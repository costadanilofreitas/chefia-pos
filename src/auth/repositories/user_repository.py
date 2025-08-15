"""
Repository for user authentication operations.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import delete, select, update

from src.core.database.connection import DatabaseManager

from ..models.db_models import NumericCredential, User
from ..models.numeric_password_models import (
    OperatorCredential,
    OperatorCredentialCreate,
)
from ..models.user_models import (
    User as UserModel,
)
from ..models.user_models import (
    UserCreate,
    UserInDB,
    UserUpdate,
)


class UserRepository:
    """Repository for user operations."""

    def __init__(self):
        self.db_manager = DatabaseManager()

    async def create_user(self, user_data: UserCreate) -> UserModel:
        """Create a new user."""
        async with self.db_manager.get_session() as session:
            db_user = User(
                user_id=uuid4(),
                client_id="default",
                store_id="default",
                username=user_data.username,
                password="",  # Will be set by service with hashed password
                name=user_data.full_name or user_data.username,
                email=user_data.email,
                role=user_data.role.value,
                permissions=(
                    [p.value for p in user_data.permissions]
                    if user_data.permissions
                    else []
                ),
                is_active=True,
            )

            session.add(db_user)
            await session.commit()
            await session.refresh(db_user)

            return self._db_user_to_model(db_user)

    async def get_user_by_id(self, user_id: UUID) -> Optional[UserModel]:
        """Get user by ID."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(select(User).where(User.user_id == user_id))
            db_user = result.scalar_one_or_none()

            if db_user:
                return self._db_user_to_model(db_user)
            return None

    async def get_user_by_username(self, username: str) -> Optional[UserInDB]:
        """Get user by username including password hash."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(User).where(User.username == username)
            )
            db_user = result.scalar_one_or_none()

            if db_user:
                return self._db_user_to_user_in_db(db_user)
            return None

    async def get_user_by_email(self, email: str) -> Optional[UserModel]:
        """Get user by email."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(select(User).where(User.email == email))
            db_user = result.scalar_one_or_none()

            if db_user:
                return self._db_user_to_model(db_user)
            return None

    async def update_user(
        self, user_id: UUID, user_data: UserUpdate
    ) -> Optional[UserModel]:
        """Update user."""
        async with self.db_manager.get_session() as session:
            update_data = {
                k: v
                for k, v in user_data.dict(exclude_unset=True).items()
                if v is not None
            }

            if "role" in update_data:
                update_data["role"] = update_data["role"].value
            if "permissions" in update_data:
                update_data["permissions"] = [
                    p.value for p in update_data["permissions"]
                ]

            await session.execute(
                update(User).where(User.user_id == user_id).values(**update_data)
            )
            await session.commit()

            return await self.get_user_by_id(user_id)

    async def delete_user(self, user_id: UUID) -> bool:
        """Delete user."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(delete(User).where(User.user_id == user_id))
            await session.commit()
            return result.rowcount > 0

    async def list_users(
        self,
        client_id: str = "default",
        store_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        role: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[UserModel]:
        """List users with filters."""
        async with self.db_manager.get_session() as session:
            query = select(User).where(User.client_id == client_id)

            if store_id:
                query = query.where(User.store_id == store_id)
            if is_active is not None:
                query = query.where(User.is_active == is_active)
            if role:
                query = query.where(User.role == role)

            query = query.limit(limit).offset(offset)

            result = await session.execute(query)
            db_users = result.scalars().all()

            return [self._db_user_to_model(db_user) for db_user in db_users]

    async def update_last_login(self, user_id: UUID) -> None:
        """Update user's last login timestamp."""
        async with self.db_manager.get_session() as session:
            await session.execute(
                update(User)
                .where(User.user_id == user_id)
                .values(last_login=datetime.utcnow())
            )
            await session.commit()

    # Numeric credentials methods

    async def create_numeric_credential(
        self, credential_data: OperatorCredentialCreate
    ) -> OperatorCredential:
        """Create numeric credential."""
        async with self.db_manager.get_session() as session:
            db_credential = NumericCredential(
                credential_id=uuid4(),
                user_id=UUID(credential_data.user_id),
                operator_code=credential_data.operator_code,
                password_hash="",  # Will be set by service
                is_active=True,
                failed_attempts="0",
            )

            session.add(db_credential)
            await session.commit()
            await session.refresh(db_credential)

            return self._db_credential_to_model(db_credential)

    async def get_credential_by_code(
        self, operator_code: str
    ) -> Optional[OperatorCredential]:
        """Get credential by operator code."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(NumericCredential).where(
                    NumericCredential.operator_code == operator_code
                )
            )
            db_credential = result.scalar_one_or_none()

            if db_credential:
                return self._db_credential_to_model(db_credential)
            return None

    async def update_credential_failed_attempts(
        self, credential_id: UUID, attempts: int
    ) -> None:
        """Update failed login attempts."""
        async with self.db_manager.get_session() as session:
            await session.execute(
                update(NumericCredential)
                .where(NumericCredential.credential_id == credential_id)
                .values(failed_attempts=str(attempts))
            )
            await session.commit()

    async def lock_credential(
        self, credential_id: UUID, locked_until: datetime
    ) -> None:
        """Lock credential until specified time."""
        async with self.db_manager.get_session() as session:
            await session.execute(
                update(NumericCredential)
                .where(NumericCredential.credential_id == credential_id)
                .values(locked_until=locked_until)
            )
            await session.commit()

    # Helper methods

    def _db_user_to_model(self, db_user: User) -> UserModel:
        """Convert database user to Pydantic model."""
        from ..models.user_models import Permission, UserRole

        return UserModel(
            id=str(db_user.user_id),
            username=str(db_user.username),
            email=str(db_user.email) if db_user.email else None,
            full_name=str(db_user.name),
            role=UserRole(str(db_user.role)),
            permissions=[
                Permission(p)
                for p in (db_user.permissions or [])
                if isinstance(db_user.permissions, list)
            ],
            is_active=bool(db_user.is_active),
            created_at=db_user.created_at,
            updated_at=db_user.updated_at,
        )

    def _db_user_to_user_in_db(self, db_user: User) -> UserInDB:
        """Convert database user to UserInDB model."""
        from ..models.user_models import Permission, UserRole

        return UserInDB(
            id=str(db_user.user_id),
            username=str(db_user.username),
            email=str(db_user.email) if db_user.email else None,
            full_name=str(db_user.name),
            role=UserRole(str(db_user.role)),
            permissions=[
                Permission(p)
                for p in (db_user.permissions or [])
                if isinstance(db_user.permissions, list)
            ],
            is_active=bool(db_user.is_active),
            created_at=db_user.created_at,
            updated_at=db_user.updated_at,
            hashed_password=str(db_user.password),
        )

    def _db_credential_to_model(
        self, db_credential: NumericCredential
    ) -> OperatorCredential:
        """Convert database credential to Pydantic model."""
        return OperatorCredential(
            id=str(db_credential.credential_id),
            user_id=str(db_credential.user_id),
            operator_code=db_credential.operator_code,
            is_active=db_credential.is_active,
            last_used=db_credential.last_used,
            failed_attempts=int(db_credential.failed_attempts),
            locked_until=db_credential.locked_until,
            created_at=db_credential.created_at,
            updated_at=db_credential.updated_at,
        )

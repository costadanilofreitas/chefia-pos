"""
User service using PostgreSQL repository.
"""

import os
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

import bcrypt
import jwt

from ..models.user_models import (
    Permission,
    Token,
    TokenData,
    TokenPayload,
    User,
    UserCreate,
    UserInDB,
    UserRole,
    UserUpdate,
)
from ..repositories.user_repository import UserRepository


class UserService:
    """Service for user management with PostgreSQL."""

    def __init__(self, repository: Optional[UserRepository] = None):
        self.repository = repository or UserRepository()
        self.jwt_secret = os.getenv(
            "JWT_SECRET", "default_secret_key_change_in_production"
        )
        self.jwt_algorithm = "HS256"
        self.access_token_expire_minutes = 30

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user."""
        # Hash password
        hashed_password = self._hash_password(user_data.password)

        # Create user through repository
        user = await self.repository.create_user(user_data)

        # Update with hashed password
        user_in_db = await self.repository.get_user_by_username(user_data.username)
        if user_in_db:
            # Update password hash in database
            await self.repository.update_user(
                UUID(user.id), UserUpdate(password=hashed_password)
            )

        return user

    async def authenticate_user(
        self, username: str, password: str
    ) -> Optional[UserInDB]:
        """Authenticate user with username and password."""
        user = await self.repository.get_user_by_username(username)
        if not user:
            return None

        if not self._verify_password(password, user.hashed_password):
            return None

        # Update last login
        await self.repository.update_last_login(UUID(user.id))

        return user

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID."""
        return await self.repository.get_user_by_id(user_id)

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        user_in_db = await self.repository.get_user_by_username(username)
        if user_in_db:
            return User(
                id=user_in_db.id,
                username=user_in_db.username,
                email=user_in_db.email,
                full_name=user_in_db.full_name,
                role=user_in_db.role,
                permissions=user_in_db.permissions,
                is_active=user_in_db.is_active,
                created_at=user_in_db.created_at,
                updated_at=user_in_db.updated_at,
            )
        return None

    async def update_user(self, user_id: UUID, user_data: UserUpdate) -> Optional[User]:
        """Update user."""
        return await self.repository.update_user(user_id, user_data)

    async def delete_user(self, user_id: UUID) -> bool:
        """Delete user."""
        return await self.repository.delete_user(user_id)

    async def list_users(
        self,
        client_id: str = "default",
        store_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        role: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[User]:
        """List users with filters."""
        return await self.repository.list_users(
            client_id=client_id,
            store_id=store_id,
            is_active=is_active,
            role=role,
            limit=limit,
            offset=offset,
        )

    def create_access_token(self, user: UserInDB) -> Token:
        """Create JWT access token for user."""
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)

        payload = TokenPayload(
            sub=user.id,
            username=user.username,
            role=user.role,
            permissions=[p.value for p in user.permissions],
            exp=int(expire.timestamp()),
            iat=int(datetime.utcnow().timestamp()),
        )

        token = jwt.encode(
            payload.dict(), self.jwt_secret, algorithm=self.jwt_algorithm
        )

        return Token(
            access_token=token,
            token_type="bearer",
            expires_in=self.access_token_expire_minutes * 60,
        )

    def decode_token(self, token: str) -> Optional[TokenData]:
        """Decode and validate JWT token."""
        try:
            payload = jwt.decode(
                token, self.jwt_secret, algorithms=[self.jwt_algorithm]
            )

            username = payload.get("username")
            user_id = payload.get("sub")
            role = payload.get("role")
            permissions = payload.get("permissions", [])

            if username is None or user_id is None:
                return None

            return TokenData(
                username=username,
                user_id=user_id,
                role=UserRole(role) if role else None,
                permissions=[Permission(p) for p in permissions],
            )
        except jwt.PyJWTError:
            return None

    def _hash_password(self, password: str) -> str:
        """Hash password with bcrypt."""
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash."""
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )


# Global instance
user_service = UserService()

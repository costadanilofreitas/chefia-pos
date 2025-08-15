import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ...core.database.connection import get_db_session
from ..models.coupon_models import (
    Coupon,
    CouponCreate,
    CouponRedemption,
    CouponScope,
    CouponType,
    CouponUpdate,
)
from ..models.db_models import (
    CampaignTypeEnum,
    CouponDB,
    CouponRedemptionDB,
    CouponScopeEnum,
    CouponTypeEnum,
    CustomerLoyaltyDB,
    LoyaltyPointTransactionDB,
)
from ..repositories.loyalty_repository import LoyaltyRepository


class LoyaltyDBService:
    """Database-backed loyalty service."""

    def __init__(self, db: Session = Depends(get_db_session)):
        self.repository = LoyaltyRepository(db)

    def _convert_db_to_pydantic_coupon(self, db_coupon: CouponDB) -> Coupon:
        """Convert database coupon model to Pydantic model."""
        return Coupon(
            id=db_coupon.id,  # type: ignore
            code=db_coupon.code,  # type: ignore
            description=db_coupon.description,  # type: ignore
            discount_type=CouponType(db_coupon.discount_type.value),  # type: ignore
            discount_value=db_coupon.discount_value,  # type: ignore
            scope=CouponScope(db_coupon.scope.value),  # type: ignore
            product_id=(
                uuid.UUID(db_coupon.product_id) if db_coupon.product_id else None  # type: ignore
            ),
            min_order_value=db_coupon.min_order_value,  # type: ignore
            max_discount=db_coupon.max_discount,  # type: ignore
            valid_from=db_coupon.valid_from,  # type: ignore
            valid_until=db_coupon.valid_until,  # type: ignore
            max_uses=db_coupon.max_uses,  # type: ignore
            is_active=db_coupon.is_active,  # type: ignore
            created_at=db_coupon.created_at,  # type: ignore
            updated_at=db_coupon.updated_at,  # type: ignore
            uses_count=db_coupon.uses_count,  # type: ignore
        )

    def _convert_db_to_pydantic_redemption(
        self, db_redemption: CouponRedemptionDB
    ) -> CouponRedemption:
        """Convert database redemption model to Pydantic model."""
        return CouponRedemption(
            coupon_id=db_redemption.coupon_id,  # type: ignore
            order_id=uuid.UUID(db_redemption.order_id),  # type: ignore
            customer_id=(
                uuid.UUID(db_redemption.customer_id)  # type: ignore
                if db_redemption.customer_id
                else None
            ),
            discount_amount=db_redemption.discount_amount,  # type: ignore
            redeemed_at=db_redemption.redeemed_at,  # type: ignore
        )

    async def create_coupon(self, coupon_create: CouponCreate) -> Coupon:
        """Creates a new coupon."""

        # Check if code already exists
        existing_coupon = self.repository.get_coupon_by_code(coupon_create.code)
        if existing_coupon:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Coupon with code '{coupon_create.code}' already exists",
            )

        # Convert Pydantic enums to SQLAlchemy enums
        discount_type_enum = CouponTypeEnum(coupon_create.discount_type.value)
        scope_enum = CouponScopeEnum(coupon_create.scope.value)

        db_coupon = self.repository.create_coupon(
            code=coupon_create.code,
            description=coupon_create.description,
            discount_type=discount_type_enum,
            discount_value=coupon_create.discount_value,
            scope=scope_enum,
            valid_from=coupon_create.valid_from,
            product_id=(
                str(coupon_create.product_id) if coupon_create.product_id else None
            ),
            min_order_value=coupon_create.min_order_value,
            max_discount=coupon_create.max_discount,
            valid_until=coupon_create.valid_until,
            max_uses=coupon_create.max_uses,
            is_active=coupon_create.is_active,
        )

        return self._convert_db_to_pydantic_coupon(db_coupon)

    async def get_coupon(self, coupon_id: uuid.UUID) -> Optional[Coupon]:
        """Retrieves a coupon by its ID."""
        db_coupon = self.repository.get_coupon_by_id(coupon_id)
        if not db_coupon:
            return None
        return self._convert_db_to_pydantic_coupon(db_coupon)

    async def get_coupon_by_code(self, code: str) -> Optional[Coupon]:
        """Retrieves a coupon by its code."""
        db_coupon = self.repository.get_coupon_by_code(code)
        if not db_coupon:
            return None
        return self._convert_db_to_pydantic_coupon(db_coupon)

    async def list_coupons(
        self, active_only: bool = False, campaign_id: Optional[uuid.UUID] = None
    ) -> List[Coupon]:
        """Lists all coupons, optionally filtering by active status."""
        db_coupons = self.repository.list_coupons(
            active_only=active_only, campaign_id=campaign_id
        )
        return [self._convert_db_to_pydantic_coupon(coupon) for coupon in db_coupons]

    async def update_coupon(
        self, coupon_id: uuid.UUID, coupon_update: CouponUpdate
    ) -> Optional[Coupon]:
        """Updates an existing coupon."""

        # Convert update data
        update_data = coupon_update.dict(exclude_unset=True)

        db_coupon = self.repository.update_coupon(coupon_id, update_data)
        if not db_coupon:
            return None

        return self._convert_db_to_pydantic_coupon(db_coupon)

    async def delete_coupon(self, coupon_id: uuid.UUID) -> bool:
        """Deletes a coupon."""
        return self.repository.delete_coupon(coupon_id)

    async def validate_coupon(
        self, code: str, order_value: float, product_id: Optional[uuid.UUID] = None
    ) -> Dict:
        """Validates a coupon for use in an order."""

        db_coupon = self.repository.get_coupon_by_code(code)

        if not db_coupon:
            return {"valid": False, "error": "Coupon not found", "discount_amount": 0}

        if not db_coupon.is_active:
            return {
                "valid": False,
                "error": "Coupon is not active",
                "discount_amount": 0,
            }

        # Check validity dates
        today = date.today()
        if db_coupon.valid_from > today:
            return {
                "valid": False,
                "error": "Coupon is not yet valid",
                "discount_amount": 0,
            }

        if db_coupon.valid_until and db_coupon.valid_until < today:
            return {"valid": False, "error": "Coupon has expired", "discount_amount": 0}

        # Check usage limit
        if db_coupon.max_uses and db_coupon.uses_count >= db_coupon.max_uses:
            return {
                "valid": False,
                "error": "Coupon usage limit exceeded",
                "discount_amount": 0,
            }

        # Check minimum order value
        if db_coupon.min_order_value and order_value < db_coupon.min_order_value:
            return {
                "valid": False,
                "error": f"Minimum order value of R${db_coupon.min_order_value:.2f} required",
                "discount_amount": 0,
            }

        # Check product scope
        if (
            db_coupon.scope == CouponScopeEnum.PRODUCT
            and db_coupon.product_id != str(product_id)
            if product_id
            else True
        ):
            return {
                "valid": False,
                "error": "Coupon is not valid for this product",
                "discount_amount": 0,
            }

        # Calculate discount
        if db_coupon.discount_type == CouponTypeEnum.PERCENTAGE:
            discount_amount = order_value * (db_coupon.discount_value / 100)  # type: ignore
            if db_coupon.max_discount:  # type: ignore
                discount_amount = min(discount_amount, db_coupon.max_discount)  # type: ignore
        else:  # FIXED
            discount_amount = min(db_coupon.discount_value, order_value)  # type: ignore

        coupon_pydantic = self._convert_db_to_pydantic_coupon(db_coupon)

        return {
            "valid": True,
            "error": None,
            "discount_amount": discount_amount,
            "coupon": coupon_pydantic,
        }

    async def redeem_coupon(
        self,
        code: str,
        order_id: uuid.UUID,
        customer_id: Optional[uuid.UUID],
        discount_amount: float,
        terminal_id: Optional[str] = None,
        cashier_id: Optional[str] = None,
        original_order_value: Optional[float] = None,
        final_order_value: Optional[float] = None,
    ) -> CouponRedemption:
        """Records a coupon redemption and increments usage count."""

        db_coupon = self.repository.get_coupon_by_code(code)

        if not db_coupon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found"
            )

        # Create redemption record
        db_redemption = self.repository.create_coupon_redemption(
            coupon_id=db_coupon.id,  # type: ignore
            order_id=str(order_id),
            discount_amount=discount_amount,
            customer_id=str(customer_id) if customer_id else None,
            terminal_id=terminal_id,
            cashier_id=cashier_id,
            original_order_value=original_order_value,
            final_order_value=final_order_value,
        )

        # Increment usage count
        self.repository.increment_coupon_usage(db_coupon.id)  # type: ignore

        return self._convert_db_to_pydantic_redemption(db_redemption)

    # Loyalty Points Management
    async def award_loyalty_points(
        self,
        customer_id: str,
        points: int,
        order_id: Optional[str] = None,
        purchase_amount: Optional[float] = None,
        description: Optional[str] = None,
    ) -> int:
        """Award loyalty points to a customer."""

        # Get or create customer loyalty record
        customer_loyalty = self.repository.get_customer_loyalty(customer_id)
        if not customer_loyalty:
            customer_loyalty = self.repository.create_customer_loyalty(
                customer_id=customer_id, enrollment_date=date.today()
            )

        # Get default loyalty program (assuming one exists)
        programs = self.repository.list_loyalty_programs(active_only=True)
        if not programs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active loyalty program found",
            )

        program = programs[0]  # Use first active program

        # Create point transaction
        self.repository.create_point_transaction(
            loyalty_program_id=program.id,  # type: ignore
            customer_id=customer_id,
            transaction_type="earn",
            points=points,
            order_id=order_id,
            purchase_amount=purchase_amount,
            description=description or "Points earned from purchase",
        )

        # Update customer loyalty balance
        self.repository.update_customer_points_balance(
            customer_id=customer_id, points_change=points, transaction_type="earn"
        )

        # Return new balance
        return self.repository.get_customer_points_balance(customer_id)

    async def redeem_loyalty_points(
        self,
        customer_id: str,
        points: int,
        order_id: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Redeem loyalty points for discount."""

        # Check if customer has enough points
        current_balance = self.repository.get_customer_points_balance(customer_id)

        if current_balance < points:
            return {
                "success": False,
                "error": f"Insufficient points. Current balance: {current_balance}",
                "discount_amount": 0,
                "remaining_points": current_balance,
            }

        # Get default loyalty program
        programs = self.repository.list_loyalty_programs(active_only=True)
        if not programs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active loyalty program found",
            )

        program = programs[0]

        # Calculate discount amount
        discount_amount = points / program.redemption_rate

        # Create point transaction
        self.repository.create_point_transaction(
            loyalty_program_id=program.id,  # type: ignore
            customer_id=customer_id,
            transaction_type="redeem",
            points=-points,  # Negative for redemption
            order_id=order_id,
            description=description
            or f"Points redeemed for R${discount_amount:.2f} discount",
        )

        # Update customer loyalty balance
        self.repository.update_customer_points_balance(
            customer_id=customer_id, points_change=-points, transaction_type="redeem"
        )

        # Get new balance
        new_balance = self.repository.get_customer_points_balance(customer_id)

        return {
            "success": True,
            "error": None,
            "discount_amount": discount_amount,
            "remaining_points": new_balance,
        }

    async def get_customer_loyalty_info(self, customer_id: str) -> Dict[str, Any]:
        """Get customer loyalty information."""

        customer_loyalty = self.repository.get_customer_loyalty(customer_id)
        if not customer_loyalty:
            # Create new loyalty record
            customer_loyalty = self.repository.create_customer_loyalty(
                customer_id=customer_id, enrollment_date=date.today()
            )

        current_balance = self.repository.get_customer_points_balance(customer_id)

        # Get recent transactions
        recent_transactions = self.repository.get_customer_point_transactions(
            customer_id=customer_id, limit=10
        )

        return {
            "customer_id": customer_id,
            "current_points_balance": current_balance,
            "total_points_earned": customer_loyalty.total_points_earned,
            "total_points_redeemed": customer_loyalty.total_points_redeemed,
            "current_tier": customer_loyalty.current_tier,
            "enrollment_date": customer_loyalty.enrollment_date.isoformat(),
            "is_active": customer_loyalty.is_active,
            "recent_transactions": [
                {
                    "transaction_type": t.transaction_type,
                    "points": t.points,
                    "description": t.description,
                    "created_at": t.created_at.isoformat(),
                }
                for t in recent_transactions
            ],
        }

    # Campaign management
    async def create_campaign(
        self,
        name: str,
        campaign_type: str,
        start_date: datetime,
        end_date: Optional[datetime] = None,
        description: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """Create a loyalty campaign."""

        campaign_type_enum = CampaignTypeEnum(campaign_type)

        db_campaign = self.repository.create_campaign(
            name=name,
            campaign_type=campaign_type_enum,
            start_date=start_date,
            end_date=end_date,
            description=description,
            **kwargs,
        )

        return {
            "id": str(db_campaign.id),
            "name": db_campaign.name,
            "campaign_type": db_campaign.campaign_type.value,
            "status": db_campaign.status.value,
            "start_date": db_campaign.start_date.isoformat(),
            "end_date": (
                db_campaign.end_date.isoformat() if db_campaign.end_date else None
            ),
            "created_at": db_campaign.created_at.isoformat(),
        }

    async def get_active_campaigns(self) -> List[Dict[str, Any]]:
        """Get active campaigns."""

        db_campaigns = self.repository.list_campaigns(active_only=True)

        return [
            {
                "id": str(campaign.id),
                "name": campaign.name,
                "campaign_type": campaign.campaign_type.value,
                "status": campaign.status.value,
                "start_date": campaign.start_date.isoformat(),
                "end_date": (
                    campaign.end_date.isoformat() if campaign.end_date else None
                ),
                "description": campaign.description,
            }
            for campaign in db_campaigns
        ]

    # Analytics
    async def get_coupon_analytics(
        self, from_date: Optional[datetime] = None, to_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get coupon usage analytics."""
        return self.repository.get_coupon_usage_stats(from_date, to_date)

    async def get_loyalty_analytics(
        self, customer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get loyalty program analytics."""

        if customer_id:
            # Customer-specific analytics
            return await self.get_customer_loyalty_info(customer_id)
        else:
            # Program-wide analytics
            total_customers = (
                self.repository.db.query(CustomerLoyaltyDB)
                .filter(CustomerLoyaltyDB.is_active)
                .count()
            )

            total_points_issued = (
                self.repository.db.query(func.sum(LoyaltyPointTransactionDB.points))
                .filter(LoyaltyPointTransactionDB.transaction_type == "earn")
                .scalar()
                or 0
            )

            total_points_redeemed = abs(
                self.repository.db.query(func.sum(LoyaltyPointTransactionDB.points))
                .filter(LoyaltyPointTransactionDB.transaction_type == "redeem")
                .scalar()
                or 0
            )

            return {
                "total_customers": total_customers,
                "total_points_issued": total_points_issued,
                "total_points_redeemed": total_points_redeemed,
                "points_outstanding": total_points_issued - total_points_redeemed,
            }


# Dependency function to get the service
def get_loyalty_service(db: Session = Depends(get_db_session)) -> LoyaltyDBService:
    """Get LoyaltyDBService instance with database session."""
    return LoyaltyDBService(db)

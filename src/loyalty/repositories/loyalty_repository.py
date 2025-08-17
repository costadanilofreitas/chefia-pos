# Loyalty repository for database operations

import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session, joinedload

from ..models.db_models import (
    CampaignStatusEnum,
    CampaignTypeEnum,
    CouponDB,
    CouponRedemptionDB,
    CouponScopeEnum,
    CouponTypeEnum,
    CustomerLoyaltyDB,
    LoyaltyCampaignDB,
    LoyaltyPointTransactionDB,
    LoyaltyProgramDB,
    LoyaltyProgramTypeEnum,
    LoyaltyRewardDB,
    LoyaltyRewardRedemptionDB,
)


class LoyaltyRepository:
    """Repository for loyalty-related database operations."""

    def __init__(self, db: Session):
        self.db = db

    # Coupon operations
    def create_coupon(
        self,
        code: str,
        description: str,
        discount_type: CouponTypeEnum,
        discount_value: float,
        scope: CouponScopeEnum,
        valid_from: date,
        **kwargs,
    ) -> CouponDB:
        """Create a new coupon."""

        db_coupon = CouponDB(
            code=code,
            description=description,
            discount_type=discount_type,
            discount_value=discount_value,
            scope=scope,
            valid_from=valid_from,
            **kwargs,
        )

        self.db.add(db_coupon)
        self.db.commit()
        self.db.refresh(db_coupon)
        return db_coupon

    def get_coupon_by_id(self, coupon_id: uuid.UUID) -> Optional[CouponDB]:
        """Get coupon by ID with redemptions."""
        return (
            self.db.query(CouponDB)
            .options(joinedload(CouponDB.redemptions), joinedload(CouponDB.campaign))
            .filter(CouponDB.id == coupon_id)
            .first()
        )

    def get_coupon_by_code(self, code: str) -> Optional[CouponDB]:
        """Get coupon by code."""
        return self.db.query(CouponDB).filter(CouponDB.code == code).first()

    def list_coupons(
        self,
        active_only: bool = False,
        campaign_id: Optional[uuid.UUID] = None,
        scope: Optional[CouponScopeEnum] = None,
    ) -> List[CouponDB]:
        """List coupons with filters."""

        query = self.db.query(CouponDB).options(joinedload(CouponDB.campaign))

        if active_only:
            query = query.filter(CouponDB.is_active)

        if campaign_id:
            query = query.filter(CouponDB.campaign_id == campaign_id)

        if scope:
            query = query.filter(CouponDB.scope == scope)

        return query.order_by(desc(CouponDB.created_at)).all()

    def update_coupon(
        self, coupon_id: uuid.UUID, updates: Dict[str, Any]
    ) -> Optional[CouponDB]:
        """Update coupon."""

        db_coupon = self.db.query(CouponDB).filter(CouponDB.id == coupon_id).first()

        if not db_coupon:
            return None

        for field, value in updates.items():
            if hasattr(db_coupon, field):
                setattr(db_coupon, field, value)

        setattr(db_coupon, 'updated_at', datetime.utcnow())
        self.db.commit()
        self.db.refresh(db_coupon)
        return db_coupon

    def delete_coupon(self, coupon_id: uuid.UUID) -> bool:
        """Delete coupon."""
        db_coupon = self.db.query(CouponDB).filter(CouponDB.id == coupon_id).first()

        if not db_coupon:
            return False

        self.db.delete(db_coupon)
        self.db.commit()
        return True

    def increment_coupon_usage(self, coupon_id: uuid.UUID) -> Optional[CouponDB]:
        """Increment coupon usage count."""
        db_coupon = self.db.query(CouponDB).filter(CouponDB.id == coupon_id).first()

        if not db_coupon:
            return None

        setattr(db_coupon, 'uses_count', int(db_coupon.uses_count) + 1)
        setattr(db_coupon, 'updated_at', datetime.utcnow())
        self.db.commit()
        self.db.refresh(db_coupon)
        return db_coupon

    # Coupon Redemption operations
    def create_coupon_redemption(
        self,
        coupon_id: uuid.UUID,
        order_id: str,
        discount_amount: float,
        customer_id: Optional[str] = None,
        **kwargs,
    ) -> CouponRedemptionDB:
        """Create coupon redemption record."""

        db_redemption = CouponRedemptionDB(
            coupon_id=coupon_id,
            order_id=order_id,
            discount_amount=discount_amount,
            customer_id=customer_id,
            **kwargs,
        )

        self.db.add(db_redemption)
        self.db.commit()
        self.db.refresh(db_redemption)
        return db_redemption

    def get_coupon_redemptions(
        self,
        coupon_id: Optional[uuid.UUID] = None,
        customer_id: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> List[CouponRedemptionDB]:
        """Get coupon redemptions with filters."""

        query = self.db.query(CouponRedemptionDB).options(
            joinedload(CouponRedemptionDB.coupon)
        )

        if coupon_id:
            query = query.filter(CouponRedemptionDB.coupon_id == coupon_id)

        if customer_id:
            query = query.filter(CouponRedemptionDB.customer_id == customer_id)

        if from_date:
            query = query.filter(CouponRedemptionDB.redeemed_at >= from_date)

        if to_date:
            query = query.filter(CouponRedemptionDB.redeemed_at <= to_date)

        return query.order_by(desc(CouponRedemptionDB.redeemed_at)).all()

    # Loyalty Program operations
    def create_loyalty_program(
        self, name: str, program_type: LoyaltyProgramTypeEnum, **kwargs
    ) -> LoyaltyProgramDB:
        """Create loyalty program."""

        db_program = LoyaltyProgramDB(name=name, program_type=program_type, **kwargs)

        self.db.add(db_program)
        self.db.commit()
        self.db.refresh(db_program)
        return db_program

    def get_loyalty_program_by_id(
        self, program_id: uuid.UUID
    ) -> Optional[LoyaltyProgramDB]:
        """Get loyalty program by ID."""
        return (
            self.db.query(LoyaltyProgramDB)
            .options(
                joinedload(LoyaltyProgramDB.campaigns),
                joinedload(LoyaltyProgramDB.point_transactions),
            )
            .filter(LoyaltyProgramDB.id == program_id)
            .first()
        )

    def list_loyalty_programs(self, active_only: bool = True) -> List[LoyaltyProgramDB]:
        """List loyalty programs."""

        query = self.db.query(LoyaltyProgramDB)

        if active_only:
            query = query.filter(LoyaltyProgramDB.is_active)

        return query.order_by(LoyaltyProgramDB.name).all()

    def update_loyalty_program(
        self, program_id: uuid.UUID, updates: Dict[str, Any]
    ) -> Optional[LoyaltyProgramDB]:
        """Update loyalty program."""

        db_program = (
            self.db.query(LoyaltyProgramDB)
            .filter(LoyaltyProgramDB.id == program_id)
            .first()
        )

        if not db_program:
            return None

        for field, value in updates.items():
            if hasattr(db_program, field):
                setattr(db_program, field, value)

        setattr(db_program, 'updated_at', datetime.utcnow())
        self.db.commit()
        self.db.refresh(db_program)
        return db_program

    # Campaign operations
    def create_campaign(
        self, name: str, campaign_type: CampaignTypeEnum, start_date: datetime, **kwargs
    ) -> LoyaltyCampaignDB:
        """Create loyalty campaign."""

        db_campaign = LoyaltyCampaignDB(
            name=name, campaign_type=campaign_type, start_date=start_date, **kwargs
        )

        self.db.add(db_campaign)
        self.db.commit()
        self.db.refresh(db_campaign)
        return db_campaign

    def get_campaign_by_id(self, campaign_id: uuid.UUID) -> Optional[LoyaltyCampaignDB]:
        """Get campaign by ID."""
        return (
            self.db.query(LoyaltyCampaignDB)
            .options(
                joinedload(LoyaltyCampaignDB.coupons),
                joinedload(LoyaltyCampaignDB.loyalty_program),
            )
            .filter(LoyaltyCampaignDB.id == campaign_id)
            .first()
        )

    def list_campaigns(
        self,
        status: Optional[CampaignStatusEnum] = None,
        campaign_type: Optional[CampaignTypeEnum] = None,
        active_only: bool = False,
    ) -> List[LoyaltyCampaignDB]:
        """List campaigns with filters."""

        query = self.db.query(LoyaltyCampaignDB).options(
            joinedload(LoyaltyCampaignDB.loyalty_program)
        )

        if status:
            query = query.filter(LoyaltyCampaignDB.status == status)

        if campaign_type:
            query = query.filter(LoyaltyCampaignDB.campaign_type == campaign_type)

        if active_only:
            now = datetime.utcnow()
            query = query.filter(
                and_(
                    LoyaltyCampaignDB.status == CampaignStatusEnum.ACTIVE,
                    LoyaltyCampaignDB.start_date <= now,
                    or_(
                        LoyaltyCampaignDB.end_date.is_(None),
                        LoyaltyCampaignDB.end_date >= now,
                    ),
                )
            )

        return query.order_by(desc(LoyaltyCampaignDB.created_at)).all()

    def update_campaign(
        self, campaign_id: uuid.UUID, updates: Dict[str, Any]
    ) -> Optional[LoyaltyCampaignDB]:
        """Update campaign."""

        db_campaign = (
            self.db.query(LoyaltyCampaignDB)
            .filter(LoyaltyCampaignDB.id == campaign_id)
            .first()
        )

        if not db_campaign:
            return None

        for field, value in updates.items():
            if hasattr(db_campaign, field):
                setattr(db_campaign, field, value)

        setattr(db_campaign, 'updated_at', datetime.utcnow())
        self.db.commit()
        self.db.refresh(db_campaign)
        return db_campaign

    # Point Transaction operations
    def create_point_transaction(
        self,
        loyalty_program_id: uuid.UUID,
        customer_id: str,
        transaction_type: str,
        points: int,
        **kwargs,
    ) -> LoyaltyPointTransactionDB:
        """Create loyalty point transaction."""

        db_transaction = LoyaltyPointTransactionDB(
            loyalty_program_id=loyalty_program_id,
            customer_id=customer_id,
            transaction_type=transaction_type,
            points=points,
            **kwargs,
        )

        self.db.add(db_transaction)
        self.db.commit()
        self.db.refresh(db_transaction)
        return db_transaction

    def get_customer_point_transactions(
        self, customer_id: str, transaction_type: Optional[str] = None, limit: int = 100
    ) -> List[LoyaltyPointTransactionDB]:
        """Get customer point transaction history."""

        query = (
            self.db.query(LoyaltyPointTransactionDB)
            .options(joinedload(LoyaltyPointTransactionDB.loyalty_program))
            .filter(LoyaltyPointTransactionDB.customer_id == customer_id)
        )

        if transaction_type:
            query = query.filter(
                LoyaltyPointTransactionDB.transaction_type == transaction_type
            )

        return (
            query.order_by(desc(LoyaltyPointTransactionDB.created_at))
            .limit(limit)
            .all()
        )

    def get_customer_points_balance(self, customer_id: str) -> int:
        """Calculate customer's current points balance."""

        result = (
            self.db.query(func.sum(LoyaltyPointTransactionDB.points))
            .filter(LoyaltyPointTransactionDB.customer_id == customer_id)
            .scalar()
        )

        return result if result else 0

    # Customer Loyalty operations
    def get_customer_loyalty(self, customer_id: str) -> Optional[CustomerLoyaltyDB]:
        """Get customer loyalty information."""
        return (
            self.db.query(CustomerLoyaltyDB)
            .filter(CustomerLoyaltyDB.customer_id == customer_id)
            .first()
        )

    def create_customer_loyalty(
        self, customer_id: str, enrollment_date: date, **kwargs
    ) -> CustomerLoyaltyDB:
        """Create customer loyalty record."""

        db_loyalty = CustomerLoyaltyDB(
            customer_id=customer_id, enrollment_date=enrollment_date, **kwargs
        )

        self.db.add(db_loyalty)
        self.db.commit()
        self.db.refresh(db_loyalty)
        return db_loyalty

    def update_customer_loyalty(
        self, customer_id: str, updates: Dict[str, Any]
    ) -> Optional[CustomerLoyaltyDB]:
        """Update customer loyalty information."""

        db_loyalty = (
            self.db.query(CustomerLoyaltyDB)
            .filter(CustomerLoyaltyDB.customer_id == customer_id)
            .first()
        )

        if not db_loyalty:
            return None

        for field, value in updates.items():
            if hasattr(db_loyalty, field):
                setattr(db_loyalty, field, value)

        setattr(db_loyalty, 'updated_at', datetime.utcnow())
        self.db.commit()
        self.db.refresh(db_loyalty)
        return db_loyalty

    def update_customer_points_balance(
        self, customer_id: str, points_change: int, transaction_type: str = "adjust"
    ) -> Optional[CustomerLoyaltyDB]:
        """Update customer points balance and create transaction record."""

        # Get or create customer loyalty record
        db_loyalty = self.get_customer_loyalty(customer_id)
        if not db_loyalty:
            db_loyalty = self.create_customer_loyalty(
                customer_id=customer_id, enrollment_date=date.today()
            )

        # Update balance
        new_balance = max(0, int(db_loyalty.current_points_balance) + points_change)

        updates = {"current_points_balance": new_balance}

        if points_change > 0:
            updates["total_points_earned"] = (
                int(db_loyalty.total_points_earned) + points_change
            )
        else:
            updates["total_points_redeemed"] = int(db_loyalty.total_points_redeemed) + abs(
                points_change
            )

        return self.update_customer_loyalty(customer_id, updates)

    # Reward operations
    def create_reward(
        self, name: str, reward_type: str, points_required: int, **kwargs
    ) -> LoyaltyRewardDB:
        """Create loyalty reward."""

        db_reward = LoyaltyRewardDB(
            name=name,
            reward_type=reward_type,
            points_required=points_required,
            **kwargs,
        )

        self.db.add(db_reward)
        self.db.commit()
        self.db.refresh(db_reward)
        return db_reward

    def get_reward_by_id(self, reward_id: uuid.UUID) -> Optional[LoyaltyRewardDB]:
        """Get reward by ID."""
        return (
            self.db.query(LoyaltyRewardDB)
            .filter(LoyaltyRewardDB.id == reward_id)
            .first()
        )

    def list_available_rewards(
        self, customer_points: Optional[int] = None, reward_type: Optional[str] = None
    ) -> List[LoyaltyRewardDB]:
        """List available rewards."""

        query = self.db.query(LoyaltyRewardDB).filter(LoyaltyRewardDB.is_active)

        if customer_points is not None:
            query = query.filter(LoyaltyRewardDB.points_required <= customer_points)

        if reward_type:
            query = query.filter(LoyaltyRewardDB.reward_type == reward_type)

        # Check availability dates
        today = date.today()
        query = query.filter(
            or_(
                LoyaltyRewardDB.available_from.is_(None),
                LoyaltyRewardDB.available_from <= today,
            )
        ).filter(
            or_(
                LoyaltyRewardDB.available_until.is_(None),
                LoyaltyRewardDB.available_until >= today,
            )
        )

        # Check stock availability
        query = query.filter(
            or_(
                LoyaltyRewardDB.total_available.is_(None),
                LoyaltyRewardDB.total_available > LoyaltyRewardDB.total_redeemed,
            )
        )

        return query.order_by(LoyaltyRewardDB.points_required).all()

    def create_reward_redemption(
        self, reward_id: uuid.UUID, customer_id: str, points_used: int, **kwargs
    ) -> LoyaltyRewardRedemptionDB:
        """Create reward redemption."""

        db_redemption = LoyaltyRewardRedemptionDB(
            reward_id=reward_id,
            customer_id=customer_id,
            points_used=points_used,
            **kwargs,
        )

        self.db.add(db_redemption)

        # Update reward total redeemed count
        reward = self.get_reward_by_id(reward_id)
        if reward:
            setattr(reward, 'total_redeemed', int(reward.total_redeemed) + 1)

        self.db.commit()
        self.db.refresh(db_redemption)
        return db_redemption

    # Analytics operations
    def get_coupon_usage_stats(
        self, from_date: Optional[datetime] = None, to_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get coupon usage statistics."""

        query = self.db.query(CouponRedemptionDB)

        if from_date:
            query = query.filter(CouponRedemptionDB.redeemed_at >= from_date)

        if to_date:
            query = query.filter(CouponRedemptionDB.redeemed_at <= to_date)

        redemptions = query.all()

        total_redemptions = len(redemptions)
        total_discount = sum(r.discount_amount for r in redemptions)

        # Top coupons by usage
        coupon_usage = {}
        for redemption in redemptions:
            coupon_id = str(redemption.coupon_id)
            if coupon_id not in coupon_usage:
                coupon_usage[coupon_id] = {
                    "count": 0,
                    "total_discount": 0,
                    "coupon": redemption.coupon,
                }
            coupon_usage[coupon_id]["count"] += 1
            coupon_usage[coupon_id]["total_discount"] += redemption.discount_amount

        top_coupons = sorted(
            coupon_usage.values(), key=lambda x: x["count"], reverse=True
        )[:10]

        return {
            "total_redemptions": total_redemptions,
            "total_discount_given": total_discount,
            "average_discount": (
                total_discount / total_redemptions if total_redemptions > 0 else 0
            ),
            "top_coupons": top_coupons,
        }

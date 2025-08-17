# Loyalty module database models for PostgreSQL

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy import Enum as SqlEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ...core.database.connection import Base


# Enums
class CouponTypeEnum(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class CouponScopeEnum(str, enum.Enum):
    ORDER = "order"
    PRODUCT = "product"


class LoyaltyProgramTypeEnum(str, enum.Enum):
    POINTS = "points"  # Points-based program
    TIER = "tier"  # Tier-based program (Bronze, Silver, Gold)
    CASHBACK = "cashback"  # Cashback program
    STAMP = "stamp"  # Stamp card program


class CampaignStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CampaignTypeEnum(str, enum.Enum):
    PROMOTIONAL = "promotional"
    SEASONAL = "seasonal"
    BIRTHDAY = "birthday"
    REFERRAL = "referral"
    RETENTION = "retention"


class CouponDB(Base):
    """Database model for coupons."""

    __tablename__ = "loyalty_coupons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Basic coupon information
    code = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=False)

    # Discount details
    discount_type: Column = Column(SqlEnum(CouponTypeEnum), nullable=False)
    discount_value = Column(Float, nullable=False)  # Percentage or fixed amount
    max_discount = Column(
        Float, nullable=True
    )  # Maximum discount for percentage coupons

    # Application scope
    scope: Column = Column(
        SqlEnum(CouponScopeEnum), nullable=False, default=CouponScopeEnum.ORDER
    )
    product_id = Column(
        String, nullable=True, index=True
    )  # Reference to product if scope is PRODUCT

    # Usage conditions
    min_order_value = Column(Float, nullable=True)
    max_uses = Column(Integer, nullable=True)  # Maximum number of times it can be used
    uses_count = Column(Integer, default=0, nullable=False, index=True)

    # Validity period
    valid_from = Column(Date, nullable=False, index=True)
    valid_until = Column(Date, nullable=True, index=True)

    # Status
    is_active = Column(Boolean, default=True, index=True)

    # Campaign association
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("loyalty_campaigns.id"),
        nullable=True,
        index=True,
    )

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    campaign = relationship("LoyaltyCampaignDB", back_populates="coupons")
    redemptions = relationship(
        "CouponRedemptionDB", back_populates="coupon", cascade="all, delete-orphan"
    )


class CouponRedemptionDB(Base):
    """Database model for coupon redemptions."""

    __tablename__ = "coupon_redemptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    coupon_id = Column(
        UUID(as_uuid=True), ForeignKey("loyalty_coupons.id"), nullable=False, index=True
    )

    # Order and customer information
    order_id = Column(String, nullable=False, index=True)  # Reference to main order
    customer_id = Column(String, nullable=True, index=True)  # Reference to customer

    # Redemption details
    discount_amount = Column(Float, nullable=False)
    original_order_value = Column(Float, nullable=True)
    final_order_value = Column(Float, nullable=True)

    # Location and context
    terminal_id = Column(String, nullable=True)
    cashier_id = Column(String, nullable=True)

    # Timestamps
    redeemed_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationship
    coupon = relationship("CouponDB", back_populates="redemptions")


class LoyaltyProgramDB(Base):
    """Database model for loyalty programs."""

    __tablename__ = "loyalty_programs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Program details
    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    program_type: Column = Column(
        SqlEnum(LoyaltyProgramTypeEnum),
        nullable=False,
        default=LoyaltyProgramTypeEnum.POINTS,
    )

    # Points configuration
    points_per_real = Column(Float, default=1.0)  # Points earned per R$1 spent
    points_per_visit = Column(Integer, default=0)  # Bonus points per visit
    redemption_rate = Column(Float, default=100.0)  # Points needed for R$1 discount

    # Tier configuration (for tier-based programs)
    tier_config = Column(String, nullable=True)  # JSON with tier definitions

    # Status and validity
    is_active = Column(Boolean, default=True, index=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    # Rules and conditions
    min_purchase_amount = Column(Float, default=0.0)  # Minimum purchase to earn points
    max_points_per_transaction = Column(Integer, nullable=True)
    point_expiration_days = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    campaigns = relationship("LoyaltyCampaignDB", back_populates="loyalty_program")
    point_transactions = relationship(
        "LoyaltyPointTransactionDB", back_populates="loyalty_program"
    )


class LoyaltyCampaignDB(Base):
    """Database model for loyalty campaigns."""

    __tablename__ = "loyalty_campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    loyalty_program_id = Column(
        UUID(as_uuid=True), ForeignKey("loyalty_programs.id"), nullable=True, index=True
    )

    # Campaign details
    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    campaign_type: Column = Column(SqlEnum(CampaignTypeEnum), nullable=False)

    # Timing
    start_date = Column(DateTime, nullable=False, index=True)
    end_date = Column(DateTime, nullable=True, index=True)

    # Targeting
    target_customers = Column(
        String, nullable=True
    )  # JSON with customer targeting rules
    target_products = Column(String, nullable=True)  # JSON with product targeting rules

    # Campaign rules and rewards
    rules = Column(String, nullable=True)  # JSON with campaign rules
    rewards = Column(String, nullable=True)  # JSON with reward configuration

    # Budget and limits
    budget_limit = Column(Float, nullable=True)
    max_redemptions = Column(Integer, nullable=True)
    current_redemptions = Column(Integer, default=0)

    # Status
    status: Column = Column(
        SqlEnum(CampaignStatusEnum),
        nullable=False,
        default=CampaignStatusEnum.DRAFT,
        index=True,
    )

    # Performance tracking
    impressions = Column(Integer, default=0)  # How many times shown to customers
    clicks = Column(Integer, default=0)  # How many times customers clicked/engaged
    conversions = Column(Integer, default=0)  # How many times customers made purchase
    total_discount_given = Column(Float, default=0.0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    loyalty_program = relationship("LoyaltyProgramDB", back_populates="campaigns")
    coupons = relationship("CouponDB", back_populates="campaign")


class LoyaltyPointTransactionDB(Base):
    """Database model for loyalty point transactions."""

    __tablename__ = "loyalty_point_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    loyalty_program_id = Column(
        UUID(as_uuid=True),
        ForeignKey("loyalty_programs.id"),
        nullable=False,
        index=True,
    )

    # Customer and transaction info
    customer_id = Column(String, nullable=False, index=True)  # Reference to customer
    order_id = Column(
        String, nullable=True, index=True
    )  # Reference to order if applicable

    # Transaction details
    transaction_type = Column(
        String, nullable=False, index=True
    )  # earn, redeem, expire, adjust, bonus
    points = Column(
        Integer, nullable=False
    )  # Positive for earning, negative for spending
    description = Column(Text)

    # Transaction metadata
    purchase_amount = Column(
        Float, nullable=True
    )  # Purchase amount that generated points
    multiplier = Column(Float, default=1.0)  # Points multiplier applied

    # Expiration (for earned points)
    expires_at = Column(DateTime, nullable=True, index=True)

    # Administrative
    created_by = Column(String, nullable=True)  # User who created the transaction
    reference = Column(String, nullable=True, index=True)  # External reference

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationship
    loyalty_program = relationship(
        "LoyaltyProgramDB", back_populates="point_transactions"
    )


class CustomerLoyaltyDB(Base):
    """Database model for customer loyalty status and balances."""

    __tablename__ = "customer_loyalty"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(
        String, nullable=False, unique=True, index=True
    )  # Reference to customer

    # Points balance
    total_points_earned = Column(Integer, default=0)
    total_points_redeemed = Column(Integer, default=0)
    current_points_balance = Column(Integer, default=0, index=True)

    # Tier information (for tier-based programs)
    current_tier = Column(String, nullable=True)
    tier_progress = Column(Float, default=0.0)  # Progress to next tier (0.0 to 1.0)
    next_tier = Column(String, nullable=True)

    # Statistics
    total_purchases = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    average_order_value = Column(Float, default=0.0)
    last_purchase_date = Column(Date, nullable=True)

    # Program enrollment
    enrollment_date = Column(Date, nullable=False, index=True)
    is_active = Column(Boolean, default=True, index=True)

    # Preferences
    communication_preferences = Column(String, nullable=True)  # JSON with preferences

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class LoyaltyRewardDB(Base):
    """Database model for loyalty rewards catalog."""

    __tablename__ = "loyalty_rewards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Reward details
    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    reward_type = Column(
        String, nullable=False, index=True
    )  # discount, free_item, gift, cashback

    # Cost and availability
    points_required = Column(Integer, nullable=False, index=True)
    cash_value = Column(Float, nullable=True)  # Equivalent cash value

    # Reward configuration
    reward_config = Column(String, nullable=True)  # JSON with reward-specific config

    # Product or category association
    product_id = Column(String, nullable=True, index=True)
    category_id = Column(String, nullable=True, index=True)

    # Availability
    is_active = Column(Boolean, default=True, index=True)
    available_from = Column(Date, nullable=True)
    available_until = Column(Date, nullable=True)
    max_redemptions_per_customer = Column(Integer, nullable=True)
    total_available = Column(Integer, nullable=True)
    total_redeemed = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class LoyaltyRewardRedemptionDB(Base):
    """Database model for loyalty reward redemptions."""

    __tablename__ = "loyalty_reward_redemptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    reward_id = Column(
        UUID(as_uuid=True), ForeignKey("loyalty_rewards.id"), nullable=False, index=True
    )

    # Customer and transaction info
    customer_id = Column(String, nullable=False, index=True)
    order_id = Column(String, nullable=True, index=True)

    # Redemption details
    points_used = Column(Integer, nullable=False)
    discount_amount = Column(Float, nullable=True)

    # Status
    status = Column(
        String, default="redeemed", index=True
    )  # redeemed, used, expired, cancelled
    used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True, index=True)

    # Administrative
    redeemed_by = Column(
        String, nullable=True
    )  # Terminal/user who processed redemption
    notes = Column(Text)

    # Timestamps
    redeemed_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationship
    reward = relationship("LoyaltyRewardDB")

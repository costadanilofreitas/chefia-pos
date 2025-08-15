import json
import os
import uuid
from datetime import date, datetime
from typing import Dict, List, Optional

from fastapi import HTTPException, status

from ..models.coupon_models import (
    Coupon,
    CouponCreate,
    CouponRedemption,
    CouponScope,
    CouponType,
    CouponUpdate,
)

# File-based storage
DATA_DIR = "/home/ubuntu/chefia-pos/data"
COUPONS_FILE = os.path.join(DATA_DIR, "coupons.json")
REDEMPTIONS_FILE = os.path.join(DATA_DIR, "coupon_redemptions.json")


def ensure_data_dir():
    """Ensure data directory exists."""
    os.makedirs(DATA_DIR, exist_ok=True)


def load_coupons() -> List[Dict]:
    """Load coupons from JSON file."""
    ensure_data_dir()
    if not os.path.exists(COUPONS_FILE):
        return []
    try:
        with open(COUPONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError, Exception):
        return []


def save_coupons(coupons: List[Dict]):
    """Save coupons to JSON file."""
    ensure_data_dir()
    with open(COUPONS_FILE, "w", encoding="utf-8") as f:
        json.dump(coupons, f, ensure_ascii=False, indent=2, default=str)


def load_redemptions() -> List[Dict]:
    """Load coupon redemptions from JSON file."""
    ensure_data_dir()
    if not os.path.exists(REDEMPTIONS_FILE):
        return []
    try:
        with open(REDEMPTIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError, Exception):
        return []


def save_redemptions(redemptions: List[Dict]):
    """Save coupon redemptions to JSON file."""
    ensure_data_dir()
    with open(REDEMPTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(redemptions, f, ensure_ascii=False, indent=2, default=str)


class CouponService:
    """Service layer for managing coupons and redemptions."""

    async def create_coupon(self, coupon_create: CouponCreate) -> Coupon:
        """Creates a new coupon."""
        coupons_data = load_coupons()

        # Check if code already exists
        for coupon_data in coupons_data:
            if coupon_data.get("code") == coupon_create.code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Coupon with code '{coupon_create.code}' already exists",
                )

        coupon_id = uuid.uuid4()
        now = datetime.utcnow()

        coupon_dict = coupon_create.dict()
        coupon_dict.update(
            {
                "id": str(coupon_id),
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
                "uses_count": 0,
            }
        )

        # Convert dates to strings
        if isinstance(coupon_dict.get("valid_from"), date):
            coupon_dict["valid_from"] = coupon_dict["valid_from"].isoformat()
        if isinstance(coupon_dict.get("valid_until"), date):
            coupon_dict["valid_until"] = coupon_dict["valid_until"].isoformat()

        coupons_data.append(coupon_dict)
        save_coupons(coupons_data)

        return Coupon(**coupon_dict)

    async def get_coupon(self, coupon_id: uuid.UUID) -> Optional[Coupon]:
        """Retrieves a coupon by its ID."""
        coupons_data = load_coupons()
        for coupon_data in coupons_data:
            if coupon_data.get("id") == str(coupon_id):
                return Coupon(**coupon_data)
        return None

    async def get_coupon_by_code(self, code: str) -> Optional[Coupon]:
        """Retrieves a coupon by its code."""
        coupons_data = load_coupons()
        for coupon_data in coupons_data:
            if coupon_data.get("code") == code:
                return Coupon(**coupon_data)
        return None

    async def list_coupons(self, active_only: bool = False) -> List[Coupon]:
        """Lists all coupons, optionally filtering by active status."""
        coupons_data = load_coupons()
        coupons = []

        for coupon_data in coupons_data:
            if active_only and not coupon_data.get("is_active", True):
                continue
            coupons.append(Coupon(**coupon_data))

        return coupons

    async def update_coupon(
        self, coupon_id: uuid.UUID, coupon_update: CouponUpdate
    ) -> Optional[Coupon]:
        """Updates an existing coupon."""
        coupons_data = load_coupons()

        for i, coupon_data in enumerate(coupons_data):
            if coupon_data.get("id") == str(coupon_id):
                # Update only provided fields
                update_data = coupon_update.dict(exclude_unset=True)

                # Convert dates to strings
                if "valid_until" in update_data and isinstance(
                    update_data["valid_until"], date
                ):
                    update_data["valid_until"] = update_data["valid_until"].isoformat()

                coupon_data.update(update_data)
                coupon_data["updated_at"] = datetime.utcnow().isoformat()

                coupons_data[i] = coupon_data
                save_coupons(coupons_data)

                return Coupon(**coupon_data)

        return None

    async def delete_coupon(self, coupon_id: uuid.UUID) -> bool:
        """Deletes a coupon."""
        coupons_data = load_coupons()

        for i, coupon_data in enumerate(coupons_data):
            if coupon_data.get("id") == str(coupon_id):
                coupons_data.pop(i)
                save_coupons(coupons_data)
                return True

        return False

    async def validate_coupon(
        self, code: str, order_value: float, product_id: Optional[uuid.UUID] = None
    ) -> Dict:
        """Validates a coupon for use in an order."""
        coupon = await self.get_coupon_by_code(code)

        if not coupon:
            return {"valid": False, "error": "Coupon not found", "discount_amount": 0}

        if not coupon.is_active:
            return {
                "valid": False,
                "error": "Coupon is not active",
                "discount_amount": 0,
            }

        # Check validity dates
        today = date.today()
        if coupon.valid_from > today:
            return {
                "valid": False,
                "error": "Coupon is not yet valid",
                "discount_amount": 0,
            }

        if coupon.valid_until and coupon.valid_until < today:
            return {"valid": False, "error": "Coupon has expired", "discount_amount": 0}

        # Check usage limit
        if coupon.max_uses and coupon.uses_count >= coupon.max_uses:
            return {
                "valid": False,
                "error": "Coupon usage limit exceeded",
                "discount_amount": 0,
            }

        # Check minimum order value
        if coupon.min_order_value and order_value < coupon.min_order_value:
            return {
                "valid": False,
                "error": f"Minimum order value of R${coupon.min_order_value:.2f} required",
                "discount_amount": 0,
            }

        # Check product scope
        if coupon.scope == CouponScope.PRODUCT and coupon.product_id != product_id:
            return {
                "valid": False,
                "error": "Coupon is not valid for this product",
                "discount_amount": 0,
            }

        # Calculate discount
        if coupon.discount_type == CouponType.PERCENTAGE:
            discount_amount = order_value * (coupon.discount_value / 100)
            if coupon.max_discount:
                discount_amount = min(discount_amount, coupon.max_discount)
        else:  # FIXED
            discount_amount = min(coupon.discount_value, order_value)

        return {
            "valid": True,
            "error": None,
            "discount_amount": discount_amount,
            "coupon": coupon,
        }

    async def redeem_coupon(
        self,
        code: str,
        order_id: uuid.UUID,
        customer_id: Optional[uuid.UUID],
        discount_amount: float,
    ) -> CouponRedemption:
        """Records a coupon redemption and increments usage count."""
        coupon = await self.get_coupon_by_code(code)

        if not coupon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found"
            )

        # Create redemption record
        redemption = CouponRedemption(
            coupon_id=coupon.id,
            order_id=order_id,
            customer_id=customer_id,
            discount_amount=discount_amount,
        )

        # Save redemption
        redemptions_data = load_redemptions()
        redemption_dict = redemption.dict()
        redemption_dict["coupon_id"] = str(redemption_dict["coupon_id"])
        redemption_dict["order_id"] = str(redemption_dict["order_id"])
        if redemption_dict["customer_id"]:
            redemption_dict["customer_id"] = str(redemption_dict["customer_id"])
        redemption_dict["redeemed_at"] = redemption_dict["redeemed_at"].isoformat()

        redemptions_data.append(redemption_dict)
        save_redemptions(redemptions_data)

        # Increment usage count
        coupons_data = load_coupons()
        for i, coupon_data in enumerate(coupons_data):
            if coupon_data.get("id") == str(coupon.id):
                coupon_data["uses_count"] = coupon_data.get("uses_count", 0) + 1
                coupon_data["updated_at"] = datetime.utcnow().isoformat()
                coupons_data[i] = coupon_data
                break

        save_coupons(coupons_data)

        return redemption


# Global service instance
coupon_service = CouponService()

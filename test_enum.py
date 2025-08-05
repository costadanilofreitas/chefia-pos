from enum import Enum

class Permission(str, Enum):
    ADMIN_SETTINGS = "admin:settings"
    COUPONS_CREATE = "coupons.create"
    COUPONS_READ = "coupons.read"

print(Permission.COUPONS_CREATE)

from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import asyncio
import json

from ..models.backoffice_models import (
    BackofficeUser, BackofficeUserCreate, BackofficeUserUpdate,
    Brand, BrandCreate, BrandUpdate,
    Restaurant, RestaurantCreate, RestaurantUpdate,
    UserRole, Permission, ReportRequest, ReportResponse, ReportType, ReportFormat,
    DashboardMetrics
)
from ..auth.auth_service import create_access_token, get_password_hash, verify_password

class BackofficeService:
    """Service for backoffice operations."""
    
    def __init__(self):
        """Initialize the backoffice service."""
        # In-memory storage for demo purposes
        # In a real application, this would use a database
        self._users_db = {}
        self._brands_db = {}
        self._restaurants_db = {}
        self._reports_db = {}
        
        # Create a default admin user if none exists
        if not self._users_db:
            admin_id = uuid.uuid4()
            self._users_db[admin_id] = {
                "id": admin_id,
                "username": "admin",
                "email": "admin@posmodern.com",
                "full_name": "System Administrator",
                "hashed_password": get_password_hash("admin"),
                "role": UserRole.ADMIN,
                "permissions": list(Permission),
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "last_login": None,
                "brand_id": None,
                "restaurant_ids": []
            }
    
    # === Authentication Methods ===
    async def authenticate_user(self, username: str, password: str):
        """Authenticate a user and return an access token."""
        # Find user by username
        user = None
        for user_id, user_data in self._users_db.items():
            if user_data["username"] == username:
                user = user_data
                break
        
        if not user:
            return {"error": "Invalid username or password"}
        
        # Verify password
        if not verify_password(password, user["hashed_password"]):
            return {"error": "Invalid username or password"}
        
        # Check if user is active
        if not user["is_active"]:
            return {"error": "User is inactive"}
        
        # Create access token
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": user["username"]},
            expires_delta=access_token_expires
        )
        
        # Update last login
        user["last_login"] = datetime.utcnow()
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user["id"]),
            "username": user["username"],
            "role": user["role"]
        }
    
    # === User Management Methods ===
    async def create_user(self, user_create: BackofficeUserCreate, current_user: BackofficeUser):
        """Create a new backoffice user."""
        # Check if username already exists
        for user_id, user_data in self._users_db.items():
            if user_data["username"] == user_create.username:
                raise ValueError("Username already exists")
        
        # Check if email already exists
        for user_id, user_data in self._users_db.items():
            if user_data["email"] == user_create.email:
                raise ValueError("Email already exists")
        
        # Check if brand_id exists if provided
        if user_create.brand_id and user_create.brand_id not in self._brands_db:
            raise ValueError(f"Brand with ID {user_create.brand_id} not found")
        
        # Check if restaurant_ids exist if provided
        if user_create.restaurant_ids:
            for restaurant_id in user_create.restaurant_ids:
                if restaurant_id not in self._restaurants_db:
                    raise ValueError(f"Restaurant with ID {restaurant_id} not found")
        
        # Set default permissions based on role if not provided
        if user_create.permissions is None:
            if user_create.role == UserRole.ADMIN:
                user_create.permissions = list(Permission)
            elif user_create.role == UserRole.MANAGER:
                user_create.permissions = [
                    Permission.VIEW_USERS, Permission.VIEW_RESTAURANTS, Permission.VIEW_BRANDS,
                    Permission.VIEW_SALES_REPORTS, Permission.VIEW_INVENTORY_REPORTS,
                    Permission.EXPORT_REPORTS, Permission.MANAGE_RESTAURANT_CONFIG,
                    Permission.APPROVE_INVENTORY_TRANSACTIONS, Permission.MANAGE_MENU,
                    Permission.MANAGE_PROMOTIONS, Permission.VIEW_SYSTEM_STATUS
                ]
            elif user_create.role == UserRole.ACCOUNTANT:
                user_create.permissions = [
                    Permission.VIEW_SALES_REPORTS, Permission.VIEW_INVENTORY_REPORTS,
                    Permission.VIEW_FINANCIAL_REPORTS, Permission.EXPORT_REPORTS,
                    Permission.VIEW_SYSTEM_STATUS
                ]
            elif user_create.role == UserRole.OPERATOR:
                user_create.permissions = [
                    Permission.VIEW_SALES_REPORTS, Permission.MANAGE_MENU,
                    Permission.MANAGE_PROMOTIONS
                ]
            else:  # VIEWER
                user_create.permissions = [
                    Permission.VIEW_SALES_REPORTS, Permission.VIEW_INVENTORY_REPORTS
                ]
        
        # Create user
        user_id = uuid.uuid4()
        now = datetime.utcnow()
        
        user = {
            "id": user_id,
            "username": user_create.username,
            "email": user_create.email,
            "hashed_password": get_password_hash(user_create.password),
            "full_name": user_create.full_name,
            "role": user_create.role,
            "permissions": user_create.permissions or [],
            "is_active": True,
            "created_at": now,
            "updated_at": now,
            "last_login": None,
            "brand_id": user_create.brand_id,
            "restaurant_ids": user_create.restaurant_ids or []
        }
        
        self._users_db[user_id] = user
        
        # Return user without hashed_password
        user_copy = user.copy()
        user_copy.pop("hashed_password")
        return BackofficeUser(**user_copy)
    
    async def list_users(self, role: Optional[UserRole], brand_id: Optional[uuid.UUID], 
                         is_active: Optional[bool], current_user: BackofficeUser):
        """List backoffice users with optional filtering."""
        users = []
        
        for user_id, user_data in self._users_db.items():
            # Apply filters
            if role is not None and user_data["role"] != role:
                continue
            if brand_id is not None and user_data["brand_id"] != brand_id:
                continue
            if is_active is not None and user_data["is_active"] != is_active:
                continue
            
            # Check if current user has access to this user
            if current_user.role != UserRole.ADMIN:
                # Non-admin users can only see users from their brand
                if current_user.brand_id and user_data["brand_id"] != current_user.brand_id:
                    continue
            
            # Create user object without hashed_password
            user_copy = user_data.copy()
            user_copy.pop("hashed_password")
            users.append(BackofficeUser(**user_copy))
        
        return users
    
    async def get_user(self, user_id: uuid.UUID, current_user: BackofficeUser):
        """Get a specific backoffice user."""
        if user_id not in self._users_db:
            return None
        
        user_data = self._users_db[user_id]
        
        # Check if current user has access to this user
        if current_user.role != UserRole.ADMIN:
            # Non-admin users can only see users from their brand
            if current_user.brand_id and user_data["brand_id"] != current_user.brand_id:
                return None
        
        # Create user object without hashed_password
        user_copy = user_data.copy()
        user_copy.pop("hashed_password")
        return BackofficeUser(**user_copy)
    
    async def update_user(self, user_id: uuid.UUID, user_update: BackofficeUserUpdate, current_user: BackofficeUser):
        """Update a backoffice user."""
        if user_id not in self._users_db:
            return None
        
        user_data = self._users_db[user_id]
        
        # Check if current user has access to this user
        if current_user.role != UserRole.ADMIN:
            # Non-admin users can only update users from their brand
            if current_user.brand_id and user_data["brand_id"] != current_user.brand_id:
                return None
        
        # Update fields
        if user_update.email is not None:
            user_data["email"] = user_update.email
        if user_update.full_name is not None:
            user_data["full_name"] = user_update.full_name
        if user_update.role is not None:
            user_data["role"] = user_update.role
        if user_update.permissions is not None:
            user_data["permissions"] = user_update.permissions
        if user_update.is_active is not None:
            user_data["is_active"] = user_update.is_active
        if user_update.brand_id is not None:
            # Check if brand_id exists
            if user_update.brand_id not in self._brands_db:
                raise ValueError(f"Brand with ID {user_update.brand_id} not found")
            user_data["brand_id"] = user_update.brand_id
        if user_update.restaurant_ids is not None:
            # Check if restaurant_ids exist
            for restaurant_id in user_update.restaurant_ids:
                if restaurant_id not in self._restaurants_db:
                    raise ValueError(f"Restaurant with ID {restaurant_id} not found")
            user_data["restaurant_ids"] = user_update.restaurant_ids
        
        user_data["updated_at"] = datetime.utcnow()
        
        # Create user object without hashed_password
        user_copy = user_data.copy()
        user_copy.pop("hashed_password")
        return BackofficeUser(**user_copy)
    
    async def delete_user(self, user_id: uuid.UUID, current_user: BackofficeUser):
        """Delete a backoffice user (deactivate)."""
        if user_id not in self._users_db:
            return False
        
        user_data = self._users_db[user_id]
        
        # Check if current user has access to this user
        if current_user.role != UserRole.ADMIN:
            # Non-admin users can only delete users from their brand
            if current_user.brand_id and user_data["brand_id"] != current_user.brand_id:
                return False
        
        # Deactivate user
        user_data["is_active"] = False
        user_data["updated_at"] = datetime.utcnow()
        
        return True
    
    # === Brand Management Methods ===
    async def create_brand(self, brand_create: BrandCreate, current_user: BackofficeUser):
        """Create a new brand."""
        # Create brand
        brand_id = uuid.uuid4()
        now = datetime.utcnow()
        
        brand = {
            "id": brand_id,
            "name": brand_create.name,
            "logo_url": brand_create.logo_url,
            "primary_color": brand_create.primary_color,
            "secondary_color": brand_create.secondary_color,
            "created_at": now,
            "updated_at": now,
            "is_active": True,
            "config": brand_create.config or {}
        }
        
        self._brands_db[brand_id] = brand
        
        return Brand(**brand)
    
    async def list_brands(self, is_active: Optional[bool], current_user: BackofficeUser):
        """List brands with optional filtering."""
        brands = []
        
        for brand_id, brand_data in self._brands_db.items():
            # Apply filters
            if is_active is not None and brand_data["is_active"] != is_active:
                continue
            
            # Check if current user has access to this brand
            if current_user.role != UserRole.ADMIN:
                # Non-admin users can only see their brand
                if current_user.brand_id and brand_id != current_user.brand_id:
                    continue
            
            brands.append(Brand(**brand_data))
        
        return brands
    
    async def get_brand(self, brand_id: uuid.UUID):
        """Get a specific brand."""
        if brand_id not in self._brands_db:
            return None
        
        return Brand(**self._brands_db[brand_id])
    
    async def update_brand(self, brand_id: uuid.UUID, brand_update: BrandUpdate, current_user: BackofficeUser):
        """Update a brand."""
        if brand_id not in self._brands_db:
            return None
        
        brand_data = self._brands_db[brand_id]
        
        # Update fields
        if brand_update.name is not None:
            brand_data["name"] = brand_update.name
        if brand_update.logo_url is not None:
            brand_data["logo_url"] = brand_update.logo_url
        if brand_update.primary_color is not None:
            brand_data["primary_color"] = brand_update.primary_color
        if brand_update.secondary_color is not None:
            brand_data["secondary_color"] = brand_update.secondary_color
        if brand_update.is_active is not None:
            brand_data["is_active"] = brand_update.is_active
        if brand_update.config is not None:
            brand_data["config"] = brand_update.config
        
        brand_data["updated_at"] = datetime.utcnow()
        
        return Brand(**brand_data)
    
    async def delete_brand(self, brand_id: uuid.UUID, current_user: BackofficeUser):
        """Delete a brand (deactivate)."""
        if brand_id not in self._brands_db:
            return False
        
        # Deactivate brand
        self._brands_db[brand_id]["is_active"] = False
        self._brands_db[brand_id]["updated_at"] = datetime.utcnow()
        
        return True
    
    # === Restaurant Management Methods ===
    async def create_restaurant(self, restaurant_create: RestaurantCreate, current_user: BackofficeUser):
        """Create a new restaurant."""
        # Check if brand_id exists
        if restaurant_create.brand_id not in self._brands_db:
            raise ValueError(f"Brand with ID {restaurant_create.brand_id} not found")
        
        # Create restaurant
        restaurant_id = uuid.uuid4()
        now = datetime.utcnow()
        
        restaurant = {
            "id": restaurant_id,
            "brand_id": restaurant_create.brand_id,
            "name": restaurant_create.name,
            "address": restaurant_create.address,
            "city": restaurant_create.city,
            "state": restaurant_create.state,
            "postal_code": restaurant_create.postal_code,
            "country": restaurant_create.country,
            "phone": restaurant_create.phone,
            "email": restaurant_create.email,
            "manager_name": restaurant_create.manager_name,
            "created_at": now,
            "updated_at": now,
            "is_active": True,
            "config": restaurant_create.config or {}
        }
        
        self._restaurants_db[restaurant_id] = restaurant
        
        return Restaurant(**restaurant)
    
    async def list_restaurants(self, brand_id: Optional[uuid.UUID], is_active: Optional[bool], current_user: BackofficeUser):
        """List restaurants with optional filtering."""
        restaurants = []
        
        for restaurant_id, restaurant_data in self._restaurants_db.items():
            # Apply filters
            if brand_id is not None and restaurant_data["brand_id"] != brand_id:
                continue
            if is_active is not None and restaurant_data["is_active"] != is_active:
                continue
            
            # Check if current user has access to this restaurant
            if current_user.role != UserRole.ADMIN:
                # Non-admin users can only see restaurants from their brand
                if current_user.brand_id and restaurant_data["brand_id"] != current_user.brand_id:
                    continue
                # If user is restricted to specific restaurants
                if current_user.restaurant_ids and restaurant_id not in current_user.restaurant_ids:
                    continue
            
            restaurants.append(Restaurant(**restaurant_data))
        
        return restaurants
    
    async def get_restaurant(self, restaurant_id: uuid.UUID):
        """Get a specific restaurant."""
        if restaurant_id not in self._restaurants_db:
            return None
        
        return Restaurant(**self._restaurants_db[restaurant_id])
    
    async def update_restaurant(self, restaurant_id: uuid.UUID, restaurant_update: RestaurantUpdate, current_user: BackofficeUser):
        """Update a restaurant."""
        if restaurant_id not in self._restaurants_db:
            return None
        
        restaurant_data = self._restaurants_db[restaurant_id]
        
        # Update fields
        if restaurant_update.brand_id is not None:
            # Check if brand_id exists
            if restaurant_update.brand_id not in self._brands_db:
                raise ValueError(f"Brand with ID {restaurant_update.brand_id} not found")
            restaurant_data["brand_id"] = restaurant_update.brand_id
        if restaurant_update.name is not None:
            restaurant_data["name"] = restaurant_update.name
        if restaurant_update.address is not None:
            restaurant_data["address"] = restaurant_update.address
        if restaurant_update.city is not None:
            restaurant_data["city"] = restaurant_update.city
        if restaurant_update.state is not None:
            restaurant_data["state"] = restaurant_update.state
        if restaurant_update.postal_code is not None:
            restaurant_data["postal_code"] = restaurant_update.postal_code
        if restaurant_update.country is not None:
            restaurant_data["country"] = restaurant_update.country
        if restaurant_update.phone is not None:
            restaurant_data["phone"] = restaurant_update.phone
        if restaurant_update.email is not None:
            restaurant_data["email"] = restaurant_update.email
        if restaurant_update.manager_name is not None:
            restaurant_data["manager_name"] = restaurant_update.manager_name
        if restaurant_update.is_active is not None:
            restaurant_data["is_active"] = restaurant_update.is_active
        if restaurant_update.config is not None:
            restaurant_data["config"] = restaurant_update.config
        
        restaurant_data["updated_at"] = datetime.utcnow()
        
        return Restaurant(**restaurant_data)
    
    async def delete_restaurant(self, restaurant_id: uuid.UUID, current_user: BackofficeUser):
        """Delete a restaurant (deactivate)."""
        if restaurant_id not in self._restaurants_db:
            return False
        
        # Deactivate restaurant
        self._restaurants_db[restaurant_id]["is_active"] = False
        self._restaurants_db[restaurant_id]["updated_at"] = datetime.utcnow()
        
        return True
    
    # === Report Methods ===
    async def generate_report(self, report_request: ReportRequest, current_user: BackofficeUser):
        """Generate a report."""
        # In a real application, this would generate the actual report
        # For demo purposes, we'll just create a report response
        report_id = uuid.uuid4()
        now = datetime.utcnow()
        
        # Simulate report generation delay
        await asyncio.sleep(1)
        
        report = {
            "id": report_id,
            "report_type": report_request.report_type,
            "start_date": report_request.start_date,
            "end_date": report_request.end_date,
            "restaurant_ids": report_request.restaurant_ids,
            "brand_id": report_request.brand_id,
            "format": report_request.format,
            "created_at": now,
            "created_by": current_user.id,
            "file_url": f"/api/backoffice/reports/{report_id}/download",
            "status": "completed",
            "error_message": None
        }
        
        self._reports_db[report_id] = report
        
        return ReportResponse(**report)
    
    async def get_report(self, report_id: uuid.UUID, current_user: BackofficeUser):
        """Get a specific report."""
        if report_id not in self._reports_db:
            return None
        
        report_data = self._reports_db[report_id]
        
        # Check if current user has access to this report
        if current_user.id != report_data["created_by"] and current_user.role != UserRole.ADMIN:
            # Check brand and restaurant access
            if report_data["brand_id"] and not await self.has_brand_access(current_user, report_data["brand_id"]):
                return None
            if report_data["restaurant_ids"]:
                for restaurant_id in report_data["restaurant_ids"]:
                    if not await self.has_restaurant_access(current_user, restaurant_id):
                        return None
        
        return ReportResponse(**report_data)
    
    # === Dashboard Methods ===
    async def get_dashboard_metrics(self, restaurant_id: Optional[uuid.UUID], brand_id: Optional[uuid.UUID], current_user: BackofficeUser):
        """Get dashboard metrics."""
        # In a real application, this would fetch actual metrics from the database
        # For demo purposes, we'll return mock data
        
        # Generate some random metrics
        import random
        
        sales_today = random.uniform(1000, 5000)
        sales_week = sales_today * random.uniform(5, 7)
        sales_month = sales_week * random.uniform(3, 4)
        sales_growth = random.uniform(-10, 20)
        active_orders = random.randint(5, 20)
        completed_orders_today = random.randint(20, 100)
        average_order_value = sales_today / (completed_orders_today if completed_orders_today > 0 else 1)
        
        # Generate top selling products
        products = ["Hambúrguer Clássico", "Batata Frita", "Refrigerante", "Milk Shake", "Salada Caesar"]
        top_selling_products = []
        for product in products:
            top_selling_products.append({
                "name": product,
                "quantity": random.randint(10, 50),
                "revenue": random.uniform(100, 1000)
            })
        
        # Generate inventory alerts
        inventory_items = ["Carne", "Pão", "Queijo", "Alface", "Tomate"]
        inventory_alerts = []
        for item in inventory_items:
            if random.random() < 0.3:  # 30% chance of alert
                inventory_alerts.append({
                    "item": item,
                    "current_stock": random.randint(1, 10),
                    "minimum_stock": random.randint(10, 20),
                    "status": "low"
                })
        
        # Generate recent activities
        activities = [
            "Novo pedido recebido",
            "Pedido entregue",
            "Estoque atualizado",
            "Novo cliente registrado",
            "Pagamento processado"
        ]
        recent_activities = []
        for _ in range(5):
            recent_activities.append({
                "activity": random.choice(activities),
                "timestamp": (datetime.utcnow() - timedelta(minutes=random.randint(1, 60))).isoformat(),
                "user": "Sistema" if random.random() < 0.5 else current_user.username
            })
        
        return DashboardMetrics(
            sales_today=sales_today,
            sales_week=sales_week,
            sales_month=sales_month,
            sales_growth=sales_growth,
            active_orders=active_orders,
            completed_orders_today=completed_orders_today,
            average_order_value=average_order_value,
            top_selling_products=top_selling_products,
            inventory_alerts=inventory_alerts,
            recent_activities=recent_activities
        )
    
    # === System Methods ===
    async def get_system_status(self, current_user: BackofficeUser):
        """Get system status."""
        # In a real application, this would fetch actual system status
        # For demo purposes, we'll return mock data
        
        # Generate some random metrics
        import random
        import psutil
        
        return {
            "status": "healthy",
            "uptime": "3 days, 12:34:56",
            "cpu_usage": psutil.cpu_percent(),
            "memory_usage": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent,
            "active_users": random.randint(1, 10),
            "modules": {
                "order": {"status": "running", "version": "1.0.0"},
                "inventory": {"status": "running", "version": "1.0.0"},
                "payment": {"status": "running", "version": "1.0.0"},
                "customer": {"status": "running", "version": "1.0.0"},
                "remote_orders": {"status": "running", "version": "1.0.0"},
                "waiter": {"status": "running", "version": "1.0.0"},
                "kds": {"status": "running", "version": "1.0.0"}
            }
        }
    
    async def get_system_logs(self, module: Optional[str], level: Optional[str], start_date: Optional[datetime], end_date: Optional[datetime], limit: int, current_user: BackofficeUser):
        """Get system logs."""
        # In a real application, this would fetch actual logs from the database or log files
        # For demo purposes, we'll return mock data
        
        # Generate some random logs
        import random
        
        log_levels = ["INFO", "WARNING", "ERROR", "DEBUG"]
        modules = ["order", "inventory", "payment", "customer", "remote_orders", "waiter", "kds", "system"]
        messages = [
            "Application started",
            "User logged in",
            "Order created",
            "Payment processed",
            "Inventory updated",
            "Database connection established",
            "API request received",
            "API response sent",
            "Error processing request",
            "Warning: low inventory"
        ]
        
        logs = []
        for _ in range(min(limit, 100)):
            log_level = level or random.choice(log_levels)
            log_module = module or random.choice(modules)
            log_message = random.choice(messages)
            log_timestamp = datetime.utcnow() - timedelta(minutes=random.randint(1, 1440))
            
            # Apply date filters
            if start_date and log_timestamp < start_date:
                continue
            if end_date and log_timestamp > end_date:
                continue
            
            logs.append({
                "timestamp": log_timestamp.isoformat(),
                "level": log_level,
                "module": log_module,
                "message": log_message,
                "details": {"request_id": str(uuid.uuid4())} if random.random() < 0.5 else None
            })
        
        # Sort logs by timestamp (newest first)
        logs.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return logs
    
    # === Helper Methods ===
    async def has_permission(self, user: BackofficeUser, permission: Permission):
        """Check if a user has a specific permission."""
        return permission in user.permissions
    
    async def has_brand_access(self, user: BackofficeUser, brand_id: uuid.UUID):
        """Check if a user has access to a specific brand."""
        # Admin has access to all brands
        if user.role == UserRole.ADMIN:
            return True
        # User is restricted to a specific brand
        if user.brand_id:
            return user.brand_id == brand_id
        # User has no brand restrictions
        return True
    
    async def has_restaurant_access(self, user: BackofficeUser, restaurant_id: uuid.UUID):
        """Check if a user has access to a specific restaurant."""
        # Admin has access to all restaurants
        if user.role == UserRole.ADMIN:
            return True
        
        # Check if restaurant exists
        if restaurant_id not in self._restaurants_db:
            return False
        
        restaurant = self._restaurants_db[restaurant_id]
        
        # User is restricted to a specific brand
        if user.brand_id and restaurant["brand_id"] != user.brand_id:
            return False
        
        # User is restricted to specific restaurants
        if user.restaurant_ids and restaurant_id not in user.restaurant_ids:
            return False
        
        # User has no restrictions
        return True

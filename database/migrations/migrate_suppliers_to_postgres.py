"""Migration script to move supplier data from JSON files to PostgreSQL."""

import json
import os
import sys
from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from supplier.models.db_models import Base, PurchaseOrderDB, SupplierDB, SupplierProductDB
from supplier.models.supplier_models import PurchaseOrderStatus


def get_database_url() -> str:
    """Get database URL from environment or use default."""
    return os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:password@localhost:5432/chefia_pos"
    )


def load_json_data(file_path: str) -> List[Dict[str, Any]]:
    """Load data from JSON file."""
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return []
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return []


def migrate_suppliers(session, suppliers_data: List[Dict[str, Any]]) -> None:
    """Migrate suppliers from JSON to PostgreSQL."""
    print(f"Migrating {len(suppliers_data)} suppliers...")
    
    for supplier_data in suppliers_data:
        try:
            # Check if supplier already exists
            existing = session.query(SupplierDB).filter(
                SupplierDB.id == supplier_data["id"]
            ).first()
            
            if existing:
                print(f"Supplier {supplier_data['name']} already exists, skipping...")
                continue
            
            # Create supplier
            supplier = SupplierDB(
                id=supplier_data["id"],
                name=supplier_data["name"],
                trading_name=supplier_data.get("trading_name"),
                document=supplier_data["document"],
                document_type=supplier_data.get("document_type", "CNPJ"),
                address=supplier_data["address"],
                contacts=supplier_data.get("contacts", []),
                payment_terms=supplier_data.get("payment_terms", []),
                website=supplier_data.get("website"),
                category=supplier_data.get("category"),
                rating=supplier_data.get("rating"),
                is_active=supplier_data.get("is_active", True),
                notes=supplier_data.get("notes"),
                created_at=datetime.fromisoformat(supplier_data["created_at"].replace("Z", "+00:00")),
                updated_at=datetime.fromisoformat(supplier_data["updated_at"].replace("Z", "+00:00")),
            )
            
            session.add(supplier)
            print(f"Migrated supplier: {supplier.name}")
            
        except Exception as e:
            print(f"Error migrating supplier {supplier_data.get('name', 'Unknown')}: {e}")
            continue
    
    session.commit()


def migrate_purchase_orders(session, purchase_orders_data: List[Dict[str, Any]]) -> None:
    """Migrate purchase orders from JSON to PostgreSQL."""
    print(f"Migrating {len(purchase_orders_data)} purchase orders...")
    
    for po_data in purchase_orders_data:
        try:
            # Check if purchase order already exists
            existing = session.query(PurchaseOrderDB).filter(
                PurchaseOrderDB.id == po_data["id"]
            ).first()
            
            if existing:
                print(f"Purchase order {po_data['order_number']} already exists, skipping...")
                continue
            
            # Create purchase order
            purchase_order = PurchaseOrderDB(
                id=po_data["id"],
                supplier_id=po_data["supplier_id"],
                supplier_name=po_data["supplier_name"],
                order_number=po_data["order_number"],
                status=po_data["status"],
                items=po_data["items"],
                total_amount=po_data["total_amount"],
                expected_delivery_date=(
                    datetime.fromisoformat(po_data["expected_delivery_date"].replace("Z", "+00:00"))
                    if po_data.get("expected_delivery_date")
                    else None
                ),
                payment_term_days=po_data.get("payment_term_days", 30),
                notes=po_data.get("notes"),
                created_by=po_data["created_by"],
                created_at=datetime.fromisoformat(po_data["created_at"].replace("Z", "+00:00")),
                updated_at=datetime.fromisoformat(po_data["updated_at"].replace("Z", "+00:00")),
                sent_at=(
                    datetime.fromisoformat(po_data["sent_at"].replace("Z", "+00:00"))
                    if po_data.get("sent_at")
                    else None
                ),
                confirmed_at=(
                    datetime.fromisoformat(po_data["confirmed_at"].replace("Z", "+00:00"))
                    if po_data.get("confirmed_at")
                    else None
                ),
                received_at=(
                    datetime.fromisoformat(po_data["received_at"].replace("Z", "+00:00"))
                    if po_data.get("received_at")
                    else None
                ),
                cancelled_at=(
                    datetime.fromisoformat(po_data["cancelled_at"].replace("Z", "+00:00"))
                    if po_data.get("cancelled_at")
                    else None
                ),
            )
            
            session.add(purchase_order)
            print(f"Migrated purchase order: {purchase_order.order_number}")
            
        except Exception as e:
            print(f"Error migrating purchase order {po_data.get('order_number', 'Unknown')}: {e}")
            continue
    
    session.commit()


def main():
    """Main migration function."""
    print("Starting supplier data migration from JSON to PostgreSQL...")
    
    # Database setup
    database_url = get_database_url()
    engine = create_engine(database_url)
    
    # Create tables
    print("Creating database tables...")
    Base.metadata.create_all(engine)
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        # Define data file paths
        data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data")
        suppliers_file = os.path.join(data_dir, "suppliers.json")
        purchase_orders_file = os.path.join(data_dir, "purchase_orders.json")
        
        # Load JSON data
        suppliers_data = load_json_data(suppliers_file)
        purchase_orders_data = load_json_data(purchase_orders_file)
        
        # Migrate data
        if suppliers_data:
            migrate_suppliers(session, suppliers_data)
        else:
            print("No suppliers data found to migrate.")
        
        if purchase_orders_data:
            migrate_purchase_orders(session, purchase_orders_data)
        else:
            print("No purchase orders data found to migrate.")
        
        print("Migration completed successfully!")
        
        # Show statistics
        supplier_count = session.query(SupplierDB).count()
        po_count = session.query(PurchaseOrderDB).count()
        print(f"Total suppliers in database: {supplier_count}")
        print(f"Total purchase orders in database: {po_count}")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Database Management Script for Chefia POS System
Handles migrations, backups, and database operations
"""

import os
import sys
import argparse
import subprocess
import asyncio
import asyncpg
from pathlib import Path
from datetime import datetime
from typing import List, Optional

# Add src to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

class DatabaseManager:
    def __init__(self):
        self.host = os.getenv("DB_HOST", "localhost")
        self.port = int(os.getenv("DB_PORT", "5432"))
        self.user = os.getenv("DB_USER", "posmodern")
        self.password = os.getenv("DB_PASSWORD", "posmodern123")
        self.database = os.getenv("DB_NAME", "posmodern")
        self.schema = "pos_modern"
        
    async def connect(self):
        """Create database connection"""
        return await asyncpg.connect(
            host=self.host,
            port=self.port,
            user=self.user,
            password=self.password,
            database=self.database
        )
    
    async def init_database(self):
        """Initialize database schema and tables"""
        print("Initializing database schema...")
        
        conn = await self.connect()
        
        try:
            # Create schema if not exists
            await conn.execute(f"""
                CREATE SCHEMA IF NOT EXISTS {self.schema}
            """)
            print(f"✓ Schema '{self.schema}' created/verified")
            
            # Set search path
            await conn.execute(f"SET search_path TO {self.schema}")
            
            # Create base tables
            init_sql_path = Path("database/init/01-init.sql")
            if init_sql_path.exists():
                with open(init_sql_path, 'r') as f:
                    sql = f.read()
                    await conn.execute(sql)
                print("✓ Base tables created from init script")
            else:
                # Create essential tables if init.sql doesn't exist
                await self._create_essential_tables(conn)
                print("✓ Essential tables created")
            
            # Create migration tracking table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id SERIAL PRIMARY KEY,
                    version VARCHAR(255) NOT NULL UNIQUE,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    description TEXT
                )
            """)
            print("✓ Migration tracking table created")
            
            await conn.close()
            print("\n✓ Database initialization complete!")
            
        except Exception as e:
            print(f"✗ Error initializing database: {e}")
            await conn.close()
            raise
    
    async def _create_essential_tables(self, conn):
        """Create essential tables if init.sql doesn't exist"""
        
        # Users table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                role VARCHAR(50) DEFAULT 'user',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Products table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                price DECIMAL(10, 2) NOT NULL,
                cost DECIMAL(10, 2),
                stock_quantity INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Customers table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(20),
                document VARCHAR(20) UNIQUE,
                address TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Orders table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                order_number VARCHAR(50) UNIQUE NOT NULL,
                customer_id INTEGER REFERENCES customers(id),
                user_id INTEGER REFERENCES users(id),
                status VARCHAR(50) DEFAULT 'pending',
                total DECIMAL(10, 2) NOT NULL,
                discount DECIMAL(10, 2) DEFAULT 0,
                tax DECIMAL(10, 2) DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Order items table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10, 2) NOT NULL,
                discount DECIMAL(10, 2) DEFAULT 0,
                total DECIMAL(10, 2) NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
            CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
            CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
            CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        """)
    
    async def run_migrations(self):
        """Run pending database migrations"""
        print("Running database migrations...")
        
        conn = await self.connect()
        
        try:
            # Get applied migrations
            applied = await conn.fetch("""
                SELECT version FROM schema_migrations
            """)
            applied_versions = {row['version'] for row in applied}
            
            # Get migration files
            migrations_dir = Path("database/migrations")
            if not migrations_dir.exists():
                print("No migrations directory found")
                await conn.close()
                return
            
            migration_files = sorted(migrations_dir.glob("*.sql"))
            
            # Run pending migrations
            pending_count = 0
            for migration_file in migration_files:
                version = migration_file.stem
                
                if version not in applied_versions:
                    print(f"  Applying migration: {version}")
                    
                    with open(migration_file, 'r') as f:
                        sql = f.read()
                    
                    # Run migration in transaction
                    async with conn.transaction():
                        await conn.execute(sql)
                        await conn.execute("""
                            INSERT INTO schema_migrations (version, description)
                            VALUES ($1, $2)
                        """, version, migration_file.name)
                    
                    print(f"  ✓ Applied: {version}")
                    pending_count += 1
            
            if pending_count == 0:
                print("✓ No pending migrations")
            else:
                print(f"\n✓ Applied {pending_count} migration(s)")
            
            await conn.close()
            
        except Exception as e:
            print(f"✗ Error running migrations: {e}")
            await conn.close()
            raise
    
    async def backup_database(self, output_dir: str = "backups"):
        """Create database backup"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = Path(output_dir)
        backup_dir.mkdir(exist_ok=True)
        
        backup_file = backup_dir / f"chefia_pos_backup_{timestamp}.sql"
        
        print(f"Creating backup: {backup_file}")
        
        # Use docker-compose to run pg_dump
        cmd = [
            "docker-compose", "exec", "-T", "postgres",
            "pg_dump", "-U", self.user, "-d", self.database,
            "--no-owner", "--no-privileges"
        ]
        
        try:
            with open(backup_file, 'w') as f:
                result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True)
            
            if result.returncode == 0:
                size = backup_file.stat().st_size / (1024 * 1024)  # MB
                print(f"✓ Backup created: {backup_file} ({size:.2f} MB)")
                return str(backup_file)
            else:
                print(f"✗ Backup failed: {result.stderr}")
                if backup_file.exists():
                    backup_file.unlink()
                return None
                
        except Exception as e:
            print(f"✗ Error creating backup: {e}")
            return None
    
    async def restore_database(self, backup_file: str):
        """Restore database from backup"""
        backup_path = Path(backup_file)
        
        if not backup_path.exists():
            print(f"✗ Backup file not found: {backup_file}")
            return False
        
        print(f"Restoring from: {backup_file}")
        print("⚠ WARNING: This will overwrite existing data!")
        
        response = input("Continue? (yes/no): ")
        if response.lower() != 'yes':
            print("Restore cancelled")
            return False
        
        # Drop and recreate database
        try:
            # Connect to postgres database to drop/create
            admin_conn = await asyncpg.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database='postgres'
            )
            
            # Terminate existing connections
            await admin_conn.execute(f"""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = '{self.database}' AND pid <> pg_backend_pid()
            """)
            
            # Drop and recreate database
            await admin_conn.execute(f"DROP DATABASE IF EXISTS {self.database}")
            await admin_conn.execute(f"CREATE DATABASE {self.database}")
            await admin_conn.close()
            
            # Restore from backup
            cmd = [
                "docker-compose", "exec", "-T", "postgres",
                "psql", "-U", self.user, "-d", self.database
            ]
            
            with open(backup_path, 'r') as f:
                result = subprocess.run(cmd, stdin=f, capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✓ Database restored successfully")
                return True
            else:
                print(f"✗ Restore failed: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"✗ Error restoring database: {e}")
            return False
    
    async def reset_database(self):
        """Reset database to initial state"""
        print("⚠ WARNING: This will DELETE ALL DATA and reset the database!")
        response = input("Type 'RESET' to confirm: ")
        
        if response != 'RESET':
            print("Reset cancelled")
            return
        
        try:
            # Connect to postgres database
            admin_conn = await asyncpg.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database='postgres'
            )
            
            # Terminate connections and drop database
            await admin_conn.execute(f"""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = '{self.database}' AND pid <> pg_backend_pid()
            """)
            
            await admin_conn.execute(f"DROP DATABASE IF EXISTS {self.database}")
            await admin_conn.execute(f"CREATE DATABASE {self.database}")
            await admin_conn.close()
            
            print("✓ Database dropped and recreated")
            
            # Initialize schema
            await self.init_database()
            
            # Run migrations
            await self.run_migrations()
            
            print("\n✓ Database reset complete!")
            
        except Exception as e:
            print(f"✗ Error resetting database: {e}")
            raise
    
    async def check_status(self):
        """Check database status and statistics"""
        print("Database Status Check")
        print("-" * 40)
        
        try:
            conn = await self.connect()
            
            # Database version
            version = await conn.fetchval("SELECT version()")
            print(f"PostgreSQL: {version.split(',')[0]}")
            
            # Database size
            size = await conn.fetchval(f"""
                SELECT pg_size_pretty(pg_database_size('{self.database}'))
            """)
            print(f"Database size: {size}")
            
            # Table count
            table_count = await conn.fetchval("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = 'pos_modern'
                AND table_type = 'BASE TABLE'
            """)
            print(f"Tables: {table_count}")
            
            # Connection count
            conn_count = await conn.fetchval(f"""
                SELECT COUNT(*)
                FROM pg_stat_activity
                WHERE datname = '{self.database}'
            """)
            print(f"Active connections: {conn_count}")
            
            # Top 5 largest tables
            print("\nLargest tables:")
            tables = await conn.fetch("""
                SELECT
                    schemaname || '.' || tablename AS table_name,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
                FROM pg_tables
                WHERE schemaname = 'pos_modern'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                LIMIT 5
            """)
            
            for table in tables:
                print(f"  • {table['table_name']}: {table['size']}")
            
            await conn.close()
            print("\n✓ Database is healthy")
            
        except Exception as e:
            print(f"✗ Error checking status: {e}")

async def main():
    parser = argparse.ArgumentParser(description="Manage Chefia POS Database")
    
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Init command
    subparsers.add_parser('init', help='Initialize database schema')
    
    # Migrate command
    subparsers.add_parser('migrate', help='Run pending migrations')
    
    # Backup command
    backup_parser = subparsers.add_parser('backup', help='Create database backup')
    backup_parser.add_argument('--output', default='backups', help='Output directory')
    
    # Restore command
    restore_parser = subparsers.add_parser('restore', help='Restore from backup')
    restore_parser.add_argument('file', help='Backup file path')
    
    # Reset command
    subparsers.add_parser('reset', help='Reset database (WARNING: Deletes all data)')
    
    # Status command
    subparsers.add_parser('status', help='Check database status')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    db = DatabaseManager()
    
    try:
        if args.command == 'init':
            await db.init_database()
        elif args.command == 'migrate':
            await db.run_migrations()
        elif args.command == 'backup':
            await db.backup_database(args.output)
        elif args.command == 'restore':
            await db.restore_database(args.file)
        elif args.command == 'reset':
            await db.reset_database()
        elif args.command == 'status':
            await db.check_status()
            
    except Exception as e:
        print(f"\n✗ Command failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user")
        sys.exit(1)
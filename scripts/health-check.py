#!/usr/bin/env python3
"""
Health Check Script for Chefia POS System
Verifies all services are running and accessible
"""

import os
import sys
import time
import json
import asyncio
import subprocess
from typing import Dict, List, Tuple
from datetime import datetime

try:
    import requests
    import asyncpg
    import redis
    import pika
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install requirements: pip install requests asyncpg redis pika")
    sys.exit(1)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Service configurations
SERVICES = {
    "PostgreSQL": {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "user": os.getenv("DB_USER", "posmodern"),
        "password": os.getenv("DB_PASSWORD"),  # Must be set via environment
        "database": os.getenv("DB_NAME", "posmodern")
    },
    "Redis": {
        "host": os.getenv("REDIS_HOST", "localhost"),
        "port": int(os.getenv("REDIS_PORT", "6379")),
        "password": os.getenv("REDIS_PASSWORD")  # Must be set via environment
    },
    "RabbitMQ": {
        "host": os.getenv("RABBITMQ_HOST", "localhost"),
        "port": int(os.getenv("RABBITMQ_PORT", "5672")),
        "user": os.getenv("RABBITMQ_USER", "posmodern"),
        "password": os.getenv("RABBITMQ_PASSWORD")  # Must be set via environment
    },
    "Backend API": {
        "url": f"http://localhost:{os.getenv('BACKEND_PORT', '8001')}/health"
    },
    "Frontend POS": {
        "url": f"http://localhost:{os.getenv('POS_PORT', '3000')}/"
    }
}

class HealthChecker:
    def __init__(self):
        self.results = {}
        self.start_time = datetime.now()
        
    async def check_postgres(self) -> Tuple[bool, str]:
        """Check PostgreSQL connectivity"""
        config = SERVICES["PostgreSQL"]
        try:
            conn = await asyncpg.connect(
                host=config["host"],
                port=config["port"],
                user=config["user"],
                password=config["password"],
                database=config["database"]
            )
            
            # Test query
            version = await conn.fetchval("SELECT version()")
            await conn.close()
            
            return True, f"Connected - {version[:30]}..."
        except Exception as e:
            return False, f"Connection failed: {str(e)}"
    
    def check_redis(self) -> Tuple[bool, str]:
        """Check Redis connectivity"""
        config = SERVICES["Redis"]
        try:
            r = redis.Redis(
                host=config["host"],
                port=config["port"],
                password=config["password"],
                decode_responses=True,
                socket_connect_timeout=5
            )
            
            # Test ping
            if r.ping():
                info = r.info()
                return True, f"Connected - v{info['redis_version']}, {info['used_memory_human']} used"
            return False, "Ping failed"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"
    
    def check_rabbitmq(self) -> Tuple[bool, str]:
        """Check RabbitMQ connectivity"""
        config = SERVICES["RabbitMQ"]
        try:
            credentials = pika.PlainCredentials(
                config["user"],
                config["password"]
            )
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(
                    host=config["host"],
                    port=config["port"],
                    credentials=credentials,
                    connection_attempts=3,
                    retry_delay=1
                )
            )
            connection.close()
            return True, "Connected successfully"
        except Exception as e:
            # RabbitMQ is optional, so we don't fail hard
            return None, f"Not available (optional): {str(e)}"
    
    def check_http_service(self, name: str, url: str) -> Tuple[bool, str]:
        """Check HTTP service availability"""
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                # Try to parse JSON response
                try:
                    data = response.json()
                    if "status" in data:
                        return True, f"Online - {data.get('status', 'ok')}"
                    return True, "Online"
                except:
                    return True, "Online"
            else:
                return False, f"HTTP {response.status_code}"
        except requests.exceptions.ConnectionError:
            return False, "Connection refused - service may not be running"
        except requests.exceptions.Timeout:
            return False, "Timeout - service not responding"
        except Exception as e:
            return False, f"Error: {str(e)}"
    
    def check_docker_container(self, container_name: str) -> Tuple[bool, str]:
        """Check if Docker container is running"""
        try:
            result = subprocess.run(
                ["docker", "inspect", container_name],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                data = json.loads(result.stdout)
                if data and len(data) > 0:
                    state = data[0]["State"]
                    if state["Running"]:
                        uptime = state.get("Status", "Unknown")
                        return True, f"Running - {uptime}"
                    return False, f"Stopped - {state.get('Status', 'Unknown')}"
            return False, "Container not found"
        except Exception as e:
            return None, f"Docker not available: {str(e)}"
    
    async def run_checks(self):
        """Run all health checks"""
        print("\n" + "="*60)
        print("CHEFIA POS SYSTEM HEALTH CHECK")
        print("="*60)
        print(f"Started at: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("-"*60)
        
        # Check Docker containers first
        print("\n[DOCKER CONTAINERS]")
        containers = [
            "chefia_postgres",
            "chefia_redis", 
            "chefia_backend",
            "chefia_frontend_pos",
            "chefia_rabbitmq"
        ]
        
        docker_available = False
        for container in containers:
            status, message = self.check_docker_container(container)
            if status is not None:
                docker_available = True
                icon = "✓" if status else "✗"
                print(f"  {icon} {container:20} : {message}")
            
        if not docker_available:
            print("  ⚠ Docker not running or not installed")
        
        # Check individual services
        print("\n[SERVICE CONNECTIVITY]")
        
        # PostgreSQL
        status, message = await self.check_postgres()
        self.results["PostgreSQL"] = status
        icon = "✓" if status else "✗"
        print(f"  {icon} PostgreSQL          : {message}")
        
        # Redis
        status, message = self.check_redis()
        self.results["Redis"] = status
        icon = "✓" if status else "✗"
        print(f"  {icon} Redis               : {message}")
        
        # RabbitMQ
        status, message = self.check_rabbitmq()
        if status is not None:
            self.results["RabbitMQ"] = status
            icon = "✓" if status else "⚠"
        else:
            icon = "○"
        print(f"  {icon} RabbitMQ (optional) : {message}")
        
        # Backend API
        status, message = self.check_http_service(
            "Backend API",
            SERVICES["Backend API"]["url"]
        )
        self.results["Backend API"] = status
        icon = "✓" if status else "✗"
        print(f"  {icon} Backend API         : {message}")
        
        # Frontend POS
        status, message = self.check_http_service(
            "Frontend POS",
            SERVICES["Frontend POS"]["url"]
        )
        self.results["Frontend POS"] = status
        icon = "✓" if status else "✗"
        print(f"  {icon} Frontend POS        : {message}")
        
        # Summary
        print("\n" + "-"*60)
        total = len(self.results)
        passed = sum(1 for v in self.results.values() if v)
        failed = total - passed
        
        print(f"SUMMARY: {passed}/{total} services healthy")
        
        if failed > 0:
            print(f"\n⚠ {failed} service(s) need attention:")
            for service, status in self.results.items():
                if not status:
                    print(f"  - {service}")
            
            print("\nTROUBLESHOOTING TIPS:")
            if not self.results.get("PostgreSQL"):
                print("  • PostgreSQL: Check if container is running: docker ps")
                print("    Start with: docker-compose up -d postgres")
            if not self.results.get("Redis"):
                print("  • Redis: Check if container is running: docker ps")
                print("    Start with: docker-compose up -d redis")
            if not self.results.get("Backend API"):
                print("  • Backend: Check logs: docker logs chefia_backend")
                print("    Start with: docker-compose up -d backend")
            if not self.results.get("Frontend POS"):
                print("  • Frontend: Check logs: docker logs chefia_frontend_pos")
                print("    Start with: docker-compose up -d frontend-pos")
        else:
            print("\n✓ All services are healthy!")
            print("\nACCESS POINTS:")
            print(f"  • POS Terminal: http://localhost:{os.getenv('POS_PORT', '3000')}")
            print(f"  • Backend API: http://localhost:{os.getenv('BACKEND_PORT', '8001')}")
            print(f"  • API Docs: http://localhost:{os.getenv('BACKEND_PORT', '8001')}/docs")
            
            if docker_available:
                print("\nUSEFUL COMMANDS:")
                print("  • View logs: docker-compose logs -f [service_name]")
                print("  • Stop all: docker-compose down")
                print("  • Restart: docker-compose restart [service_name]")
        
        print("="*60 + "\n")
        
        # Return exit code
        return 0 if failed == 0 else 1

async def main():
    checker = HealthChecker()
    exit_code = await checker.run_checks()
    sys.exit(exit_code)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nHealth check interrupted by user")
        sys.exit(1)
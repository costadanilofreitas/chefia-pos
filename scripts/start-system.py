#!/usr/bin/env python3
"""
Unified Startup Script for Chefia POS System
Handles service startup with proper dependency management
"""

import os
import sys
import time
import subprocess
import argparse
from pathlib import Path
from typing import List, Dict, Tuple

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_colored(message: str, color: str = Colors.ENDC):
    """Print colored message"""
    print(f"{color}{message}{Colors.ENDC}")

def print_header(title: str):
    """Print formatted header"""
    print_colored("\n" + "="*60, Colors.HEADER)
    print_colored(title.center(60), Colors.HEADER)
    print_colored("="*60, Colors.HEADER)

def run_command(command: List[str], capture_output: bool = False) -> Tuple[int, str]:
    """Run shell command and return status"""
    try:
        if capture_output:
            result = subprocess.run(command, capture_output=True, text=True)
            return result.returncode, result.stdout + result.stderr
        else:
            result = subprocess.run(command)
            return result.returncode, ""
    except FileNotFoundError:
        return 1, f"Command not found: {command[0]}"
    except Exception as e:
        return 1, str(e)

def check_prerequisites():
    """Check if all required tools are installed"""
    print_header("CHECKING PREREQUISITES")
    
    prerequisites = {
        "Docker": ["docker", "--version"],
        "Docker Compose": ["docker-compose", "--version"],
        "Python": ["python", "--version"],
        "Node.js": ["node", "--version"],
        "npm": ["npm", "--version"]
    }
    
    all_ok = True
    for tool, command in prerequisites.items():
        status, output = run_command(command, capture_output=True)
        if status == 0:
            version = output.strip().split('\n')[0]
            print_colored(f"  ✓ {tool:15} : {version}", Colors.GREEN)
        else:
            print_colored(f"  ✗ {tool:15} : Not installed", Colors.RED)
            all_ok = False
    
    if not all_ok:
        print_colored("\n⚠ Some prerequisites are missing!", Colors.YELLOW)
        print("Please install missing tools before continuing.")
        return False
    
    return True

def check_env_file():
    """Check and create .env file if needed"""
    print_header("CHECKING ENVIRONMENT")
    
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists():
        print_colored("  ⚠ .env file not found", Colors.YELLOW)
        
        if env_example.exists():
            print("  Creating .env from .env.example...")
            import shutil
            shutil.copy(env_example, env_file)
            print_colored("  ✓ .env file created", Colors.GREEN)
            print_colored("\n  IMPORTANT: Edit .env file with your configuration!", Colors.YELLOW)
            return False
        else:
            print_colored("  ✗ No .env.example found!", Colors.RED)
            return False
    else:
        print_colored("  ✓ .env file exists", Colors.GREEN)
        
        # Check for critical variables
        with open(env_file, 'r') as f:
            content = f.read()
            
        warnings = []
        if 'JWT_SECRET_KEY=your-super-secret' in content:
            warnings.append("JWT_SECRET_KEY is using default value")
        if 'ASAAS_API_KEY=' in content and 'ASAAS_API_KEY=\n' in content + '\n':
            warnings.append("ASAAS_API_KEY is not configured")
            
        if warnings:
            print_colored("\n  ⚠ Configuration warnings:", Colors.YELLOW)
            for warning in warnings:
                print(f"    - {warning}")
    
    return True

def create_directories():
    """Create required directories"""
    print_header("CREATING DIRECTORIES")
    
    directories = [
        "logs",
        "data",
        "uploads",
        "temp"
    ]
    
    for directory in directories:
        dir_path = Path(directory)
        if not dir_path.exists():
            dir_path.mkdir(parents=True, exist_ok=True)
            print_colored(f"  ✓ Created: {directory}/", Colors.GREEN)
        else:
            print(f"  • Exists: {directory}/")
    
    return True

def start_infrastructure(profile: str = "default"):
    """Start infrastructure services"""
    print_header("STARTING INFRASTRUCTURE")
    
    services_order = [
        ("PostgreSQL", "postgres"),
        ("Redis", "redis")
    ]
    
    if profile == "full":
        services_order.append(("RabbitMQ", "rabbitmq"))
    
    for service_name, container in services_order:
        print(f"\n  Starting {service_name}...")
        
        # Start the service
        if profile == "full" and container == "rabbitmq":
            status, _ = run_command(["docker-compose", "--profile", "full", "up", "-d", container])
        else:
            status, _ = run_command(["docker-compose", "up", "-d", container])
        
        if status != 0:
            print_colored(f"  ✗ Failed to start {service_name}", Colors.RED)
            return False
        
        # Wait for service to be healthy
        print(f"  Waiting for {service_name} to be healthy...")
        max_attempts = 30
        for attempt in range(max_attempts):
            status, output = run_command(
                ["docker-compose", "ps", container],
                capture_output=True
            )
            
            if "healthy" in output.lower() or "(healthy)" in output:
                print_colored(f"  ✓ {service_name} is healthy", Colors.GREEN)
                break
            elif attempt < max_attempts - 1:
                time.sleep(2)
                print(f"    Attempt {attempt + 1}/{max_attempts}...")
            else:
                print_colored(f"  ✗ {service_name} health check timeout", Colors.RED)
                return False
    
    return True

def initialize_database():
    """Initialize database if needed"""
    print_header("INITIALIZING DATABASE")
    
    # Check if database is already initialized
    status, output = run_command([
        "docker-compose", "exec", "-T", "postgres",
        "psql", "-U", "posmodern", "-d", "posmodern",
        "-c", "SELECT 1 FROM information_schema.tables LIMIT 1;"
    ], capture_output=True)
    
    if status == 0:
        print_colored("  ✓ Database already initialized", Colors.GREEN)
    else:
        print("  Initializing database schema...")
        # Run init scripts if they exist
        init_sql = Path("database/init/01-init.sql")
        if init_sql.exists():
            status, _ = run_command([
                "docker-compose", "exec", "-T", "postgres",
                "psql", "-U", "posmodern", "-d", "posmodern",
                "-f", "/docker-entrypoint-initdb.d/01-init.sql"
            ])
            
            if status == 0:
                print_colored("  ✓ Database schema initialized", Colors.GREEN)
            else:
                print_colored("  ⚠ Database initialization had issues", Colors.YELLOW)
    
    return True

def start_backend():
    """Start backend service"""
    print_header("STARTING BACKEND")
    
    print("  Starting Backend API...")
    status, _ = run_command(["docker-compose", "up", "-d", "backend"])
    
    if status != 0:
        print_colored("  ✗ Failed to start Backend", Colors.RED)
        return False
    
    # Wait for backend to be ready
    print("  Waiting for Backend API to be ready...")
    max_attempts = 30
    for attempt in range(max_attempts):
        time.sleep(3)
        status, _ = run_command([
            "curl", "-f", "-s", "http://localhost:8001/health"
        ], capture_output=True)
        
        if status == 0:
            print_colored("  ✓ Backend API is ready", Colors.GREEN)
            break
        elif attempt < max_attempts - 1:
            print(f"    Attempt {attempt + 1}/{max_attempts}...")
        else:
            print_colored("  ✗ Backend API timeout", Colors.RED)
            print("\n  Check logs with: docker-compose logs backend")
            return False
    
    return True

def start_frontend(services: List[str]):
    """Start frontend services"""
    print_header("STARTING FRONTEND")
    
    frontend_map = {
        "pos": ("POS Terminal", "frontend-pos", 3000),
        "kds": ("Kitchen Display", "frontend-kds", 3001),
        "kiosk": ("Self-service Kiosk", "frontend-kiosk", 3002),
        "waiter": ("Waiter Terminal", "frontend-waiter", 3003)
    }
    
    for service in services:
        if service in frontend_map:
            name, container, port = frontend_map[service]
            print(f"\n  Starting {name}...")
            
            if service != "pos":
                status, _ = run_command(["docker-compose", "--profile", "full", "up", "-d", container])
            else:
                status, _ = run_command(["docker-compose", "up", "-d", container])
            
            if status == 0:
                print_colored(f"  ✓ {name} started on port {port}", Colors.GREEN)
            else:
                print_colored(f"  ✗ Failed to start {name}", Colors.RED)
                return False
    
    return True

def show_summary():
    """Show system summary and access points"""
    print_header("SYSTEM READY")
    
    print_colored("\nACCESS POINTS:", Colors.BOLD)
    print(f"  • POS Terminal:     http://localhost:3000")
    print(f"  • Backend API:      http://localhost:8001")
    print(f"  • API Documentation: http://localhost:8001/docs")
    print(f"  • RabbitMQ Admin:   http://localhost:15672 (if enabled)")
    
    print_colored("\nUSEFUL COMMANDS:", Colors.BOLD)
    print("  • View logs:        docker-compose logs -f [service]")
    print("  • Stop all:         docker-compose down")
    print("  • Health check:     python scripts/health-check.py")
    print("  • Restart service:  docker-compose restart [service]")
    
    print_colored("\nDEFAULT CREDENTIALS:", Colors.BOLD)
    print("  • Database: posmodern / posmodern123")
    print("  • RabbitMQ: posmodern / posmodern123")
    print("  • Redis:    Password: posmodern123")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Start Chefia POS System")
    parser.add_argument(
        "--profile",
        choices=["minimal", "default", "full"],
        default="default",
        help="Startup profile (minimal=core only, default=pos+backend, full=all services)"
    )
    parser.add_argument(
        "--services",
        nargs="+",
        choices=["pos", "kds", "kiosk", "waiter"],
        default=["pos"],
        help="Frontend services to start"
    )
    parser.add_argument(
        "--skip-checks",
        action="store_true",
        help="Skip prerequisite checks"
    )
    parser.add_argument(
        "--skip-init",
        action="store_true",
        help="Skip database initialization"
    )
    
    args = parser.parse_args()
    
    print_colored("""
    ╔═══════════════════════════════════════╗
    ║     CHEFIA POS SYSTEM STARTUP         ║
    ╚═══════════════════════════════════════╝
    """, Colors.BLUE)
    
    # Step 1: Check prerequisites
    if not args.skip_checks:
        if not check_prerequisites():
            return 1
    
    # Step 2: Check environment
    env_ready = check_env_file()
    if not env_ready:
        print_colored("\n⚠ Please configure your .env file and run again.", Colors.YELLOW)
        return 1
    
    # Step 3: Create directories
    create_directories()
    
    # Step 4: Start infrastructure
    if not start_infrastructure(args.profile):
        print_colored("\n✗ Infrastructure startup failed!", Colors.RED)
        return 1
    
    # Step 5: Initialize database
    if not args.skip_init:
        if not initialize_database():
            print_colored("\n✗ Database initialization failed!", Colors.RED)
            return 1
    
    # Step 6: Start backend
    if args.profile != "minimal":
        if not start_backend():
            print_colored("\n✗ Backend startup failed!", Colors.RED)
            return 1
    
    # Step 7: Start frontend
    if args.profile != "minimal":
        if not start_frontend(args.services):
            print_colored("\n✗ Frontend startup failed!", Colors.RED)
            return 1
    
    # Step 8: Show summary
    show_summary()
    
    print_colored("\n✓ System startup complete!", Colors.GREEN)
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print_colored("\n\nStartup interrupted by user", Colors.YELLOW)
        print("Run 'docker-compose down' to stop services")
        sys.exit(1)
    except Exception as e:
        print_colored(f"\n✗ Unexpected error: {e}", Colors.RED)
        sys.exit(1)
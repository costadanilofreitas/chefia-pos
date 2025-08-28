# Chefia POS - Development Environment Setup

Complete guide for setting up and managing the Chefia POS local development environment.

## Prerequisites

### Required Software
- **Docker Desktop** (latest version)
- **Docker Compose** (included with Docker Desktop)
- **Python 3.11+** (for running management scripts)
- **Node.js 18+** and **npm 9+** (for frontend development)
- **Git** (for version control)

### Recommended Tools
- **VS Code** with extensions:
  - Python
  - Docker
  - ESLint
  - Prettier
  - Thunder Client (API testing)
- **PostgreSQL client** (pgAdmin, DBeaver, or TablePlus)
- **Redis client** (RedisInsight or Redis Commander)

## Quick Start

### 1. Clone and Setup
```bash
# Clone repository
git clone <repository-url>
cd chefia-pos

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
# IMPORTANT: Change JWT_SECRET_KEY and other sensitive values!
```

### 2. Start the System

#### Option A: Using Python Script (Recommended)
```bash
# Install Python dependencies for scripts
pip install python-dotenv requests asyncpg redis pika

# Start with default profile (core services + POS)
python scripts/start-system.py

# Start with all services
python scripts/start-system.py --profile full --services pos kds kiosk waiter

# Start minimal (infrastructure only)
python scripts/start-system.py --profile minimal
```

#### Option B: Using Docker Compose Directly
```bash
# Start core services
docker-compose up -d

# Start all services (including optional ones)
docker-compose --profile full up -d

# View logs
docker-compose logs -f [service_name]
```

### 3. Verify Installation
```bash
# Run health check
python scripts/health-check.py

# Check running containers
docker-compose ps
```

## Service URLs

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| POS Terminal | http://localhost:3000 | - |
| KDS (Kitchen) | http://localhost:3001 | - |
| Kiosk | http://localhost:3002 | - |
| Waiter | http://localhost:3003 | - |
| Backend API | http://localhost:8001 | - |
| API Docs | http://localhost:8001/docs | - |
| PostgreSQL | localhost:5432 | posmodern / posmodern123 |
| Redis | localhost:6379 | Password: posmodern123 |
| RabbitMQ Admin | http://localhost:15672 | posmodern / posmodern123 |
| Adminer (DB UI) | http://localhost:8080 | - |
| Redis Commander | http://localhost:8081 | - |

## Database Management

### Initialize Database
```bash
# Initialize schema and tables
python scripts/manage-db.py init

# Run pending migrations
python scripts/manage-db.py migrate

# Check database status
python scripts/manage-db.py status
```

### Backup and Restore
```bash
# Create backup
python scripts/manage-db.py backup

# Restore from backup
python scripts/manage-db.py restore backups/chefia_pos_backup_20240101_120000.sql

# Reset database (CAUTION: Deletes all data!)
python scripts/manage-db.py reset
```

## Development Workflow

### Backend Development

#### Running Locally (without Docker)
```bash
cd src/

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DB_HOST=localhost
export REDIS_HOST=localhost
# ... other variables from .env

# Run development server
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

#### Testing
```bash
# Run all tests
cd src/
pytest

# Run specific module tests
pytest order/ -v

# Run with coverage
pytest --cov=. --cov-report=html

# Run integration tests
pytest tests/test_integration.py
```

#### Code Quality
```bash
# Format code
black src/

# Lint code
ruff check src/ --fix

# Type checking
mypy src/

# All checks at once
black src/ && ruff check src/ --fix && mypy src/ && pytest
```

### Frontend Development

#### Working with the Monorepo
```bash
cd frontend/

# Install all dependencies
npm install

# Run POS app (recommended for development)
npm run dev

# Run specific app
npm run dev:kds
npm run dev:kiosk
npm run dev:waiter

# Build all apps
npm run build

# Run tests
npm run test

# Lint all workspaces
npm run lint
```

#### E2E Testing
```bash
cd frontend/apps/pos/

# Run Playwright tests
npm run test:e2e

# Interactive mode
npm run test:e2e:ui

# View test report
npm run test:e2e:report
```

## Environment Variables

### Critical Variables to Configure

```env
# Security (MUST CHANGE!)
JWT_SECRET_KEY=<generate-strong-key>
SECRET_KEY=<generate-strong-key>
ENCRYPTION_KEY=<generate-strong-key>

# Database
DB_HOST=localhost  # Use 'postgres' in Docker
REDIS_HOST=localhost  # Use 'redis' in Docker

# Payment Gateway (Required for payments)
ASAAS_API_KEY=<your-api-key>
ASAAS_ENV=sandbox  # or 'production'

# Optional Integrations
GOOGLE_MAPS_API_KEY=<your-key>
TWILIO_ACCOUNT_SID=<your-sid>
IFOOD_CLIENT_ID=<your-client-id>
```

### Generating Secret Keys
```bash
# Python method
python -c "import secrets; print(secrets.token_hex(32))"

# OpenSSL method
openssl rand -hex 32
```

## Docker Commands

### Container Management
```bash
# Start services
docker-compose up -d [service_name]

# Stop services
docker-compose stop [service_name]

# Restart service
docker-compose restart [service_name]

# Stop and remove all
docker-compose down

# Remove all data (CAUTION!)
docker-compose down -v
```

### Debugging
```bash
# View logs
docker-compose logs -f [service_name]

# Execute command in container
docker-compose exec backend bash
docker-compose exec postgres psql -U posmodern -d posmodern

# Check container health
docker inspect chefia_backend --format='{{.State.Health.Status}}'

# Resource usage
docker stats
```

### Development Tools
```bash
# Start with development tools (Adminer, Redis Commander)
docker-compose --profile dev-tools up -d

# Access database with Adminer
# URL: http://localhost:8080
# System: PostgreSQL
# Server: postgres
# Username: posmodern
# Password: posmodern123
# Database: posmodern
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
netstat -ano | findstr :8001  # Windows
lsof -i :8001  # Mac/Linux

# Change port in .env
BACKEND_PORT=8002
```

#### 2. Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

#### 3. Frontend Not Loading
```bash
# Check backend is accessible
curl http://localhost:8001/health

# Check CORS settings in .env
CORS_ORIGINS=http://localhost:3000,...

# Rebuild frontend
docker-compose build frontend-pos
```

#### 4. Docker Issues
```bash
# Clean Docker system
docker system prune -a

# Reset Docker Desktop (Windows/Mac)
# Settings -> Troubleshoot -> Reset to factory defaults
```

### Health Check Failed

If health check shows failures:

1. **Check individual service logs:**
   ```bash
   docker-compose logs [service_name]
   ```

2. **Verify environment variables:**
   ```bash
   # Check if .env is loaded
   docker-compose config
   ```

3. **Test connectivity:**
   ```bash
   # Test PostgreSQL
   docker-compose exec postgres pg_isready

   # Test Redis
   docker-compose exec redis redis-cli ping

   # Test Backend
   curl http://localhost:8001/health
   ```

## Performance Tips

### Development Optimization

1. **Use Docker volumes wisely:**
   - Mount only necessary directories
   - Exclude node_modules and __pycache__

2. **Resource allocation:**
   - Docker Desktop: Increase CPU/Memory limits
   - WSL2 (Windows): Configure .wslconfig

3. **Database performance:**
   ```sql
   -- Check slow queries
   SELECT * FROM pg_stat_statements 
   ORDER BY total_time DESC LIMIT 10;
   ```

4. **Redis optimization:**
   ```bash
   # Monitor Redis performance
   docker-compose exec redis redis-cli --stat
   ```

## Profiles and Configurations

### Startup Profiles

- **minimal**: PostgreSQL + Redis only
- **default**: Core services + Backend + POS
- **full**: All services including optional ones

### Feature Flags

Control features via .env:
```env
ENABLE_WEBSOCKET_SYNC=true
ENABLE_OFFLINE_MODE=true
ENABLE_AI_FEATURES=false
```

## Next Steps

1. **Configure integrations** in .env file
2. **Run health check** to verify setup
3. **Initialize database** with sample data
4. **Access POS** at http://localhost:3000
5. **Check API docs** at http://localhost:8001/docs

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Run health check: `python scripts/health-check.py`
3. Review this documentation
4. Check `/docs/ai/` folder for detailed technical docs

---

**Remember**: This is a local development setup. For production deployment, see `/docs/ai/DEPLOYMENT_PROCEDURES.md`
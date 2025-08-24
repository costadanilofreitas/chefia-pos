# 🚀 Deployment Procedures - Chefia POS

## Metadata
- **Version**: 1.0.0
- **Last Updated**: January 2025
- **Environment**: On-Premise + Cloud Hybrid
- **Orchestration**: Docker Compose + Kubernetes

---

## 1. DEPLOYMENT ARCHITECTURE

### Environment Overview
```yaml
environments:
  development:
    location: Local Docker
    database: PostgreSQL (Docker)
    services: All modules
    
  staging:
    location: AWS EC2
    database: PostgreSQL (RDS)
    services: All modules
    
  production:
    on_premise:
      - POS Terminal
      - KDS
      - Local PostgreSQL
      - Redis Cache
    cloud:
      - Analytics Dashboard
      - Backoffice
      - WhatsApp Bot
      - iFood Integration
```

---

## 2. PRE-DEPLOYMENT CHECKLIST

### Code Readiness
```yaml
code_checklist:
  - [ ] All tests passing (>60% coverage)
  - [ ] No critical security vulnerabilities
  - [ ] Bundle size < 300KB
  - [ ] Response time < 150ms in tests
  - [ ] Database migrations reviewed
  - [ ] Environment variables documented
  - [ ] Docker images built successfully
  - [ ] Version tags applied
```

### Infrastructure Requirements
```yaml
hardware_requirements:
  minimum:
    cpu: 4 cores
    ram: 8 GB
    storage: 50 GB SSD
    network: 10 Mbps
    
  recommended:
    cpu: 8 cores
    ram: 16 GB
    storage: 100 GB SSD
    network: 100 Mbps
    
software_requirements:
  os: Ubuntu 20.04 LTS / Windows Server 2019
  docker: 20.10+
  docker_compose: 2.0+
  postgresql: 15+
  redis: 7+
  nginx: 1.20+
```

---

## 3. DOCKER DEPLOYMENT

### 3.1 Docker Compose Configuration
```yaml
# docker-compose.production.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: chefia_postgres
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backup:/backup
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: chefia_redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./src
      dockerfile: Dockerfile.production
    container_name: chefia_backend
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      SECRET_KEY: ${SECRET_KEY}
      ENVIRONMENT: production
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    ports:
      - "8001:8001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # POS Frontend
  pos:
    build:
      context: ./frontend/apps/pos
      dockerfile: Dockerfile.production
    container_name: chefia_pos
    environment:
      VITE_API_URL: http://backend:8001
      VITE_WS_URL: ws://backend:8001
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped

  # KDS Frontend
  kds:
    build:
      context: ./frontend/apps/kds
      dockerfile: Dockerfile.production
    container_name: chefia_kds
    environment:
      VITE_API_URL: http://backend:8001
      VITE_WS_URL: ws://backend:8001
    ports:
      - "3001:80"
    depends_on:
      - backend
    restart: unless-stopped

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: chefia_nginx
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/sites:/etc/nginx/sites-enabled
      - ./ssl:/etc/ssl/certs
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - pos
      - kds
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: chefia_network
```

### 3.2 Dockerfile for Backend
```dockerfile
# src/Dockerfile.production
FROM python:3.11-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 chefia

# Set working directory
WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=chefia:chefia . .

# Switch to non-root user
USER chefia

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

# Start application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4"]
```

### 3.3 Dockerfile for Frontend
```dockerfile
# frontend/apps/pos/Dockerfile.production
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../../package*.json ../../

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

---

## 4. DEPLOYMENT SCRIPTS

### 4.1 Deployment Script
```bash
#!/bin/bash
# deploy.sh - Main deployment script

set -e

# Configuration
ENVIRONMENT=${1:-production}
VERSION=${2:-latest}

echo "🚀 Starting deployment for $ENVIRONMENT environment (version: $VERSION)"

# Load environment variables
source .env.$ENVIRONMENT

# Pre-deployment checks
echo "📋 Running pre-deployment checks..."
./scripts/pre_deploy_check.sh

# Backup current deployment
echo "💾 Backing up current deployment..."
./scripts/backup.sh

# Pull latest code
echo "📦 Pulling latest code..."
git fetch --all
git checkout $VERSION

# Build Docker images
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.$ENVIRONMENT.yml build

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.$ENVIRONMENT.yml run --rm backend alembic upgrade head

# Stop current services
echo "🛑 Stopping current services..."
docker-compose -f docker-compose.$ENVIRONMENT.yml down

# Start new services
echo "▶️ Starting new services..."
docker-compose -f docker-compose.$ENVIRONMENT.yml up -d

# Health check
echo "🏥 Running health checks..."
./scripts/health_check.sh

# Post-deployment tasks
echo "🔧 Running post-deployment tasks..."
./scripts/post_deploy.sh

echo "✅ Deployment completed successfully!"
```

### 4.2 Rollback Script
```bash
#!/bin/bash
# rollback.sh - Rollback to previous version

set -e

BACKUP_VERSION=${1:-latest}

echo "⏪ Starting rollback to version: $BACKUP_VERSION"

# Stop current services
docker-compose down

# Restore database backup
echo "💾 Restoring database backup..."
./scripts/restore_db.sh $BACKUP_VERSION

# Restore application backup
echo "📦 Restoring application backup..."
./scripts/restore_app.sh $BACKUP_VERSION

# Start services with previous version
docker-compose up -d

# Health check
./scripts/health_check.sh

echo "✅ Rollback completed successfully!"
```

### 4.3 Health Check Script
```bash
#!/bin/bash
# health_check.sh - Verify deployment health

set -e

echo "🏥 Starting health checks..."

# Check backend API
echo -n "Checking backend API... "
if curl -f http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
    exit 1
fi

# Check database connection
echo -n "Checking database... "
if docker exec chefia_postgres pg_isready > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
    exit 1
fi

# Check Redis
echo -n "Checking Redis... "
if docker exec chefia_redis redis-cli ping > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
    exit 1
fi

# Check frontend apps
for app in pos kds; do
    echo -n "Checking $app frontend... "
    if curl -f http://localhost:300${app: -1} > /dev/null 2>&1; then
        echo "✅"
    else
        echo "❌"
        exit 1
    fi
done

echo "✅ All health checks passed!"
```

---

## 5. DATABASE MIGRATION

### 5.1 Alembic Configuration
```python
# alembic.ini
[alembic]
script_location = migrations
prepend_sys_path = .
version_path_separator = os
sqlalchemy.url = postgresql://%(DB_USER)s:%(DB_PASSWORD)s@%(DB_HOST)s/%(DB_NAME)s

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic
```

### 5.2 Migration Script
```python
# migrations/env.py
from alembic import context
from sqlalchemy import engine_from_config, pool
from logging.config import fileConfig
import os
import sys

# Add src to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))

from src.core.database import Base

config = context.config

# Set database URL from environment
config.set_main_option(
    "sqlalchemy.url",
    os.environ.get("DATABASE_URL", "postgresql://localhost/chefia_pos")
)

target_metadata = Base.metadata

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### 5.3 Migration Commands
```bash
# Create new migration
alembic revision --autogenerate -m "Add new feature"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history

# Check current version
alembic current
```

---

## 6. MONITORING & LOGGING

### 6.1 Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'chefia-backend'
    static_configs:
      - targets: ['backend:8001']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres_exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis_exporter:9121']

  - job_name: 'node'
    static_configs:
      - targets: ['node_exporter:9100']
```

### 6.2 Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Chefia POS Monitoring",
    "panels": [
      {
        "title": "API Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "postgresql_connections_active"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "container_memory_usage_bytes"
          }
        ]
      }
    ]
  }
}
```

### 6.3 Log Aggregation
```yaml
# filebeat.yml
filebeat.inputs:
  - type: container
    paths:
      - '/var/lib/docker/containers/*/*.log'
    processors:
      - add_docker_metadata:
          host: "unix:///var/run/docker.sock"

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "chefia-pos-%{+yyyy.MM.dd}"

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644
```

---

## 7. BACKUP & RESTORE

### 7.1 Backup Strategy
```bash
#!/bin/bash
# backup.sh - Automated backup script

# Configuration
BACKUP_DIR="/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Database backup
echo "Backing up database..."
docker exec chefia_postgres pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Application data backup
echo "Backing up application data..."
tar -czf $BACKUP_DIR/app_data_$TIMESTAMP.tar.gz /app/uploads /app/logs

# Configuration backup
echo "Backing up configuration..."
tar -czf $BACKUP_DIR/config_$TIMESTAMP.tar.gz .env* docker-compose*.yml nginx/

# Clean old backups
echo "Cleaning old backups..."
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete

# Upload to S3 (optional)
if [ "$ENABLE_S3_BACKUP" = "true" ]; then
    aws s3 sync $BACKUP_DIR s3://$S3_BUCKET/backups/
fi

echo "Backup completed: $TIMESTAMP"
```

### 7.2 Restore Procedure
```bash
#!/bin/bash
# restore.sh - Restore from backup

BACKUP_TIMESTAMP=$1

if [ -z "$BACKUP_TIMESTAMP" ]; then
    echo "Usage: ./restore.sh TIMESTAMP"
    exit 1
fi

# Stop services
docker-compose down

# Restore database
echo "Restoring database..."
gunzip < /backup/db_$BACKUP_TIMESTAMP.sql.gz | docker exec -i chefia_postgres psql -U $DB_USER $DB_NAME

# Restore application data
echo "Restoring application data..."
tar -xzf /backup/app_data_$BACKUP_TIMESTAMP.tar.gz -C /

# Restore configuration
echo "Restoring configuration..."
tar -xzf /backup/config_$BACKUP_TIMESTAMP.tar.gz -C /

# Start services
docker-compose up -d

echo "Restore completed from: $BACKUP_TIMESTAMP"
```

---

## 8. CI/CD PIPELINE

### 8.1 GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        run: pytest --cov=src --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: chefia/pos:${{ github.ref_name }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/chefia-pos
            ./deploy.sh production ${{ github.ref_name }}
```

---

## 9. TROUBLESHOOTING

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Container fails to start | Port already in use | `sudo lsof -i :PORT` and kill process |
| Database connection error | Wrong credentials | Check .env file and DATABASE_URL |
| Out of memory | Insufficient resources | Increase Docker memory limit |
| Slow performance | No indexes | Run `ANALYZE` and create indexes |
| SSL certificate error | Expired certificate | Renew with `certbot renew` |
| Migration failure | Schema conflict | Review and fix migration files |
| Redis connection refused | Password not set | Set REDIS_PASSWORD in .env |
| Nginx 502 Bad Gateway | Backend not running | Check backend container logs |

### Debug Commands
```bash
# View container logs
docker logs -f chefia_backend

# Enter container shell
docker exec -it chefia_backend /bin/bash

# Check container resources
docker stats

# View PostgreSQL queries
docker exec chefia_postgres psql -U $DB_USER -c "SELECT * FROM pg_stat_activity;"

# Test API endpoint
curl -X GET http://localhost:8001/health

# Check disk usage
df -h

# Monitor network
netstat -tuln

# View systemd logs
journalctl -u docker -f
```

---

## 10. PRODUCTION CHECKLIST

### Pre-Production
```yaml
security:
  - [ ] Change all default passwords
  - [ ] Enable firewall rules
  - [ ] Configure SSL certificates
  - [ ] Set up intrusion detection
  - [ ] Enable audit logging

performance:
  - [ ] Configure connection pooling
  - [ ] Set up CDN for static assets
  - [ ] Enable response caching
  - [ ] Optimize database indexes

monitoring:
  - [ ] Configure alerts
  - [ ] Set up dashboards
  - [ ] Enable log aggregation
  - [ ] Configure uptime monitoring

backup:
  - [ ] Automated backup scheduled
  - [ ] Backup verification tested
  - [ ] Restore procedure documented
  - [ ] Off-site backup configured
```

### Post-Production
```yaml
validation:
  - [ ] All services running
  - [ ] Health checks passing
  - [ ] SSL certificate valid
  - [ ] Monitoring active
  - [ ] Backup successful

documentation:
  - [ ] Deployment documented
  - [ ] Runbook updated
  - [ ] Team notified
  - [ ] Customer communication sent
```

---

*Document Version: 1.0.0*
*Last Updated: January 2025*
*Next Review: After each deployment*
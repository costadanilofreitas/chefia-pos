# Deployment - Infraestrutura para Recursos Real-time

## Visão Geral

Este documento detalha os requisitos e procedimentos de deployment para a infraestrutura que suporta os recursos de sincronização em tempo real do Chefia POS, incluindo:

- **WebSocket Server**: Gerenciamento de conexões em tempo real
- **RequestCache Service**: Sistema de cache inteligente
- **Backup/Restore System**: Sistema de backup offline
- **Terminal Monitor**: Dashboard de monitoramento
- **Conflict Resolution**: Sistema de resolução de conflitos

## Requisitos de Infraestrutura

### Hardware Mínimo

#### Para Ambiente de Produção (por instância)

```yaml
server_specs:
  cpu:
    cores: 4
    min_frequency: 2.4GHz
    recommended: Intel Xeon ou AMD EPYC
  
  memory:
    min: 8GB RAM
    recommended: 16GB RAM
    swap: 4GB
  
  storage:
    min: 100GB SSD
    recommended: 250GB NVMe SSD
    iops: min 1000 IOPS
  
  network:
    bandwidth: min 100Mbps
    latency: <10ms local network
    concurrent_connections: 1000+
```

#### Para Ambiente de Desenvolvimento

```yaml
dev_specs:
  cpu: 2 cores, 2.0GHz
  memory: 4GB RAM
  storage: 50GB SSD
  network: 10Mbps
```

### Software Requirements

```yaml
dependencies:
  os:
    - Ubuntu 20.04+ (recommended)
    - CentOS 8+
    - Windows Server 2019+
  
  runtime:
    - Python 3.11+
    - Node.js 20+
    - Docker 24.0+
    - Docker Compose 2.21+
  
  database:
    - PostgreSQL 14+
    - Redis 6.0+
  
  web_server:
    - Nginx 1.20+ (for reverse proxy)
    - SSL/TLS certificates
```

## Configuração do WebSocket Server

### 1. Configuração do Backend

```python
# src/core/config.py - Configurações WebSocket
import os
from typing import List

class WebSocketConfig:
    # Conexão
    WS_HOST: str = os.getenv("WS_HOST", "0.0.0.0")
    WS_PORT: int = int(os.getenv("WS_PORT", "8001"))
    WS_PATH: str = os.getenv("WS_PATH", "/ws")
    
    # Limits
    MAX_CONNECTIONS: int = int(os.getenv("MAX_WS_CONNECTIONS", "1000"))
    MAX_MESSAGE_SIZE: int = int(os.getenv("MAX_WS_MESSAGE_SIZE", "1048576"))  # 1MB
    CONNECTION_TIMEOUT: int = int(os.getenv("WS_CONNECTION_TIMEOUT", "300"))  # 5 min
    
    # Performance
    HEARTBEAT_INTERVAL: int = int(os.getenv("WS_HEARTBEAT_INTERVAL", "30"))  # 30s
    MESSAGE_QUEUE_SIZE: int = int(os.getenv("WS_MESSAGE_QUEUE_SIZE", "1000"))
    WORKER_THREADS: int = int(os.getenv("WS_WORKER_THREADS", "4"))
    
    # Security
    ALLOWED_ORIGINS: List[str] = os.getenv("WS_ALLOWED_ORIGINS", "*").split(",")
    ENABLE_COMPRESSION: bool = os.getenv("WS_ENABLE_COMPRESSION", "true").lower() == "true"
    
    # Monitoring
    ENABLE_METRICS: bool = os.getenv("WS_ENABLE_METRICS", "true").lower() == "true"
    METRICS_INTERVAL: int = int(os.getenv("WS_METRICS_INTERVAL", "60"))  # 60s
    
    # Logging
    LOG_LEVEL: str = os.getenv("WS_LOG_LEVEL", "INFO")
    LOG_WEBSOCKET_MESSAGES: bool = os.getenv("WS_LOG_MESSAGES", "false").lower() == "true"

# src/main.py - Integração WebSocket com FastAPI
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Chefia POS API", version="2.0.0")

# CORS para WebSocket
app.add_middleware(
    CORSMiddleware,
    allow_origins=WebSocketConfig.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Manager Instance
websocket_manager = WebSocketManager()

@app.websocket("/ws/{terminal_id}")
async def websocket_endpoint(websocket: WebSocket, terminal_id: str, terminal_type: str = "pos"):
    await websocket_manager.connect(websocket, terminal_id, terminal_type)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=WebSocketConfig.WS_HOST,
        port=WebSocketConfig.WS_PORT,
        ws_ping_interval=WebSocketConfig.HEARTBEAT_INTERVAL,
        ws_ping_timeout=WebSocketConfig.CONNECTION_TIMEOUT,
        workers=WebSocketConfig.WORKER_THREADS,
        access_log=WebSocketConfig.LOG_WEBSOCKET_MESSAGES
    )
```

### 2. Configuração do Nginx

```nginx
# /etc/nginx/sites-available/chefia-pos
server {
    listen 80;
    listen 443 ssl http2;
    server_name pos.local;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/pos.local.crt;
    ssl_certificate_key /etc/ssl/private/pos.local.key;
    
    # WebSocket Configuration
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        
        # Rate limiting para WebSocket
        limit_req zone=ws_limit burst=10 nodelay;
    }
    
    # API REST
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting para API
        limit_req zone=api_limit burst=20 nodelay;
    }
    
    # Static files (Frontend)
    location / {
        root /var/www/chefia-pos/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache for static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}

# Rate limiting zones
http {
    limit_req_zone $binary_remote_addr zone=ws_limit:10m rate=5r/s;
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    
    upstream backend {
        server 127.0.0.1:8001;
        keepalive 32;
    }
}
```

### 3. Docker Configuration

```dockerfile
# Dockerfile.backend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    redis-tools \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

EXPOSE 8001

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

```yaml
# docker-compose.realtime.yml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: chefia_pos
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    command: >
      postgres
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    command: >
      redis-server
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
      --appendfsync everysec
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build: 
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/chefia_pos
      - REDIS_URL=redis://redis:6379/0
      - WS_MAX_CONNECTIONS=1000
      - WS_HEARTBEAT_INTERVAL=30
      - WS_ENABLE_COMPRESSION=true
      - WS_ENABLE_METRICS=true
      - LOG_LEVEL=INFO
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

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/sites:/etc/nginx/sites-available:ro
      - ./ssl:/etc/ssl:ro
      - ./frontend/dist:/var/www/chefia-pos/frontend/dist:ro
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  default:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## Configuração de Monitoramento

### 1. Prometheus Configuration

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'chefia-pos-backend'
    static_configs:
      - targets: ['backend:8001']
    metrics_path: '/metrics'
    scrape_interval: 30s
    
  - job_name: 'chefia-pos-websocket'
    static_configs:
      - targets: ['backend:8001']
    metrics_path: '/ws/metrics'
    scrape_interval: 15s
    
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:9113']
    scrape_interval: 30s
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    scrape_interval: 30s
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### 2. Grafana Dashboards

```json
{
  "dashboard": {
    "id": null,
    "title": "Chefia POS - Real-time Monitoring",
    "tags": ["chefia-pos", "realtime", "websocket"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "WebSocket Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "websocket_active_connections",
            "legendFormat": "Active Connections"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 800},
                {"color": "red", "value": 950}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "WebSocket Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(websocket_message_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(websocket_message_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "id": 3,
        "title": "Sync Operations Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(sync_operations_total[5m])",
            "legendFormat": "Operations per second"
          }
        ]
      },
      {
        "id": 4,
        "title": "Conflict Resolution Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(sync_conflicts_total[5m])",
            "legendFormat": "Conflicts per second"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
```

### 3. Alert Rules

```yaml
# prometheus/rules/chefia-pos.yml
groups:
  - name: chefia-pos-realtime
    rules:
      - alert: WebSocketHighLatency
        expr: histogram_quantile(0.95, rate(websocket_message_duration_seconds_bucket[5m])) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "WebSocket latency is high"
          description: "95th percentile latency is {{ $value }}s"
      
      - alert: WebSocketConnectionsHigh
        expr: websocket_active_connections > 900
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High number of WebSocket connections"
          description: "Currently {{ $value }} active connections"
      
      - alert: SyncConflictRateHigh
        expr: rate(sync_conflicts_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High sync conflict rate"
          description: "Conflict rate is {{ $value }} conflicts/second"
      
      - alert: TerminalOffline
        expr: terminal_status == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Terminal is offline"
          description: "Terminal {{ $labels.terminal_id }} has been offline for more than 1 minute"
```

## Deployment Scripts

### 1. Production Deployment Script

```bash
#!/bin/bash
# deploy-realtime.sh

set -e

# Configuration
PROJECT_NAME="chefia-pos"
DEPLOY_ENV="${1:-production}"
BACKUP_RETENTION_DAYS=7

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check disk space (minimum 10GB)
    available_space=$(df / | awk 'NR==2 {print $4}')
    if [ $available_space -lt 10485760 ]; then
        log_error "Insufficient disk space. At least 10GB required"
        exit 1
    fi
    
    # Check memory (minimum 4GB)
    available_memory=$(free -m | awk 'NR==2{print $7}')
    if [ $available_memory -lt 4096 ]; then
        log_warn "Low available memory. At least 4GB recommended"
    fi
    
    log_info "Prerequisites check passed"
}

# Backup current deployment
backup_current() {
    log_info "Creating backup of current deployment..."
    
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_dir="/opt/backups/${PROJECT_NAME}/${timestamp}"
    
    mkdir -p "$backup_dir"
    
    # Backup database
    if docker-compose ps postgres | grep -q "Up"; then
        docker-compose exec -T postgres pg_dump -U postgres chefia_pos > "$backup_dir/database.sql"
        log_info "Database backed up to $backup_dir/database.sql"
    fi
    
    # Backup Redis data
    if docker-compose ps redis | grep -q "Up"; then
        docker-compose exec -T redis redis-cli SAVE
        docker cp $(docker-compose ps -q redis):/data/dump.rdb "$backup_dir/redis.rdb"
        log_info "Redis data backed up to $backup_dir/redis.rdb"
    fi
    
    # Backup configuration files
    cp -r ./nginx "$backup_dir/"
    cp -r ./ssl "$backup_dir/"
    cp docker-compose*.yml "$backup_dir/"
    cp .env "$backup_dir/"
    
    log_info "Configuration backed up to $backup_dir"
    
    # Cleanup old backups
    find /opt/backups/${PROJECT_NAME} -type d -mtime +$BACKUP_RETENTION_DAYS -exec rm -rf {} +
    
    echo "$backup_dir" > .last_backup_path
}

# Deploy new version
deploy() {
    log_info "Starting deployment for environment: $DEPLOY_ENV"
    
    # Pull latest images
    log_info "Pulling latest Docker images..."
    docker-compose -f docker-compose.realtime.yml pull
    
    # Stop services gracefully
    log_info "Stopping services..."
    docker-compose -f docker-compose.realtime.yml down --timeout 30
    
    # Start services
    log_info "Starting services..."
    docker-compose -f docker-compose.realtime.yml up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Health checks
    max_retries=12
    retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -f http://localhost:8001/health > /dev/null 2>&1; then
            log_info "Backend is healthy"
            break
        fi
        
        retry_count=$((retry_count + 1))
        log_warn "Backend not ready, retry $retry_count/$max_retries"
        sleep 10
    done
    
    if [ $retry_count -eq $max_retries ]; then
        log_error "Backend failed to start properly"
        rollback
        exit 1
    fi
    
    # Test WebSocket connectivity
    if ! timeout 10 bash -c "</dev/tcp/localhost/8001"; then
        log_error "WebSocket port not accessible"
        rollback
        exit 1
    fi
    
    log_info "Deployment completed successfully"
}

# Rollback to previous version
rollback() {
    log_warn "Rolling back to previous version..."
    
    if [ ! -f .last_backup_path ]; then
        log_error "No backup path found for rollback"
        exit 1
    fi
    
    backup_path=$(cat .last_backup_path)
    
    if [ ! -d "$backup_path" ]; then
        log_error "Backup directory not found: $backup_path"
        exit 1
    fi
    
    # Stop current services
    docker-compose -f docker-compose.realtime.yml down
    
    # Restore configuration
    cp -r "$backup_path/nginx" ./
    cp -r "$backup_path/ssl" ./
    cp "$backup_path/docker-compose"*.yml ./
    cp "$backup_path/.env" ./
    
    # Start services
    docker-compose -f docker-compose.realtime.yml up -d
    
    # Restore database if needed
    if [ -f "$backup_path/database.sql" ]; then
        log_info "Restoring database..."
        docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS chefia_pos;"
        docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE chefia_pos;"
        cat "$backup_path/database.sql" | docker-compose exec -T postgres psql -U postgres chefia_pos
    fi
    
    # Restore Redis data if needed
    if [ -f "$backup_path/redis.rdb" ]; then
        log_info "Restoring Redis data..."
        docker cp "$backup_path/redis.rdb" $(docker-compose ps -q redis):/data/dump.rdb
        docker-compose restart redis
    fi
    
    log_info "Rollback completed"
}

# Performance tuning
tune_performance() {
    log_info "Applying performance optimizations..."
    
    # Kernel parameters for high-performance networking
    echo 'net.core.somaxconn = 65535' >> /etc/sysctl.conf
    echo 'net.core.netdev_max_backlog = 5000' >> /etc/sysctl.conf
    echo 'net.ipv4.tcp_max_syn_backlog = 8192' >> /etc/sysctl.conf
    echo 'net.ipv4.tcp_keepalive_time = 300' >> /etc/sysctl.conf
    echo 'net.ipv4.tcp_keepalive_intvl = 60' >> /etc/sysctl.conf
    echo 'net.ipv4.tcp_keepalive_probes = 3' >> /etc/sysctl.conf
    
    sysctl -p
    
    # Docker performance optimizations
    echo '{
        "log-driver": "json-file",
        "log-opts": {
            "max-size": "10m",
            "max-file": "3"
        },
        "default-ulimits": {
            "nofile": {
                "Name": "nofile",
                "Hard": 65536,
                "Soft": 65536
            }
        }
    }' > /etc/docker/daemon.json
    
    systemctl restart docker
    
    log_info "Performance optimizations applied"
}

# Post-deployment verification
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Test API endpoints
    if ! curl -f http://localhost:8001/api/v1/health; then
        log_error "API health check failed"
        return 1
    fi
    
    # Test WebSocket connection
    if ! timeout 5 node -e "
        const WebSocket = require('ws');
        const ws = new WebSocket('ws://localhost:8001/ws/test-terminal?type=pos');
        ws.on('open', () => { console.log('WebSocket OK'); process.exit(0); });
        ws.on('error', (err) => { console.error('WebSocket Error:', err); process.exit(1); });
        setTimeout(() => { console.error('WebSocket Timeout'); process.exit(1); }, 3000);
    "; then
        log_error "WebSocket connection test failed"
        return 1
    fi
    
    # Test terminal monitor
    if ! curl -f http://localhost/monitor; then
        log_error "Terminal monitor not accessible"
        return 1
    fi
    
    # Check service logs for errors
    if docker-compose logs --tail=50 backend | grep -i error; then
        log_warn "Errors found in backend logs"
    fi
    
    log_info "Deployment verification completed successfully"
    return 0
}

# Main execution
main() {
    log_info "Starting Chefia POS Real-time Infrastructure Deployment"
    
    check_prerequisites
    backup_current
    
    if deploy; then
        log_info "Deployment successful"
        
        if [ "$DEPLOY_ENV" = "production" ]; then
            tune_performance
        fi
        
        if verify_deployment; then
            log_info "All systems operational"
        else
            log_error "Deployment verification failed"
            read -p "Do you want to rollback? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rollback
            fi
        fi
    else
        log_error "Deployment failed"
        rollback
        exit 1
    fi
    
    log_info "Deployment process completed"
}

# Script options
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "verify")
        verify_deployment
        ;;
    "tune")
        tune_performance
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|verify|tune]"
        exit 1
        ;;
esac
```

### 2. Environment Configuration

```bash
# .env.production
# Database
POSTGRES_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/chefia_pos

# Redis
REDIS_URL=redis://redis:6379/0

# WebSocket Configuration
WS_HOST=0.0.0.0
WS_PORT=8001
WS_MAX_CONNECTIONS=1000
WS_HEARTBEAT_INTERVAL=30
WS_CONNECTION_TIMEOUT=300
WS_ENABLE_COMPRESSION=true
WS_ENABLE_METRICS=true
WS_ALLOWED_ORIGINS=https://pos.local,https://monitor.pos.local

# Security
SECRET_KEY=your_very_secure_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_key_here
ENCRYPTION_KEY=your_32_char_encryption_key_here

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
LOG_LEVEL=INFO

# Performance
UVICORN_WORKERS=4
GUNICORN_WORKERS=4
NGINX_WORKER_PROCESSES=auto
NGINX_WORKER_CONNECTIONS=1024

# SSL
SSL_CERT_PATH=/etc/ssl/certs/pos.local.crt
SSL_KEY_PATH=/etc/ssl/private/pos.local.key

# Backup
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
```

### 3. Health Check Script

```bash
#!/bin/bash
# health-check.sh

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_service() {
    local service=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $service... "
    
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}OK${NC} ($http_code)"
        return 0
    else
        echo -e "${RED}FAILED${NC} ($http_code)"
        return 1
    fi
}

check_websocket() {
    echo -n "Checking WebSocket... "
    
    if timeout 5 node -e "
        const WebSocket = require('ws');
        const ws = new WebSocket('ws://localhost:8001/ws/health-check?type=monitor');
        ws.on('open', () => { process.exit(0); });
        ws.on('error', () => { process.exit(1); });
        setTimeout(() => { process.exit(1); }, 3000);
    " > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        return 1
    fi
}

check_database() {
    echo -n "Checking Database... "
    
    if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        return 1
    fi
}

check_redis() {
    echo -n "Checking Redis... "
    
    if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        return 1
    fi
}

main() {
    echo "Chefia POS Health Check"
    echo "======================"
    
    failed=0
    
    # Core services
    check_service "API Health" "http://localhost:8001/health" || ((failed++))
    check_service "WebSocket Stats" "http://localhost:8001/ws/stats" || ((failed++))
    check_websocket || ((failed++))
    check_database || ((failed++))
    check_redis || ((failed++))
    
    # Frontend services
    check_service "Frontend" "http://localhost/" || ((failed++))
    check_service "Monitor Dashboard" "http://localhost/monitor" || ((failed++))
    
    # Monitoring services (if enabled)
    if [ "${PROMETHEUS_ENABLED}" = "true" ]; then
        check_service "Prometheus" "http://localhost:9090/-/healthy" || ((failed++))
    fi
    
    if [ "${GRAFANA_ENABLED}" = "true" ]; then
        check_service "Grafana" "http://localhost:3000/api/health" || ((failed++))
    fi
    
    echo "======================"
    
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}All services are healthy${NC}"
        exit 0
    else
        echo -e "${RED}$failed service(s) failed health check${NC}"
        exit 1
    fi
}

main "$@"
```

## Performance Tuning

### 1. WebSocket Optimizations

```python
# src/realtime_sync/optimizations.py
import asyncio
from typing import Dict, Any
import msgpack
import lz4.frame

class WebSocketOptimizer:
    def __init__(self):
        self.compression_threshold = 1024  # bytes
        self.batch_size = 100
        self.batch_timeout = 0.1  # seconds
        self.message_batches: Dict[str, list] = {}
    
    async def optimize_message(self, message: Dict[str, Any]) -> bytes:
        """Optimize message for transmission"""
        
        # Serialize with msgpack (faster than JSON)
        serialized = msgpack.packb(message)
        
        # Compress large messages
        if len(serialized) > self.compression_threshold:
            compressed = lz4.frame.compress(serialized)
            return b'compressed:' + compressed
        
        return serialized
    
    async def batch_messages(self, terminal_id: str, message: Dict[str, Any]):
        """Batch multiple messages for efficient transmission"""
        
        if terminal_id not in self.message_batches:
            self.message_batches[terminal_id] = []
            # Schedule batch send
            asyncio.create_task(self._send_batch_after_timeout(terminal_id))
        
        self.message_batches[terminal_id].append(message)
        
        # Send immediately if batch is full
        if len(self.message_batches[terminal_id]) >= self.batch_size:
            await self._send_batch(terminal_id)
    
    async def _send_batch_after_timeout(self, terminal_id: str):
        """Send batch after timeout"""
        await asyncio.sleep(self.batch_timeout)
        
        if terminal_id in self.message_batches:
            await self._send_batch(terminal_id)
    
    async def _send_batch(self, terminal_id: str):
        """Send batched messages"""
        if terminal_id not in self.message_batches:
            return
        
        messages = self.message_batches.pop(terminal_id)
        
        if not messages:
            return
        
        # Send as single batch message
        batch_message = {
            'type': 'message_batch',
            'messages': messages,
            'count': len(messages)
        }
        
        # Send via WebSocket manager
        # await websocket_manager.send_to_terminal(terminal_id, batch_message)
```

### 2. Database Optimizations

```sql
-- Database performance optimizations
-- PostgreSQL configuration for WebSocket workloads

-- Connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';

-- WebSocket-friendly settings
ALTER SYSTEM SET tcp_keepalives_idle = 300;
ALTER SYSTEM SET tcp_keepalives_interval = 60;
ALTER SYSTEM SET tcp_keepalives_count = 3;

-- Logging for monitoring
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;

-- Indexes for WebSocket tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_websocket_connections_terminal_id 
    ON websocket_connections(terminal_id);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_operations_timestamp 
    ON sync_operations(timestamp);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_operations_entity 
    ON sync_operations(entity_type, entity_id);

-- Partitioning for audit logs (monthly partitions)
CREATE TABLE audit_logs_master (
    id SERIAL,
    operation_id VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    operation VARCHAR(20),
    terminal_id VARCHAR(50),
    user_id VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changes JSONB,
    sync_status VARCHAR(20),
    conflict_resolved BOOLEAN DEFAULT FALSE
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs_master
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Function to automatically create partitions
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS TRIGGER AS $$
DECLARE
    partition_date TEXT;
    partition_name TEXT;
    start_date TEXT;
    end_date TEXT;
BEGIN
    partition_date := to_char(NEW.timestamp, 'YYYY_MM');
    partition_name := 'audit_logs_' || partition_date;
    start_date := to_char(date_trunc('month', NEW.timestamp), 'YYYY-MM-DD');
    end_date := to_char(date_trunc('month', NEW.timestamp) + interval '1 month', 'YYYY-MM-DD');
    
    -- Create partition if it doesn't exist
    BEGIN
        EXECUTE format('CREATE TABLE %I PARTITION OF audit_logs_master 
                       FOR VALUES FROM (%L) TO (%L)', 
                       partition_name, start_date, end_date);
    EXCEPTION WHEN duplicate_table THEN
        NULL; -- Partition already exists
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create partitions automatically
CREATE TRIGGER audit_logs_partition_trigger
    BEFORE INSERT ON audit_logs_master
    FOR EACH ROW EXECUTE FUNCTION create_monthly_partition();

SELECT pg_reload_conf();
```

## Load Testing

### 1. WebSocket Load Test

```javascript
// tests/load/websocket-load-test.js
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

class WebSocketLoadTest {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'ws://localhost:8001';
        this.concurrentConnections = options.concurrentConnections || 100;
        this.messagesPerConnection = options.messagesPerConnection || 100;
        this.messageSizeBytes = options.messageSizeBytes || 1024;
        
        this.connections = [];
        this.stats = {
            connectionsOpened: 0,
            messagesSent: 0,
            messagesReceived: 0,
            errors: 0,
            avgLatency: 0,
            minLatency: Infinity,
            maxLatency: 0,
            latencies: []
        };
    }
    
    async runTest() {
        console.log(`Starting WebSocket load test:
            - Concurrent connections: ${this.concurrentConnections}
            - Messages per connection: ${this.messagesPerConnection}
            - Message size: ${this.messageSizeBytes} bytes
        `);
        
        const startTime = performance.now();
        
        // Create concurrent connections
        const connectionPromises = [];
        for (let i = 0; i < this.concurrentConnections; i++) {
            connectionPromises.push(this.createConnection(i));
        }
        
        await Promise.all(connectionPromises);
        
        // Wait for all messages to be processed
        await this.waitForCompletion();
        
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;
        
        this.printResults(duration);
        
        // Cleanup
        this.connections.forEach(ws => ws.close());
    }
    
    async createConnection(connectionId) {
        return new Promise((resolve, reject) => {
            const terminalId = `load-test-${connectionId}`;
            const ws = new WebSocket(`${this.baseUrl}/ws/${terminalId}?type=pos`);
            
            ws.messagesSent = 0;
            ws.messagesReceived = 0;
            ws.pendingMessages = new Map();
            
            ws.on('open', () => {
                this.stats.connectionsOpened++;
                this.connections.push(ws);
                
                // Start sending messages
                this.sendMessages(ws, connectionId);
                resolve();
            });
            
            ws.on('message', (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'sync_confirmation' && message.operation_id) {
                    const sentTime = ws.pendingMessages.get(message.operation_id);
                    if (sentTime) {
                        const latency = performance.now() - sentTime;
                        this.recordLatency(latency);
                        ws.pendingMessages.delete(message.operation_id);
                    }
                }
                
                ws.messagesReceived++;
                this.stats.messagesReceived++;
            });
            
            ws.on('error', (error) => {
                console.error(`Connection ${connectionId} error:`, error);
                this.stats.errors++;
                reject(error);
            });
        });
    }
    
    sendMessages(ws, connectionId) {
        const messageData = 'x'.repeat(this.messageSizeBytes);
        
        const sendNext = () => {
            if (ws.messagesSent >= this.messagesPerConnection) {
                return;
            }
            
            const operationId = `op-${connectionId}-${ws.messagesSent}`;
            const message = {
                type: 'data_sync',
                operation: {
                    id: operationId,
                    entity_type: 'test',
                    entity_id: `test-${ws.messagesSent}`,
                    operation: 'UPDATE',
                    data: { content: messageData },
                    version: 1,
                    timestamp: new Date().toISOString(),
                    terminal_id: `load-test-${connectionId}`,
                    priority: 'medium'
                }
            };
            
            const sentTime = performance.now();
            ws.pendingMessages.set(operationId, sentTime);
            
            ws.send(JSON.stringify(message));
            ws.messagesSent++;
            this.stats.messagesSent++;
            
            // Schedule next message
            setTimeout(sendNext, Math.random() * 100); // Random delay 0-100ms
        };
        
        sendNext();
    }
    
    recordLatency(latency) {
        this.stats.latencies.push(latency);
        this.stats.minLatency = Math.min(this.stats.minLatency, latency);
        this.stats.maxLatency = Math.max(this.stats.maxLatency, latency);
    }
    
    async waitForCompletion() {
        const maxWaitTime = 60000; // 60 seconds
        const startWait = performance.now();
        
        while (performance.now() - startWait < maxWaitTime) {
            const allCompleted = this.connections.every(ws => 
                ws.messagesReceived >= ws.messagesSent * 0.95 // Allow 5% message loss
            );
            
            if (allCompleted) {
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    printResults(duration) {
        const latencies = this.stats.latencies.sort((a, b) => a - b);
        const p50 = latencies[Math.floor(latencies.length * 0.5)];
        const p95 = latencies[Math.floor(latencies.length * 0.95)];
        const p99 = latencies[Math.floor(latencies.length * 0.99)];
        
        const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
        
        console.log(`
Load Test Results:
==================
Duration: ${duration.toFixed(2)}s
Connections opened: ${this.stats.connectionsOpened}
Messages sent: ${this.stats.messagesSent}
Messages received: ${this.stats.messagesReceived}
Errors: ${this.stats.errors}
Success rate: ${((this.stats.messagesReceived / this.stats.messagesSent) * 100).toFixed(2)}%

Latency Statistics:
Min: ${this.stats.minLatency.toFixed(2)}ms
Max: ${this.stats.maxLatency.toFixed(2)}ms
Avg: ${avgLatency.toFixed(2)}ms
P50: ${p50.toFixed(2)}ms
P95: ${p95.toFixed(2)}ms
P99: ${p99.toFixed(2)}ms

Throughput:
Messages/sec: ${(this.stats.messagesSent / duration).toFixed(2)}
Connections/sec: ${(this.stats.connectionsOpened / duration).toFixed(2)}
        `);
    }
}

// Run the load test
async function main() {
    const loadTest = new WebSocketLoadTest({
        concurrentConnections: process.env.CONNECTIONS || 100,
        messagesPerConnection: process.env.MESSAGES || 50,
        messageSizeBytes: process.env.MESSAGE_SIZE || 1024
    });
    
    try {
        await loadTest.runTest();
    } catch (error) {
        console.error('Load test failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = WebSocketLoadTest;
```

### 2. Performance Benchmark Script

```bash
#!/bin/bash
# benchmark.sh

echo "Chefia POS Performance Benchmark"
echo "================================"

# WebSocket Connection Test
echo "Testing WebSocket connections..."
node tests/load/websocket-load-test.js

# API Load Test
echo "Testing API endpoints..."
ab -n 1000 -c 10 http://localhost:8001/api/v1/health

# Database Performance Test
echo "Testing database performance..."
docker-compose exec postgres pgbench -i -s 10 chefia_pos
docker-compose exec postgres pgbench -c 10 -j 2 -t 1000 chefia_pos

# Redis Performance Test
echo "Testing Redis performance..."
docker-compose exec redis redis-benchmark -q -n 10000

# Memory Usage Test
echo "Current memory usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Network Latency Test
echo "Network latency test:"
ping -c 10 localhost

echo "Benchmark completed!"
```

Este documento fornece uma base sólida para o deployment da infraestrutura de recursos real-time do Chefia POS, garantindo alta performance, monitoramento adequado e procedimentos de deployment seguros.
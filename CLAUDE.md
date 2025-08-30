# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chefia POS is a comprehensive point-of-sale system for restaurants built with a modular microservices architecture. The system includes multiple frontend applications (POS, KDS, Kiosk, Waiter, Backoffice), a FastAPI backend with 30+ business modules, and extensive integrations for complete restaurant management.

## Project Structure

```
chefia-pos/
├── src/                    # Backend (FastAPI/Python 3.11+)
│   ├── auth/              # Authentication & authorization
│   ├── business_day/      # Business day management
│   ├── cashier/           # Cashier operations
│   ├── command_card/      # Command cards system
│   ├── core/              # Core utilities & middleware
│   ├── customer/          # Customer management
│   ├── delivery/          # Delivery management
│   ├── fiscal/            # Fiscal & tax compliance
│   ├── inventory/         # Stock control
│   ├── kds/               # Kitchen display system
│   ├── loyalty/           # Customer loyalty program
│   ├── order/             # Order management
│   ├── payment/           # Payment processing
│   ├── peripherals/       # Hardware integration
│   ├── product/           # Product catalog
│   ├── queue/             # Waiting queue system
│   ├── remote_orders/     # iFood/Rappi integration
│   ├── reservation/       # Table reservations
│   ├── selfservice/       # Self-service kiosk
│   ├── tables/            # Table management
│   └── waiter/            # Waiter operations
├── frontend/              # Frontend monorepo (React 18/TypeScript 5)
│   ├── apps/
│   │   ├── pos/          # ⭐⭐⭐⭐⭐ Reference architecture (250KB)
│   │   ├── kds/          # ⭐⭐⭐⭐ Kitchen display (235KB)
│   │   ├── kiosk/        # ⭐⭐⭐ Self-service
│   │   ├── waiter/       # ⭐⭐ Waiter app
│   │   └── backoffice/   # ⭐⭐ Cloud management
│   └── common/           # ⚠️ DEPRECATED (being phased out)
├── docs/
│   └── ai/               # Technical documentation
│       ├── ARQUITETURA_TECNICA_COMPLETA.md
│       ├── GUIA_DESENVOLVIMENTO.md
│       └── REGRAS_NEGOCIO_CONSOLIDADAS.md
├── scripts/              # Utility scripts
│   ├── pos-modern.sh/bat/ps1  # Start system
│   ├── format-code.py         # Code formatting
│   └── generate-types.py      # TypeScript generation
└── docker-compose.yml    # Infrastructure setup
```

## Quick Start Commands

### 🚀 Start Complete System
```bash
# Using scripts (Linux/Mac)
./scripts/pos-modern.sh start

# Using scripts (Windows)
./scripts/pos-modern.bat
# or PowerShell
./scripts/pos-modern.ps1

# Or manually with Docker
docker-compose up -d
```

### Backend Development (Python/FastAPI)
```bash
cd src/

# Install dependencies (Poetry preferred)
poetry install
# or pip
pip install -r requirements.txt

# Run development server
poetry run dev
# or manually
uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Testing & Quality
poetry run pytest                    # Run all tests
poetry run pytest src/order/         # Test specific module
poetry run pytest --cov=src          # With coverage

# Code formatting & linting
poetry run black src/                # Format code
poetry run ruff check src/ --fix     # Lint and fix
poetry run mypy src/                 # Type checking

# All quality checks at once
poetry run black src/ && poetry run ruff check src/ --fix && poetry run mypy src/ && poetry run pytest
```

### Frontend Development (React/TypeScript Monorepo)
```bash
cd frontend/

# Install all workspace dependencies
npm install

# Run specific apps
npm run dev              # POS terminal (reference architecture)
npm run dev:kds          # Kitchen Display System
npm run dev:kiosk        # Self-service kiosk
npm run dev:waiter       # Waiter terminal
npm run dev:backoffice   # Cloud management

# Build & Test
npm run build            # Build all apps
npm run test             # Test all workspaces
npm run lint             # Lint all workspaces

# Type checking (per app)
cd apps/pos && npm run type-check

# Security & Quality Analysis (POS app)
cd apps/pos
npm run lint:security    # Security linting
npm run analyze:duplicates  # Find duplicate code
npm run audit           # Security audit
npm run analyze:all     # All checks combined
```

### E2E Testing
```bash
cd frontend/apps/pos/
npm run test:e2e          # Run Playwright tests
npm run test:e2e:ui       # With UI mode
npm run test:e2e:report   # View test report
```

## Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND APPS                         │
├─────────────────────────────────────────────────────────┤
│ POS ⭐⭐⭐⭐⭐ | KDS ⭐⭐⭐⭐ | Kiosk ⭐⭐⭐ | Waiter ⭐⭐ | Backoffice ⭐⭐ │
│ React 18 + TypeScript 5 + Vite 5 + TailwindCSS 3        │
└─────────────────────────────────────────────────────────┘
                        ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                     │
├─────────────────────────────────────────────────────────┤
│ 30+ Business Modules | Event Bus | Async Operations     │
│ Python 3.11+ | Pydantic 2 | SQLAlchemy 2 | JWT Auth    │
└─────────────────────────────────────────────────────────┘
                        ↕ 
┌─────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                        │
├─────────────────────────────────────────────────────────┤
│ PostgreSQL 14 | Redis 6 | RabbitMQ 3 | Docker Compose  │
└─────────────────────────────────────────────────────────┘
```

### Backend Module Structure
```
src/
├── <module>/
│   ├── models/       # Pydantic models & DTOs
│   ├── services/     # Business logic
│   ├── repositories/ # Data access layer
│   ├── router/       # FastAPI endpoints
│   ├── events/       # Event bus handlers
│   └── tests/        # Module tests
```

### Frontend App Maturity
- **POS Terminal** ⭐⭐⭐⭐⭐: Production-ready, reference architecture, 250KB bundle
- **KDS** ⭐⭐⭐⭐: Migrating to POS architecture
- **Kiosk** ⭐⭐⭐: Partially independent
- **Waiter** ⭐⭐: Initial phase
- **Backoffice** ⭐⭐: Cloud-based, different context

## Critical Development Rules

### ⚠️ MANDATORY: Code Quality Standards (SonarLint Compliance)

#### NEVER in Production Code:
```python
# ❌ NEVER leave debug statements
print("debug:", data)  # REMOVE BEFORE COMMIT
console.log("test");   # REMOVE BEFORE COMMIT

# ❌ NEVER use mocks outside tests
def get_user():
    return {"id": 1, "name": "Mock"}  # ONLY IN TEST FILES

# ❌ NEVER use 'any' type in TypeScript
let data: any;  # USE SPECIFIC TYPES

# ❌ NEVER leave empty catch blocks
try {
  doSomething();
} catch (error) {
  // Silent fail - NEVER DO THIS
}
```

#### ALWAYS Do:
```python
# ✅ Use proper typing
def process_data(data: Dict[str, Any]) -> ProcessedData:
    return ProcessedData(data)

# ✅ Complete error handling
try:
    result = await operation()
except SpecificError as e:
    logger.error(f"Operation failed: {e}")
    raise

# ✅ Use logging instead of console (Frontend)
import { offlineStorage } from '@/services/offlineStorage';
offlineStorage.log('Order processed', { orderId: data.id });

# ✅ Remove unused imports
# Run: poetry run ruff check --fix
```

### Task Management Philosophy

**🎯 GOLDEN RULE: One Task at a Time to 100% Completion**

```markdown
✅ RIGHT WAY:
1. Choose ONE task
2. Complete it 100% (no known bugs)
3. Test thoroughly
4. Commit when DONE
5. THEN move to next task

❌ WRONG WAY:
- Start multiple tasks
- Leave bugs "for later"
- Jump between features
- Commit incomplete work
```

### Pre-Commit Checklist
```bash
# Before EVERY commit, ensure:
□ No console.log/print statements
□ No mocks in production code
□ All tests passing
□ No linting errors (ESLint/Ruff)
□ No type errors (TypeScript/mypy)
□ No unused imports
□ No security vulnerabilities (npm audit)
□ No duplicate code (jscpd)
□ No known bugs in the feature
```

## Key Integrations & Features

### Payment & Financial
- **Asaas**: Payment gateway with split payment support
- **PIX**: Brazilian instant payment
- **TEF**: Card terminal integration

### Delivery & Orders
- **iFood**: Native integration (unique in market)
- **Rappi**: Delivery platform integration
- **WhatsApp**: AI-powered chatbot for orders

### Fiscal & Compliance
- **SAT**: Fiscal document generation
- **NFC-e/MFe**: Electronic invoicing
- **Brazilian Tax**: Full compliance

### Hardware
- **Printers**: Epson, Bematech, Daruma, Elgin support
- **Card Readers**: Multiple TEF providers
- **Kitchen Hardware**: Displays, buzzers, printers

## Development Patterns

### API Design
```python
# RESTful endpoints
/api/v1/{module}/{resource}
/api/v1/{module}/{resource}/{id}
/api/v1/{module}/{resource}/{id}/{action}

# Event-driven communication
event_bus.publish("order.created", order_data)
event_bus.subscribe("order.*", handle_order_event)
```

### Frontend Reference (POS App)
```typescript
// Component structure - FOLLOW THIS PATTERN
interface ComponentProps {
  id: string;
  onUpdate?: (data: Data) => void;
}

export const Component: FC<ComponentProps> = memo(({ id, onUpdate }) => {
  // 1. Hooks
  const { data, loading } = useData(id);
  
  // 2. Computed values
  const computed = useMemo(() => process(data), [data]);
  
  // 3. Handlers
  const handleAction = useCallback(() => {
    // action logic
  }, [dependencies]);
  
  // 4. Early returns
  if (loading) return <Loading />;
  if (!data) return null;
  
  // 5. Main render
  return <div>...</div>;
});
```

### Testing Strategy
```python
# Backend test example
@pytest.mark.asyncio
async def test_create_order():
    # Arrange
    mock_repo = Mock()
    service = OrderService(mock_repo)
    
    # Act
    result = await service.create_order(data)
    
    # Assert
    assert result.id == "123"
    mock_repo.create.assert_called_once()
```

```typescript
// Frontend test example
import { render, screen, waitFor } from '@testing-library/react';

test('should display order', async () => {
  render(<Order orderId="123" />);
  
  await waitFor(() => {
    expect(screen.getByText('Order #123')).toBeInTheDocument();
  });
});
```

## Git Workflow & Commits

### Branch Strategy
```bash
main              # Production
├── develop       # Development
    ├── feature/module-name     # New features
    ├── fix/bug-description     # Bug fixes
    └── refactor/component      # Refactoring
```

### Commit Message Format
```bash
feat(module): add new feature
fix(module): correct specific bug
docs(module): update documentation
refactor(module): improve code structure
test(module): add/fix tests
chore: maintenance tasks
perf(module): performance improvement
style(module): code formatting only
```

## Performance Guidelines

### Cache Strategy for Local Application
Since this is a **local POS application** (frontend and backend on same device), the cache strategy is:

#### ✅ Backend Cache (Recommended)
- Cache is implemented in the **backend** (Python/FastAPI)
- Frontend makes simple requests without cache logic
- Backend manages TTL and invalidation
- Benefits:
  - Shared cache between all browser tabs
  - Persists across browser sessions
  - Less memory usage in browser
  - Simpler frontend code

#### ❌ Frontend Cache (Not Used)
- We DON'T use frontend cache (localStorage/memory)
- Reasons:
  - Data is already local (same machine)
  - Adds unnecessary complexity
  - Each tab would have separate cache
  - Backend cache is more efficient

#### Implementation Example:
```python
# Backend (Python) - WHERE CACHE HAPPENS
from functools import lru_cache
from fastapi_cache.decorator import cache

@router.get("/products")
@cache(expire=300)  # 5 min cache
async def get_products():
    return await product_service.get_all()
```

```typescript
// Frontend (React) - SIMPLE, NO CACHE
const loadProducts = async () => {
  // Just fetch - backend handles cache!
  const products = await fetch('/api/v1/products');
  setProducts(await products.json());
};
```

### Frontend Optimization
- **POS Bundle Target**: <300KB (currently 250KB)
- **Response Time**: <100ms for interactions
- **Techniques**: Code splitting, lazy loading, memoization
- **Avoid**: Material UI, unnecessary dependencies

### Backend Optimization
- **Async Operations**: Use async/await throughout
- **Connection Pooling**: PostgreSQL with proper pool config
- **Caching**: Redis for frequently accessed data
- **Query Optimization**: Use indexes, avoid N+1 queries

## Infrastructure Commands

### Docker Operations
```bash
docker-compose up -d            # Start all services
docker-compose logs -f backend  # View logs
docker-compose down             # Stop services
docker-compose build --no-cache # Rebuild images
```

### Database Management
```bash
# PostgreSQL access
docker exec -it chefia-pos-postgres psql -U postgres

# Migrations (when available)
alembic upgrade head
alembic revision -m "description"
```

### Useful Scripts
```bash
# Format all code
./scripts/format-code.py

# Generate TypeScript types from API
./scripts/generate-types.py

# Setup environment
./scripts/setup-env.sh
```

## Troubleshooting

### Common Issues & Solutions

**Import Errors (Python)**
```bash
export PYTHONPATH="${PYTHONPATH}:${PWD}/src"
```

**Type Errors (Frontend)**
```bash
cd frontend/apps/pos
npm run type-check
```

**CORS Issues**
- Check backend CORS settings in `src/core/middleware.py`
- Ensure frontend URL is in allowed origins

**Performance Issues**
- Check for N+1 queries in backend
- Verify React component memoization
- Review bundle size with `npm run build:analyze`

**ESLint Security Issues**
```bash
# Check security rules
cd frontend/apps/pos
npm run lint:security

# Fix security issues
npm run lint:fix
```

## Module-Specific Notes

### POS Terminal (Reference Architecture)
- **Zero Material UI**: Custom components only
- **Zero common/**: Completely independent
- **Bundle**: 250KB optimized
- **Performance**: <100ms interactions
- **Touch-first**: Designed for tablets
- **Security**: ESLint security plugin configured

### Critical Business Rules
- Orders can only be created during business hours
- Minimum order value: R$ 10.00
- Auto-cancel unpaid orders after 2 hours
- Fiscal documents required for all sales
- Inventory updates must be atomic
- Cash drawer operations require authentication

### Offline-First Architecture
- 100% functional without internet
- Local PostgreSQL for data persistence
- Intelligent sync when reconnected
- Conflict resolution strategies per module
- <50ms local operation latency

## Code Quality Enforcement

### SonarLint Rules Applied
```typescript
// ✅ Use centralized logging instead of console
import { offlineStorage } from '@/services/offlineStorage';
offlineStorage.log('Event occurred', { context: data });

// ✅ Use API configuration instead of hardcoded URLs
import { API_CONFIG } from '@/config/api';
const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}`);

// ✅ Extract nested ternary to functions
function getStatusColor(status: OrderStatus): string {
  const colorMap: Record<OrderStatus, string> = {
    pending: 'yellow',
    confirmed: 'green',
    preparing: 'blue',
    ready: 'purple',
    cancelled: 'red'
  };
  return colorMap[status] || 'gray';
}

// ✅ Use semantic HTML for accessibility
<button onClick={handleClick} aria-label="Submit order">
  Submit
</button>

// ✅ Complete error handling
try {
  const result = await api.getData();
} catch (error) {
  offlineStorage.log('Failed to fetch data', error);
  showNotification('Error loading data', 'error');
  throw error;
}
```

## Quick Debug Commands

```bash
# Check for console.logs in TypeScript/JavaScript
grep -r "console\." frontend/ --include="*.ts" --include="*.tsx" | grep -v test | grep -v node_modules

# Check for prints in Python
grep -r "print(" src/ --include="*.py" | grep -v test | grep -v __pycache__

# Check for 'any' types in TypeScript
grep -r ": any" frontend/apps/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".d.ts"

# Check for empty catch blocks
grep -r "catch.*{[[:space:]]*}" frontend/ --include="*.ts" --include="*.tsx"

# Find duplicate code
cd frontend/apps/pos && npm run analyze:duplicates

# Run security audit
cd frontend/apps/pos && npm audit

# Run all quality checks (Python)
cd src && poetry run black . && poetry run ruff check --fix && poetry run mypy . && poetry run pytest

# Run all quality checks (Frontend)
cd frontend/apps/pos && npm run analyze:all && npm run test && npm run build
```

## Important Resources

- **Main Docs**: `/docs/ai/` - Comprehensive technical documentation
- **Dev Guide**: `/docs/ai/GUIA_DESENVOLVIMENTO.md` - Development best practices (Portuguese)
- **Architecture**: `/docs/ai/ARQUITETURA_TECNICA_COMPLETA.md` - Full technical architecture
- **Business Rules**: `/docs/ai/REGRAS_NEGOCIO_CONSOLIDADAS.md` - Business logic documentation

## Important Reminders

### 🚫 NEVER Do This
- Leave console.log/print in production code
- Use mocks outside test files
- Use 'any' type in TypeScript
- Leave empty catch blocks
- Hardcode API URLs
- Start multiple tasks without completing them
- Commit code with known bugs

### ✅ ALWAYS Do This
- Complete one task 100% before moving to next
- Use offlineStorage.log for logging
- Handle errors completely
- Use API_CONFIG for endpoints
- Test before committing
- Run quality checks (lint, type-check, test)
- Follow the established patterns

## Support & Feedback

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check `/docs/ai/` folder for detailed guides
- **Development Channel**: #chefia-pos-dev on Slack
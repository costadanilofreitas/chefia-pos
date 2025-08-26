# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chefia POS is a comprehensive point-of-sale system for restaurants, built with a microservices architecture. The system includes multiple frontend applications, a FastAPI backend, and various integrated modules for complete restaurant management.

## Common Development Commands

### Backend (Python/FastAPI)
```bash
# Navigate to backend directory
cd src/

# Install dependencies
pip install -r requirements.txt

# Run the backend server
python main.py
# or
uvicorn src.main:app --reload --host 0.0.0.0 --port 8001

# Run tests
pytest

# Format and lint
make format         # Format with black and ruff
make lint           # Run linting
make typecheck      # Type checking with mypy
make all            # Format, lint, typecheck and test
```

### Frontend (React/TypeScript Monorepo)
```bash
# Navigate to frontend directory
cd frontend/

# Install dependencies (uses npm workspaces)
npm install

# Development servers for different apps
npm run dev           # Main POS app
npm run dev:kds       # Kitchen Display System
npm run dev:kiosk     # Self-service kiosk
npm run dev:waiter    # Waiter terminal
npm run dev:backoffice # Backoffice management

# Build all apps
npm run build

# Run tests across all workspaces
npm run test

# Lint all workspaces
npm run lint

# Type checking (per app)
cd apps/pos && npm run type-check
```

### E2E Tests (Playwright)
```bash
cd frontend/apps/pos/
npm run test:e2e          # Run e2e tests
npm run test:e2e:ui       # Run with UI mode
npm run test:e2e:report   # Show test report
```

### Marketing Site
```bash
cd marketing-site/
npm install
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

## High-Level Architecture

### Backend Structure (src/)
The backend follows a modular architecture with each business domain as a separate module:

- **Core Modules**: Core functionality shared across the system
  - `core/`: Event bus, middleware, error handling, tracing
  - `auth/`: Authentication and authorization with JWT
  - `peripherals/`: Hardware integration (printers, payment terminals, keyboards)

- **Business Modules**: Each module contains:
  - `models/`: Pydantic models for data validation
  - `router/`: FastAPI route definitions
  - `services/`: Business logic implementation  
  - `repositories/`: Data access layer (when using DB)
  - `events/`: Event definitions for the event bus system
  - `tests/`: Module-specific tests

- **Key Integrations**:
  - **Payment**: Asaas payment gateway with split payment support
  - **Delivery**: iFood, Rappi, Google Maps integration
  - **Fiscal**: SAT, NFC-e, MFe fiscal document generation
  - **Messaging**: WhatsApp/Twilio chatbot integration
  - **Remote Orders**: Platform-agnostic remote order handling

### Frontend Architecture (frontend/)
Monorepo structure using npm workspaces:

- **common/**: Shared components, services, and utilities (deprecated for POS)
  - Reusable UI components (Button, Card, Table, etc.)
  - API client and service abstractions
  - Event bus for frontend communication
  - Common types and utilities

- **apps/**: Individual applications
  - **pos**: Main point-of-sale terminal (React + TypeScript + TailwindCSS)
    - REFERENCE ARCHITECTURE: Zero MUI, zero common/, optimized bundle
    - Custom components with Tailwind styling
    - React Context for state management
  - **kds**: Kitchen Display System for order management
  - **kiosk**: Customer self-service interface
  - **waiter**: Mobile waiter terminal
  - **backoffice**: Cloud-based management interface
  - Each app has its own Vite config and can be developed/deployed independently

### Event-Driven Architecture
The system uses an event bus pattern for decoupled communication:
- Backend events handle cross-module communication
- Frontend events coordinate between components
- Transaction tracing tracks operations across modules

### Database Strategy
- JSON file-based storage in `data/` for development
- PostgreSQL support via Docker (docker-compose.yml)
- SQLAlchemy 2.0 for ORM operations
- Redis for caching

## Key Development Patterns

### API Endpoints
- RESTful design with FastAPI
- Consistent URL patterns: `/api/{module}/{resource}`
- Pydantic models for request/response validation
- Async/await throughout for performance

### Frontend State Management
- React Context API for global state (Auth, Theme, Toast)
- Local component state for UI-specific data
- Service layer pattern for API communication
- TypeScript for type safety

### Testing Strategy
- Backend: pytest for unit and integration tests
- Frontend: Jest + React Testing Library
- E2E: Playwright for critical user flows
- Test files co-located with source code

### Error Handling
- Centralized error middleware in backend
- Custom exception classes per module
- Frontend error boundaries and toast notifications
- Comprehensive logging with configurable levels

## Important Development Rules

### Code Quality Standards
- **NEVER** leave console.log/print debug statements in production code
- **NEVER** use mocks outside of test files
- **ALWAYS** use proper typing (avoid 'any' in TypeScript)
- **ALWAYS** complete tasks 100% before moving to the next
- **ALWAYS** fix bugs before marking a task as complete

### Before Committing
1. Remove all debug statements (console.log, print)
2. Run linting and fix all issues
3. Ensure all tests pass
4. Remove unused imports
5. Verify no type errors exist

### Frontend Guidelines
- POS app is the reference architecture - follow its patterns
- Prefer custom components over external UI libraries
- Use TailwindCSS for styling
- Minimize bundle size - avoid unnecessary dependencies
- Components should be pure and testable

### Backend Guidelines
- Follow the module structure consistently
- Use Pydantic for all data validation
- Implement proper error handling in services
- Use the event bus for cross-module communication
- Write tests for all business logic

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/module-name

# Make atomic commits
git add .
git commit -m "feat(module): description"

# Push to remote
git push origin feature/module-name
```

### Commit Message Format
- `feat(scope):` New feature
- `fix(scope):` Bug fix
- `docs(scope):` Documentation only
- `refactor(scope):` Code refactoring
- `test(scope):` Adding tests
- `chore(scope):` Maintenance tasks

## Infrastructure Commands

### Docker Operations
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Rebuild containers
docker-compose build
```

### Database Operations
```bash
# Access PostgreSQL
docker exec -it chefia-pos-postgres psql -U postgres

# Run migrations (when available)
alembic upgrade head

# Create new migration
alembic revision -m "description"
```

## Troubleshooting

### Common Issues
- **Import errors**: Ensure PYTHONPATH includes src/ directory
- **Type errors in frontend**: Run `npm run type-check` in the specific app
- **Test failures**: Check if test database is properly configured
- **CORS issues**: Verify backend CORS settings match frontend URL

### Performance Optimization
- Frontend: Use React.memo, useMemo, and useCallback appropriately
- Backend: Use async operations, implement caching where needed
- Database: Add indexes for frequently queried fields

## Module-Specific Notes

### POS Terminal (frontend/apps/pos)
- Reference implementation for frontend architecture
- Zero Material UI dependencies
- Optimized for touch interfaces
- Custom component library with TailwindCSS
- Comprehensive keyboard shortcuts support

### Payment Module
- Asaas integration for payment processing
- Support for split payments
- PIX payment implementation
- Partial payment capabilities

### Fiscal Module
- SAT fiscal document generation
- NFC-e and MFe support
- Integration with multiple fiscal printers
- Compliance with Brazilian tax regulations

### Remote Orders
- Unified interface for delivery platforms
- iFood and Rappi integrations
- Order status synchronization
- Platform-agnostic order handling
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

# Type checking
npm run type-check --workspace=apps/pos
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

- **common/**: Shared components, services, and utilities
  - Reusable UI components (Button, Card, Table, etc.)
  - API client and service abstractions
  - Event bus for frontend communication
  - Common types and utilities

- **apps/**: Individual applications
  - **pos**: Main point-of-sale terminal (React + TypeScript + MUI)
  - **kds**: Kitchen Display System for order management
  - **kiosk**: Customer self-service interface
  - **waiter**: Mobile waiter terminal
  - Each app has its own Vite config and can be developed/deployed independently

### Event-Driven Architecture
The system uses an event bus pattern for decoupled communication:
- Backend events handle cross-module communication
- Frontend events coordinate between components
- Transaction tracing tracks operations across modules

### Database Strategy
- JSON file-based storage in `data/` for development
- PostgreSQL support via Docker (docker-compose.yml)
- Motor for async MongoDB operations where needed

## Key Development Patterns

### API Endpoints
- RESTful design with FastAPI
- Consistent URL patterns: `/api/{module}/{resource}`
- Pydantic models for request/response validation
- Async/await throughout for performance

### Frontend State Management
- React Context API for global state
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
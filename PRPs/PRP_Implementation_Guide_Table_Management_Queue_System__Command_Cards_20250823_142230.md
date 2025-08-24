# 🎯 Product Requirement Prompt - Implementation Guide: Table Management, Queue System & Command Cards

## Metadata
- **Generated from**: `docs/features/IMPLEMENTATION_TABLE_QUEUE_MANAGEMENT.md`
- **Generated at**: 2025-08-23T14:22:30.964544
- **PRP Version**: 1.0.0

---

## 📋 FEATURE SPECIFICATION

### Feature Overview
Complete implementation guide for table management with waiting queue, physical command cards (barcode/QR), and self-service weight-based billing for restaurants.

---

### User Stories
- No explicit user stories found in source document.

### Affected Modules
- database
- backend
- integration
- waiter
- frontend
- pos
- kds

---

## 🏗️ TECHNICAL SPECIFICATION

### API Endpoints
- POST /api/tables/queue
- GET /api/tables/queue
- POST /api/tables/queue/{id}/notify
- POST /api/tables/queue/{id}/seat
- POST /api/commands
- GET /api/commands/{code}
- POST /api/commands/{code}/items
- POST /api/commands/{code}/close
- GET /api/commands/{id}/print
- POST /api/selfservice/weigh
- POST /api/selfservice/tare
- POST /api/selfservice/checkout
- GET /api/selfservice/scales

### Database Considerations
Based on the feature requirements, consider the following database aspects:
- Data models and relationships
- Indexes for performance
- Migration strategy
- Backup and recovery impact

### Event Architecture
Events to be published/subscribed:
- Define events based on feature operations
- Ensure loose coupling between modules
- Implement proper event versioning

---

## 💻 IMPLEMENTATION GUIDE

### Backend Tasks
Following the Chefia POS architecture standards:

1. **Models** (`src/[module]/models/`)
   - Create Pydantic models for validation
   - Define database models if needed
   - Ensure decimal precision for monetary values

2. **Services** (`src/[module]/services/`)
   - Implement business logic
   - Follow repository pattern
   - Publish relevant events
   - Handle offline scenarios

3. **API Routes** (`src/[module]/router/`)
   - RESTful endpoints
   - Proper error handling
   - Response time < 150ms
   - JWT authentication

4. **Tests** (`src/[module]/tests/`)
   - Unit tests for services
   - Integration tests for API
   - Test offline scenarios

### Frontend Tasks
Following React/TypeScript/TailwindCSS standards:

1. **Components** (`frontend/apps/[module]/src/components/`)
   - Functional components with hooks
   - TypeScript interfaces
   - Memoization where needed
   - NO Material-UI

2. **State Management**
   - Context API + useReducer
   - Optimistic updates
   - Offline queue handling

3. **UI/UX**
   - TailwindCSS only
   - Mobile responsive
   - Loading states
   - Error boundaries

4. **Performance**
   - Bundle size impact < 50KB
   - Lazy loading if needed
   - Image optimization

---

## ✅ ACCEPTANCE CRITERIA

1. Acceptance criteria to be defined based on feature requirements.

---

## 📊 PERFORMANCE REQUIREMENTS

### Metrics
- API Response: < 150ms (p95)
- UI Render: < 100ms
- Database Query: < 50ms
- Offline Sync: < 5 seconds
- Bundle Size Increase: < 50KB

### Load Testing
- Concurrent Users: 50+
- Requests per Second: 100+
- Data Volume: 10,000+ records

---

## 🧪 TESTING STRATEGY

### Unit Tests
- Service logic coverage > 80%
- Component testing with React Testing Library
- Mock external dependencies

### Integration Tests
- API endpoint testing
- Database transaction testing
- Event publishing verification

### E2E Tests
- Critical user flows
- Offline/online transitions
- Cross-module interactions

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Code review completed
- [ ] Tests passing (>60% coverage)
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] Security review passed
- [ ] Database migrations ready
- [ ] Feature flags configured
- [ ] Monitoring alerts set up

---

## 🔗 BASE SYSTEM CONTEXT

<details>
<summary>Click to expand full system context</summary>

# 🎯 Product Requirement Prompt (PRP) - Chefia POS System

## System Context & Role Definition

You are a fullstack developer specialist with extensive experience in POS systems for restaurants, with deep knowledge of React/TypeScript/TailwindCSS + FastAPI with Python.

---

## 🏗️ PROJECT FOUNDATION

### Business Context
```yaml
product_name: Chefia POS System
industry: Restaurant & Food Service
target_market: Brazilian restaurants (all sizes)
business_model: SaaS with on-premise core
unique_value: 100% offline operation with cloud sync
current_status: MVP Development - Sprint 1
timeline: 12 weeks to launch
budget: R$ 331,000
team_size: 5.5 developers
```

### Technical Architecture
```yaml
deployment_model:
  on_premise:
    - POS Terminal (critical operations)
    - KDS (Kitchen Display System)
    - PostgreSQL database
    - Redis cache
    - Event bus
  cloud:
    - Analytics dashboard
    - Backoffice management
    - WhatsApp/iFood integrations
    - AI predictions

tech_stack:
  backend:
    language: Python 3.11+
    framework: FastAPI 0.116.1
    database: PostgreSQL 15
    cache: Redis 7
    queue: RabbitMQ
    
  frontend:
    framework: React 18.3
    language: TypeScript 5.6
    bundler: Vite 7.0
    styling: TailwindCSS 3.4
    state: Context API + useReducer
    
  infrastructure:
    containers: Docker
    monitoring: Prometheus + Grafana
    logs: ELK Stack
```

---

## 🎯 CORE PRINCIPLES & CONSTRAINTS

### Non-Negotiable Rules
1. **OFFLINE-FIRST**: System MUST work 100% without internet
2. **NO MATERIAL-UI**: Use TailwindCSS exclusively
3. **BUNDLE SIZE < 300KB**: Performance is critical
4. **RESPONSE TIME < 150ms**: All operations must be instant
5. **NO COMMON FOLDER**: Each module is independent
6. **LOCAL DATABASE**: PostgreSQL on-premise for critical data
7. **EVENT-DRIVEN**: Modules communicate via events only
8. **TYPING REQUIRED**: Full TypeScript strict mode
9. **NO CONSOLE.LOG**: Use structured logging only
10. **TEST COVERAGE > 60%**: All critical paths tested

### Architecture Patterns
```typescript
// Required patterns for all modules
const PATTERNS = {
  backend: [
    "Repository Pattern",
    "Service Layer",
    "Event Bus",
    "Factory Pattern",
    "Dependency Injection"
  ],
  frontend: [
    "Component Composition",
    "Custom Hooks",
    "Context Providers",
    "Optimistic Updates",
    "Error Boundaries"
  ],
  data: [
    "Event Sourcing",
    "CQRS (read/write separation)",
    "Outbox Pattern",
    "Saga Pattern"
  ]
}
```

---

## 🏢 BUSINESS DOMAIN KNOWLEDGE

### Restaurant Operations
```yaml
order_types:
  dine_in:
    - Table management
    - Command cards (physical/digital)
    - Split bills
    - Service charge (10%)
  
  takeout:
    - Counter orders
    - Quick payment
    - Order tracking
  
  delivery:
    - Address management
    - Delivery fee calculation
    - Driver assignment
    - Multi-platform (iFood, Rappi)
  
  self_service:
    - Weight-based pricing
    - Plate tare
    - Additional items

payment_methods:
  - Cash (with change calculation)
  - Credit/Debit cards (TEF integration)
  - PIX (QR code generation)
  - Vouchers (meal tickets)
  - Split payments
  - Partial payments

fiscal_requirements:
  brazil:
    - NFC-e (consumer invoice)
    - CF-e SAT (São Paulo)
    - MF-e (Ceará)
    - Contingency mode
    - SPED Fiscal
```

### Operational Workflows
```yaml
daily_operations:
  opening:
    1. Open business day
    2. Open cashier/shift
    3. Count initial cash
    4. Check printer/peripherals
    
  service:
    1. Take orders
    2. Send to kitchen (KDS)
    3. Manage queue/tables
    4. Process payments
    5. Issue fiscal documents
    
  closing:
    1. Close all orders
    2. Count final cash
    3. Generate reports
    4. Close shift/cashier
    5. Close business day

staff_roles:
  manager:
    - Full system access
    - Reports and analytics
    - Configuration changes
    
  cashier:
    - Order creation
    - Payment processing
    - Basic reports
    
  waiter:
    - Table orders
    - Order modifications
    - No payment access
    
  kitchen:
    - View orders only
    - Mark items ready
```

---

## 📦 MODULE SPECIFICATIONS

### Current Modules Status
```yaml
pos_terminal:
  status: 85% complete
  missing:
    - Shift management integration
    - TEF payment providers
    - Advanced discounts
  bundle_size: 250KB
  performance: <100ms response

kds_kitchen:
  status: 60% complete
  missing:
    - Real-time sync
    - Station routing
    - Performance optimization
  current_issue: Using Material-UI (needs removal)
  
kiosk_selfservice:
  status: 50% complete
  missing:
    - Payment flow
    - Multi-language
    - Accessibility
    
waiter_mobile:
  status: 30% complete
  needs: Complete refactoring
  
integrations:
  ifood: 40% (webhook incomplete)
  whatsapp: 20% (basic structure)
  analytics: 15% (planning phase)
```

### API Structure
```yaml
base_url: /api/v1
authentication: JWT Bearer token
rate_limiting: 100 req/s per client

endpoints_pattern:
  GET /api/v1/{module}: List resources
  GET /api/v1/{module}/{id}: Get single resource
  POST /api/v1/{module}: Create resource
  PUT /api/v1/{module}/{id}: Update resource
  DELETE /api/v1/{module}/{id}: Delete resource
  POST /api/v1/{module}/{id}/{action}: Custom action

response_format:
  success:
    status: 200-299
    body: {
      success: true,
      data: {...},
      metadata: {...}
    }
  error:
    status: 400-599
    body: {
      success: false,
      error: {
        code: "ERROR_CODE",
        message: "Human readable",
        details: {...}
      }
    }
```

---

## 🚀 IMPLEMENTATION REQUIREMENTS

### Code Standards
```python
# Backend Python/FastAPI Standard
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field
from datetime import datetime

class ServicePattern:
    """All services must follow this pattern"""
    
    def __init__(self, repository, event_bus):
        self.repository = repository
        self.event_bus = event_bus
    
    async def execute_action(self, data: BaseModel) -> BaseModel:
        # 1. Validate permissions
        # 2. Execute business logic
        # 3. Persist changes
        # 4. Publish events
        # 5. Return result
        pass
```

```typescript
// Frontend React/TypeScript Standard
import { memo, useCallback, useMemo } from 'react'

interface ComponentProps {
  // Always define interfaces
}

export const Component = memo(({ ...props }: ComponentProps) => {
  // 1. Hooks at top
  // 2. Memoize calculations
  // 3. Optimize callbacks
  // 4. Clean JSX
  // 5. TailwindCSS only
  
  return (
    <div className="tailwind-classes-only">
      {/* No Material-UI allowed */}
    </div>
  )
})
```

### Performance Requirements
```yaml
metrics:
  api_response: <150ms p95
  database_query: <50ms p95
  frontend_bundle: <300KB
  first_paint: <500ms
  time_to_interactive: <1000ms
  offline_sync: <5s
  
scalability:
  concurrent_users: 100+
  orders_per_minute: 50+
  products_catalog: 10,000+
  historical_data: 5 years
```

---

## 📋 FEATURE IMPLEMENTATION TEMPLATE

When implementing any feature, follow this structure:

### 1. Requirement Analysis
```yaml
feature_name: [Name]
business_value: [Why needed]
user_story: As a [role], I want [feature] so that [benefit]
acceptance_criteria:
  - [ ] Criteria 1
  - [ ] Criteria 2
dependencies: [List other features/modules]
risks: [Technical/business risks]
```

### 2. Technical Design
```yaml
affected_modules:
  backend:
    - Module name and changes
  frontend:
    - Component changes
  database:
    - Schema modifications
    
api_changes:
  new_endpoints:
    - POST /api/v1/...
  modified_endpoints:
    - PUT /api/v1/...
    
events:
  published:
    - event.name: {payload}
  subscribed:
    - event.name: handler
```

### 3. Implementation Checklist
```yaml
backend_tasks:
  - [ ] Create models
  - [ ] Implement service
  - [ ] Add repository methods
  - [ ] Create API endpoints
  - [ ] Write unit tests
  - [ ] Add integration tests
  
frontend_tasks:
  - [ ] Create components
  - [ ] Add state management
  - [ ] Implement UI
  - [ ] Add validations
  - [ ] Write component tests
  - [ ] Test offline mode
  
integration:
  - [ ] API integration
  - [ ] Event handling
  - [ ] Error scenarios
  - [ ] Performance test
```

---

## 🔥 CURRENT SPRINT PRIORITIES

### Sprint 1 (Current - Weeks 1-4)
```yaml
week_1:
  focus: Table Management & Queue System
  deliverables:
    - Waiting list with SMS/WhatsApp notification
    - Real-time table status
    - Queue time estimation
    - Customer position tracking

week_2:
  focus: Command Cards System
  deliverables:
    - Barcode/QR code generation
    - Scanner integration
    - Add items to command
    - Payment later flow

week_3:
  focus: Self-Service Weight Billing
  deliverables:
    - Scale integration
    - Tare functionality
    - Price per kg calculation
    - Additional items

week_4:
  focus: Integration & Testing
  deliverables:
    - End-to-end testing
    - Performance optimization
    - Bug fixes
    - Documentation
```

---

## 🚨 CRITICAL INFORMATION

### Known Issues to Avoid
```yaml
do_not:
  - Use Material-UI components
  - Create common/shared folders
  - Make synchronous API calls
  - Store sensitive data in localStorage
  - Use console.log in production
  - Import entire libraries
  - Create files > 500 lines
  - Nest components > 3 levels
  
always_do:
  - Check offline mode first
  - Use TypeScript strict mode
  - Implement error boundaries
  - Add loading states
  - Test with slow network
  - Validate all inputs
  - Handle edge cases
  - Document complex logic
```

### Integration Points
```yaml
external_systems:
  ifood:
    status: Webhook incomplete
    priority: HIGH
    endpoint: /api/v1/webhooks/ifood
    
  whatsapp:
    status: Basic structure
    priority: HIGH
    integration: Twilio API
    
  payment_terminals:
    status: Mock only
    priority: MEDIUM
    providers: [SiTef, Stone, Cielo]
    
  fiscal_systems:
    status: Partial
    priority: HIGH
    types: [SAT, NFC-e, MF-e]
```

---

## 📊 SUCCESS METRICS

### Technical KPIs
```yaml
performance:
  uptime: >99.5%
  response_time: <150ms
  error_rate: <0.1%
  offline_recovery: <5s
  
quality:
  test_coverage: >60%
  bug_rate: <5 per sprint
  code_review: 100%
  documentation: Complete
  
user_experience:
  task_completion: <3 clicks
  load_time: <1s
  error_messages: Clear
  offline_mode: Seamless
```

### Business KPIs
```yaml
adoption:
  restaurants_onboarded: 20+ in MVP
  daily_transactions: 1000+
  user_satisfaction: >4/5
  
efficiency:
  order_time_reduction: 30%
  kitchen_efficiency: +25%
  payment_processing: <30s
  table_turnover: +20%
```

---

## 🛠️ DEVELOPMENT TOOLS & COMMANDS

### Essential Commands
```bash
# Backend
cd src/
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Frontend
cd frontend/
npm install
npm run dev           # POS app
npm run dev:kds       # Kitchen display
npm run dev:kiosk     # Self-service

# Testing
pytest src/ --cov
npm test
npm run e2e

# Build & Analyze
npm run build
npm run analyze      # Check bundle size

# Database
docker-compose up -d postgres redis
alembic upgrade head
```

---

## 📚 REFERENCE DOCUMENTS

For detailed information, consult:
- `AI_CONTEXT_KNOWLEDGE_BASE.md` - Complete system context
- `ARQUITETURA_TECNICA_COMPLETA.md` - Technical architecture
- `REGRAS_NEGOCIO_CONSOLIDADAS.md` - Business rules
- `MVP_ANALISE_ROADMAP.md` - MVP roadmap and analysis
- `IMPLEMENTATION_CHECKLIST_SPRINT1.md` - Current sprint tasks
- `IMPLEMENTATION_TABLE_QUEUE_MANAGEMENT.md` - Queue system details

---

## ✅ PROMPT USAGE INSTRUCTIONS

When using this PRP to generate code or solutions:

1. **Always specify the context**: "Using the Chefia POS PRP template..."
2. **Reference the section**: "Following the [Section Name] specifications..."
3. **Include constraints**: "Respecting the offline-first and no Material-UI constraints..."
4. **Define the output**: "Generate [backend service|frontend component|API endpoint]..."
5. **Specify the module**: "For the [POS|KDS|Waiter] module..."

### Example Prompt
```
Using the Chefia POS PRP template, following the Code Standards specifications and respecting the offline-first constraint, generate a Python FastAPI service for managing restaurant waiting queue with SMS notifications for the tables module. Include proper event publishing, error handling, and PostgreSQL repository pattern.
```

---

*This PRP template version: 1.0.0*
*Last updated: January 2025*
*Next review: After each sprint completion*

</details>

---

## 📝 NOTES FOR IMPLEMENTATION

1. **Offline-First**: Ensure all features work without internet
2. **No Material-UI**: Use TailwindCSS exclusively
3. **Event-Driven**: Communicate via events, not direct calls
4. **Performance**: Every operation < 150ms
5. **Testing**: No feature without tests

---

## 🎯 PROMPT USAGE

To implement this feature, use the following prompt structure:

```
Using the PRP for Implementation Guide: Table Management, Queue System & Command Cards, implement [specific component/service] 
following the Chefia POS standards. Ensure offline-first operation, 
use TailwindCSS for styling, and maintain response times under 150ms.
Include proper error handling and test coverage.
```

---

*End of PRP Document*

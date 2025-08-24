# Generate PRP Command for Claude Code

## Description

This command generates a Product Requirement Prompt (PRP) from a feature specification file, combining it with the base PRP template and MCP context to create a comprehensive, contextualized requirement document with technology-specific blueprints.

## Usage

```
/generate-prp <feature-file-path>
```

## Example

```
/generate-prp docs/features/IMPLEMENTATION_TABLE_QUEUE_MANAGEMENT.md
```

## Command Instructions for Claude

When this command is executed, you should:

1. **Read the feature file** at path: `${ARGUMENT}`
2. **Load the PRP base template** from `PRPs/templates/prp_base.md`
3. **Load system context** from these knowledge base files:
   - `docs/ai/AI_CONTEXT_KNOWLEDGE_BASE.md` - Complete system context
   - `docs/ai/ARQUITETURA_TECNICA_COMPLETA.md` - Technical architecture
   - `docs/ai/REGRAS_NEGOCIO_CONSOLIDADAS.md` - Business rules
   - `docs/ai/MVP_ANALISE_ROADMAP.md` - MVP roadmap
   - `docs/ai/GUIA_DESENVOLVIMENTO.md` - Development guidelines
4. **Query MCP context** for technology-specific patterns:
   - FastAPI best practices and patterns
   - React 18 hooks and patterns
   - TypeScript 5 type definitions
   - TailwindCSS utility classes
   - PostgreSQL schema patterns
   - Redis caching strategies
5. **Analyze the feature file** to extract:
   - Feature name (from main heading)
   - Business requirements
   - Technical specifications
   - User stories
   - API endpoints
   - Database changes
   - Acceptance criteria
   - Performance requirements
6. **Generate a contextualized PRP** that combines:
   - The system context from prp_base.md
   - The specific feature requirements
   - Implementation guidelines with MCP blueprints
   - Testing requirements
   - Technology-specific code examples
7. **Save the generated PRP** to `PRPs/features/PRP_[feature-name].md`

### MCP Context Integration

When generating blueprints, use MCP context to provide accurate examples:

- **FastAPI**: Use latest async patterns, dependency injection, Pydantic v2
- **React 18**: Use concurrent features, Suspense, transitions
- **TypeScript 5**: Use satisfies operator, const type parameters
- **TailwindCSS 3.4**: Use latest utility classes, arbitrary values
- **PostgreSQL 15**: Use JSONB, generated columns, partitioning
- **Redis 7**: Use streams, JSON support, search capabilities

## PRP Generation Template

When generating the PRP, use this structure:

````markdown
# 🎯 Product Requirement Prompt - [Feature Name]

## Metadata

- **Source Feature File**: `${ARGUMENT}`
- **Generated Date**: [current-date]
- **PRP Version**: 1.0.0
- **System**: Chefia POS

---

## 📋 FEATURE SPECIFICATION

### Feature Overview

[Extract the main description/overview from the feature file]

### Business Value

[Identify and describe the business value this feature provides]

### User Stories

[Extract or generate user stories in the format: "As a [role], I want [feature] so that [benefit]"]

---

## 🏗️ TECHNICAL REQUIREMENTS

### Affected Modules

[Identify which modules are affected: POS, KDS, Backend, etc.]

### API Specifications

[List all API endpoints needed with their methods and purposes]

### Database Changes

[Describe any database schema changes, new tables, or migrations needed]

### Event Architecture

[List events that will be published/subscribed]

---

## 💻 IMPLEMENTATION SPECIFICATION

### Backend Implementation (Python/FastAPI)

[Provide specific implementation requirements following project patterns]

### Frontend Implementation (React/TypeScript/TailwindCSS)

[Provide specific UI/UX requirements following project standards]

### Integration Points

[Describe how this feature integrates with existing modules]

---

## 🔧 TECHNOLOGY BLUEPRINTS

### FastAPI Service Blueprint

```python
# Based on MCP context and project patterns
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status

class [Feature]Service:
    """
    Service implementation for [feature].
    Following repository pattern with event publishing.
    """

    def __init__(self, repository: [Feature]Repository, event_bus: EventBus):
        self.repository = repository
        self.event_bus = event_bus

    async def create_[resource](
        self,
        data: Create[Resource]DTO,
        user: User = Depends(get_current_user)
    ) -> [Resource]:
        # 1. Validate permissions
        if not user.has_permission("[resource].create"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        # 2. Business logic validation
        await self._validate_business_rules(data)

        # 3. Persist to database
        resource = await self.repository.create(data)

        # 4. Publish event
        await self.event_bus.publish(
            "[Resource]CreatedEvent",
            {"resource_id": resource.id, "user_id": user.id}
        )

        # 5. Return response
        return resource
```
````

### React Component Blueprint

```typescript
// Based on MCP context and React 18 patterns
import { memo, useCallback, useMemo, useState, useEffect } from 'react'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'

interface [Feature]Props {
  initialData?: [DataType]
  onSuccess?: (data: [DataType]) => void
  onError?: (error: Error) => void
}

export const [Feature]Component = memo(({
  initialData,
  onSuccess,
  onError
}: [Feature]Props) => {
  // State management
  const [data, setData] = useState<[DataType]>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Offline support
  const { addToQueue, isOffline } = useOfflineQueue()

  // Memoized calculations
  const processedData = useMemo(() => {
    return data ? process(data) : null
  }, [data])

  // Optimized callbacks
  const handleSubmit = useCallback(async (formData: FormData) => {
    setLoading(true)
    setError(null)

    try {
      if (isOffline) {
        // Queue for later sync
        await addToQueue({
          action: 'create_[resource]',
          data: formData,
          timestamp: Date.now()
        })
        onSuccess?.(formData)
      } else {
        // Direct API call
        const response = await api.[resource].create(formData)
        setData(response)
        onSuccess?.(response)
      }
    } catch (err) {
      setError(err as Error)
      onError?.(err as Error)
    } finally {
      setLoading(false)
    }
  }, [isOffline, addToQueue, onSuccess, onError])

  // Error boundary
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* TailwindCSS only - NO Material-UI */}
      {loading && (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}

      {/* Component content */}
    </div>
  )
})

[Feature]Component.displayName = '[Feature]Component'
```

### PostgreSQL Schema Blueprint

```sql
-- Based on MCP context and PostgreSQL best practices
-- Table for [feature]
CREATE TABLE IF NOT EXISTS [feature_table] (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core fields
    [specific_fields],

    -- Relationships
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Indexes for performance
    CONSTRAINT [feature]_unique_constraint UNIQUE (restaurant_id, [unique_field])
);

-- Indexes for common queries
CREATE INDEX idx_[feature]_restaurant_id ON [feature_table](restaurant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_[feature]_created_at ON [feature_table](created_at DESC);
CREATE INDEX idx_[feature]_status ON [feature_table](status) WHERE deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_[feature]_updated_at
    BEFORE UPDATE ON [feature_table]
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Redis Caching Blueprint

```python
# Based on MCP context for caching patterns
from typing import Optional, Any
import json
import redis.asyncio as redis
from datetime import timedelta

class [Feature]Cache:
    """Cache layer for [feature] using Redis."""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.default_ttl = timedelta(minutes=5)
        self.key_prefix = "chefia:[feature]"

    def _make_key(self, *parts: str) -> str:
        """Generate cache key."""
        return f"{self.key_prefix}:{':'.join(parts)}"

    async def get_[resource](self, resource_id: str) -> Optional[dict]:
        """Get resource from cache."""
        key = self._make_key("resource", resource_id)
        data = await self.redis.get(key)
        return json.loads(data) if data else None

    async def set_[resource](
        self,
        resource_id: str,
        data: dict,
        ttl: Optional[timedelta] = None
    ) -> None:
        """Cache resource with TTL."""
        key = self._make_key("resource", resource_id)
        ttl = ttl or self.default_ttl
        await self.redis.setex(
            key,
            ttl,
            json.dumps(data)
        )

    async def invalidate_[resource](self, resource_id: str) -> None:
        """Invalidate cached resource."""
        pattern = self._make_key("resource", resource_id, "*")
        async for key in self.redis.scan_iter(match=pattern):
            await self.redis.delete(key)
```

### TypeScript Types Blueprint

```typescript
// Based on MCP context and TypeScript 5 features
// Types for [feature]

// Domain types
export interface [Feature] {
  readonly id: string
  readonly restaurantId: string

  // Core properties
  [properties]: [types]

  // Metadata
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly deletedAt?: Date
}

// DTOs
export interface Create[Feature]DTO {
  [required_fields]: [types]
  [optional_fields]?: [types]
}

export interface Update[Feature]DTO extends Partial<Create[Feature]DTO> {
  readonly id: string
}

// API Response types
export interface [Feature]Response {
  success: boolean
  data: [Feature]
  metadata?: {
    timestamp: number
    version: string
  }
}

export interface [Feature]ListResponse {
  success: boolean
  data: [Feature][]
  pagination: {
    total: number
    page: number
    limit: number
    hasNext: boolean
  }
}

// Event types
export type [Feature]Event =
  | { type: '[FEATURE]_CREATED'; payload: [Feature] }
  | { type: '[FEATURE]_UPDATED'; payload: [Feature] }
  | { type: '[FEATURE]_DELETED'; payload: { id: string } }

// Utility types
export type [Feature]Status = 'pending' | 'active' | 'completed' | 'cancelled'
export type [Feature]Permission = '[feature].create' | '[feature].read' | '[feature].update' | '[feature].delete'
```

---

## ✅ ACCEPTANCE CRITERIA

[List all acceptance criteria as checkboxes]

---

## 📊 PERFORMANCE REQUIREMENTS

- API Response Time: < 150ms
- Database Query: < 50ms
- Frontend Bundle Impact: < 50KB
- Offline Operation: Required/Optional
  [Add specific performance metrics for this feature]

---

## 🧪 TESTING REQUIREMENTS

### Unit Tests

[Specify unit test requirements]

### Integration Tests

[Specify integration test requirements]

### E2E Tests

[Specify end-to-end test scenarios]

---

## 🚀 IMPLEMENTATION CHECKLIST

### Phase 1: Backend

- [ ] Create models in `src/[module]/models/`
- [ ] Implement services in `src/[module]/services/`
- [ ] Add API endpoints in `src/[module]/router/`
- [ ] Write unit tests
- [ ] Add integration tests

### Phase 2: Frontend

- [ ] Create components in appropriate module
- [ ] Implement state management
- [ ] Add UI with TailwindCSS
- [ ] Implement offline support
- [ ] Write component tests

### Phase 3: Integration

- [ ] Connect frontend to backend
- [ ] Test event publishing/subscribing
- [ ] Verify offline functionality
- [ ] Performance testing
- [ ] Documentation update

---

## 🔗 SYSTEM CONTEXT

[Include relevant sections from prp_base.md]

### Core Constraints

- OFFLINE-FIRST: Must work 100% without internet
- NO MATERIAL-UI: Use TailwindCSS only
- BUNDLE SIZE: < 300KB total
- RESPONSE TIME: < 150ms
- LOCAL DATABASE: PostgreSQL on-premise

### Tech Stack

- Backend: Python 3.11+ / FastAPI 0.116.1
- Frontend: React 18.3 / TypeScript 5.6 / TailwindCSS 3.4
- Database: PostgreSQL 15 (local)
- State: Context API + useReducer

---

## 📝 USAGE INSTRUCTIONS

To implement this feature using this PRP:

```
Using this PRP for [Feature Name], implement the [specific component/service]
following all Chefia POS standards. Ensure offline-first operation,
use TailwindCSS exclusively for styling, and maintain response times under 150ms.
Include comprehensive error handling and achieve >60% test coverage.
```

---

_Generated from: ${ARGUMENT}_
_PRP Template Version: 1.0.0_

```

## Extraction Rules

When analyzing the feature file:

### Feature Name
- Look for the main heading (# Title)
- Remove emojis and special characters
- Use underscores for file naming

### User Stories
- Look for "As a..." patterns
- Extract from requirements sections
- Generate if not explicitly stated

### Technical Requirements
- Identify backend mentions (API, service, repository)
- Identify frontend mentions (component, UI, screen)
- Detect database operations (create, update, schema)

### Affected Modules
- POS: payment, cashier, terminal
- KDS: kitchen, orders, display
- Waiter: tables, service
- Backend: API, services
- Frontend: UI components

### API Endpoints
- Look for HTTP methods (GET, POST, PUT, DELETE)
- Extract /api/ paths
- Identify REST patterns

### Acceptance Criteria
- Look for checkbox lists
- Extract from "Definition of Done"
- Find success criteria

## Output

After generating the PRP, respond with:

```

✅ PRP Generated Successfully!

📄 File: PRPs/features/PRP\_[feature-name].md
📊 Size: [file-size]
🎯 Feature: [feature-name]
📦 Affected Modules: [list-of-modules]

The PRP has been created and is ready for use in implementation prompts.

```

## Error Handling

If the feature file doesn't exist:
```

❌ Error: Feature file not found at ${ARGUMENT}
Please provide a valid path to a feature specification file.

```

If the base template is missing:
```

⚠️ Warning: Base template not found at PRPs/templates/prp_base.md
Generating PRP with minimal context.

```

---

*This is a Claude Code command definition*
*Version: 1.0.0*
*Command: /generate-prp*
```

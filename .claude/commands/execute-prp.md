# Execute PRP Command for Claude Code

## Description

This command executes a Product Requirement Prompt (PRP) to automatically implement all specified features, creating files, code, tests, and documentation according to the PRP specifications.

## Usage

```
/execute-prp <prp-file-path>
```

## Examples

```
/execute-prp PRPs/features/PRP_Table_Queue_Management.md
/execute-prp PRPs/features/PRP_Payment_Split.md
```

## Command Instructions for Claude

When this command is executed, you should:

1. **Load and Parse the PRP** from path: `${ARGUMENT}`
2. **Load system context** to ensure compliance with project standards:
   - `docs/ai/AI_CONTEXT_KNOWLEDGE_BASE.md` - System principles and constraints
   - `docs/ai/ARQUITETURA_TECNICA_COMPLETA.md` - Architecture patterns
   - `docs/ai/REGRAS_NEGOCIO_CONSOLIDADAS.md` - Business rules
   - `docs/ai/GUIA_DESENVOLVIMENTO.md` - Coding standards
   - `docs/ai/IMPLEMENTATION_CHECKLIST_SPRINT1.md` - Current sprint priorities
3. **Analyze Requirements** to determine what needs to be created
4. **Execute Implementation** in the correct order:
   - Backend models and schemas
   - Database migrations
   - Services and repositories
   - API endpoints
   - Frontend components
   - Integration code
   - Tests
   - Documentation updates
5. **Validate Implementation** against acceptance criteria
6. **Report Results** with created files and status

## Execution Flow

### Phase 1: Analysis and Planning

```yaml
steps: 1. Load PRP document
  2. Extract feature name and modules
  3. Parse blueprints and specifications
  4. Identify files to create/modify
  5. Determine execution order
  6. Check for conflicts or dependencies
```

### Phase 2: Backend Implementation

#### 2.1 Create Models

```python
# Path: src/[module]/models/[feature]_models.py
# Action: Create Pydantic models from PRP specification

from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

# Generate enums from PRP
class [Feature]Status(str, Enum):
    [statuses from PRP]

# Generate models from PRP
class [Feature]Model(BaseModel):
    """[Description from PRP]"""
    [fields from PRP specification]

class Create[Feature]DTO(BaseModel):
    """DTO for creating [feature]"""
    [required fields from PRP]

class Update[Feature]DTO(BaseModel):
    """DTO for updating [feature]"""
    [optional fields from PRP]
```

#### 2.2 Create Database Schema

```sql
-- Path: database/migrations/[timestamp]_create_[feature]_table.sql
-- Action: Generate migration from PRP schema blueprint

[PostgreSQL schema from PRP blueprint]
```

#### 2.3 Create Repository

```python
# Path: src/[module]/repositories/[feature]_repository.py
# Action: Generate repository with CRUD operations

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.repositories import BaseRepository

class [Feature]Repository(BaseRepository):
    """Repository for [feature] data access."""

    async def create(self, data: Create[Feature]DTO) -> [Feature]:
        [implementation based on PRP]

    async def get_by_id(self, id: str) -> Optional[[Feature]]:
        [implementation based on PRP]

    async def update(self, id: str, data: Update[Feature]DTO) -> [Feature]:
        [implementation based on PRP]

    async def delete(self, id: str) -> bool:
        [implementation based on PRP]

    [additional methods from PRP]
```

#### 2.4 Create Service

```python
# Path: src/[module]/services/[feature]_service.py
# Action: Generate service from PRP blueprint

[Service implementation from PRP blueprint with:
- Business logic
- Event publishing
- Error handling
- Permission checks]
```

#### 2.5 Create API Router

```python
# Path: src/[module]/router/[feature]_router.py
# Action: Generate FastAPI endpoints

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

router = APIRouter(prefix="/api/v1/[feature]", tags=["[feature]"])

[Generate all endpoints from PRP API specifications]
```

#### 2.6 Register Module

```python
# Path: src/main.py
# Action: Add router to main app

# Add import
from src.[module].router import [feature]_router

# Add to app
app.include_router([feature]_router.router)
```

### Phase 3: Frontend Implementation

#### 3.1 Create Types

```typescript
// Path: frontend/apps/[app]/src/types/[feature].types.ts
// Action: Generate TypeScript types from PRP

// Domain types with strict typing
export interface [Feature] {
  readonly id: string
  readonly restaurantId: string

  // Core properties (from PRP specification)
  name: string
  description?: string
  status: [Feature]Status

  // Relationships
  userId: string
  items: [Feature]Item[]

  // Metadata
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly deletedAt?: Date
}

// Enums for type safety
export enum [Feature]Status {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// DTOs for API communication
export interface Create[Feature]DTO {
  name: string
  description?: string
  items: Create[Feature]ItemDTO[]
}

export interface Update[Feature]DTO extends Partial<Create[Feature]DTO> {
  readonly id: string
}

// Response types with metadata
export interface [Feature]Response {
  success: boolean
  data: [Feature]
  metadata?: {
    timestamp: number
    version: string
  }
}

// Utility types
export type [Feature]FilterOptions = {
  status?: [Feature]Status
  startDate?: Date
  endDate?: Date
  search?: string
}
```

#### 3.2 Create API Client

```typescript
// Path: frontend/apps/[app]/src/services/[feature]Service.ts
// Action: Generate API client service with error handling and offline support

import { apiClient } from './apiClient'
import type {
  [Feature],
  Create[Feature]DTO,
  Update[Feature]DTO,
  [Feature]Response,
  [Feature]FilterOptions
} from '@/types/[feature].types'

class [Feature]Service {
  private readonly baseUrl = '/api/v1/[feature]'

  async create(data: Create[Feature]DTO): Promise<[Feature]> {
    try {
      const response = await apiClient.post<[Feature]Response>(
        this.baseUrl,
        data
      )

      if (!response.data.success) {
        throw new Error('Failed to create [feature]')
      }

      return response.data.data
    } catch (error) {
      // Handle offline scenario
      if (!navigator.onLine) {
        const offlineId = `offline_${Date.now()}`
        const offlineData = {
          ...data,
          id: offlineId,
          _offline: true,
          _syncPending: true
        }

        // Queue for sync
        await this.queueForSync('create', offlineData)
        return offlineData as [Feature]
      }

      throw error
    }
  }

  async getById(id: string): Promise<[Feature]> {
    // Check local cache first
    const cached = await this.getFromCache(id)
    if (cached) return cached

    const response = await apiClient.get<[Feature]Response>(
      `${this.baseUrl}/${id}`
    )

    // Cache the result
    await this.saveToCache(id, response.data.data)

    return response.data.data
  }

  async update(id: string, data: Update[Feature]DTO): Promise<[Feature]> {
    try {
      const response = await apiClient.put<[Feature]Response>(
        `${this.baseUrl}/${id}`,
        data
      )

      // Invalidate cache
      await this.invalidateCache(id)

      return response.data.data
    } catch (error) {
      if (!navigator.onLine) {
        await this.queueForSync('update', { id, ...data })

        // Optimistic update
        const current = await this.getFromCache(id)
        const updated = { ...current, ...data }
        await this.saveToCache(id, updated)

        return updated as [Feature]
      }

      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}`)
      await this.invalidateCache(id)
    } catch (error) {
      if (!navigator.onLine) {
        await this.queueForSync('delete', { id })
      }
      throw error
    }
  }

  async list(filters?: [Feature]FilterOptions): Promise<[Feature][]> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
    }

    const response = await apiClient.get<{ data: [Feature][] }>(
      `${this.baseUrl}?${params}`
    )

    return response.data.data
  }

  // Cache helpers
  private async getFromCache(id: string): Promise<[Feature] | null> {
    const cached = localStorage.getItem(`[feature]_${id}`)
    return cached ? JSON.parse(cached) : null
  }

  private async saveToCache(id: string, data: [Feature]): Promise<void> {
    localStorage.setItem(`[feature]_${id}`, JSON.stringify(data))
  }

  private async invalidateCache(id: string): Promise<void> {
    localStorage.removeItem(`[feature]_${id}`)
  }

  private async queueForSync(action: string, data: any): Promise<void> {
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]')
    queue.push({
      entity: '[feature]',
      action,
      data,
      timestamp: Date.now()
    })
    localStorage.setItem('offline_queue', JSON.stringify(queue))
  }
}

export const [feature]Service = new [Feature]Service()
```

#### 3.3 Create Main Component

```typescript
// Path: frontend/apps/[app]/src/components/[feature]/[Feature]Component.tsx
// Action: Generate main React component with TailwindCSS

import React, { memo, useState, useCallback, useMemo } from 'react'
import { use[Feature] } from '@/hooks/use[Feature]'
import { [Feature]List } from './[Feature]List'
import { [Feature]Form } from './[Feature]Form'
import { [Feature]Detail } from './[Feature]Detail'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorMessage } from '@/components/common/ErrorMessage'
import type { [Feature], Create[Feature]DTO } from '@/types/[feature].types'

interface [Feature]ComponentProps {
  initialView?: 'list' | 'create' | 'detail'
  onSuccess?: (data: [Feature]) => void
}

export const [Feature]Component = memo(({
  initialView = 'list',
  onSuccess
}: [Feature]ComponentProps) => {
  // State management
  const [view, setView] = useState(initialView)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Custom hook for data and operations
  const {
    items,
    loading,
    error,
    create,
    update,
    remove,
    refresh
  } = use[Feature]()

  // Handlers
  const handleCreate = useCallback(async (data: Create[Feature]DTO) => {
    try {
      const created = await create(data)
      onSuccess?.(created)
      setView('list')
    } catch (error) {
      console.error('Failed to create:', error)
    }
  }, [create, onSuccess])

  const handleEdit = useCallback((id: string) => {
    setSelectedId(id)
    setView('detail')
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      await remove(id)
      await refresh()
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }, [remove, refresh])

  // Loading state
  if (loading && !items.length) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <ErrorMessage
        message={error.message}
        onRetry={refresh}
      />
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            [Feature] Management
          </h2>

          <div className="flex gap-2">
            {view === 'list' && (
              <button
                onClick={() => setView('create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                         transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 4v16m8-8H4" />
                </svg>
                Create New
              </button>
            )}

            {view !== 'list' && (
              <button
                onClick={() => setView('list')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg
                         hover:bg-gray-50 transition-colors duration-200"
              >
                Back to List
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {view === 'list' && (
          <[Feature]List
            items={items}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {view === 'create' && (
          <[Feature]Form
            onSubmit={handleCreate}
            onCancel={() => setView('list')}
          />
        )}

        {view === 'detail' && selectedId && (
          <[Feature]Detail
            id={selectedId}
            onEdit={(data) => update(selectedId, data)}
            onBack={() => setView('list')}
          />
        )}
      </div>
    </div>
  )
})

[Feature]Component.displayName = '[Feature]Component'
```

#### 3.4 Create List Component

```typescript
// Path: frontend/apps/[app]/src/components/[feature]/[Feature]List.tsx
// Action: Generate list component with TailwindCSS table

import React, { memo, useState, useMemo } from 'react'
import type { [Feature] } from '@/types/[feature].types'

interface [Feature]ListProps {
  items: [Feature][]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export const [Feature]List = memo(({
  items,
  onEdit,
  onDelete
}: [Feature]ListProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<keyof [Feature]>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter and sort items
  const processedItems = useMemo(() => {
    let filtered = items

    // Apply search filter
    if (searchTerm) {
      filtered = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [items, searchTerm, sortBy, sortOrder])

  const handleSort = (column: keyof [Feature]) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th
                onClick={() => handleSort('name')}
                className="text-left py-3 px-4 font-semibold text-gray-700
                         cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  Name
                  {sortBy === 'name' && (
                    <span className="text-blue-500">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Description
              </th>
              <th
                onClick={() => handleSort('status')}
                className="text-left py-3 px-4 font-semibold text-gray-700
                         cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  Status
                  {sortBy === 'status' && (
                    <span className="text-blue-500">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Created
              </th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {processedItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  No items found
                </td>
              </tr>
            ) : (
              processedItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-900">
                      {item.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {item.description || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => onEdit(item.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg
                                 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg
                                 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
})

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusStyles = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium
                    ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

[Feature]List.displayName = '[Feature]List'
```

#### 3.5 Create Form Component

```typescript
// Path: frontend/apps/[app]/src/components/[feature]/[Feature]Form.tsx
// Action: Generate form component with validation

import React, { memo, useState, useCallback } from 'react'
import type { Create[Feature]DTO } from '@/types/[feature].types'

interface [Feature]FormProps {
  initialData?: Partial<Create[Feature]DTO>
  onSubmit: (data: Create[Feature]DTO) => Promise<void>
  onCancel: () => void
}

export const [Feature]Form = memo(({
  initialData,
  onSubmit,
  onCancel
}: [Feature]FormProps) => {
  const [formData, setFormData] = useState<Partial<Create[Feature]DTO>>(
    initialData || {}
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required'
    }

    // Add more validation rules based on PRP

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // Handle submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    try {
      await onSubmit(formData as Create[Feature]DTO)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setLoading(false)
    }
  }, [formData, validate, onSubmit])

  // Handle field change
  const handleChange = useCallback((
    field: keyof Create[Feature]DTO,
    value: any
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [errors])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Name *
        </label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2
                    focus:ring-blue-500 focus:border-transparent
                    ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Enter name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Description Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter description"
          rows={4}
        />
      </div>

      {/* Additional fields based on PRP */}

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg
                   hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors disabled:opacity-50
                   flex items-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
})

[Feature]Form.displayName = '[Feature]Form'
```

#### 3.6 Create Custom Hook

```typescript
// Path: frontend/apps/[app]/src/hooks/use[Feature].ts
// Action: Generate custom hook with state management

import { useState, useEffect, useCallback, useRef } from 'react'
import { [feature]Service } from '@/services/[feature]Service'
import { useOfflineQueue } from './useOfflineQueue'
import { useWebSocket } from './useWebSocket'
import type {
  [Feature],
  Create[Feature]DTO,
  Update[Feature]DTO,
  [Feature]FilterOptions
} from '@/types/[feature].types'

interface Use[Feature]Return {
  items: [Feature][]
  loading: boolean
  error: Error | null
  selectedItem: [Feature] | null
  create: (data: Create[Feature]DTO) => Promise<[Feature]>
  update: (id: string, data: Update[Feature]DTO) => Promise<[Feature]>
  remove: (id: string) => Promise<void>
  refresh: () => Promise<void>
  setFilter: (filter: [Feature]FilterOptions) => void
}

export const use[Feature] = (
  initialFilter?: [Feature]FilterOptions
): Use[Feature]Return => {
  // State
  const [items, setItems] = useState<[Feature][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [selectedItem, setSelectedItem] = useState<[Feature] | null>(null)
  const [filter, setFilter] = useState(initialFilter || {})

  // Refs for cleanup
  const isMounted = useRef(true)

  // Offline support
  const { addToQueue, isOffline } = useOfflineQueue()

  // WebSocket for real-time updates
  const { subscribe, unsubscribe } = useWebSocket()

  // Load items
  const loadItems = useCallback(async () => {
    if (!isMounted.current) return

    setLoading(true)
    setError(null)

    try {
      const data = await [feature]Service.list(filter)

      if (isMounted.current) {
        setItems(data)
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err as Error)
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [filter])

  // Create item
  const create = useCallback(async (data: Create[Feature]DTO): Promise<[Feature]> => {
    try {
      const created = await [feature]Service.create(data)

      // Optimistic update
      setItems(prev => [...prev, created])

      return created
    } catch (error) {
      // If offline, still return the queued item
      if (isOffline && error.message.includes('offline')) {
        const offlineItem = {
          ...data,
          id: `offline_${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        } as [Feature]

        setItems(prev => [...prev, offlineItem])
        return offlineItem
      }

      throw error
    }
  }, [isOffline])

  // Update item
  const update = useCallback(async (
    id: string,
    data: Update[Feature]DTO
  ): Promise<[Feature]> => {
    try {
      const updated = await [feature]Service.update(id, data)

      // Optimistic update
      setItems(prev => prev.map(item =>
        item.id === id ? updated : item
      ))

      return updated
    } catch (error) {
      if (isOffline) {
        // Optimistic offline update
        const optimisticUpdate = { id, ...data } as [Feature]
        setItems(prev => prev.map(item =>
          item.id === id ? { ...item, ...data } : item
        ))
        return optimisticUpdate
      }

      throw error
    }
  }, [isOffline])

  // Remove item
  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      await [feature]Service.delete(id)

      // Optimistic update
      setItems(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      if (isOffline) {
        // Mark for deletion when online
        setItems(prev => prev.map(item =>
          item.id === id ? { ...item, _deleted: true } : item
        ))
      } else {
        throw error
      }
    }
  }, [isOffline])

  // Refresh
  const refresh = useCallback(async () => {
    await loadItems()
  }, [loadItems])

  // WebSocket handlers
  useEffect(() => {
    const handleCreate = (data: [Feature]) => {
      setItems(prev => [...prev, data])
    }

    const handleUpdate = (data: [Feature]) => {
      setItems(prev => prev.map(item =>
        item.id === data.id ? data : item
      ))
    }

    const handleDelete = (data: { id: string }) => {
      setItems(prev => prev.filter(item => item.id !== data.id))
    }

    // Subscribe to WebSocket events
    subscribe('[feature].created', handleCreate)
    subscribe('[feature].updated', handleUpdate)
    subscribe('[feature].deleted', handleDelete)

    return () => {
      unsubscribe('[feature].created', handleCreate)
      unsubscribe('[feature].updated', handleUpdate)
      unsubscribe('[feature].deleted', handleDelete)
    }
  }, [subscribe, unsubscribe])

  // Initial load
  useEffect(() => {
    loadItems()

    return () => {
      isMounted.current = false
    }
  }, [loadItems])

  // Auto-refresh when filter changes
  useEffect(() => {
    loadItems()
  }, [filter, loadItems])

  return {
    items,
    loading,
    error,
    selectedItem,
    create,
    update,
    remove,
    refresh,
    setFilter
  }
}
```

#### 3.7 Add to UI Page

```typescript
// Path: frontend/apps/[app]/src/ui/[Feature]Page.tsx
// Action: Create page component with layout

import React, { Suspense, lazy } from 'react'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

// Lazy load the main component for code splitting
const [Feature]Component = lazy(() =>
  import('@/components/[feature]/[Feature]Component')
    .then(module => ({ default: module.[Feature]Component }))
)

export const [Feature]Page: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            [Feature] Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage and configure [feature] for your restaurant
          </p>
        </div>

        {/* Main Content */}
        <ErrorBoundary fallback={<ErrorFallback />}>
          <Suspense fallback={<PageLoader />}>
            <[Feature]Component />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}

// Loading component
const PageLoader: React.FC = () => (
  <div className="bg-white rounded-lg shadow-lg p-8">
    <div className="flex justify-center items-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  </div>
)

// Error fallback component
const ErrorFallback: React.FC = () => (
  <div className="bg-white rounded-lg shadow-lg p-8">
    <div className="text-center">
      <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 className="mt-2 text-lg font-medium text-gray-900">
        Something went wrong
      </h3>
      <p className="mt-1 text-gray-500">
        Please refresh the page or contact support if the problem persists.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Refresh Page
      </button>
    </div>
  </div>
)
```

### Phase 4: Integration

#### 4.1 Create Events

```python
# Path: src/[module]/events/[feature]_events.py
# Action: Generate event definitions

from src.core.events import BaseEvent

class [Feature]CreatedEvent(BaseEvent):
    event_type = "[feature].created"
    [payload from PRP]

class [Feature]UpdatedEvent(BaseEvent):
    event_type = "[feature].updated"
    [payload from PRP]

[additional events from PRP]
```

#### 4.2 Setup Cache

```python
# Path: src/[module]/cache/[feature]_cache.py
# Action: Generate cache layer if specified in PRP

[Redis cache implementation from PRP blueprint]
```

### Phase 5: Testing

#### 5.1 Backend Unit Tests

```python
# Path: src/[module]/tests/test_[feature]_service.py
# Action: Generate service tests

import pytest
from unittest.mock import Mock, AsyncMock

@pytest.mark.asyncio
async def test_create_[feature]():
    """Test creating a [feature]."""
    [test implementation based on PRP]

@pytest.mark.asyncio
async def test_update_[feature]():
    """Test updating a [feature]."""
    [test implementation based on PRP]

[additional tests from PRP]
```

#### 5.2 API Integration Tests

```python
# Path: src/[module]/tests/test_[feature]_api.py
# Action: Generate API tests

from fastapi.testclient import TestClient
import pytest

def test_create_[feature]_endpoint(client: TestClient):
    """Test POST /api/v1/[feature]"""
    [test implementation based on PRP]

[additional API tests from PRP]
```

#### 5.3 Frontend Component Tests

```typescript
// Path: frontend/apps/[app]/src/components/[feature]/[Feature]Component.test.tsx
// Action: Generate component tests

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { [Feature]Component } from './[Feature]Component'

describe('[Feature]Component', () => {
  it('should render correctly', () => {
    [test implementation based on PRP]
  })

  it('should handle form submission', async () => {
    [test implementation based on PRP]
  })

  [additional tests from PRP]
})
```

### Phase 6: Documentation

#### 6.1 Update API Documentation

```yaml
# Path: docs/api/[feature].yaml
# Action: Generate OpenAPI documentation

paths:
  /api/v1/[feature]: [OpenAPI specification from PRP]
```

#### 6.2 Update README

```markdown
# Path: src/[module]/README.md

# Action: Add feature documentation

## [Feature Name]

[Description from PRP]

### Endpoints

[List of API endpoints from PRP]

### Usage

[Usage examples from PRP]
```

## Execution Report Template

After execution, provide a detailed report:

````markdown
# 🚀 PRP Execution Report

## Feature: [Feature Name]

**PRP Source**: ${ARGUMENT}
**Execution Date**: [current-date]
**Status**: ✅ Success | ⚠️ Partial | ❌ Failed

## 📁 Files Created

### Backend (Python/FastAPI)

- ✅ `src/[module]/models/[feature]_models.py` - Models and DTOs
- ✅ `src/[module]/services/[feature]_service.py` - Business logic
- ✅ `src/[module]/repositories/[feature]_repository.py` - Data access
- ✅ `src/[module]/router/[feature]_router.py` - API endpoints
- ✅ `src/[module]/events/[feature]_events.py` - Event definitions
- ✅ `database/migrations/[timestamp]_[feature].sql` - Database schema

### Frontend (React/TypeScript)

- ✅ `frontend/apps/[app]/src/types/[feature].types.ts` - TypeScript types
- ✅ `frontend/apps/[app]/src/services/[feature]Service.ts` - API client
- ✅ `frontend/apps/[app]/src/components/[feature]/` - Components
- ✅ `frontend/apps/[app]/src/hooks/use[Feature].ts` - Custom hook

### Tests

- ✅ `src/[module]/tests/test_[feature]_service.py` - Service tests
- ✅ `src/[module]/tests/test_[feature]_api.py` - API tests
- ✅ `frontend/[app]/src/components/[feature]/[Feature].test.tsx` - Component tests

## 🔧 Configuration Updates

- ✅ Router registered in `src/main.py`
- ✅ Migration added to queue
- ✅ Types exported from index

## ✅ Acceptance Criteria Validation

[Check each criterion from PRP]

- [x] Criterion 1: Implemented
- [x] Criterion 2: Implemented
- [ ] Criterion 3: Pending (reason)

## 📊 Metrics

- **Files Created**: [count]
- **Lines of Code**: [count]
- **Test Coverage**: [percentage]
- **Bundle Impact**: +[size]KB

## 🚨 Warnings/Issues

[Any issues encountered during execution]

## 📝 Next Steps

1. Run database migration: `alembic upgrade head`
2. Run tests: `pytest src/[module]/tests/`
3. Check bundle size: `npm run build && npm run analyze`
4. Deploy to staging for validation

## 💡 Usage Example

```python
# Backend usage
from src.[module].services import [feature]_service

result = await [feature]_service.create_[feature](data)
```
````

```typescript
// Frontend usage
import { use[Feature] } from '@/hooks/use[Feature]'

const { data, loading, error } = use[Feature]()
```

```

## Error Handling

### PRP Not Found
```

❌ Error: PRP file not found at ${ARGUMENT}
Please ensure the PRP file exists and the path is correct.

```

### Invalid PRP Format
```

❌ Error: Invalid PRP format
The PRP file must contain required sections:

- Feature Specification
- Technical Requirements
- Implementation Specification
- Acceptance Criteria

```

### File Already Exists
```

⚠️ Warning: File already exists at [path]
Options:

1. Skip this file
2. Backup and overwrite
3. Merge changes
   Please choose an option: [1/2/3]

```

### Dependency Missing
```

❌ Error: Required dependency not found
The feature requires [dependency] which is not installed.
Run: pip install [dependency] or npm install [dependency]

```

## Validation Checklist

Before marking execution as complete, verify:

- [ ] All models follow Pydantic v2 patterns
- [ ] Services use async/await properly
- [ ] API endpoints have proper error handling
- [ ] Frontend components use TypeScript strict mode
- [ ] No Material-UI components used
- [ ] Bundle size impact < 50KB
- [ ] Response time < 150ms
- [ ] Offline support implemented
- [ ] Tests have > 60% coverage
- [ ] Events are properly published
- [ ] Documentation is updated

## Advanced Options

### Partial Execution
```

/execute-prp ${ARGUMENT} --only backend
/execute-prp ${ARGUMENT} --only frontend
/execute-prp ${ARGUMENT} --only tests

```

### Dry Run Mode
```

/execute-prp ${ARGUMENT} --dry-run

```
Shows what would be created without actually creating files.

### Force Overwrite
```

/execute-prp ${ARGUMENT} --force

```
Overwrites existing files without prompting.

---

*This is a Claude Code command definition*
*Version: 1.0.0*
*Command: /execute-prp*
*Dependencies: /generate-prp command must be run first*
```

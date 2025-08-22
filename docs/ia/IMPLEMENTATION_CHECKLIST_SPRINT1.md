# 🚀 Implementation Checklist - Sprint 1 (Weeks 1-4)

## Sprint Overview
**Objective**: Implement critical operational features blocking restaurant operations
**Budget**: R$ 110,000
**Team**: 3 developers + 1 QA
**Deadline**: 4 weeks from start

---

## 🔴 WEEK 1: Shift Management System

### Backend Tasks
- [ ] Create shift module structure (`src/shift/`)
- [ ] Implement models:
  ```python
  # src/shift/models/shift_models.py
  - ShiftModel (id, name, start_time, end_time, cashier_id, status)
  - ShiftReportModel (sales, payments, withdrawals, final_balance)
  - ShiftTransferModel (from_cashier, to_cashier, balance, timestamp)
  ```
- [ ] Create services:
  - [ ] `shift_service.py` - Open/close shift logic
  - [ ] `shift_report_service.py` - Generate shift reports
  - [ ] `shift_validation_service.py` - Validate shift operations
- [ ] Create API endpoints:
  - [ ] `POST /api/shifts/open` - Start new shift
  - [ ] `POST /api/shifts/close` - Close current shift
  - [ ] `GET /api/shifts/current` - Get active shift
  - [ ] `POST /api/shifts/transfer` - Transfer shift between cashiers
  - [ ] `GET /api/shifts/report/{shift_id}` - Get shift report
- [ ] Integrate with existing modules:
  - [ ] Link to cashier operations
  - [ ] Link to business_day module
  - [ ] Update payment module to check shift status

### Frontend Tasks
- [ ] Create shift components in POS:
  ```typescript
  // frontend/apps/pos/src/components/shift/
  - ShiftOpenDialog.tsx
  - ShiftCloseDialog.tsx  
  - ShiftTransferDialog.tsx
  - ShiftReportView.tsx
  - ShiftStatusIndicator.tsx
  ```
- [ ] Add shift state management:
  - [ ] Create `useShift` hook
  - [ ] Add shift context provider
  - [ ] Update AuthGuard to check shift status
- [ ] Update cashier page to require shift
- [ ] Add shift indicator to header

### Tests Required
- [ ] Unit tests for shift services
- [ ] Integration tests for shift flow
- [ ] E2E test: Open shift → Make sales → Close shift

---

## 🔴 WEEK 2: TEF/Payment Terminal Integration

### Backend Tasks
- [ ] Expand payment terminal module:
  ```python
  # src/peripherals/drivers/
  - stone_terminal.py (Stone TEF)
  - cielo_terminal.py (Cielo LIO/TEF)
  - getnet_terminal.py (GetNet TEF)
  ```
- [ ] Implement TEF protocol handlers:
  - [ ] SiTef protocol implementation
  - [ ] PayGo protocol implementation
  - [ ] E1 protocol implementation
- [ ] Create payment flow services:
  - [ ] `tef_transaction_service.py` - Handle TEF transactions
  - [ ] `tef_reconciliation_service.py` - Reconcile TEF with orders
  - [ ] `tef_contingency_service.py` - Handle offline scenarios
- [ ] Add TEF configuration endpoints:
  - [ ] `POST /api/peripherals/tef/configure`
  - [ ] `POST /api/peripherals/tef/test`
  - [ ] `GET /api/peripherals/tef/status`

### Frontend Tasks
- [ ] Create TEF configuration UI:
  ```typescript
  // frontend/apps/pos/src/components/tef/
  - TEFConfigDialog.tsx
  - TEFTestDialog.tsx
  - TEFStatusMonitor.tsx
  ```
- [ ] Update payment page:
  - [ ] Add TEF payment option
  - [ ] Show TEF terminal status
  - [ ] Handle TEF callbacks and messages
- [ ] Add TEF transaction flow:
  - [ ] Show "Insert card" message
  - [ ] Display transaction progress
  - [ ] Handle approval/denial
  - [ ] Print receipt via TEF

### Tests Required
- [ ] Mock TEF terminal tests
- [ ] Payment flow integration tests
- [ ] Contingency scenario tests

---

## 🔴 WEEK 3: Table Management & Real-time Sync

### Backend Tasks
- [ ] Enhance table module:
  ```python
  # src/waiter/models/table_models.py
  - TableStateModel (occupied, reserved, available, cleaning)
  - TableTransferModel (from_table, to_table, items)
  - TableSplitModel (original_table, new_tables, items_distribution)
  ```
- [ ] Implement WebSocket endpoints:
  - [ ] `/ws/tables` - Real-time table updates
  - [ ] `/ws/orders` - Real-time order updates
  - [ ] `/ws/notifications` - System notifications
- [ ] Create table services:
  - [ ] `table_sync_service.py` - Sync table states
  - [ ] `table_transfer_service.py` - Transfer orders between tables
  - [ ] `table_split_service.py` - Split table bills
- [ ] Add table management endpoints:
  - [ ] `POST /api/tables/transfer`
  - [ ] `POST /api/tables/split`
  - [ ] `POST /api/tables/merge`
  - [ ] `PATCH /api/tables/{id}/state`

### Frontend Tasks
- [ ] Implement WebSocket client:
  ```typescript
  // frontend/common/src/services/websocket.ts
  - WebSocketManager class
  - Auto-reconnection logic
  - Message queue for offline
  ```
- [ ] Update table layout page:
  - [ ] Real-time table status updates
  - [ ] Drag-and-drop table transfer
  - [ ] Visual table states (colors/icons)
  - [ ] Quick actions menu per table
- [ ] Create table management dialogs:
  - [ ] Transfer items dialog
  - [ ] Split bill dialog
  - [ ] Merge tables dialog
- [ ] Add table notifications:
  - [ ] New order on table
  - [ ] Table requesting service
  - [ ] Payment completed

### Tests Required
- [ ] WebSocket connection tests
- [ ] Table state synchronization tests
- [ ] Multi-terminal sync tests

---

## 🔴 WEEK 4: Integration & Stabilization

### Critical Integrations
- [ ] **iFood Webhook Implementation**:
  ```python
  # src/remote_orders/adapters/ifood/
  - webhook_handler.py (complete implementation)
  - menu_sync_service.py
  - order_status_service.py
  ```
  - [ ] Handle order confirmation
  - [ ] Handle order cancellation
  - [ ] Handle order dispatch
  - [ ] Sync menu availability

- [ ] **WhatsApp Order Flow**:
  ```python
  # src/whatsapp/
  - order_flow_handler.py
  - menu_presenter.py
  - payment_handler.py
  ```
  - [ ] Menu navigation via WhatsApp
  - [ ] Cart management
  - [ ] Address collection
  - [ ] Payment link generation

### System Stabilization
- [ ] **Performance Optimization**:
  - [ ] Database query optimization
  - [ ] API response time < 100ms
  - [ ] Frontend bundle analysis
  - [ ] Memory leak detection

- [ ] **Error Handling**:
  - [ ] Global error boundaries
  - [ ] Retry mechanisms
  - [ ] Graceful degradation
  - [ ] Error logging and monitoring

- [ ] **Data Validation**:
  - [ ] Input sanitization
  - [ ] Business rule validation
  - [ ] Database constraints
  - [ ] API contract testing

### Final Testing
- [ ] **Integration Tests**:
  - [ ] Full order flow (create → pay → close)
  - [ ] Shift lifecycle (open → operations → close)
  - [ ] Multi-terminal scenarios
  - [ ] Offline/online transitions

- [ ] **Load Testing**:
  - [ ] 100 concurrent orders
  - [ ] 50 simultaneous payments
  - [ ] 20 terminals active
  - [ ] 1000 products in catalog

- [ ] **User Acceptance Testing**:
  - [ ] Restaurant staff training
  - [ ] Real environment testing
  - [ ] Feedback collection
  - [ ] Bug fixing

---

## 📊 Success Metrics

### Technical Metrics
- ✅ All endpoints responding < 100ms
- ✅ Zero critical bugs in production
- ✅ 95% test coverage on new code
- ✅ Successful TEF transactions
- ✅ Real-time sync working across terminals

### Business Metrics
- ✅ Complete shift lifecycle working
- ✅ TEF payments processing successfully
- ✅ Tables syncing in real-time
- ✅ iFood orders flowing automatically
- ✅ WhatsApp orders being received

---

## 🚨 Risk Mitigation

### High-Risk Items
1. **TEF Integration Complexity**
   - Mitigation: Start with simulator, gradually add providers
   - Fallback: Manual card machine entry

2. **WebSocket Stability**
   - Mitigation: Implement reconnection and queueing
   - Fallback: Polling mechanism

3. **iFood API Changes**
   - Mitigation: Version lock and monitoring
   - Fallback: Manual order entry

### Contingency Plans
- Week 1 delay: Simplify shift reports
- Week 2 delay: Focus on one TEF provider
- Week 3 delay: Basic table sync without transfers
- Week 4 delay: Postpone WhatsApp to Sprint 2

---

## 👥 Team Allocation

### Developer 1 (Backend Lead)
- Week 1: Shift management backend
- Week 2: TEF integration
- Week 3: WebSocket implementation
- Week 4: Integration support

### Developer 2 (Frontend Lead)
- Week 1: Shift management UI
- Week 2: Payment page updates
- Week 3: Table management UI
- Week 4: Testing and polish

### Developer 3 (Full Stack)
- Week 1: Shift-cashier integration
- Week 2: TEF configuration UI
- Week 3: Real-time notifications
- Week 4: iFood & WhatsApp

### QA Engineer
- Week 1: Test plan creation
- Week 2: Shift testing
- Week 3: Payment testing
- Week 4: Full regression

---

## 📝 Daily Standup Topics

### Week 1 Focus
- Shift model design decisions
- Integration with existing cashier
- Report requirements clarification

### Week 2 Focus
- TEF provider prioritization
- Payment flow edge cases
- Terminal communication issues

### Week 3 Focus
- WebSocket performance
- Table state conflicts
- Multi-terminal sync issues

### Week 4 Focus
- Integration test results
- Performance bottlenecks
- Go-live preparation

---

## ✅ Definition of Done

Each feature is considered DONE when:
1. Code is written and reviewed
2. Unit tests pass (>80% coverage)
3. Integration tests pass
4. Documentation is updated
5. No critical bugs remain
6. Performance meets requirements
7. Feature works offline (where applicable)
8. QA has signed off

---

## 🚀 Sprint 1 Deliverables

By end of Week 4, the system will have:
1. ✅ Complete shift management system
2. ✅ Working TEF integration (at least 1 provider)
3. ✅ Real-time table management
4. ✅ Basic iFood webhook handling
5. ✅ WhatsApp order receiving capability

This forms the foundation for a production-ready POS system that can handle real restaurant operations.
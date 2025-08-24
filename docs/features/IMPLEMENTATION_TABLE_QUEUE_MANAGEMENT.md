# 📋 Implementation Guide: Table Management, Queue System & Command Cards

## Executive Summary
Complete implementation guide for table management with waiting queue, physical command cards (barcode/QR), and self-service weight-based billing for restaurants.

---

## 🎯 PART 1: TABLE & QUEUE MANAGEMENT

### 1.1 Database Models

```python
# src/tables/models/queue_models.py
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum

class QueueStatus(str, Enum):
    WAITING = "waiting"
    NOTIFIED = "notified" 
    SEATED = "seated"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class PartySize(str, Enum):
    SMALL = "1-2"
    MEDIUM = "3-4"
    LARGE = "5-6"
    XLARGE = "7+"

class WaitingQueueEntry(BaseModel):
    """Customer waiting for table"""
    id: str = Field(default_factory=lambda: f"WQ{int(datetime.now().timestamp())}")
    customer_name: str
    customer_phone: str
    party_size: int
    party_type: PartySize
    estimated_wait_minutes: int
    check_in_time: datetime = Field(default_factory=datetime.now)
    notification_time: Optional[datetime] = None
    seated_time: Optional[datetime] = None
    status: QueueStatus = QueueStatus.WAITING
    table_preferences: List[str] = []  # ["window", "quiet", "highchair"]
    notes: Optional[str] = None
    notification_method: str = "sms"  # sms, whatsapp, call
    position_in_queue: int = 0

class TableAvailability(BaseModel):
    """Real-time table status"""
    table_id: str
    capacity: int
    current_status: str  # available, occupied, reserved, cleaning
    estimated_available_time: Optional[datetime] = None
    current_order_id: Optional[str] = None
    cleanup_time_minutes: int = 10
    average_dining_time: int = 60  # Based on historical data
```

### 1.2 Queue Management Service

```python
# src/tables/services/queue_service.py
import asyncio
from typing import List, Optional
from datetime import datetime, timedelta
from src.core.events import EventBus
from src.notification.services import NotificationService

class QueueManagementService:
    """Manages restaurant waiting queue with smart predictions"""
    
    def __init__(self):
        self.queue: List[WaitingQueueEntry] = []
        self.notification_service = NotificationService()
        self.event_bus = EventBus()
        
    async def add_to_queue(
        self, 
        customer_data: dict
    ) -> WaitingQueueEntry:
        """Add customer to waiting queue"""
        
        # Create queue entry
        entry = WaitingQueueEntry(**customer_data)
        
        # Calculate estimated wait time
        entry.estimated_wait_minutes = await self._calculate_wait_time(
            party_size=entry.party_size
        )
        
        # Determine queue position
        entry.position_in_queue = len(self.queue) + 1
        
        # Add to queue
        self.queue.append(entry)
        
        # Send confirmation
        await self._send_queue_confirmation(entry)
        
        # Publish event
        await self.event_bus.publish("queue.customer_added", {
            "entry_id": entry.id,
            "position": entry.position_in_queue,
            "estimated_wait": entry.estimated_wait_minutes
        })
        
        return entry
    
    async def notify_customer_table_ready(
        self, 
        entry_id: str,
        table_id: str
    ) -> bool:
        """Notify customer their table is ready"""
        
        entry = self._get_entry(entry_id)
        if not entry:
            return False
            
        # Update status
        entry.status = QueueStatus.NOTIFIED
        entry.notification_time = datetime.now()
        
        # Send notification based on preference
        message = f"Olá {entry.customer_name}! Sua mesa está pronta. " \
                 f"Mesa {table_id}. Por favor, dirija-se ao balcão."
        
        if entry.notification_method == "whatsapp":
            await self.notification_service.send_whatsapp(
                phone=entry.customer_phone,
                message=message
            )
        elif entry.notification_method == "sms":
            await self.notification_service.send_sms(
                phone=entry.customer_phone,
                message=message
            )
        else:
            # In-restaurant announcement
            await self.event_bus.publish("queue.announce_customer", {
                "customer_name": entry.customer_name,
                "table_id": table_id
            })
        
        # Start no-show timer (5 minutes)
        asyncio.create_task(self._check_no_show(entry_id, delay_minutes=5))
        
        return True
    
    async def _calculate_wait_time(self, party_size: int) -> int:
        """Smart wait time calculation based on current state"""
        
        # Get current table states
        tables = await self._get_all_tables()
        
        # Find suitable tables for party size
        suitable_tables = [
            t for t in tables 
            if t.capacity >= party_size and t.capacity <= party_size + 2
        ]
        
        if not suitable_tables:
            return 60  # Default 1 hour if no suitable tables
        
        # Calculate based on current occupancy
        available_soon = []
        for table in suitable_tables:
            if table.current_status == "available":
                return 5  # Immediate seating
            elif table.current_status == "occupied":
                # Estimate based on order start time
                remaining = table.average_dining_time - self._get_elapsed_time(table)
                available_soon.append(remaining + table.cleanup_time_minutes)
        
        # Return minimum wait time
        return min(available_soon) if available_soon else 45
    
    async def _check_no_show(self, entry_id: str, delay_minutes: int):
        """Check if customer showed up after notification"""
        await asyncio.sleep(delay_minutes * 60)
        
        entry = self._get_entry(entry_id)
        if entry and entry.status == QueueStatus.NOTIFIED:
            entry.status = QueueStatus.NO_SHOW
            
            # Move to next customer
            await self._process_next_in_queue()
```

### 1.3 Frontend Queue Display

```typescript
// frontend/apps/pos/src/components/queue/QueueManagementPanel.tsx
import React, { useState, useEffect } from 'react'
import { useWebSocket } from '../../hooks/useWebSocket'

interface QueueEntry {
  id: string
  customer_name: string
  customer_phone: string
  party_size: number
  estimated_wait_minutes: number
  check_in_time: Date
  status: 'waiting' | 'notified' | 'seated' | 'no_show'
  position_in_queue: number
}

export const QueueManagementPanel: React.FC = () => {
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const { subscribe } = useWebSocket()
  
  useEffect(() => {
    // Subscribe to queue updates
    const unsubscribe = subscribe('queue.updated', (data) => {
      setQueue(data.queue)
    })
    
    return unsubscribe
  }, [])
  
  const handleAddToQueue = async (customerData: any) => {
    const response = await fetch('/api/tables/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData)
    })
    
    if (response.ok) {
      const entry = await response.json()
      
      // Show ticket/position
      alert(`Posição na fila: ${entry.position_in_queue}\n` +
            `Tempo estimado: ${entry.estimated_wait_minutes} minutos`)
    }
  }
  
  const handleNotifyCustomer = async (entryId: string, tableId: string) => {
    await fetch(`/api/tables/queue/${entryId}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: tableId })
    })
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Fila de Espera</h2>
        <button
          onClick={() => setShowAddDialog(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          Adicionar à Fila
        </button>
      </div>
      
      <div className="space-y-4">
        {queue.map((entry) => (
          <QueueCard
            key={entry.id}
            entry={entry}
            onNotify={handleNotifyCustomer}
          />
        ))}
      </div>
      
      {showAddDialog && (
        <AddToQueueDialog
          onAdd={handleAddToQueue}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  )
}

const QueueCard: React.FC<{
  entry: QueueEntry
  onNotify: (id: string, table: string) => void
}> = ({ entry, onNotify }) => {
  const statusColors = {
    waiting: 'bg-yellow-100 text-yellow-800',
    notified: 'bg-blue-100 text-blue-800',
    seated: 'bg-green-100 text-green-800',
    no_show: 'bg-red-100 text-red-800'
  }
  
  return (
    <div className="border rounded-lg p-4 flex justify-between items-center">
      <div>
        <div className="flex items-center gap-4">
          <span className="text-3xl font-bold text-gray-500">
            #{entry.position_in_queue}
          </span>
          <div>
            <h3 className="font-semibold">{entry.customer_name}</h3>
            <p className="text-sm text-gray-600">
              {entry.party_size} pessoas • {entry.customer_phone}
            </p>
            <p className="text-sm text-gray-500">
              Esperando há {getWaitingTime(entry.check_in_time)}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-xs ${statusColors[entry.status]}`}>
          {entry.status}
        </span>
        
        {entry.status === 'waiting' && (
          <button
            onClick={() => {
              const table = prompt('Número da mesa:')
              if (table) onNotify(entry.id, table)
            }}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Chamar
          </button>
        )}
      </div>
    </div>
  )
}
```

---

## 🎯 PART 2: PHYSICAL COMMAND CARDS SYSTEM

### 2.1 Command Card Models

```python
# src/command/models/command_models.py
from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field
from enum import Enum

class CommandStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    PAID = "paid"
    CANCELLED = "cancelled"

class CommandType(str, Enum):
    BARCODE = "barcode"
    QRCODE = "qrcode"
    RFID = "rfid"
    MANUAL = "manual"

class CommandCard(BaseModel):
    """Physical command card for dine-in orders"""
    id: str = Field(default_factory=lambda: f"CMD{int(datetime.now().timestamp())}")
    code: str  # Barcode/QR code value
    type: CommandType
    status: CommandStatus = CommandStatus.OPEN
    table_id: Optional[str] = None
    customer_name: Optional[str] = None
    opened_at: datetime = Field(default_factory=datetime.now)
    closed_at: Optional[datetime] = None
    items: List[dict] = []
    subtotal: Decimal = Decimal("0.00")
    service_charge: Decimal = Decimal("0.00")
    total: Decimal = Decimal("0.00")
    employee_id: str  # Who opened the command
    notes: Optional[str] = None

class CommandItem(BaseModel):
    """Item added to command card"""
    id: str
    command_id: str
    product_id: str
    product_name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    added_at: datetime = Field(default_factory=datetime.now)
    added_by: str  # Employee who added
    notes: Optional[str] = None
```

### 2.2 Command Card Service

```python
# src/command/services/command_service.py
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
import qrcode
import barcode
from barcode.writer import ImageWriter

class CommandCardService:
    """Manages physical command cards for restaurants"""
    
    async def create_command(
        self,
        card_type: CommandType,
        table_id: Optional[str] = None,
        customer_name: Optional[str] = None
    ) -> CommandCard:
        """Create new command card"""
        
        # Generate unique code
        code = await self._generate_unique_code(card_type)
        
        # Create command
        command = CommandCard(
            code=code,
            type=card_type,
            table_id=table_id,
            customer_name=customer_name,
            employee_id=self.current_user.id
        )
        
        # Save to database
        await self.repository.create(command)
        
        # Generate physical card if needed
        if card_type in [CommandType.BARCODE, CommandType.QRCODE]:
            await self._generate_physical_card(command)
        
        # Publish event
        await self.event_bus.publish("command.created", {
            "command_id": command.id,
            "code": command.code,
            "table_id": table_id
        })
        
        return command
    
    async def add_items_to_command(
        self,
        command_code: str,
        items: List[dict]
    ) -> CommandCard:
        """Add items to existing command"""
        
        # Find command by code
        command = await self.repository.find_by_code(command_code)
        if not command:
            raise ValueError(f"Command not found: {command_code}")
        
        if command.status != CommandStatus.OPEN:
            raise ValueError(f"Command is not open: {command.status}")
        
        # Add items
        for item_data in items:
            item = CommandItem(
                command_id=command.id,
                product_id=item_data["product_id"],
                product_name=item_data["product_name"],
                quantity=item_data["quantity"],
                unit_price=Decimal(str(item_data["unit_price"])),
                total_price=Decimal(str(item_data["total_price"])),
                added_by=self.current_user.id
            )
            
            command.items.append(item.dict())
            command.subtotal += item.total_price
        
        # Recalculate totals
        command.service_charge = command.subtotal * Decimal("0.10")  # 10% service
        command.total = command.subtotal + command.service_charge
        
        # Update database
        await self.repository.update(command)
        
        return command
    
    async def close_command_for_payment(
        self,
        command_code: str
    ) -> dict:
        """Close command and prepare for payment"""
        
        # Find command
        command = await self.repository.find_by_code(command_code)
        if not command:
            raise ValueError(f"Command not found: {command_code}")
        
        if command.status != CommandStatus.OPEN:
            raise ValueError(f"Command already closed: {command.status}")
        
        # Close command
        command.status = CommandStatus.CLOSED
        command.closed_at = datetime.now()
        
        # Create payment request
        payment_data = {
            "command_id": command.id,
            "total": float(command.total),
            "items": command.items,
            "service_charge": float(command.service_charge)
        }
        
        # Update database
        await self.repository.update(command)
        
        # Publish event
        await self.event_bus.publish("command.closed", {
            "command_id": command.id,
            "total": float(command.total)
        })
        
        return payment_data
    
    async def _generate_physical_card(self, command: CommandCard):
        """Generate barcode or QR code image"""
        
        if command.type == CommandType.QRCODE:
            # Generate QR Code
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(command.code)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            img.save(f"cards/qr_{command.code}.png")
            
        elif command.type == CommandType.BARCODE:
            # Generate Barcode (Code128)
            code128 = barcode.get("code128", command.code, writer=ImageWriter())
            code128.save(f"cards/bar_{command.code}")
```

### 2.3 Command Card UI

```typescript
// frontend/apps/pos/src/components/command/CommandCardManager.tsx
import React, { useState } from 'react'
import { BarcodeScanner } from '../scanner/BarcodeScanner'

export const CommandCardManager: React.FC = () => {
  const [scanMode, setScanMode] = useState(false)
  const [currentCommand, setCurrentCommand] = useState(null)
  
  const handleScan = async (code: string) => {
    // Load command by code
    const response = await fetch(`/api/commands/${code}`)
    if (response.ok) {
      const command = await response.json()
      setCurrentCommand(command)
      setScanMode(false)
    }
  }
  
  const handleCreateCommand = async () => {
    const type = prompt('Tipo: barcode ou qrcode?', 'qrcode')
    const table = prompt('Mesa (opcional):')
    
    const response = await fetch('/api/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        table_id: table || null
      })
    })
    
    if (response.ok) {
      const command = await response.json()
      
      // Show/print the generated code
      window.open(`/api/commands/${command.id}/print`, '_blank')
    }
  }
  
  const handleAddItems = async () => {
    if (!currentCommand) return
    
    // Navigate to product selection
    window.location.href = `/pos/1/main?command=${currentCommand.code}`
  }
  
  const handleCloseCommand = async () => {
    if (!currentCommand) return
    
    const response = await fetch(`/api/commands/${currentCommand.code}/close`, {
      method: 'POST'
    })
    
    if (response.ok) {
      const paymentData = await response.json()
      
      // Navigate to payment
      window.location.href = `/pos/1/payment?command=${currentCommand.code}`
    }
  }
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Gestão de Comandas</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={handleCreateCommand}
          className="bg-green-500 text-white p-4 rounded-lg"
        >
          <span className="text-3xl">➕</span>
          <p>Nova Comanda</p>
        </button>
        
        <button
          onClick={() => setScanMode(true)}
          className="bg-blue-500 text-white p-4 rounded-lg"
        >
          <span className="text-3xl">📷</span>
          <p>Escanear Comanda</p>
        </button>
      </div>
      
      {scanMode && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setScanMode(false)}
        />
      )}
      
      {currentCommand && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">
            Comanda: {currentCommand.code}
          </h3>
          
          <div className="space-y-2 mb-4">
            <p>Mesa: {currentCommand.table_id || 'N/A'}</p>
            <p>Status: {currentCommand.status}</p>
            <p>Total: R$ {currentCommand.total}</p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">Itens:</h4>
            {currentCommand.items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.quantity}x {item.product_name}</span>
                <span>R$ {item.total_price}</span>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2 mt-6">
            <button
              onClick={handleAddItems}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Adicionar Itens
            </button>
            
            <button
              onClick={handleCloseCommand}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Fechar para Pagamento
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 🎯 PART 3: SELF-SERVICE WEIGHT-BASED BILLING

### 3.1 Weight Billing Models

```python
# src/selfservice/models/weight_models.py
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from enum import Enum

class WeightUnit(str, Enum):
    KILOGRAM = "kg"
    GRAM = "g"
    POUND = "lb"

class SelfServiceOrder(BaseModel):
    """Self-service restaurant order by weight"""
    id: str = Field(default_factory=lambda: f"SS{int(datetime.now().timestamp())}")
    command_id: Optional[str] = None  # Link to command card if used
    table_id: Optional[str] = None
    
    # Weight information
    container_weight: Decimal  # Tare weight
    gross_weight: Decimal  # Total weight with food
    net_weight: Decimal  # Food weight only
    weight_unit: WeightUnit = WeightUnit.GRAM
    
    # Pricing
    price_per_kg: Decimal
    food_subtotal: Decimal
    
    # Additional items (drinks, desserts)
    additional_items: List[dict] = []
    additional_subtotal: Decimal = Decimal("0.00")
    
    # Totals
    subtotal: Decimal
    service_charge: Decimal = Decimal("0.00")
    total: Decimal
    
    # Metadata
    scale_id: str  # Which scale was used
    weighed_at: datetime = Field(default_factory=datetime.now)
    employee_id: str

class ScaleConfiguration(BaseModel):
    """Scale device configuration"""
    id: str
    name: str
    location: str  # "buffet", "checkout"
    connection_type: str  # "serial", "usb", "network"
    connection_params: dict
    tare_weight: Decimal = Decimal("0.150")  # Default plate weight
    price_per_kg: Decimal
    active: bool = True
```

### 3.2 Weight Billing Service

```python
# src/selfservice/services/weight_service.py
from decimal import Decimal
from typing import Optional
import serial
import asyncio

class SelfServiceWeightService:
    """Handles weight-based billing for self-service restaurants"""
    
    def __init__(self):
        self.scales = {}  # Connected scales
        self.current_price_per_kg = Decimal("69.90")  # R$ 69.90/kg
        
    async def connect_scale(self, config: ScaleConfiguration):
        """Connect to weighing scale"""
        
        if config.connection_type == "serial":
            scale = serial.Serial(
                port=config.connection_params["port"],
                baudrate=config.connection_params["baudrate"],
                timeout=1
            )
            self.scales[config.id] = scale
            
        elif config.connection_type == "network":
            # Network scale implementation
            pass
            
        return True
    
    async def read_weight(self, scale_id: str) -> Decimal:
        """Read current weight from scale"""
        
        scale = self.scales.get(scale_id)
        if not scale:
            raise ValueError(f"Scale not connected: {scale_id}")
        
        # Read from serial scale
        if isinstance(scale, serial.Serial):
            scale.write(b'W\r\n')  # Request weight
            response = scale.readline().decode('utf-8').strip()
            
            # Parse weight (format: "W:0000.000kg")
            if response.startswith('W:'):
                weight_str = response[2:].replace('kg', '').strip()
                return Decimal(weight_str)
        
        return Decimal("0.000")
    
    async def create_weight_order(
        self,
        scale_id: str,
        command_id: Optional[str] = None,
        additional_items: List[dict] = None
    ) -> SelfServiceOrder:
        """Create order based on plate weight"""
        
        # Read gross weight
        gross_weight = await self.read_weight(scale_id)
        
        # Get scale configuration
        scale_config = await self.repository.get_scale(scale_id)
        
        # Calculate net weight (subtract plate)
        net_weight = gross_weight - scale_config.tare_weight
        
        if net_weight <= 0:
            raise ValueError("Peso inválido. Verifique a balança.")
        
        # Calculate food price
        food_subtotal = (net_weight / 1000) * scale_config.price_per_kg  # Convert g to kg
        
        # Calculate additional items
        additional_subtotal = Decimal("0.00")
        if additional_items:
            for item in additional_items:
                additional_subtotal += Decimal(str(item["price"])) * item["quantity"]
        
        # Create order
        order = SelfServiceOrder(
            command_id=command_id,
            container_weight=scale_config.tare_weight,
            gross_weight=gross_weight,
            net_weight=net_weight,
            weight_unit=WeightUnit.GRAM,
            price_per_kg=scale_config.price_per_kg,
            food_subtotal=food_subtotal,
            additional_items=additional_items or [],
            additional_subtotal=additional_subtotal,
            subtotal=food_subtotal + additional_subtotal,
            total=food_subtotal + additional_subtotal,
            scale_id=scale_id,
            employee_id=self.current_user.id
        )
        
        # Apply service charge if configured
        if self.settings.service_charge_percent > 0:
            order.service_charge = order.subtotal * (self.settings.service_charge_percent / 100)
            order.total = order.subtotal + order.service_charge
        
        # Save to database
        await self.repository.create(order)
        
        # Link to command if provided
        if command_id:
            await self._link_to_command(command_id, order)
        
        return order
    
    async def tare_scale(self, scale_id: str) -> bool:
        """Zero/tare the scale"""
        
        scale = self.scales.get(scale_id)
        if not scale:
            return False
        
        if isinstance(scale, serial.Serial):
            scale.write(b'T\r\n')  # Send tare command
            response = scale.readline().decode('utf-8').strip()
            return response == 'OK'
        
        return False
```

### 3.3 Self-Service UI

```typescript
// frontend/apps/pos/src/components/selfservice/SelfServiceCheckout.tsx
import React, { useState, useEffect } from 'react'

interface WeightReading {
  gross: number
  tare: number
  net: number
  unit: 'g' | 'kg'
}

export const SelfServiceCheckout: React.FC = () => {
  const [weight, setWeight] = useState<WeightReading | null>(null)
  const [pricePerKg, setPricePerKg] = useState(69.90)
  const [additionalItems, setAdditionalItems] = useState([])
  const [isWeighing, setIsWeighing] = useState(false)
  
  const handleWeigh = async () => {
    setIsWeighing(true)
    
    // Read weight from scale
    const response = await fetch('/api/selfservice/weigh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scale_id: 'scale_01' })
    })
    
    if (response.ok) {
      const data = await response.json()
      setWeight(data)
    }
    
    setIsWeighing(false)
  }
  
  const handleTare = async () => {
    await fetch('/api/selfservice/tare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scale_id: 'scale_01' })
    })
    
    // Re-weigh after tare
    await handleWeigh()
  }
  
  const calculateTotal = () => {
    if (!weight) return 0
    
    const foodPrice = (weight.net / 1000) * pricePerKg
    const additionalPrice = additionalItems.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    )
    
    return foodPrice + additionalPrice
  }
  
  const handleCheckout = async () => {
    const orderData = {
      scale_id: 'scale_01',
      additional_items: additionalItems
    }
    
    const response = await fetch('/api/selfservice/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })
    
    if (response.ok) {
      const order = await response.json()
      
      // Navigate to payment
      window.location.href = `/pos/1/payment?order=${order.id}`
    }
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6">Self-Service - Pesagem</h2>
      
      {/* Weight Display */}
      <div className="bg-gray-100 rounded-lg p-6 mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-600">Peso Líquido</p>
          <p className="text-5xl font-bold">
            {weight ? `${weight.net}g` : '---'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Tara: {weight?.tare || 150}g
          </p>
        </div>
        
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleWeigh}
            disabled={isWeighing}
            className="flex-1 bg-blue-500 text-white py-3 rounded"
          >
            {isWeighing ? 'Pesando...' : 'Pesar'}
          </button>
          
          <button
            onClick={handleTare}
            className="bg-gray-500 text-white px-6 py-3 rounded"
          >
            Tarar
          </button>
        </div>
      </div>
      
      {/* Price Calculation */}
      {weight && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Peso do Alimento:</span>
              <span>{weight.net}g</span>
            </div>
            <div className="flex justify-between">
              <span>Preço por Kg:</span>
              <span>R$ {pricePerKg.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Valor da Comida:</span>
              <span>R$ {((weight.net / 1000) * pricePerKg).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Additional Items */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-bold mb-4">Itens Adicionais</h3>
        
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => addItem('Refrigerante', 6.00)}
            className="p-3 border rounded hover:bg-gray-100"
          >
            🥤 Refrigerante
            <br />R$ 6,00
          </button>
          
          <button
            onClick={() => addItem('Suco', 8.00)}
            className="p-3 border rounded hover:bg-gray-100"
          >
            🧃 Suco
            <br />R$ 8,00
          </button>
          
          <button
            onClick={() => addItem('Sobremesa', 12.00)}
            className="p-3 border rounded hover:bg-gray-100"
          >
            🍰 Sobremesa
            <br />R$ 12,00
          </button>
        </div>
        
        {additionalItems.length > 0 && (
          <div className="space-y-1">
            {additionalItems.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.name}</span>
                <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Total and Checkout */}
      <div className="bg-green-50 rounded-lg p-6">
        <div className="flex justify-between text-2xl font-bold mb-4">
          <span>Total:</span>
          <span>R$ {calculateTotal().toFixed(2)}</span>
        </div>
        
        <button
          onClick={handleCheckout}
          disabled={!weight}
          className="w-full bg-green-500 text-white py-4 rounded-lg text-xl font-bold disabled:opacity-50"
        >
          Finalizar Venda
        </button>
      </div>
    </div>
  )
}
```

---

## 🔧 API ENDPOINTS

### Queue Management
```yaml
POST /api/tables/queue:
  description: Add customer to waiting queue
  body: { name, phone, party_size, preferences }
  
GET /api/tables/queue:
  description: Get current queue status
  
POST /api/tables/queue/{id}/notify:
  description: Notify customer table is ready
  
POST /api/tables/queue/{id}/seat:
  description: Mark customer as seated
```

### Command Cards
```yaml
POST /api/commands:
  description: Create new command card
  body: { type, table_id, customer_name }
  
GET /api/commands/{code}:
  description: Get command by code
  
POST /api/commands/{code}/items:
  description: Add items to command
  body: { items: [{ product_id, quantity }] }
  
POST /api/commands/{code}/close:
  description: Close command for payment
  
GET /api/commands/{id}/print:
  description: Generate printable card
```

### Self-Service Weight
```yaml
POST /api/selfservice/weigh:
  description: Read current weight from scale
  body: { scale_id }
  
POST /api/selfservice/tare:
  description: Tare/zero the scale
  body: { scale_id }
  
POST /api/selfservice/checkout:
  description: Create weight-based order
  body: { scale_id, additional_items }
  
GET /api/selfservice/scales:
  description: List configured scales
```

---

## 📱 MOBILE CONSIDERATIONS

### Customer Queue App
```typescript
// Mobile web app for customers
const QueuePositionApp = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500 to-blue-700 text-white p-4">
      <div className="text-center mt-20">
        <h1 className="text-4xl font-bold mb-2">Sua Posição</h1>
        <div className="text-8xl font-bold my-8">#3</div>
        <p className="text-xl">Tempo estimado: 15 minutos</p>
        
        <div className="mt-10 bg-white/20 rounded-lg p-4">
          <p className="text-sm">Você será notificado quando sua mesa estiver pronta</p>
        </div>
      </div>
    </div>
  )
}
```

---

## 🚀 IMPLEMENTATION CHECKLIST

### Week 1: Queue System
- [ ] Create queue models and database schema
- [ ] Implement queue service with wait time calculation
- [ ] Build queue management UI
- [ ] Add customer notification system
- [ ] Create mobile queue view

### Week 2: Command Cards
- [ ] Design command card models
- [ ] Implement barcode/QR generation
- [ ] Create scanning interface
- [ ] Build command management service
- [ ] Add payment flow for commands

### Week 3: Self-Service Weight
- [ ] Setup scale integration
- [ ] Create weight reading service
- [ ] Build weight-based checkout UI
- [ ] Implement tare functionality
- [ ] Add additional items management

### Week 4: Integration & Testing
- [ ] Integrate all three systems
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Staff training materials
- [ ] Go-live preparation

---

## 🎯 SUCCESS METRICS

- Queue wait time accuracy: ±5 minutes
- Command card scan speed: <1 second
- Weight reading accuracy: ±5 grams
- Checkout time: <30 seconds
- System uptime: 99.9%

This implementation provides a complete solution for table management with queue system, physical command cards, and self-service weight-based billing.
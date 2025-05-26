# Design da Expansão do Módulo de Periféricos

## Visão Geral

Este documento detalha o design para a expansão do módulo de periféricos do sistema POS Modern, adicionando suporte para múltiplas marcas de impressoras térmicas, impressoras convencionais, leitores de código de barras, leitores de QR Code/PIX, gavetas de dinheiro e integração com TEF/SiTef.

## Objetivos

1. Manter a arquitetura modular e extensível existente
2. Adicionar suporte para múltiplas marcas e modelos de dispositivos
3. Garantir que todas as integrações sejam opcionais e configuráveis
4. Fornecer simuladores para testes sem hardware real
5. Documentar claramente os dispositivos suportados e suas configurações

## Arquitetura Expandida

A arquitetura atual já fornece uma boa base com:
- Abstrações para diferentes tipos de periféricos
- Sistema de fábrica para criação de periféricos
- Gerenciador central para controle de todos os dispositivos

Expandiremos esta arquitetura para incluir:

### 1. Novos Tipos de Periféricos

```
PeripheralType (Enum)
├── PRINTER (existente)
├── BARCODE_SCANNER (novo)
├── QR_SCANNER (novo)
├── CASH_DRAWER (novo)
├── TEF_TERMINAL (novo)
└── CONVENTIONAL_PRINTER (novo)
```

### 2. Novas Interfaces de Periféricos

```
Peripheral (ABC)
├── Printer (existente)
│   ├── ThermalPrinter (novo)
│   └── ConventionalPrinter (novo)
├── BarcodeScanner (novo)
├── QRScanner (novo)
├── CashDrawer (novo)
└── TEFTerminal (novo)
```

### 3. Drivers Específicos por Marca

```
ThermalPrinter
├── EpsonThermalPrinter (existente)
├── BematechThermalPrinter (novo)
├── DarumaThermalPrinter (novo)
└── ElginThermalPrinter (novo)

ConventionalPrinter
├── GenericPrinter (novo)
├── HPPrinter (novo)
└── EpsonInkjetPrinter (novo)

BarcodeScanner
├── GenericBarcodeScanner (novo)
├── ZebraBarcodeScanner (novo)
└── HoneywellBarcodeScanner (novo)

QRScanner
├── GenericQRScanner (novo)
└── IntegratedQRScanner (novo)

CashDrawer
├── GenericCashDrawer (novo)
├── PrinterConnectedCashDrawer (novo)
└── NetworkCashDrawer (novo)

TEFTerminal
├── SiTefTerminal (novo)
├── StoneTerminal (novo)
└── CieloTerminal (novo)
```

### 4. Simuladores para Testes

```
SimulatedThermalPrinter (existente)
SimulatedConventionalPrinter (novo)
SimulatedBarcodeScanner (novo)
SimulatedQRScanner (novo)
SimulatedCashDrawer (novo)
SimulatedTEFTerminal (novo)
```

## Detalhes de Implementação

### 1. Impressoras Térmicas

Expandiremos o suporte para incluir as principais marcas:

#### Bematech
- Modelos: MP-4200 TH, MP-100S TH, MP-5100 TH
- Protocolos: ESC/POS, ESC/Bematech
- Conexões: USB, Serial, Ethernet

#### Daruma
- Modelos: DR800, DR700, DR600
- Protocolos: ESC/POS, ESC/Daruma
- Conexões: USB, Serial, Ethernet

#### Elgin
- Modelos: i9, i7, i5
- Protocolos: ESC/POS
- Conexões: USB, Serial, Ethernet

### 2. Impressoras Convencionais

Adicionaremos suporte para impressoras convencionais para relatórios:

#### Interface `ConventionalPrinter`
```python
class ConventionalPrinter(Printer):
    async def print_document(self, document_path: str) -> bool:
        """Imprime um documento."""
        pass
    
    async def print_report(self, report_data: Dict[str, Any], template: str) -> bool:
        """Imprime um relatório usando um template."""
        pass
    
    async def get_paper_levels(self) -> Dict[str, Any]:
        """Obtém níveis de papel e tinta."""
        pass
```

#### Implementações
- `GenericPrinter`: Usando CUPS/sistema operacional
- `HPPrinter`: Específico para impressoras HP
- `EpsonInkjetPrinter`: Específico para impressoras Epson jato de tinta

### 3. Leitores de Código de Barras

#### Interface `BarcodeScanner`
```python
class BarcodeScanner(Peripheral):
    async def read(self) -> Optional[str]:
        """Lê um código de barras (bloqueante)."""
        pass
    
    async def start_continuous_read(self, callback) -> bool:
        """Inicia leitura contínua com callback."""
        pass
    
    async def stop_continuous_read(self) -> bool:
        """Para leitura contínua."""
        pass
    
    async def set_symbologies(self, symbologies: List[str]) -> bool:
        """Define simbologias suportadas."""
        pass
```

#### Implementações
- `GenericBarcodeScanner`: Para leitores genéricos USB (HID)
- `ZebraBarcodeScanner`: Para leitores Zebra
- `HoneywellBarcodeScanner`: Para leitores Honeywell

### 4. Leitores de QR Code/PIX

#### Interface `QRScanner`
```python
class QRScanner(Peripheral):
    async def read(self) -> Optional[str]:
        """Lê um QR code (bloqueante)."""
        pass
    
    async def start_continuous_read(self, callback) -> bool:
        """Inicia leitura contínua com callback."""
        pass
    
    async def stop_continuous_read(self) -> bool:
        """Para leitura contínua."""
        pass
    
    async def parse_pix(self, qr_data: str) -> Dict[str, Any]:
        """Analisa dados de PIX de um QR code."""
        pass
```

#### Implementações
- `GenericQRScanner`: Para leitores genéricos
- `IntegratedQRScanner`: Para câmeras integradas

### 5. Gavetas de Dinheiro

#### Interface `CashDrawer`
```python
class CashDrawer(Peripheral):
    async def open(self) -> bool:
        """Abre a gaveta."""
        pass
    
    async def is_open(self) -> bool:
        """Verifica se a gaveta está aberta."""
        pass
    
    async def get_status(self) -> Dict[str, Any]:
        """Obtém o status da gaveta."""
        pass
```

#### Implementações
- `GenericCashDrawer`: Para gavetas genéricas
- `PrinterConnectedCashDrawer`: Para gavetas conectadas a impressoras
- `NetworkCashDrawer`: Para gavetas em rede

### 6. Terminais TEF/SiTef

#### Interface `TEFTerminal`
```python
class TEFTerminal(Peripheral):
    async def initialize_transaction(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Inicia uma transação."""
        pass
    
    async def cancel_transaction(self, transaction_id: str) -> bool:
        """Cancela uma transação."""
        pass
    
    async def get_transaction_status(self, transaction_id: str) -> Dict[str, Any]:
        """Obtém o status de uma transação."""
        pass
    
    async def print_receipt(self, transaction_id: str) -> bool:
        """Imprime o comprovante de uma transação."""
        pass
```

#### Implementações
- `SiTefTerminal`: Para terminais SiTef
- `StoneTerminal`: Para terminais Stone
- `CieloTerminal`: Para terminais Cielo

## Configuração

### Estrutura de Configuração

A configuração será armazenada em `src/peripherals/config/peripherals.json`:

```json
{
  "peripherals": {
    "default_printer": {
      "id": "default_printer",
      "name": "Impressora Principal",
      "type": "printer",
      "brand": "epson",
      "model": "TM-T20X",
      "connection_type": "usb",
      "port": "auto",
      "enabled": true,
      "paper_width": 80,
      "dpi": 180,
      "cash_drawer_enabled": true,
      "cut_type": "partial"
    },
    "report_printer": {
      "id": "report_printer",
      "name": "Impressora de Relatórios",
      "type": "conventional_printer",
      "brand": "hp",
      "model": "LaserJet Pro",
      "connection_type": "network",
      "address": "192.168.1.100",
      "enabled": true
    },
    "barcode_scanner": {
      "id": "barcode_scanner",
      "name": "Leitor de Código de Barras",
      "type": "barcode_scanner",
      "brand": "generic",
      "connection_type": "usb",
      "port": "auto",
      "enabled": true,
      "symbologies": ["CODE128", "EAN13", "QR"]
    },
    "cash_drawer": {
      "id": "cash_drawer",
      "name": "Gaveta de Dinheiro",
      "type": "cash_drawer",
      "brand": "generic",
      "connection_type": "printer",
      "printer_id": "default_printer",
      "enabled": true
    },
    "tef_terminal": {
      "id": "tef_terminal",
      "name": "Terminal TEF",
      "type": "tef_terminal",
      "brand": "sitef",
      "connection_type": "network",
      "address": "127.0.0.1",
      "port": "4096",
      "enabled": true,
      "options": {
        "store_id": "12345",
        "terminal_id": "001",
        "merchant_id": "123456789"
      }
    }
  }
}
```

### Configuração por Terminal

Para permitir diferentes configurações por terminal, a configuração será estendida para incluir um mapeamento de terminais:

```json
{
  "peripherals": {
    "default_printer": { ... },
    "report_printer": { ... },
    ...
  },
  "terminals": {
    "1": {
      "printer": "default_printer",
      "barcode_scanner": "barcode_scanner",
      "cash_drawer": "cash_drawer",
      "tef_terminal": "tef_terminal"
    },
    "2": {
      "printer": "backup_printer",
      "barcode_scanner": "backup_scanner",
      "cash_drawer": "backup_drawer"
    }
  }
}
```

## Integração com Fluxos de Trabalho

### 1. Impressão de Recibos

```python
# Obter impressora configurada para o terminal
printer = await peripheral_manager.get_printer_for_terminal("1")

# Imprimir recibo
receipt_data = {
    "order_id": "12345",
    "items": [...],
    "total": 100.0,
    "payment": {...}
}
await printer.print_receipt(receipt_data)
```

### 2. Leitura de Código de Barras

```python
# Obter leitor configurado para o terminal
scanner = await peripheral_manager.get_barcode_scanner_for_terminal("1")

# Ler código de barras
barcode = await scanner.read()
```

### 3. Pagamento com TEF

```python
# Obter terminal TEF configurado para o terminal
tef = await peripheral_manager.get_tef_terminal_for_terminal("1")

# Iniciar transação
transaction_data = {
    "amount": 100.0,
    "payment_type": "credit",
    "installments": 1
}
result = await tef.initialize_transaction(transaction_data)
```

### 4. Abertura de Gaveta

```python
# Obter gaveta configurada para o terminal
drawer = await peripheral_manager.get_cash_drawer_for_terminal("1")

# Abrir gaveta
await drawer.open()
```

## Simuladores para Testes

Para cada tipo de periférico, será fornecido um simulador que:

1. Simula o comportamento do dispositivo real
2. Registra operações em arquivos de log
3. Permite configuração de cenários de erro
4. Fornece uma interface visual (quando aplicável)

Exemplo para o simulador de TEF:

```python
class SimulatedTEFTerminal(TEFTerminal):
    async def initialize_transaction(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        # Simular delay
        await asyncio.sleep(2)
        
        # Simular aprovação/rejeição
        if random.random() < 0.9:  # 90% de aprovação
            return {
                "status": "approved",
                "transaction_id": str(uuid.uuid4()),
                "authorization_code": f"{random.randint(100000, 999999)}",
                "card_brand": random.choice(["VISA", "MASTERCARD", "ELO"]),
                "card_number": f"**** **** **** {random.randint(1000, 9999)}",
                "amount": transaction_data["amount"]
            }
        else:
            return {
                "status": "rejected",
                "reason": random.choice(["insufficient_funds", "card_blocked", "invalid_card"]),
                "amount": transaction_data["amount"]
            }
```

## Lista de Hardware Compatível

Para cada tipo de periférico, será mantida uma lista de hardware testado e compatível:

### Impressoras Térmicas
- Epson: TM-T20X, TM-T88VI, TM-T88V
- Bematech: MP-4200 TH, MP-100S TH, MP-5100 TH
- Daruma: DR800, DR700, DR600
- Elgin: i9, i7, i5

### Impressoras Convencionais
- HP: LaserJet Pro, DeskJet
- Epson: L3150, L395
- Brother: HL-L2360DW

### Leitores de Código de Barras
- Genéricos: Qualquer leitor USB HID
- Zebra: DS2208, LI2208
- Honeywell: Voyager 1250g, Xenon 1900

### Leitores de QR Code/PIX
- Genéricos: Qualquer leitor 2D
- Câmeras integradas: Webcams, câmeras de smartphones

### Gavetas de Dinheiro
- Genéricas: Qualquer gaveta com conexão RJ11
- Bematech: GD-56
- Elgin: X5

### Terminais TEF/SiTef
- SiTef: Qualquer terminal compatível com SiTef
- Stone: Stone Terminal
- Cielo: LIO, Cielo Terminal

## Próximos Passos

1. Implementar interfaces e classes base para os novos tipos de periféricos
2. Implementar drivers para as principais marcas de impressoras térmicas
3. Implementar drivers para impressoras convencionais
4. Implementar drivers para leitores de código de barras e QR Code/PIX
5. Implementar drivers para gavetas de dinheiro
6. Implementar drivers para terminais TEF/SiTef
7. Implementar simuladores para testes
8. Atualizar o gerenciador de periféricos para suportar os novos tipos
9. Integrar com os fluxos de trabalho existentes
10. Documentar os dispositivos suportados e suas configurações

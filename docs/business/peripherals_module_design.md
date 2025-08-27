# Design do Módulo de Periféricos

## Visão Geral

O Módulo de Periféricos é responsável por fornecer uma camada de abstração para interação com dispositivos de hardware conectados ao sistema POS Modern. Este módulo permite que o sistema se comunique com diversos tipos de periféricos, como impressoras térmicas, leitores de código de barras, gavetas de dinheiro, displays de cliente, entre outros.

A primeira implementação será focada em impressoras térmicas, começando com suporte para modelos Epson.

## Arquitetura

### Princípios de Design

1. **Abstração de Hardware**: Interfaces genéricas que abstraem detalhes específicos de implementação de hardware.
2. **Extensibilidade**: Facilidade para adicionar suporte a novos dispositivos e fabricantes.
3. **Desacoplamento**: Separação clara entre a lógica de negócios e a comunicação com hardware.
4. **Testabilidade**: Capacidade de simular dispositivos para testes sem hardware real.
5. **Configurabilidade**: Suporte a configurações específicas por dispositivo e instância.

### Componentes Principais

#### 1. Interfaces Base

```python
# Interfaces abstratas para diferentes tipos de periféricos
class Peripheral(ABC):
    """Interface base para todos os periféricos."""
    
    @abstractmethod
    async def initialize(self) -> bool:
        """Inicializa o periférico."""
        pass
    
    @abstractmethod
    async def shutdown(self) -> bool:
        """Finaliza o periférico."""
        pass
    
    @abstractmethod
    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual do periférico."""
        pass

class Printer(Peripheral):
    """Interface para impressoras."""
    
    @abstractmethod
    async def print_text(self, text: str) -> bool:
        """Imprime texto simples."""
        pass
    
    @abstractmethod
    async def print_receipt(self, receipt: Dict[str, Any]) -> bool:
        """Imprime um recibo formatado."""
        pass
    
    @abstractmethod
    async def cut_paper(self, partial: bool = False) -> bool:
        """Corta o papel."""
        pass
    
    @abstractmethod
    async def open_cash_drawer(self) -> bool:
        """Abre a gaveta de dinheiro conectada à impressora."""
        pass
```

#### 2. Implementações Específicas

```python
class EpsonPrinter(Printer):
    """Implementação para impressoras Epson."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.connection = None
        self.model = config.get("model", "Generic Epson")
        self.connection_type = config.get("connection_type", "USB")
        self.port = config.get("port")
        self.initialized = False
    
    async def initialize(self) -> bool:
        """Inicializa a impressora Epson."""
        # Implementação específica para Epson
        pass
    
    async def shutdown(self) -> bool:
        """Finaliza a impressora Epson."""
        # Implementação específica para Epson
        pass
    
    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual da impressora Epson."""
        # Implementação específica para Epson
        pass
    
    async def print_text(self, text: str) -> bool:
        """Imprime texto simples na impressora Epson."""
        # Implementação específica para Epson
        pass
    
    async def print_receipt(self, receipt: Dict[str, Any]) -> bool:
        """Imprime um recibo formatado na impressora Epson."""
        # Implementação específica para Epson
        pass
    
    async def cut_paper(self, partial: bool = False) -> bool:
        """Corta o papel na impressora Epson."""
        # Implementação específica para Epson
        pass
    
    async def open_cash_drawer(self) -> bool:
        """Abre a gaveta de dinheiro conectada à impressora Epson."""
        # Implementação específica para Epson
        pass
```

#### 3. Fábrica de Periféricos

```python
class PeripheralFactory:
    """Fábrica para criar instâncias de periféricos."""
    
    @staticmethod
    async def create_printer(config: Dict[str, Any]) -> Printer:
        """Cria uma instância de impressora com base na configuração."""
        brand = config.get("brand", "").lower()
        
        if brand == "epson":
            return EpsonPrinter(config)
        # Adicionar suporte para outras marcas no futuro
        
        raise ValueError(f"Marca de impressora não suportada: {brand}")
```

#### 4. Gerenciador de Periféricos

```python
class PeripheralManager:
    """Gerenciador central de periféricos."""
    
    def __init__(self):
        self.peripherals = {}
        self.config = {}
        self.event_bus = get_event_bus()
    
    async def initialize(self, config_path: str) -> None:
        """Inicializa o gerenciador com configurações de um arquivo."""
        # Carregar configuração
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        # Inicializar periféricos configurados
        for peripheral_id, peripheral_config in self.config.get("peripherals", {}).items():
            await self.add_peripheral(peripheral_id, peripheral_config)
    
    async def add_peripheral(self, peripheral_id: str, config: Dict[str, Any]) -> None:
        """Adiciona um periférico ao gerenciador."""
        peripheral_type = config.get("type", "").lower()
        
        if peripheral_type == "printer":
            peripheral = await PeripheralFactory.create_printer(config)
        # Adicionar suporte para outros tipos no futuro
        else:
            raise ValueError(f"Tipo de periférico não suportado: {peripheral_type}")
        
        # Inicializar o periférico
        success = await peripheral.initialize()
        if not success:
            raise RuntimeError(f"Falha ao inicializar periférico: {peripheral_id}")
        
        # Armazenar o periférico
        self.peripherals[peripheral_id] = peripheral
    
    async def get_peripheral(self, peripheral_id: str) -> Optional[Peripheral]:
        """Obtém um periférico pelo ID."""
        return self.peripherals.get(peripheral_id)
    
    async def shutdown(self) -> None:
        """Finaliza todos os periféricos."""
        for peripheral in self.peripherals.values():
            await peripheral.shutdown()
        
        self.peripherals.clear()
```

#### 5. Serviço de Impressão

```python
class PrintService:
    """Serviço para operações de impressão."""
    
    def __init__(self, peripheral_manager: PeripheralManager):
        self.peripheral_manager = peripheral_manager
        self.event_bus = get_event_bus()
        self.templates = {}
    
    async def initialize(self, templates_path: str) -> None:
        """Inicializa o serviço com templates de um diretório."""
        # Carregar templates
        for filename in os.listdir(templates_path):
            if filename.endswith(".json"):
                template_name = os.path.splitext(filename)[0]
                with open(os.path.join(templates_path, filename), 'r') as f:
                    self.templates[template_name] = json.load(f)
    
    async def print_receipt(self, printer_id: str, template_name: str, data: Dict[str, Any]) -> bool:
        """Imprime um recibo usando um template e dados."""
        # Obter a impressora
        printer = await self.peripheral_manager.get_peripheral(printer_id)
        if not printer or not isinstance(printer, Printer):
            raise ValueError(f"Impressora não encontrada ou inválida: {printer_id}")
        
        # Obter o template
        template = self.templates.get(template_name)
        if not template:
            raise ValueError(f"Template não encontrado: {template_name}")
        
        # Renderizar o template com os dados
        receipt = self._render_template(template, data)
        
        # Imprimir o recibo
        success = await printer.print_receipt(receipt)
        
        # Cortar o papel
        if success:
            await printer.cut_paper()
        
        return success
    
    async def print_text(self, printer_id: str, text: str) -> bool:
        """Imprime texto simples."""
        # Obter a impressora
        printer = await self.peripheral_manager.get_peripheral(printer_id)
        if not printer or not isinstance(printer, Printer):
            raise ValueError(f"Impressora não encontrada ou inválida: {printer_id}")
        
        # Imprimir o texto
        return await printer.print_text(text)
    
    async def open_cash_drawer(self, printer_id: str) -> bool:
        """Abre a gaveta de dinheiro conectada à impressora."""
        # Obter a impressora
        printer = await self.peripheral_manager.get_peripheral(printer_id)
        if not printer or not isinstance(printer, Printer):
            raise ValueError(f"Impressora não encontrada ou inválida: {printer_id}")
        
        # Abrir a gaveta
        return await printer.open_cash_drawer()
    
    def _render_template(self, template: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
        """Renderiza um template com dados."""
        # Implementação de renderização de template
        # Pode usar Jinja2 ou outra biblioteca de templates
        pass
```

#### 6. Eventos de Periféricos

```python
class PeripheralEventType(str, Enum):
    """Tipos de eventos relacionados a periféricos."""
    PERIPHERAL_CONNECTED = "peripheral.connected"
    PERIPHERAL_DISCONNECTED = "peripheral.disconnected"
    PERIPHERAL_ERROR = "peripheral.error"
    PRINT_REQUESTED = "print.requested"
    PRINT_COMPLETED = "print.completed"
    PRINT_ERROR = "print.error"
    CASH_DRAWER_OPENED = "cash_drawer.opened"
    CASH_DRAWER_CLOSED = "cash_drawer.closed"

class PrintRequestedEvent(Event):
    """Evento de solicitação de impressão."""
    
    def __init__(self, printer_id: str, template_name: str, data: Dict[str, Any]):
        super().__init__(
            event_type=PeripheralEventType.PRINT_REQUESTED,
            data={
                "printer_id": printer_id,
                "template_name": template_name,
                "data": data
            }
        )

class PrintCompletedEvent(Event):
    """Evento de impressão concluída."""
    
    def __init__(self, printer_id: str, template_name: str, success: bool):
        super().__init__(
            event_type=PeripheralEventType.PRINT_COMPLETED,
            data={
                "printer_id": printer_id,
                "template_name": template_name,
                "success": success
            }
        )

class PrintErrorEvent(Event):
    """Evento de erro de impressão."""
    
    def __init__(self, printer_id: str, error_message: str):
        super().__init__(
            event_type=PeripheralEventType.PRINT_ERROR,
            data={
                "printer_id": printer_id,
                "error_message": error_message
            }
        )
```

#### 7. Handlers de Eventos

```python
class PrintRequestedHandler(EventHandler):
    """Handler para eventos de solicitação de impressão."""
    
    def __init__(self, print_service: PrintService):
        self.print_service = print_service
        self.event_bus = get_event_bus()
    
    async def handle(self, event: Event) -> None:
        """Processa um evento de solicitação de impressão."""
        if event.type == PeripheralEventType.PRINT_REQUESTED:
            data = event.data
            printer_id = data.get("printer_id")
            template_name = data.get("template_name")
            template_data = data.get("data", {})
            
            try:
                success = await self.print_service.print_receipt(
                    printer_id=printer_id,
                    template_name=template_name,
                    data=template_data
                )
                
                # Publicar evento de conclusão
                await self.event_bus.publish(
                    PrintCompletedEvent(
                        printer_id=printer_id,
                        template_name=template_name,
                        success=success
                    )
                )
            except Exception as e:
                # Publicar evento de erro
                await self.event_bus.publish(
                    PrintErrorEvent(
                        printer_id=printer_id,
                        error_message=str(e)
                    )
                )
```

### Estrutura de Diretórios

```
src/
  peripherals/
    __init__.py
    models/
      __init__.py
      peripheral_models.py  # Interfaces e modelos base
    services/
      __init__.py
      peripheral_service.py  # Gerenciador de periféricos
      print_service.py  # Serviço de impressão
    drivers/
      __init__.py
      epson/
        __init__.py
        epson_printer.py  # Implementação para Epson
      # Outros fabricantes no futuro
    events/
      __init__.py
      peripheral_events.py  # Eventos e handlers
    router/
      __init__.py
      peripheral_router.py  # Endpoints da API
    templates/
      receipt_default.json  # Template padrão de recibo
      receipt_order.json  # Template de recibo de pedido
      # Outros templates
    config/
      peripherals.json  # Configuração de periféricos
```

## Integração com o Sistema

### Integração com o Módulo POS

O Módulo de Periféricos será integrado ao Módulo POS para permitir a impressão de recibos de vendas, abertura de gaveta de dinheiro e outras operações relacionadas ao ponto de venda.

```python
# Exemplo de integração no serviço POS
async def process_payment(self, payment_data: PaymentTransactionCreate) -> PaymentTransaction:
    """Processa um pagamento e imprime o recibo."""
    # Processar o pagamento
    payment = await self.create_payment(payment_data)
    
    # Imprimir o recibo
    await self.event_bus.publish(
        PrintRequestedEvent(
            printer_id="default_printer",
            template_name="receipt_payment",
            data={
                "payment": payment.dict(),
                "session": (await self.get_session(payment.session_id)).dict(),
                "terminal": {
                    "name": "Terminal Principal",
                    "address": "Rua Exemplo, 123"
                }
            }
        )
    )
    
    return payment
```

### Integração com o Módulo de Pedidos

O Módulo de Periféricos será integrado ao Módulo de Pedidos para permitir a impressão de pedidos na cozinha, comandas e outras operações relacionadas a pedidos.

```python
# Exemplo de integração no serviço de Pedidos
async def create_order(self, order_data: OrderCreate) -> Order:
    """Cria um pedido e imprime na cozinha."""
    # Criar o pedido
    order = await self._create_order(order_data)
    
    # Imprimir o pedido na cozinha
    await self.event_bus.publish(
        PrintRequestedEvent(
            printer_id="kitchen_printer",
            template_name="receipt_kitchen_order",
            data={
                "order": order.dict(),
                "items": [item.dict() for item in order.items]
            }
        )
    )
    
    return order
```

## Configuração

### Exemplo de Configuração de Periféricos

```json
{
  "peripherals": {
    "default_printer": {
      "type": "printer",
      "brand": "epson",
      "model": "TM-T20X",
      "connection_type": "USB",
      "port": "auto",
      "options": {
        "paper_width": 80,
        "dpi": 180,
        "cash_drawer_enabled": true
      }
    },
    "kitchen_printer": {
      "type": "printer",
      "brand": "epson",
      "model": "TM-T88VI",
      "connection_type": "network",
      "address": "192.168.1.100",
      "port": 9100,
      "options": {
        "paper_width": 80,
        "dpi": 180,
        "cash_drawer_enabled": false
      }
    }
  }
}
```

### Exemplo de Template de Recibo

```json
{
  "name": "receipt_payment",
  "version": "1.0",
  "sections": [
    {
      "type": "header",
      "content": [
        {"type": "text", "value": "{{terminal.name}}", "align": "center", "style": "bold"},
        {"type": "text", "value": "{{terminal.address}}", "align": "center"},
        {"type": "line", "style": "double"}
      ]
    },
    {
      "type": "body",
      "content": [
        {"type": "text", "value": "COMPROVANTE DE PAGAMENTO", "align": "center", "style": "bold"},
        {"type": "text", "value": "Data: {{payment.created_at|date}}", "align": "left"},
        {"type": "text", "value": "Hora: {{payment.created_at|time}}", "align": "left"},
        {"type": "text", "value": "Operador: {{session.user_id}}", "align": "left"},
        {"type": "line", "style": "single"},
        {"type": "text", "value": "Pedido: {{payment.order_id}}", "align": "left"},
        {"type": "text", "value": "Valor: R$ {{payment.amount|number:2}}", "align": "left"},
        {"type": "text", "value": "Forma de Pagamento: {{payment.method}}", "align": "left"},
        {"type": "line", "style": "single"}
      ]
    },
    {
      "type": "footer",
      "content": [
        {"type": "text", "value": "Obrigado pela preferência!", "align": "center"},
        {"type": "text", "value": "www.exemplo.com.br", "align": "center"},
        {"type": "barcode", "value": "{{payment.id}}", "type": "code128", "align": "center"}
      ]
    }
  ]
}
```

## Hardware Suportado

### Impressoras Térmicas

#### Epson

- TM-T20X
- TM-T88VI
- TM-T88V
- TM-T88IV
- TM-T81III
- TM-U220

## Considerações de Implementação

### Comunicação com Hardware

Para a comunicação com impressoras Epson, utilizaremos o protocolo ESC/POS, que é um padrão de fato para impressoras térmicas. A implementação será feita usando a biblioteca `python-escpos`, que oferece suporte a diversos modelos de impressoras Epson e outros fabricantes compatíveis com ESC/POS.

### Simulação para Testes

Para facilitar o desenvolvimento e testes sem hardware real, implementaremos uma classe `SimulatedPrinter` que simula o comportamento de uma impressora real, mas gera arquivos PDF ou imagens em vez de imprimir fisicamente.

### Tratamento de Erros

O módulo incluirá tratamento robusto de erros para lidar com situações como:
- Impressora desconectada
- Falta de papel
- Erro de comunicação
- Timeout

### Monitoramento

O módulo incluirá recursos de monitoramento para acompanhar o status dos periféricos e detectar problemas, como:
- Status da impressora (online/offline)
- Nível de papel
- Erros de hardware
- Estatísticas de uso

## Próximos Passos

1. Implementar a estrutura base do módulo
2. Implementar o suporte para impressoras Epson
3. Criar templates de recibos padrão
4. Integrar com o Módulo POS para impressão de recibos
5. Implementar simulação para testes
6. Adicionar suporte para outros fabricantes de impressoras
7. Expandir para outros tipos de periféricos (leitores de código de barras, gavetas de dinheiro, etc.)

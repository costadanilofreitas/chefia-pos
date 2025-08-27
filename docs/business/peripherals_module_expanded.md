# Documentação do Módulo de Periféricos

## Visão Geral

O Módulo de Periféricos do POS Modern fornece uma interface unificada para interação com diversos dispositivos de hardware comumente utilizados em ambientes de ponto de venda. Este módulo foi projetado com foco em:

- **Modularidade**: Suporte a múltiplos tipos e marcas de periféricos
- **Flexibilidade**: Configuração simples e adaptável às necessidades do negócio
- **Robustez**: Tratamento de erros e mecanismos de fallback
- **Extensibilidade**: Fácil adição de suporte a novos dispositivos

## Periféricos Suportados

### Impressoras Térmicas

| Marca | Modelos Suportados | Recursos Especiais |
|-------|-------------------|-------------------|
| Epson | TM-T20X, TM-T88VI, TM-T88VII | Códigos de barras, QR codes, gaveta de dinheiro |
| Bematech | MP-4200 TH, MP-100S TH, MP-2800 TH | Guilhotina automática, sensor de papel |
| Daruma | DR800, DR700, DR600 | Impressão em alta velocidade, logotipos |
| Elgin | i9, i7, i8 | Conexão Bluetooth, impressão em escala de cinza |

### Impressoras Convencionais

| Tipo | Compatibilidade | Observações |
|------|----------------|-------------|
| CUPS | Qualquer impressora compatível com CUPS | Ideal para relatórios e documentos administrativos |
| Impressoras HP | Série LaserJet, OfficeJet | Suporte a impressão em rede |
| Impressoras Epson | Série L, WorkForce | Suporte a impressão em rede e USB |

### Leitores de Código de Barras

| Tipo | Compatibilidade | Observações |
|------|----------------|-------------|
| Genéricos (USB HID) | Maioria dos leitores USB | Plug-and-play, sem necessidade de drivers especiais |
| Zebra | Série DS, LI | Suporte a leitura de códigos 1D e 2D |
| Honeywell | Voyager, Xenon | Suporte a leitura de códigos danificados |

### Leitores de QR Code/PIX

| Tipo | Compatibilidade | Observações |
|------|----------------|-------------|
| Leitores dedicados | Qualquer leitor compatível com USB HID | Configuração automática |
| Câmeras integradas | Webcams, câmeras USB | Requer calibração para melhor desempenho |

### Gavetas de Dinheiro

| Tipo | Compatibilidade | Observações |
|------|----------------|-------------|
| Conectadas a impressoras | Compatíveis com Epson, Bematech, Daruma, Elgin | Acionamento via impressora |
| Standalone | Gavetas com interface USB | Controle direto via USB |
| Em rede | Gavetas com interface Ethernet | Controle via rede local |

### Terminais TEF/SiTef

| Marca | Modelos Suportados | Observações |
|-------|-------------------|-------------|
| SiTef | Qualquer terminal compatível com protocolo SiTef | Suporte a múltiplas adquirentes |
| Stone | Stone e Stone Mini | Integração via API Stone |
| Cielo | LIO, Cielo Mini | Integração via API Cielo |

## Configuração

### Arquivo de Configuração

O módulo utiliza um arquivo de configuração JSON localizado em `src/peripherals/config/peripherals.json`. Exemplo:

```json
{
  "peripherals": {
    "main_printer": {
      "type": "thermal_printer",
      "driver": "epson",
      "name": "Impressora Principal",
      "device_path": "/dev/usb/lp0",
      "options": {
        "width": 80,
        "encoding": "cp850"
      },
      "auto_load": true
    },
    "barcode_reader": {
      "type": "barcode_reader",
      "driver": "generic",
      "name": "Leitor de Código de Barras",
      "device_path": "/dev/input/event0",
      "auto_load": true
    }
  }
}
```

### Configuração via API

Também é possível configurar periféricos via API REST:

```
POST /peripherals
{
  "id": "kitchen_printer",
  "type": "thermal_printer",
  "driver": "bematech",
  "name": "Impressora da Cozinha",
  "device_path": "/dev/usb/lp1",
  "options": {
    "width": 80
  }
}
```

## Uso da API

### Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/peripherals` | Lista todos os periféricos configurados |
| GET | `/peripherals/types` | Lista tipos e drivers disponíveis |
| GET | `/peripherals/{id}` | Obtém detalhes de um periférico específico |
| POST | `/peripherals` | Adiciona um novo periférico |
| DELETE | `/peripherals/{id}` | Remove um periférico |
| POST | `/peripherals/{id}/initialize` | Inicializa um periférico |
| POST | `/peripherals/{id}/shutdown` | Finaliza um periférico |

### Endpoints Específicos por Tipo

#### Impressoras

```
POST /peripherals/{id}/print
{
  "content": "Texto a ser impresso\nSegunda linha",
  "options": {
    "bold": true,
    "font_size": "large",
    "align": "center"
  }
}
```

#### Gavetas de Dinheiro

```
POST /peripherals/{id}/open_drawer
```

#### Terminais de Pagamento

```
POST /peripherals/{id}/process_payment
{
  "amount": 50.75,
  "type": "CREDIT",
  "installments": 1,
  "reference": "Pedido #12345"
}
```

```
POST /peripherals/{id}/cancel_payment
{
  "transaction_id": "TX1621234567"
}
```

#### Leitores de Código de Barras

```
POST /peripherals/{id}/read_barcode
{
  "timeout": 30
}
```

#### Leitores de PIX

```
POST /peripherals/{id}/read_pix
{
  "timeout": 60
}
```

## Integração com o Sistema

### Event Bus

O módulo de periféricos se integra ao barramento de eventos do sistema, permitindo que outros módulos reajam a eventos de periféricos. Exemplos de eventos:

- `peripheral_status_changed`: Quando o status de um periférico muda
- `peripheral_error`: Quando ocorre um erro em um periférico
- `payment_processed`: Quando um pagamento é processado com sucesso
- `drawer_opened`: Quando uma gaveta de dinheiro é aberta

### Integração com Módulo de Pedidos

O módulo de periféricos se integra naturalmente com o módulo de pedidos para:

- Imprimir recibos de pedidos
- Processar pagamentos
- Abrir gaveta de dinheiro após pagamento em dinheiro

Exemplo de uso no serviço de pedidos:

```python
from src.peripherals.services.peripheral_manager import peripheral_manager

async def finalize_order(order_id: str, payment_data: dict):
    # Processar pagamento
    payment_terminal = peripheral_manager.get_peripheral("main_terminal")
    if payment_terminal:
        payment_result = await payment_terminal.process_payment(payment_data)
        if not payment_result["success"]:
            raise Exception(f"Falha no pagamento: {payment_result['message']}")
    
    # Imprimir recibo
    printer = peripheral_manager.get_peripheral("main_printer")
    if printer:
        receipt_data = generate_receipt(order_id)
        await printer.print_receipt(receipt_data)
    
    # Abrir gaveta se pagamento em dinheiro
    if payment_data["type"] == "CASH":
        drawer = peripheral_manager.get_peripheral("cash_drawer")
        if drawer:
            await drawer.open()
```

## Simulação para Testes

O módulo inclui drivers de simulação para todos os tipos de periféricos, permitindo testes sem hardware real:

```json
{
  "peripherals": {
    "simulated_printer": {
      "type": "thermal_printer",
      "driver": "simulated",
      "name": "Impressora Simulada"
    },
    "simulated_terminal": {
      "type": "payment_terminal",
      "driver": "simulated",
      "name": "Terminal Simulado",
      "options": {
        "decline_rate": 0.1,
        "error_rate": 0.05
      }
    }
  }
}
```

## Solução de Problemas

### Problemas Comuns com Impressoras

| Problema | Possíveis Causas | Soluções |
|----------|-----------------|----------|
| Impressora não responde | Desconectada, sem papel, tampa aberta | Verificar conexão, papel e tampa |
| Caracteres incorretos | Codificação incorreta | Ajustar opção `encoding` na configuração |
| Corte de papel não funciona | Recurso não suportado pelo modelo | Verificar compatibilidade ou desativar corte automático |

### Problemas com Leitores de Código de Barras

| Problema | Possíveis Causas | Soluções |
|----------|-----------------|----------|
| Leitor não detectado | Problema de permissão no dispositivo | Ajustar permissões: `sudo chmod 666 /dev/input/eventX` |
| Leitura incorreta | Configuração de teclado incompatível | Ajustar layout de teclado do sistema |

### Problemas com Terminais de Pagamento

| Problema | Possíveis Causas | Soluções |
|----------|-----------------|----------|
| Conexão recusada | Endereço IP ou porta incorretos | Verificar configuração de rede |
| Timeout na transação | Problemas de rede ou terminal ocupado | Aumentar timeout ou verificar status do terminal |

## Extensão do Módulo

### Adicionando Suporte a Novos Dispositivos

Para adicionar suporte a um novo dispositivo:

1. Crie uma nova classe que herde da interface apropriada em `src/peripherals/models/peripheral_models.py`
2. Implemente os métodos abstratos requeridos
3. Registre o driver no mapa de drivers em `src/peripherals/services/peripheral_manager.py`

Exemplo para uma nova marca de impressora térmica:

```python
from src.peripherals.models.peripheral_models import ThermalPrinter, ThermalPrinterConfig

class NewBrandPrinter(ThermalPrinter):
    def __init__(self, config: ThermalPrinterConfig):
        super().__init__(config)
        # Inicialização específica
    
    async def initialize(self) -> bool:
        # Implementação específica
        
    async def print(self, content: str, options: dict = None) -> bool:
        # Implementação específica
```

Registro no mapa de drivers:

```python
_driver_map = {
    "thermal_printer": {
        # Drivers existentes
        "new_brand": "src.peripherals.drivers.new_brand.NewBrandPrinter"
    }
}
```

## Considerações de Segurança

- Todos os endpoints da API requerem autenticação
- As operações sensíveis (como abrir gaveta de dinheiro) devem ser restritas a usuários com permissões adequadas
- Os dados de pagamento são tratados com segurança e não são armazenados permanentemente

## Compatibilidade com Sistemas Operacionais

| Sistema Operacional | Suporte | Observações |
|---------------------|---------|-------------|
| Linux | Completo | Testado em Ubuntu 20.04+ |
| Windows | Parcial | Alguns dispositivos podem requerer drivers adicionais |
| macOS | Limitado | Suporte principalmente via CUPS |

## Requisitos de Hardware

- Portas USB disponíveis para periféricos locais
- Conexão de rede estável para periféricos em rede
- Espaço em disco para logs e arquivos temporários

## Referências

- [Documentação da API Epson ESC/POS](https://download.epson-biz.com/modules/pos/index.php?page=prod&pcat=3&pid=36)
- [Documentação da API SiTef](https://www.softwareexpress.com.br/sitef/)
- [Especificação USB HID para leitores de código de barras](https://www.usb.org/hid)

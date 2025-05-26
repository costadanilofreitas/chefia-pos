# Documentação do Módulo de Periféricos

## Visão Geral

O Módulo de Periféricos fornece uma camada de abstração para interação com dispositivos de hardware no sistema POS Modern. Atualmente, o módulo suporta impressoras térmicas (com foco inicial na Epson) e inclui um sistema de simulação para testes sem hardware real.

## Arquitetura

O módulo segue uma arquitetura em camadas:

1. **Camada de Abstração de Hardware**: Define interfaces genéricas para diferentes tipos de periféricos.
2. **Camada de Drivers**: Implementa a comunicação específica com cada marca/modelo de dispositivo.
3. **Camada de Serviços**: Fornece funcionalidades de alto nível para o restante do sistema.
4. **Camada de API**: Expõe endpoints REST para controle dos periféricos.
5. **Camada de Eventos**: Integra com o barramento de eventos para comunicação assíncrona.

## Dispositivos Suportados

### Impressoras Térmicas

| Marca | Modelo | Conexão | Status | Observações |
|-------|--------|---------|--------|-------------|
| Epson | TM-T20X | USB | Testado | Suporta gaveta de dinheiro |
| Epson | TM-T88VI | Rede | Testado | Alta velocidade, suporta QR Code |
| Epson | TM-T88V | USB/Serial | Compatível | Não testado extensivamente |
| Epson | TM-U220 | USB/Serial | Compatível | Impressora matricial, limitações gráficas |
| Bematech | MP-4200 TH | USB | Planejado | Suporte em desenvolvimento |
| Daruma | DR800 | USB/Serial | Planejado | Suporte em desenvolvimento |
| Elgin | i9 | USB/Rede | Planejado | Suporte em desenvolvimento |

### Simulação

O módulo inclui um driver de simulação que emula o comportamento de impressoras reais, gerando arquivos de texto/JSON para representar as saídas. Isso é útil para desenvolvimento e testes sem hardware físico.

## Configuração

### Arquivo de Configuração

A configuração dos periféricos é feita através do arquivo `peripherals.json` localizado em `src/peripherals/config/`. Exemplo:

```json
{
  "peripherals": {
    "default_printer": {
      "type": "printer",
      "brand": "epson",
      "model": "TM-T20X",
      "connection_type": "usb",
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
      "port": "9100",
      "options": {
        "paper_width": 80,
        "dpi": 180,
        "cash_drawer_enabled": false
      }
    },
    "simulated_printer": {
      "type": "printer",
      "brand": "simulated",
      "model": "Simulated Printer",
      "connection_type": "direct",
      "options": {
        "paper_width": 80,
        "output_dir": "/tmp/simulated_printer",
        "cash_drawer_enabled": true
      }
    }
  }
}
```

### Parâmetros de Configuração

#### Impressoras

| Parâmetro | Descrição | Valores |
|-----------|-----------|---------|
| type | Tipo de periférico | "printer" |
| brand | Marca do dispositivo | "epson", "bematech", "daruma", "elgin", "simulated" |
| model | Modelo específico | Depende da marca |
| connection_type | Tipo de conexão | "usb", "network", "serial", "direct" |
| port | Porta de conexão | "auto" ou específica (ex: "COM1", "9100") |
| address | Endereço IP (para conexão de rede) | Endereço IP válido |
| options.paper_width | Largura do papel em mm | 58, 80 (comum) |
| options.dpi | Resolução em DPI | Depende do modelo |
| options.cash_drawer_enabled | Suporte a gaveta de dinheiro | true/false |
| options.output_dir | Diretório de saída (apenas simulação) | Caminho válido |

## Templates de Impressão

O módulo suporta templates de impressão em formato JSON, permitindo a definição de layouts personalizados para diferentes tipos de recibos. Os templates são armazenados em `src/peripherals/templates/`.

### Estrutura de Template

```json
{
  "name": "receipt_payment",
  "version": "1.0",
  "sections": [
    {
      "type": "header",
      "content": [
        {"type": "text", "value": "{{terminal.name}}", "align": "center", "style": "bold"},
        {"type": "line", "style": "double"}
      ]
    },
    {
      "type": "body",
      "content": [
        {"type": "text", "value": "COMPROVANTE DE PAGAMENTO", "align": "center", "style": "bold"},
        {"type": "text", "value": "Data: {{payment.created_at|date}}", "align": "left"}
      ]
    },
    {
      "type": "footer",
      "content": [
        {"type": "text", "value": "Obrigado pela preferência!", "align": "center"},
        {"type": "barcode", "value": "{{payment.id}}", "barcode_type": "CODE128", "align": "center"}
      ]
    }
  ]
}
```

### Tipos de Conteúdo Suportados

- **text**: Texto simples ou formatado
- **line**: Linha horizontal (separador)
- **barcode**: Código de barras
- **qrcode**: Código QR
- **image**: Imagem (caminho para arquivo)

### Formatação de Variáveis

O sistema suporta substituição de variáveis no formato `{{variavel}}` e formatadores usando pipe: `{{variavel|formatador}}`.

Formatadores disponíveis:
- **date**: Formata data (DD/MM/AAAA)
- **time**: Formata hora (HH:MM:SS)
- **number:X**: Formata número com X casas decimais

## API REST

O módulo expõe endpoints REST para controle dos periféricos:

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| /api/v1/peripherals/ | GET | Lista todos os periféricos |
| /api/v1/peripherals/{id} | GET | Obtém detalhes de um periférico |
| /api/v1/peripherals/{id}/status | GET | Obtém status de um periférico |
| /api/v1/peripherals/printers/{id}/print-text | POST | Imprime texto simples |
| /api/v1/peripherals/printers/{id}/print-receipt | POST | Imprime recibo usando template |
| /api/v1/peripherals/printers/{id}/open-cash-drawer | POST | Abre gaveta de dinheiro |
| /api/v1/peripherals/printers/{id}/print-image | POST | Imprime imagem |
| /api/v1/peripherals/printers/{id}/print-barcode | POST | Imprime código de barras |
| /api/v1/peripherals/printers/{id}/print-qrcode | POST | Imprime código QR |
| /api/v1/peripherals/status | GET | Verifica status de todos os periféricos |

## Integração com Barramento de Eventos

O módulo se integra ao barramento de eventos do sistema, permitindo comunicação assíncrona com outros módulos.

### Eventos Publicados

| Evento | Descrição |
|--------|-----------|
| peripheral.connected | Periférico conectado |
| peripheral.disconnected | Periférico desconectado |
| peripheral.error | Erro em periférico |
| print.requested | Solicitação de impressão |
| print.completed | Impressão concluída |
| print.error | Erro de impressão |
| cash_drawer.opened | Gaveta de dinheiro aberta |
| cash_drawer.closed | Gaveta de dinheiro fechada |

### Exemplo de Uso via Eventos

Para solicitar uma impressão via eventos:

```python
from src.peripherals.events.peripheral_events import get_peripheral_event_publisher

async def print_receipt_example():
    publisher = get_peripheral_event_publisher()
    
    receipt_data = {
        "terminal": {"name": "POS #1", "address": "Rua Exemplo, 123"},
        "payment": {
            "id": "12345",
            "order_id": "O-789",
            "amount": 150.75,
            "method": "Cartão de Crédito",
            "created_at": "2025-05-24T12:34:56"
        },
        "session": {"user_id": "Operador 1"}
    }
    
    await publisher.publish_print_requested(
        printer_id="default_printer",
        template_name="receipt_payment",
        data=receipt_data
    )
```

## Requisitos de Software

Para utilizar o módulo com impressoras reais, é necessário instalar a biblioteca Python ESC/POS:

```bash
pip install python-escpos
```

Para impressoras USB, pode ser necessário instalar bibliotecas adicionais do sistema:

```bash
# Ubuntu/Debian
sudo apt-get install libusb-1.0-0-dev
```

## Solução de Problemas

### Impressora USB não detectada

1. Verifique se o usuário tem permissões para acessar dispositivos USB:
   ```bash
   sudo usermod -a -G lp,dialout $USER
   ```

2. Crie regras udev para a impressora:
   ```bash
   # Arquivo: /etc/udev/rules.d/99-escpos.rules
   SUBSYSTEM=="usb", ATTRS{idVendor}=="04b8", ATTRS{idProduct}=="0202", MODE="0666", GROUP="lp"
   ```

3. Recarregue as regras:
   ```bash
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   ```

### Problemas de Conexão de Rede

1. Verifique se a impressora está ligada e conectada à rede
2. Teste a conexão com ping: `ping 192.168.1.100`
3. Teste a porta com telnet: `telnet 192.168.1.100 9100`

## Próximos Passos

- Adicionar suporte para mais marcas de impressoras (Bematech, Daruma, Elgin)
- Implementar suporte para outros periféricos (leitor de código de barras, display de cliente)
- Melhorar o sistema de descoberta automática de dispositivos
- Adicionar suporte para impressão direta de PDFs

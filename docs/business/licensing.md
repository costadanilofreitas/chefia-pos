# Controle de Licenciamento por Instância

O sistema POS moderno utiliza um mecanismo de licenciamento baseado em arquivos de configuração para controlar o número de instâncias ativas permitidas para cada módulo (POS, KDS, Garçom), seguindo um modelo de "bundles" por instância.

## Mecanismo de Licenciamento

O licenciamento é gerenciado pela presença de arquivos de configuração específicos dentro da pasta `config/` na raiz do projeto. A estrutura é a seguinte:

```
pos-modern/
├── config/
│   ├── pos/
│   │   ├── 1.json
│   │   ├── 2.json
│   │   └── ... (até N arquivos para N instâncias POS licenciadas)
│   ├── kds/
│   │   ├── 1.json
│   │   └── ... (até M arquivos para M instâncias KDS licenciadas)
│   └── waiter/
│       ├── 1.json
│       ├── 2.json
│       └── ... (até P arquivos para P instâncias Garçom licenciadas)
└── src/
    └── ...
```

- Cada subpasta (`pos`, `kds`, `waiter`) corresponde a um módulo.
- Cada arquivo numerado (`1.json`, `2.json`, etc.) dentro de uma subpasta representa uma instância licenciada para aquele módulo.
- A existência do arquivo `config/<modulo>/<ID>.json` indica que a instância com o ID `<ID>` para o módulo `<modulo>` está licenciada e pode ser acessada.

## Gerenciando Licenças

- **Para adicionar uma nova instância licenciada:** Crie um novo arquivo JSON numerado sequencialmente na pasta do módulo correspondente (ex: `config/pos/3.json` para licenciar o terceiro terminal POS).
- **Para remover uma licença:** Exclua o arquivo JSON correspondente à instância que deseja desativar.

## Formato dos Arquivos de Configuração

Cada arquivo de configuração (`<ID>.json`) deve conter um objeto JSON com as configurações específicas para aquela instância. O formato exato depende do módulo:

### POS (`config/pos/<ID>.json`)

Deve seguir a estrutura do modelo `POSConfig` definido em `src/pos/models/pos_models.py`. Campos obrigatórios incluem `terminal_id` e `terminal_name`. Exemplo:

```json
{
  "terminal_id": "POS001",
  "terminal_name": "Caixa Principal",
  "printer_configs": [
    {
      "name": "Cozinha",
      "type": "kitchen",
      "model": "Generic Thermal",
      "connection_type": "network",
      "connection_params": {"ip_address": "192.168.1.100", "port": 9100}
    }
  ],
  "default_printer": "Recibo",
  "allow_discounts": true,
  "max_discount_percent": 15.0,
  "allow_price_override": false,
  "allow_returns": true,
  "default_payment_method": "cash",
  "tax_included": true,
  "currency_symbol": "R$",
  "decimal_places": 2
}
```

*(Nota: Os modelos `KDSConfig` e `WaiterConfig` ainda precisam ser definidos para especificar o formato dos arquivos `config/kds/<ID>.json` e `config/waiter/<ID>.json` respectivamente. Por enquanto, podem ser arquivos JSON vazios `{}` ou conter configurações básicas.)*

## Comportamento da API

As rotas da API que requerem um ID de instância (ex: `/api/v1/pos/config?pos_id=ID`, `/api/v1/kds/sessions?kds_id=ID`) verificarão automaticamente a existência do arquivo de configuração correspondente.

- **Se o arquivo `config/<modulo>/<ID>.json` existir:** A requisição prosseguirá normalmente.
- **Se o arquivo `config/<modulo>/<ID>.json` NÃO existir:** A API retornará um erro `403 Forbidden` com a mensagem:
  ```json
  {"detail":"Instance ID <ID> for module <modulo> is not licensed."}
  ```

Isso garante que apenas as instâncias explicitamente licenciadas através dos arquivos de configuração possam ser acessadas.

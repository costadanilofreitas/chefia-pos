# 🔌 Integrations Complete Guide - Chefia POS

## Metadata
- **Version**: 1.0.0
- **Last Updated**: January 2025
- **Status**: Production Ready
- **Priority**: HIGH

---

## 1. IFOOD INTEGRATION

### 1.1 Architecture Overview
```yaml
type: Webhook-based
protocol: HTTPS
authentication: OAuth 2.0
environment:
  sandbox: https://merchant-api.ifood.com.br/sandbox
  production: https://merchant-api.ifood.com.br
rate_limit: 100 requests/minute
```

### 1.2 Authentication Flow
```python
# src/integrations/ifood/auth.py
from typing import Optional
import httpx
from datetime import datetime, timedelta

class IFoodAuthService:
    """Handle iFood OAuth authentication."""
    
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = "https://merchant-api.ifood.com.br"
        self.token: Optional[str] = None
        self.token_expires: Optional[datetime] = None
    
    async def get_access_token(self) -> str:
        """Get or refresh access token."""
        if self.token and self.token_expires > datetime.now():
            return self.token
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/authentication/v1.0/oauth/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                }
            )
            response.raise_for_status()
            data = response.json()
            
            self.token = data["access_token"]
            self.token_expires = datetime.now() + timedelta(
                seconds=data["expires_in"]
            )
            return self.token
```

### 1.3 Webhook Endpoints
```python
# src/integrations/ifood/webhooks.py
from fastapi import APIRouter, HTTPException, Header, Request
from typing import Optional
import hmac
import hashlib

router = APIRouter(prefix="/api/v1/webhooks/ifood")

@router.post("/order")
async def receive_order(
    request: Request,
    x_ifood_signature: Optional[str] = Header(None)
):
    """Receive new order from iFood."""
    # 1. Validate signature
    body = await request.body()
    if not validate_signature(body, x_ifood_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # 2. Parse order data
    order_data = await request.json()
    
    # 3. Map to internal format
    internal_order = map_ifood_to_internal(order_data)
    
    # 4. Process order
    await process_ifood_order(internal_order)
    
    # 5. Send acknowledgment
    return {"status": "received", "order_id": order_data["id"]}

@router.post("/status")
async def update_order_status(
    request: Request,
    x_ifood_signature: Optional[str] = Header(None)
):
    """Update order status from iFood."""
    body = await request.body()
    if not validate_signature(body, x_ifood_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    status_data = await request.json()
    await update_internal_order_status(status_data)
    return {"status": "updated"}

def validate_signature(body: bytes, signature: str) -> bool:
    """Validate iFood webhook signature."""
    secret = get_ifood_webhook_secret()
    expected = hmac.new(
        secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

### 1.4 Order Mapping
```python
# src/integrations/ifood/mappers.py
from decimal import Decimal
from datetime import datetime

def map_ifood_to_internal(ifood_order: dict) -> dict:
    """Map iFood order to internal format."""
    return {
        "external_id": ifood_order["id"],
        "source": "IFOOD",
        "customer": {
            "name": ifood_order["customer"]["name"],
            "phone": ifood_order["customer"]["phone"]["number"],
            "document": ifood_order["customer"]["taxPayerIdentificationNumber"]
        },
        "delivery": {
            "type": ifood_order["deliveryMethod"]["mode"],
            "address": format_address(ifood_order["deliveryAddress"]),
            "fee": Decimal(str(ifood_order["deliveryMethod"]["value"]))
        },
        "items": [
            {
                "external_id": item["id"],
                "name": item["name"],
                "quantity": item["quantity"],
                "unit_price": Decimal(str(item["unitPrice"])),
                "total_price": Decimal(str(item["totalPrice"])),
                "notes": item.get("observations", ""),
                "options": map_item_options(item.get("options", []))
            }
            for item in ifood_order["items"]
        ],
        "payment": {
            "method": ifood_order["payments"][0]["method"],
            "prepaid": ifood_order["payments"][0]["prepaid"],
            "value": Decimal(str(ifood_order["payments"][0]["value"]))
        },
        "total": Decimal(str(ifood_order["total"]["value"])),
        "created_at": datetime.fromisoformat(ifood_order["createdAt"])
    }

def format_address(address: dict) -> dict:
    """Format iFood address to internal format."""
    return {
        "street": address["streetName"],
        "number": address["streetNumber"],
        "complement": address.get("complement", ""),
        "neighborhood": address["neighborhood"],
        "city": address["city"],
        "state": address["state"],
        "postal_code": address["postalCode"],
        "coordinates": {
            "latitude": address["coordinates"]["latitude"],
            "longitude": address["coordinates"]["longitude"]
        }
    }
```

### 1.5 Error Handling & Retry
```python
# src/integrations/ifood/retry.py
from typing import Callable
import asyncio
from functools import wraps

def retry_with_backoff(max_retries: int = 3, base_delay: float = 1.0):
    """Decorator for retry with exponential backoff."""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    
                    delay = base_delay * (2 ** attempt)
                    await asyncio.sleep(delay)
            
        return wrapper
    return decorator

@retry_with_backoff(max_retries=3)
async def acknowledge_order(order_id: str):
    """Acknowledge order receipt to iFood."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{IFOOD_API}/orders/{order_id}/confirm",
            headers={"Authorization": f"Bearer {await get_token()}"}
        )
        response.raise_for_status()
```

---

## 2. WHATSAPP/TWILIO INTEGRATION

### 2.1 Architecture
```yaml
provider: Twilio
service: WhatsApp Business API
authentication: Account SID + Auth Token
webhook_type: HTTP POST
message_queue: AWS SQS FIFO
ai_engine: Amazon Bedrock
```

### 2.2 Twilio Configuration
```python
# src/integrations/whatsapp/config.py
from twilio.rest import Client
from pydantic import BaseSettings

class TwilioConfig(BaseSettings):
    account_sid: str
    auth_token: str
    whatsapp_number: str
    webhook_url: str
    status_callback_url: str
    
    class Config:
        env_prefix = "TWILIO_"

config = TwilioConfig()
client = Client(config.account_sid, config.auth_token)
```

### 2.3 Message Handling
```python
# src/integrations/whatsapp/handler.py
from fastapi import APIRouter, Request, HTTPException
from twilio.twiml.messaging_response import MessagingResponse
import re

router = APIRouter(prefix="/api/v1/webhooks/whatsapp")

@router.post("/message")
async def receive_message(request: Request):
    """Handle incoming WhatsApp messages."""
    form_data = await request.form()
    
    # Extract message data
    from_number = form_data.get("From", "").replace("whatsapp:", "")
    message_body = form_data.get("Body", "")
    media_url = form_data.get("MediaUrl0")
    
    # Identify restaurant by phone mapping
    restaurant_id = await identify_restaurant(from_number)
    if not restaurant_id:
        return create_response("Desculpe, não encontramos seu restaurante.")
    
    # Get or create conversation context
    context = await get_conversation_context(from_number, restaurant_id)
    
    # Process with AI
    ai_response = await process_with_ai(
        message_body,
        context,
        restaurant_id
    )
    
    # Handle action if needed
    if ai_response.action:
        await handle_action(ai_response.action, context)
    
    # Update context
    await update_conversation_context(from_number, ai_response.context)
    
    # Send response
    return create_response(ai_response.message)

def create_response(message: str) -> str:
    """Create Twilio response."""
    response = MessagingResponse()
    response.message(message)
    return str(response)
```

### 2.4 AI Integration
```python
# src/integrations/whatsapp/ai_processor.py
import boto3
from typing import Optional

bedrock = boto3.client('bedrock-runtime')

async def process_with_ai(
    message: str,
    context: dict,
    restaurant_id: str
) -> AIResponse:
    """Process message with Amazon Bedrock."""
    
    # Get restaurant menu and context
    menu = await get_restaurant_menu(restaurant_id)
    
    # Build prompt
    prompt = build_prompt(message, context, menu)
    
    # Call Bedrock
    response = bedrock.invoke_model(
        modelId='anthropic.claude-3-sonnet',
        body={
            "prompt": prompt,
            "max_tokens": 500,
            "temperature": 0.7
        }
    )
    
    # Parse response
    ai_output = parse_ai_response(response)
    
    return AIResponse(
        message=ai_output.reply,
        action=ai_output.action,
        context=ai_output.updated_context
    )

def build_prompt(message: str, context: dict, menu: dict) -> str:
    """Build AI prompt with context."""
    return f"""
    You are a restaurant ordering assistant. 
    
    Restaurant Menu:
    {format_menu(menu)}
    
    Conversation Context:
    {format_context(context)}
    
    Customer Message: {message}
    
    Respond naturally and help the customer with their order.
    If they want to place an order, extract the items and quantities.
    """
```

### 2.5 Order Processing
```python
# src/integrations/whatsapp/order_processor.py
async def handle_action(action: dict, context: dict):
    """Handle AI-identified actions."""
    
    if action["type"] == "CREATE_ORDER":
        order = await create_whatsapp_order(
            items=action["items"],
            customer_phone=context["phone"],
            delivery_address=action.get("address")
        )
        
        # Send to queue
        await publish_to_sqs(order)
        
        # Generate payment link if needed
        if action.get("payment_method") == "online":
            payment_link = await generate_payment_link(order)
            await send_payment_link(context["phone"], payment_link)
    
    elif action["type"] == "CHECK_STATUS":
        order_status = await get_order_status(action["order_id"])
        await send_status_update(context["phone"], order_status)
```

---

## 3. ASAAS PAYMENT GATEWAY

### 3.1 Configuration
```yaml
api_url: https://api.asaas.com/v3
sandbox_url: https://sandbox.asaas.com/api/v3
authentication: API Key
webhook_validation: HMAC-SHA256
supported_methods:
  - PIX
  - CREDIT_CARD
  - DEBIT_CARD
  - BOLETO
```

### 3.2 Payment Processing
```python
# src/integrations/asaas/payment_service.py
import httpx
from decimal import Decimal
from typing import Optional

class AsaasPaymentService:
    """Asaas payment gateway integration."""
    
    def __init__(self, api_key: str, sandbox: bool = False):
        self.api_key = api_key
        self.base_url = (
            "https://sandbox.asaas.com/api/v3" if sandbox
            else "https://api.asaas.com/v3"
        )
    
    async def create_pix_payment(
        self,
        amount: Decimal,
        customer_id: str,
        description: str,
        external_reference: str
    ) -> dict:
        """Create PIX payment."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/payments",
                headers={"access_token": self.api_key},
                json={
                    "customer": customer_id,
                    "billingType": "PIX",
                    "value": float(amount),
                    "description": description,
                    "externalReference": external_reference,
                    "callback": {
                        "successUrl": f"{BASE_URL}/payment/success",
                        "autoRedirect": True
                    }
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def create_split_payment(
        self,
        amount: Decimal,
        splits: list[dict],
        payment_method: str
    ) -> dict:
        """Create split payment."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/payments",
                headers={"access_token": self.api_key},
                json={
                    "billingType": payment_method,
                    "value": float(amount),
                    "split": splits,
                    "splitType": "PERCENTAGE"
                }
            )
            response.raise_for_status()
            return response.json()
```

### 3.3 Webhook Processing
```python
# src/integrations/asaas/webhooks.py
from fastapi import APIRouter, Request, HTTPException
import hmac
import hashlib

router = APIRouter(prefix="/api/v1/webhooks/asaas")

@router.post("/payment")
async def payment_webhook(request: Request):
    """Handle Asaas payment webhooks."""
    
    # Validate signature
    signature = request.headers.get("asaas-signature")
    body = await request.body()
    
    if not validate_asaas_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Parse event
    event = await request.json()
    
    # Process based on event type
    if event["event"] == "PAYMENT_CONFIRMED":
        await handle_payment_confirmed(event["payment"])
    elif event["event"] == "PAYMENT_RECEIVED":
        await handle_payment_received(event["payment"])
    elif event["event"] == "PAYMENT_OVERDUE":
        await handle_payment_overdue(event["payment"])
    
    return {"status": "processed"}

def validate_asaas_signature(body: bytes, signature: str) -> bool:
    """Validate Asaas webhook signature."""
    webhook_token = get_asaas_webhook_token()
    expected = hmac.new(
        webhook_token.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

### 3.4 Refund Processing
```python
async def process_refund(payment_id: str, amount: Optional[Decimal] = None):
    """Process payment refund."""
    async with httpx.AsyncClient() as client:
        data = {"value": float(amount)} if amount else {}
        
        response = await client.post(
            f"{self.base_url}/payments/{payment_id}/refund",
            headers={"access_token": self.api_key},
            json=data
        )
        response.raise_for_status()
        return response.json()
```

---

## 4. TEF/PAYMENT TERMINALS

### 4.1 Supported Providers
```yaml
providers:
  sitef:
    sdk: CliSiTef
    protocol: TCP/IP
    port: 10001
  stone:
    sdk: StoneSDK
    protocol: USB/Bluetooth
  cielo:
    sdk: CieloLIO
    protocol: Android SDK
  pagseguro:
    sdk: PagSeguroSDK
    protocol: USB/Serial
```

### 4.2 TEF Integration
```python
# src/integrations/tef/sitef_adapter.py
import ctypes
from typing import Optional

class SiTefAdapter:
    """SiTef payment terminal integration."""
    
    def __init__(self):
        self.dll = ctypes.CDLL("CliSiTef32.dll")
        self.configured = False
    
    def configure(
        self,
        ip_sitef: str,
        terminal_id: str,
        company_code: str
    ):
        """Configure SiTef connection."""
        result = self.dll.ConfiguraIntSiTefInterativoEx(
            ip_sitef.encode(),
            terminal_id.encode(),
            company_code.encode(),
            0
        )
        
        if result == 0:
            self.configured = True
        else:
            raise Exception(f"SiTef configuration failed: {result}")
    
    def process_payment(
        self,
        function: int,
        amount: int,
        doc_number: str,
        datetime_str: str,
        operator: str
    ) -> dict:
        """Process payment transaction."""
        if not self.configured:
            raise Exception("SiTef not configured")
        
        # Start transaction
        result = self.dll.IniciaFuncaoSiTefInterativo(
            function,
            str(amount).encode(),
            doc_number.encode(),
            datetime_str.encode(),
            operator.encode(),
            b""
        )
        
        if result != 10000:
            return {"success": False, "error": f"Failed to start: {result}"}
        
        # Process transaction loop
        while True:
            next_command = ctypes.c_int()
            field_type = ctypes.c_int()
            min_size = ctypes.c_int()
            max_size = ctypes.c_int()
            buffer = ctypes.create_string_buffer(20000)
            
            result = self.dll.ContinuaFuncaoSiTefInterativo(
                ctypes.byref(next_command),
                ctypes.byref(field_type),
                ctypes.byref(min_size),
                ctypes.byref(max_size),
                buffer,
                20000,
                0
            )
            
            if result == 0:
                # Transaction completed
                return self._get_transaction_result()
            elif result == 1:
                # Display message
                self._display_message(buffer.value.decode())
            elif result == 2:
                # Display message and wait
                self._display_and_wait(buffer.value.decode())
            # ... handle other cases
```

---

## 5. FISCAL INTEGRATION

### 5.1 SAT Module
```python
# src/integrations/fiscal/sat_adapter.py
import xml.etree.ElementTree as ET
from decimal import Decimal

class SATAdapter:
    """SAT fiscal device integration."""
    
    def __init__(self, dll_path: str):
        self.dll = ctypes.CDLL(dll_path)
        self.session_number = 0
    
    def activate_sat(self, activation_code: str, cnpj: str, state_code: int):
        """Activate SAT device."""
        self.session_number += 1
        result = self.dll.AtivarSAT(
            self.session_number,
            1,  # Certificate type
            activation_code.encode(),
            cnpj.encode(),
            state_code
        )
        return self._parse_result(result)
    
    def generate_cfe(self, sale_data: dict) -> str:
        """Generate CF-e XML."""
        root = ET.Element("CFe")
        
        # Add infCFe
        inf_cfe = ET.SubElement(root, "infCFe")
        
        # IDE - Identification
        ide = ET.SubElement(inf_cfe, "ide")
        ET.SubElement(ide, "CNPJ").text = sale_data["cnpj"]
        ET.SubElement(ide, "signAC").text = self._generate_signature()
        ET.SubElement(ide, "numeroCaixa").text = str(sale_data["terminal_id"])
        
        # Emit - Emitter
        emit = ET.SubElement(inf_cfe, "emit")
        ET.SubElement(emit, "CNPJ").text = sale_data["company"]["cnpj"]
        ET.SubElement(emit, "IE").text = sale_data["company"]["ie"]
        ET.SubElement(emit, "xNome").text = sale_data["company"]["name"]
        
        # Dest - Customer
        if sale_data.get("customer"):
            dest = ET.SubElement(inf_cfe, "dest")
            if sale_data["customer"].get("cpf"):
                ET.SubElement(dest, "CPF").text = sale_data["customer"]["cpf"]
            elif sale_data["customer"].get("cnpj"):
                ET.SubElement(dest, "CNPJ").text = sale_data["customer"]["cnpj"]
        
        # Det - Items
        for idx, item in enumerate(sale_data["items"], 1):
            det = ET.SubElement(inf_cfe, "det", nItem=str(idx))
            prod = ET.SubElement(det, "prod")
            ET.SubElement(prod, "cProd").text = item["code"]
            ET.SubElement(prod, "xProd").text = item["description"]
            ET.SubElement(prod, "NCM").text = item.get("ncm", "00000000")
            ET.SubElement(prod, "CFOP").text = item.get("cfop", "5102")
            ET.SubElement(prod, "uCom").text = item["unit"]
            ET.SubElement(prod, "qCom").text = str(item["quantity"])
            ET.SubElement(prod, "vUnCom").text = str(item["unit_price"])
            ET.SubElement(prod, "vProd").text = str(item["total"])
            
            # Tax
            imposto = ET.SubElement(det, "imposto")
            self._add_tax_info(imposto, item)
        
        # Total
        total = ET.SubElement(inf_cfe, "total")
        ET.SubElement(total, "vCFe").text = str(sale_data["total"])
        
        # Payment
        pgto = ET.SubElement(inf_cfe, "pgto")
        for payment in sale_data["payments"]:
            mp = ET.SubElement(pgto, "MP")
            ET.SubElement(mp, "cMP").text = self._get_payment_code(payment["method"])
            ET.SubElement(mp, "vMP").text = str(payment["value"])
        
        return ET.tostring(root, encoding="unicode")
```

### 5.2 NFC-e Module
```python
# src/integrations/fiscal/nfce_adapter.py
class NFCeAdapter:
    """NFC-e fiscal document generation."""
    
    async def generate_nfce(self, sale_data: dict) -> dict:
        """Generate and transmit NFC-e."""
        
        # Generate XML
        xml_content = self._generate_nfce_xml(sale_data)
        
        # Sign XML
        signed_xml = self._sign_xml(xml_content)
        
        # Transmit to SEFAZ
        response = await self._transmit_to_sefaz(signed_xml)
        
        if response["status"] == "authorized":
            # Save authorized XML
            await self._save_authorized_xml(response["xml"])
            
            # Generate DANFE
            danfe = self._generate_danfe(response["xml"])
            
            return {
                "success": True,
                "protocol": response["protocol"],
                "access_key": response["access_key"],
                "danfe": danfe
            }
        else:
            return {
                "success": False,
                "error": response["message"]
            }
```

---

## 6. MONITORING & ERROR RECOVERY

### 6.1 Health Checks
```python
# src/integrations/health/monitor.py
from fastapi import APIRouter
import asyncio

router = APIRouter(prefix="/api/v1/integrations/health")

@router.get("/status")
async def check_integrations_health():
    """Check health of all integrations."""
    
    health_checks = await asyncio.gather(
        check_ifood_health(),
        check_whatsapp_health(),
        check_asaas_health(),
        check_tef_health(),
        check_fiscal_health(),
        return_exceptions=True
    )
    
    return {
        "ifood": format_health(health_checks[0]),
        "whatsapp": format_health(health_checks[1]),
        "asaas": format_health(health_checks[2]),
        "tef": format_health(health_checks[3]),
        "fiscal": format_health(health_checks[4])
    }

async def check_ifood_health() -> dict:
    """Check iFood integration health."""
    try:
        token = await get_ifood_token()
        return {"status": "healthy", "token_valid": bool(token)}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

### 6.2 Retry Queue
```python
# src/integrations/retry/queue.py
from typing import Any
import json
from datetime import datetime, timedelta

class RetryQueue:
    """Failed integration retry queue."""
    
    def __init__(self, redis_client):
        self.redis = redis_client
        self.key_prefix = "integration:retry"
    
    async def add_failed_request(
        self,
        integration: str,
        operation: str,
        data: dict,
        error: str,
        max_retries: int = 3
    ):
        """Add failed request to retry queue."""
        retry_item = {
            "integration": integration,
            "operation": operation,
            "data": data,
            "error": error,
            "attempts": 0,
            "max_retries": max_retries,
            "created_at": datetime.now().isoformat(),
            "next_retry": (datetime.now() + timedelta(minutes=1)).isoformat()
        }
        
        await self.redis.zadd(
            f"{self.key_prefix}:{integration}",
            {json.dumps(retry_item): datetime.now().timestamp()}
        )
    
    async def process_retry_queue(self, integration: str):
        """Process pending retries for integration."""
        now = datetime.now().timestamp()
        
        # Get items ready for retry
        items = await self.redis.zrangebyscore(
            f"{self.key_prefix}:{integration}",
            0,
            now
        )
        
        for item_json in items:
            item = json.loads(item_json)
            
            # Process retry
            success = await self._retry_operation(item)
            
            if success:
                # Remove from queue
                await self.redis.zrem(
                    f"{self.key_prefix}:{integration}",
                    item_json
                )
            else:
                # Update retry count and schedule next retry
                item["attempts"] += 1
                
                if item["attempts"] >= item["max_retries"]:
                    # Move to dead letter queue
                    await self._move_to_dlq(item)
                else:
                    # Schedule next retry with exponential backoff
                    delay = 2 ** item["attempts"]
                    item["next_retry"] = (
                        datetime.now() + timedelta(minutes=delay)
                    ).isoformat()
                    
                    # Update in queue
                    await self.redis.zadd(
                        f"{self.key_prefix}:{integration}",
                        {json.dumps(item): item["next_retry"]}
                    )
```

---

## 7. CONFIGURATION MANAGEMENT

### 7.1 Environment Configuration
```yaml
# config/integrations.yaml
integrations:
  ifood:
    enabled: true
    client_id: ${IFOOD_CLIENT_ID}
    client_secret: ${IFOOD_CLIENT_SECRET}
    webhook_secret: ${IFOOD_WEBHOOK_SECRET}
    sandbox: false
    
  whatsapp:
    enabled: true
    provider: twilio
    account_sid: ${TWILIO_ACCOUNT_SID}
    auth_token: ${TWILIO_AUTH_TOKEN}
    phone_number: ${TWILIO_WHATSAPP_NUMBER}
    
  asaas:
    enabled: true
    api_key: ${ASAAS_API_KEY}
    webhook_token: ${ASAAS_WEBHOOK_TOKEN}
    sandbox: false
    
  tef:
    enabled: true
    provider: sitef
    terminal_id: ${TEF_TERMINAL_ID}
    company_code: ${TEF_COMPANY_CODE}
    
  fiscal:
    sat:
      enabled: true
      activation_code: ${SAT_ACTIVATION_CODE}
    nfce:
      enabled: true
      certificate_path: ${NFCE_CERT_PATH}
      certificate_password: ${NFCE_CERT_PASSWORD}
```

### 7.2 Secret Management
```python
# src/integrations/config/secrets.py
import boto3
from functools import lru_cache

class SecretManager:
    """Manage integration secrets."""
    
    def __init__(self):
        self.client = boto3.client('secretsmanager')
    
    @lru_cache(maxsize=32)
    def get_secret(self, secret_name: str) -> dict:
        """Get secret from AWS Secrets Manager."""
        response = self.client.get_secret_value(SecretId=secret_name)
        return json.loads(response['SecretString'])
    
    def get_integration_config(self, integration: str) -> dict:
        """Get integration configuration with secrets."""
        secret = self.get_secret(f"chefia-pos/{integration}")
        return {
            **secret,
            "enabled": True,
            "last_updated": datetime.now().isoformat()
        }
```

---

## 8. TESTING & VALIDATION

### 8.1 Integration Tests
```python
# tests/integrations/test_ifood.py
import pytest
from unittest.mock import Mock, patch

@pytest.mark.asyncio
async def test_ifood_order_webhook():
    """Test iFood order webhook processing."""
    
    # Mock order data
    ifood_order = {
        "id": "123456",
        "customer": {
            "name": "John Doe",
            "phone": {"number": "11999999999"}
        },
        "items": [
            {
                "id": "item1",
                "name": "Pizza Margherita",
                "quantity": 1,
                "unitPrice": 35.00,
                "totalPrice": 35.00
            }
        ],
        "total": {"value": 40.00}
    }
    
    # Process webhook
    with patch('src.integrations.ifood.webhooks.process_ifood_order') as mock_process:
        response = await receive_order(ifood_order)
        
        assert response["status"] == "received"
        mock_process.assert_called_once()
```

### 8.2 Mock Services
```python
# src/integrations/mocks/mock_services.py
class MockIntegrationService:
    """Mock service for testing."""
    
    def __init__(self, integration_type: str):
        self.integration_type = integration_type
        self.responses = self._load_mock_responses()
    
    async def process_request(self, operation: str, data: dict):
        """Process mock request."""
        if operation in self.responses:
            return self.responses[operation]
        
        return {
            "success": True,
            "mock": True,
            "data": data
        }
```

---

## 9. TROUBLESHOOTING

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| iFood webhook timeout | Network latency | Implement async processing with queue |
| WhatsApp message delivery failure | Rate limiting | Implement message queue with throttling |
| Asaas payment webhook duplicate | Network retry | Implement idempotency key validation |
| TEF connection lost | Terminal offline | Implement automatic reconnection with backoff |
| SAT activation failure | Invalid certificate | Verify certificate and activation code |
| NFC-e transmission error | SEFAZ unavailable | Enable contingency mode |

---

## 10. MIGRATION GUIDE

### From Mock to Production
```bash
# 1. Update environment variables
export INTEGRATION_MODE=production
export IFOOD_CLIENT_ID=your_client_id
export IFOOD_CLIENT_SECRET=your_client_secret

# 2. Run migration script
python scripts/migrate_integrations.py --from mock --to production

# 3. Validate integrations
python scripts/validate_integrations.py --all

# 4. Enable webhooks
python scripts/enable_webhooks.py --integration all
```

---

*Document Version: 1.0.0*
*Last Updated: January 2025*
*Next Review: After Sprint 2*
from enum import Enum
from typing import Dict, List, Any, Callable
import uuid
import time
import logging
from datetime import datetime

from src.core.events.event_bus import get_event_bus, Event, EventType


class ApiGatewayError(Exception):
    """Erro base para o API Gateway."""
    pass


class AuthenticationError(ApiGatewayError):
    """Erro de autenticação."""
    pass


class RateLimitExceededError(ApiGatewayError):
    """Erro de limite de taxa excedido."""
    pass


class RouteNotFoundError(ApiGatewayError):
    """Erro de rota não encontrada."""
    pass


class ServiceUnavailableError(ApiGatewayError):
    """Erro de serviço indisponível."""
    pass


class RequestMethod(str, Enum):
    """Métodos HTTP suportados."""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"


class ApiRequest:
    """Representação de uma requisição para o API Gateway."""
    
    def __init__(self, path: str, method: RequestMethod, headers: Dict[str, str], 
                 query_params: Dict[str, str], body: Any = None):
        self.id = str(uuid.uuid4())
        self.path = path
        self.method = method
        self.headers = headers
        self.query_params = query_params
        self.body = body
        self.client_ip = headers.get("X-Forwarded-For", "unknown")
        self.timestamp = time.time()
        self.authenticated_user = None
        self.metadata = {}


class ApiResponse:
    """Representação de uma resposta do API Gateway."""
    
    def __init__(self, status_code: int, body: Any, headers: Dict[str, str] = None):
        self.status_code = status_code
        self.body = body
        self.headers = headers or {}
        self.timestamp = time.time()


class Middleware:
    """Interface base para middlewares do API Gateway."""
    
    async def process_request(self, request: ApiRequest) -> ApiRequest:
        """Processa uma requisição antes de ser roteada."""
        return request
    
    async def process_response(self, request: ApiRequest, response: ApiResponse) -> ApiResponse:
        """Processa uma resposta antes de ser enviada."""
        return response


class AuthenticationMiddleware(Middleware):
    """Middleware para autenticação de requisições."""
    
    def __init__(self, auth_service):
        self.auth_service = auth_service
    
    async def process_request(self, request: ApiRequest) -> ApiRequest:
        """Autentica a requisição."""
        # Verificar se a rota é pública
        if request.path.startswith("/api/external/public"):
            return request
        
        # Obter token de autenticação
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise AuthenticationError("Token de autenticação não fornecido")
        
        token = auth_header.replace("Bearer ", "")
        
        # Validar token
        try:
            user = await self.auth_service.validate_token(token)
            request.authenticated_user = user
        except Exception as e:
            raise AuthenticationError(f"Token inválido: {str(e)}")
        
        return request


class RateLimitingMiddleware(Middleware):
    """Middleware para limitação de taxa de requisições."""
    
    def __init__(self, rate_limit: int, time_window: int):
        self.rate_limit = rate_limit
        self.time_window = time_window  # em segundos
        self.request_counts = {}  # {client_ip: [(timestamp, count), ...]}
    
    async def process_request(self, request: ApiRequest) -> ApiRequest:
        """Verifica se o cliente excedeu o limite de requisições."""
        client_ip = request.client_ip
        
        # Limpar registros antigos
        now = time.time()
        if client_ip in self.request_counts:
            self.request_counts[client_ip] = [
                (ts, count) for ts, count in self.request_counts[client_ip]
                if now - ts < self.time_window
            ]
        
        # Contar requisições no período
        if client_ip not in self.request_counts:
            self.request_counts[client_ip] = []
        
        count = sum(count for _, count in self.request_counts[client_ip])
        
        if count >= self.rate_limit:
            raise RateLimitExceededError(f"Limite de {self.rate_limit} requisições por {self.time_window} segundos excedido")
        
        # Registrar requisição
        self.request_counts[client_ip].append((now, 1))
        
        return request


class LoggingMiddleware(Middleware):
    """Middleware para registro de requisições."""
    
    def __init__(self, logger=None):
        self.logger = logger or logging.getLogger("api_gateway")
    
    async def process_request(self, request: ApiRequest) -> ApiRequest:
        """Registra detalhes da requisição."""
        self.logger.info(f"Requisição recebida: {request.method} {request.path} de {request.client_ip}")
        return request
    
    async def process_response(self, request: ApiRequest, response: ApiResponse) -> ApiResponse:
        """Registra detalhes da resposta."""
        self.logger.info(f"Resposta enviada: {response.status_code} para {request.method} {request.path}")
        return response


class TransformationMiddleware(Middleware):
    """Middleware para transformação de dados."""
    
    def __init__(self, request_transformers: Dict[str, Callable] = None, 
                 response_transformers: Dict[str, Callable] = None):
        self.request_transformers = request_transformers or {}
        self.response_transformers = response_transformers or {}
    
    async def process_request(self, request: ApiRequest) -> ApiRequest:
        """Transforma dados da requisição."""
        for pattern, transformer in self.request_transformers.items():
            if pattern in request.path:
                request.body = transformer(request.body)
        return request
    
    async def process_response(self, request: ApiRequest, response: ApiResponse) -> ApiResponse:
        """Transforma dados da resposta."""
        for pattern, transformer in self.response_transformers.items():
            if pattern in request.path:
                response.body = transformer(response.body)
        return response


class GatewayRouter:
    """Roteador central do API Gateway."""
    
    def __init__(self):
        self.routes = {}
        self.middlewares = []
        self.event_bus = get_event_bus()
        self.logger = logging.getLogger("api_gateway")
    
    def add_route(self, path: str, target_service: str, methods: List[RequestMethod] = None):
        """Adiciona uma rota ao gateway."""
        self.routes[path] = {
            "target": target_service,
            "methods": methods or [RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE]
        }
    
    def add_middleware(self, middleware: Middleware):
        """Adiciona um middleware ao gateway."""
        self.middlewares.append(middleware)
    
    async def route_request(self, request: ApiRequest) -> ApiResponse:
        """Roteia uma requisição para o serviço apropriado."""
        # Processar middlewares de requisição
        try:
            for middleware in self.middlewares:
                request = await middleware.process_request(request)
        except ApiGatewayError as e:
            response = ApiResponse(
                status_code=401 if isinstance(e, AuthenticationError) else 
                           429 if isinstance(e, RateLimitExceededError) else 400,
                body={"error": str(e)}
            )
            return await self._process_response_middlewares(request, response)
        
        # Encontrar rota
        target_service = None
        for route_path, route_info in self.routes.items():
            if request.path.startswith(route_path) and request.method in route_info["methods"]:
                target_service = route_info["target"]
                break
        
        if not target_service:
            response = ApiResponse(
                status_code=404,
                body={"error": f"Rota não encontrada: {request.path}"}
            )
            return await self._process_response_middlewares(request, response)
        
        # Chamar serviço
        try:
            service_response = await self._call_service(target_service, request)
        except Exception as e:
            self.logger.error(f"Erro ao chamar serviço {target_service}: {str(e)}")
            response = ApiResponse(
                status_code=503,
                body={"error": f"Serviço indisponível: {str(e)}"}
            )
            return await self._process_response_middlewares(request, response)
        
        # Processar middlewares de resposta
        return await self._process_response_middlewares(request, service_response)
    
    async def _process_response_middlewares(self, request: ApiRequest, response: ApiResponse) -> ApiResponse:
        """Processa middlewares de resposta."""
        for middleware in reversed(self.middlewares):
            response = await middleware.process_response(request, response)
        return response
    
    async def _call_service(self, service: str, request: ApiRequest) -> ApiResponse:
        """Chama um serviço interno."""
        # Em um sistema real, isso poderia usar gRPC, HTTP, ou outro mecanismo
        # Aqui, vamos simular chamadas para os serviços internos
        
        if service == "product_service":
            return await self._call_product_service(request)
        elif service == "order_service":
            return await self._call_order_service(request)
        elif service == "delivery_service":
            return await self._call_delivery_service(request)
        else:
            raise ServiceUnavailableError(f"Serviço desconhecido: {service}")
    
    async def _call_product_service(self, request: ApiRequest) -> ApiResponse:
        """Chama o serviço de produtos."""
        # Simulação de resposta
        if request.path == "/api/external/products" and request.method == RequestMethod.GET:
            return ApiResponse(
                status_code=200,
                body=[
                    {"id": "1", "name": "Hambúrguer", "price": 15.90, "category": "Lanches"},
                    {"id": "2", "name": "Batata Frita", "price": 8.90, "category": "Acompanhamentos"},
                    {"id": "3", "name": "Refrigerante", "price": 5.90, "category": "Bebidas"}
                ]
            )
        elif request.path.startswith("/api/external/products/") and request.method == RequestMethod.GET:
            product_id = request.path.split("/")[-1]
            return ApiResponse(
                status_code=200,
                body={"id": product_id, "name": "Produto Exemplo", "price": 10.90, "category": "Exemplo"}
            )
        else:
            return ApiResponse(
                status_code=404,
                body={"error": "Produto não encontrado"}
            )
    
    async def _call_order_service(self, request: ApiRequest) -> ApiResponse:
        """Chama o serviço de pedidos."""
        # Simulação de resposta
        if request.path == "/api/external/orders" and request.method == RequestMethod.POST:
            # Publicar evento de criação de pedido
            await self.event_bus.publish(Event(
                event_type=EventType.ORDER_CREATED,
                data={"order": request.body, "source": "external_api"}
            ))
            
            return ApiResponse(
                status_code=201,
                body={"id": str(uuid.uuid4()), "status": "created", "items": request.body.get("items", [])}
            )
        elif request.path.startswith("/api/external/orders/") and request.method == RequestMethod.GET:
            order_id = request.path.split("/")[-1]
            return ApiResponse(
                status_code=200,
                body={"id": order_id, "status": "processing", "items": [{"product_id": "1", "quantity": 2}]}
            )
        elif request.path == "/api/external/orders" and request.method == RequestMethod.GET:
            return ApiResponse(
                status_code=200,
                body=[
                    {"id": "1", "status": "completed", "total": 30.70},
                    {"id": "2", "status": "processing", "total": 45.80}
                ]
            )
        else:
            return ApiResponse(
                status_code=404,
                body={"error": "Pedido não encontrado"}
            )
    
    async def _call_delivery_service(self, request: ApiRequest) -> ApiResponse:
        """Chama o serviço de delivery."""
        # Simulação de resposta
        if request.path == "/api/external/delivery/track" and request.method == RequestMethod.POST:
            tracking_code = request.body.get("tracking_code")
            return ApiResponse(
                status_code=200,
                body={
                    "tracking_code": tracking_code,
                    "status": "in_transit",
                    "estimated_delivery_time": (datetime.now().isoformat()),
                    "events": [
                        {"type": "order_created", "timestamp": (datetime.now().isoformat()), "notes": "Pedido criado"},
                        {"type": "in_transit", "timestamp": (datetime.now().isoformat()), "notes": "Em trânsito"}
                    ]
                }
            )
        else:
            return ApiResponse(
                status_code=404,
                body={"error": "Informação de delivery não encontrada"}
            )


class AuthService:
    """Serviço de autenticação para o API Gateway."""
    
    def __init__(self):
        self.tokens = {}  # {token: user_data}
    
    async def validate_token(self, token: str) -> Dict[str, Any]:
        """Valida um token de acesso."""
        # Em um sistema real, isso verificaria a assinatura do JWT, expirações, etc.
        # Aqui, vamos apenas simular
        
        if token in self.tokens:
            return self.tokens[token]
        
        # Simular alguns tokens válidos
        if token == "valid_token_1":
            user = {"id": "1", "name": "Cliente Externo", "role": "external_client"}
            self.tokens[token] = user
            return user
        
        raise AuthenticationError("Token inválido")
    
    async def create_token(self, credentials: Dict[str, str]) -> str:
        """Cria um token de acesso."""
        # Em um sistema real, isso verificaria credenciais no banco de dados
        # e geraria um JWT assinado
        
        # Simular autenticação
        if credentials.get("client_id") == "test_client" and credentials.get("client_secret") == "test_secret":
            token = f"token_{uuid.uuid4().hex}"
            self.tokens[token] = {"id": "1", "name": "Cliente Externo", "role": "external_client"}
            return token
        
        raise AuthenticationError("Credenciais inválidas")


class ExternalEventPublisher:
    """Publicador de eventos para ações externas."""
    
    def __init__(self, event_bus):
        self.event_bus = event_bus
    
    async def publish_order_created(self, order_data: Dict[str, Any]):
        """Publica evento de criação de pedido externo."""
        await self.event_bus.publish(Event(
            event_type=EventType.ORDER_CREATED,
            data={"order": order_data, "source": "external_api"}
        ))
    
    async def publish_order_updated(self, order_id: str, update_data: Dict[str, Any]):
        """Publica evento de atualização de pedido externo."""
        await self.event_bus.publish(Event(
            event_type=EventType.ORDER_UPDATED,
            data={"order_id": order_id, "updates": update_data, "source": "external_api"}
        ))


class ApiGateway:
    """Classe principal do API Gateway."""
    
    def __init__(self):
        self.router = GatewayRouter()
        self.auth_service = AuthService()
        self.event_publisher = ExternalEventPublisher(get_event_bus())
        
        # Configurar middlewares
        self.router.add_middleware(LoggingMiddleware())
        self.router.add_middleware(AuthenticationMiddleware(self.auth_service))
        self.router.add_middleware(RateLimitingMiddleware(rate_limit=100, time_window=60))
        
        # Configurar transformadores
        request_transformers = {
            "/api/external/orders": self._transform_order_request
        }
        response_transformers = {
            "/api/external/products": self._transform_product_response
        }
        self.router.add_middleware(TransformationMiddleware(
            request_transformers=request_transformers,
            response_transformers=response_transformers
        ))
        
        # Configurar rotas
        self.router.add_route("/api/external/products", "product_service", 
                             [RequestMethod.GET])
        self.router.add_route("/api/external/orders", "order_service", 
                             [RequestMethod.GET, RequestMethod.POST])
        self.router.add_route("/api/external/delivery", "delivery_service", 
                             [RequestMethod.GET, RequestMethod.POST])
    
    async def handle_request(self, path: str, method: str, headers: Dict[str, str], 
                            query_params: Dict[str, str], body: Any = None) -> Dict[str, Any]:
        """Manipula uma requisição HTTP."""
        request = ApiRequest(
            path=path,
            method=RequestMethod(method),
            headers=headers,
            query_params=query_params,
            body=body
        )
        
        response = await self.router.route_request(request)
        
        return {
            "status_code": response.status_code,
            "body": response.body,
            "headers": response.headers
        }
    
    async def create_token(self, client_id: str, client_secret: str) -> str:
        """Cria um token de acesso."""
        return await self.auth_service.create_token({
            "client_id": client_id,
            "client_secret": client_secret
        })
    
    def _transform_order_request(self, body: Dict[str, Any]) -> Dict[str, Any]:
        """Transforma uma requisição de pedido."""
        # Exemplo: adicionar timestamp
        body["timestamp"] = datetime.now().isoformat()
        return body
    
    def _transform_product_response(self, body: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Transforma uma resposta de produtos."""
        # Exemplo: adicionar campo formatado
        for product in body:
            product["price_formatted"] = f"R$ {product['price']:.2f}"
        return body


# Instância singleton do API Gateway
_api_gateway_instance = None

def get_api_gateway() -> ApiGateway:
    """Retorna a instância singleton do API Gateway."""
    global _api_gateway_instance
    if _api_gateway_instance is None:
        _api_gateway_instance = ApiGateway()
    return _api_gateway_instance

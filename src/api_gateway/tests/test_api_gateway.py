import unittest
from unittest.mock import patch, MagicMock

from src.api_gateway.gateway import (
    ApiGateway, ApiRequest, ApiResponse, RequestMethod,
    AuthenticationMiddleware, RateLimitingMiddleware, LoggingMiddleware
)


class TestApiGateway(unittest.TestCase):
    """Testes para o API Gateway."""
    
    def setUp(self):
        """Configuração inicial para os testes."""
        self.api_gateway = ApiGateway()
    
    @patch('src.api_gateway.gateway.AuthService.validate_token')
    async def test_authentication_middleware(self, mock_validate_token):
        """Testa o middleware de autenticação."""
        # Configurar mock
        mock_validate_token.return_value = {"id": "1", "name": "Test User", "role": "admin"}
        
        # Criar middleware
        auth_middleware = AuthenticationMiddleware(self.api_gateway.auth_service)
        
        # Testar com token válido
        request = ApiRequest(
            path="/api/external/products",
            method=RequestMethod.GET,
            headers={"Authorization": "Bearer valid_token"},
            query_params={}
        )
        
        processed_request = await auth_middleware.process_request(request)
        self.assertEqual(processed_request.authenticated_user, {"id": "1", "name": "Test User", "role": "admin"})
        
        # Testar com token inválido
        mock_validate_token.side_effect = Exception("Invalid token")
        
        request = ApiRequest(
            path="/api/external/products",
            method=RequestMethod.GET,
            headers={"Authorization": "Bearer invalid_token"},
            query_params={}
        )
        
        with self.assertRaises(Exception):
            await auth_middleware.process_request(request)
        
        # Testar rota pública
        request = ApiRequest(
            path="/api/external/public/products",
            method=RequestMethod.GET,
            headers={},
            query_params={}
        )
        
        processed_request = await auth_middleware.process_request(request)
        self.assertEqual(processed_request, request)
    
    async def test_rate_limiting_middleware(self):
        """Testa o middleware de limitação de taxa."""
        # Criar middleware
        rate_limit_middleware = RateLimitingMiddleware(rate_limit=2, time_window=60)
        
        # Testar com requisições dentro do limite
        request = ApiRequest(
            path="/api/external/products",
            method=RequestMethod.GET,
            headers={"X-Forwarded-For": "127.0.0.1"},
            query_params={}
        )
        
        processed_request1 = await rate_limit_middleware.process_request(request)
        processed_request2 = await rate_limit_middleware.process_request(request)
        
        self.assertEqual(processed_request1, request)
        self.assertEqual(processed_request2, request)
        
        # Testar com requisições acima do limite
        with self.assertRaises(Exception):
            await rate_limit_middleware.process_request(request)
    
    @patch('src.api_gateway.gateway.logging.getLogger')
    async def test_logging_middleware(self, mock_get_logger):
        """Testa o middleware de logging."""
        # Configurar mock
        mock_logger = MagicMock()
        mock_get_logger.return_value = mock_logger
        
        # Criar middleware
        logging_middleware = LoggingMiddleware()
        
        # Testar logging de requisição
        request = ApiRequest(
            path="/api/external/products",
            method=RequestMethod.GET,
            headers={"X-Forwarded-For": "127.0.0.1"},
            query_params={}
        )
        
        await logging_middleware.process_request(request)
        mock_logger.info.assert_called_once()
        
        # Testar logging de resposta
        response = ApiResponse(
            status_code=200,
            body={"message": "Success"}
        )
        
        await logging_middleware.process_response(request, response)
        self.assertEqual(mock_logger.info.call_count, 2)
    
    @patch('src.api_gateway.gateway.GatewayRouter._call_product_service')
    async def test_route_request_to_product_service(self, mock_call_product_service):
        """Testa o roteamento de requisições para o serviço de produtos."""
        # Configurar mock
        mock_response = ApiResponse(
            status_code=200,
            body=[{"id": "1", "name": "Test Product"}]
        )
        mock_call_product_service.return_value = mock_response
        
        # Testar roteamento
        request = ApiRequest(
            path="/api/external/products",
            method=RequestMethod.GET,
            headers={},
            query_params={}
        )
        
        response = await self.api_gateway.router.route_request(request)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.body, [{"id": "1", "name": "Test Product"}])
    
    @patch('src.api_gateway.gateway.GatewayRouter._call_order_service')
    async def test_route_request_to_order_service(self, mock_call_order_service):
        """Testa o roteamento de requisições para o serviço de pedidos."""
        # Configurar mock
        mock_response = ApiResponse(
            status_code=201,
            body={"id": "1", "status": "created"}
        )
        mock_call_order_service.return_value = mock_response
        
        # Testar roteamento
        request = ApiRequest(
            path="/api/external/orders",
            method=RequestMethod.POST,
            headers={},
            query_params={},
            body={"items": [{"product_id": "1", "quantity": 2}]}
        )
        
        response = await self.api_gateway.router.route_request(request)
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.body, {"id": "1", "status": "created"})
    
    @patch('src.api_gateway.gateway.GatewayRouter._call_delivery_service')
    async def test_route_request_to_delivery_service(self, mock_call_delivery_service):
        """Testa o roteamento de requisições para o serviço de delivery."""
        # Configurar mock
        mock_response = ApiResponse(
            status_code=200,
            body={"tracking_code": "ABC123", "status": "in_transit"}
        )
        mock_call_delivery_service.return_value = mock_response
        
        # Testar roteamento
        request = ApiRequest(
            path="/api/external/delivery/track",
            method=RequestMethod.POST,
            headers={},
            query_params={},
            body={"tracking_code": "ABC123"}
        )
        
        response = await self.api_gateway.router.route_request(request)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.body, {"tracking_code": "ABC123", "status": "in_transit"})
    
    async def test_route_not_found(self):
        """Testa o roteamento para uma rota inexistente."""
        # Testar roteamento
        request = ApiRequest(
            path="/api/external/invalid",
            method=RequestMethod.GET,
            headers={},
            query_params={}
        )
        
        response = await self.api_gateway.router.route_request(request)
        
        self.assertEqual(response.status_code, 404)
        self.assertIn("error", response.body)
    
    @patch('src.api_gateway.gateway.AuthService.create_token')
    async def test_create_token(self, mock_create_token):
        """Testa a criação de token de acesso."""
        # Configurar mock
        mock_create_token.return_value = "new_token_123"
        
        # Testar criação de token
        token = await self.api_gateway.create_token(
            client_id="test_client",
            client_secret="test_secret"
        )
        
        self.assertEqual(token, "new_token_123")
        mock_create_token.assert_called_once_with({
            "client_id": "test_client",
            "client_secret": "test_secret"
        })
    
    async def test_handle_request(self):
        """Testa o manipulador de requisições HTTP."""
        # Patch para o router.route_request
        with patch.object(self.api_gateway.router, 'route_request') as mock_route_request:
            # Configurar mock
            mock_route_request.return_value = ApiResponse(
                status_code=200,
                body={"message": "Success"},
                headers={"Content-Type": "application/json"}
            )
            
            # Testar manipulador
            result = await self.api_gateway.handle_request(
                path="/api/external/products",
                method="GET",
                headers={"Authorization": "Bearer token123"},
                query_params={"category": "food"}
            )
            
            self.assertEqual(result["status_code"], 200)
            self.assertEqual(result["body"], {"message": "Success"})
            self.assertEqual(result["headers"], {"Content-Type": "application/json"})
            
            # Verificar se o router foi chamado corretamente
            mock_route_request.assert_called_once()
            request_arg = mock_route_request.call_args[0][0]
            self.assertEqual(request_arg.path, "/api/external/products")
            self.assertEqual(request_arg.method, RequestMethod.GET)
            self.assertEqual(request_arg.headers, {"Authorization": "Bearer token123"})
            self.assertEqual(request_arg.query_params, {"category": "food"})


if __name__ == "__main__":
    unittest.main()

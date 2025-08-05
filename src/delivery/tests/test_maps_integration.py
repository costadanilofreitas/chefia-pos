import unittest
import asyncio
from unittest.mock import MagicMock, patch
import sys
import os

# Adicionar diretório raiz ao path para importações
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from src.delivery.services.google_maps_service import GoogleMapsService
from src.delivery.router.maps_router import router


class TestGoogleMapsIntegration(unittest.TestCase):
    """Testes de integração para o módulo de Google Maps no sistema de delivery."""

    def setUp(self):
        """Configuração inicial para os testes."""
        # Mock do serviço do Google Maps
        self.maps_service_mock = MagicMock(spec=GoogleMapsService)

        # Configurar respostas simuladas
        self.geocode_response = {
            "formatted_address": "Av. Paulista, 1000, São Paulo, SP, Brasil",
            "location": {"lat": -23.5629, "lng": -46.6544},
            "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
            "address_components": [],
            "full_response": {},
        }

        self.route_response = {
            "distance": {"text": "5 km", "value": 5000},
            "duration": {"text": "15 mins", "value": 900},
            "steps": [],
            "polyline": "encoded_polyline_string",
            "waypoint_order": [1, 0, 2],
            "full_response": {},
        }

        self.distance_matrix_response = {
            "origin_addresses": ["Origem 1", "Origem 2"],
            "destination_addresses": ["Destino 1", "Destino 2"],
            "rows": [
                {
                    "elements": [
                        {"distance": {"value": 1000}, "duration": {"value": 300}}
                    ]
                },
                {
                    "elements": [
                        {"distance": {"value": 2000}, "duration": {"value": 600}}
                    ]
                },
            ],
            "full_response": {},
        }

        # Configurar mocks para os métodos assíncronos
        async def mock_geocode_address(address):
            return self.geocode_response

        async def mock_calculate_route(origin, destination, **kwargs):
            return self.route_response

        async def mock_calculate_distance_matrix(origins, destinations, **kwargs):
            return self.distance_matrix_response

        async def mock_calculate_delivery_zone(center, **kwargs):
            return [
                {"lat": center["lat"] + 0.01, "lng": center["lng"] + 0.01},
                {"lat": center["lat"] - 0.01, "lng": center["lng"] + 0.01},
                {"lat": center["lat"] - 0.01, "lng": center["lng"] - 0.01},
                {"lat": center["lat"] + 0.01, "lng": center["lng"] - 0.01},
                {
                    "lat": center["lat"] + 0.01,
                    "lng": center["lng"] + 0.01,
                },  # Fechar o polígono
            ]

        # Atribuir mocks aos métodos
        self.maps_service_mock.geocode_address = mock_geocode_address
        self.maps_service_mock.calculate_route = mock_calculate_route
        self.maps_service_mock.calculate_distance_matrix = (
            mock_calculate_distance_matrix
        )
        self.maps_service_mock.calculate_delivery_zone = mock_calculate_delivery_zone

    @patch("delivery.router.maps_router.get_maps_service")
    def test_geocode_address(self, mock_get_maps_service):
        """Testa a geocodificação de endereços."""
        # Configurar o mock para retornar nosso serviço mockado
        mock_get_maps_service.return_value = self.maps_service_mock

        # Executar o teste de forma assíncrona
        async def run_test():
            from fastapi.testclient import TestClient
            from fastapi import FastAPI

            app = FastAPI()
            app.include_router(router)
            client = TestClient(app)

            # Fazer requisição
            response = client.post(
                "/api/delivery/maps/geocode",
                json={"address": "Av. Paulista, 1000, São Paulo"},
            )

            # Verificar resposta
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(
                data["formatted_address"], self.geocode_response["formatted_address"]
            )
            self.assertEqual(data["location"], self.geocode_response["location"])
            self.assertEqual(data["place_id"], self.geocode_response["place_id"])

        # Executar o teste
        asyncio.run(run_test())

    @patch("delivery.router.maps_router.get_maps_service")
    def test_optimize_route(self, mock_get_maps_service):
        """Testa a otimização de rotas."""
        # Configurar o mock para retornar nosso serviço mockado
        mock_get_maps_service.return_value = self.maps_service_mock

        # Executar o teste de forma assíncrona
        async def run_test():
            from fastapi.testclient import TestClient
            from fastapi import FastAPI

            app = FastAPI()
            app.include_router(router)
            client = TestClient(app)

            # Fazer requisição
            response = client.post(
                "/api/delivery/maps/optimize-route",
                json={
                    "courier_id": "c1",
                    "order_ids": ["order-1", "order-2", "order-3"],
                    "start_location": {"lat": -23.5505, "lng": -46.6333},
                    "optimization_mode": "time",
                    "transport_mode": "driving",
                    "consider_traffic": True,
                },
            )

            # Verificar resposta
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("route_id", data)
            self.assertEqual(
                data["waypoint_order"], self.route_response["waypoint_order"]
            )
            self.assertEqual(
                data["estimated_duration"], self.route_response["duration"]["value"]
            )
            self.assertEqual(
                data["estimated_distance"], self.route_response["distance"]["value"]
            )
            self.assertEqual(data["polyline"], self.route_response["polyline"])

        # Executar o teste
        asyncio.run(run_test())

    @patch("delivery.router.maps_router.get_maps_service")
    def test_calculate_delivery_zone(self, mock_get_maps_service):
        """Testa o cálculo de zonas de entrega."""
        # Configurar o mock para retornar nosso serviço mockado
        mock_get_maps_service.return_value = self.maps_service_mock

        # Executar o teste de forma assíncrona
        async def run_test():
            from fastapi.testclient import TestClient
            from fastapi import FastAPI

            app = FastAPI()
            app.include_router(router)
            client = TestClient(app)

            # Fazer requisição
            response = client.post(
                "/api/delivery/maps/delivery-zone",
                json={
                    "center": {"lat": -23.5505, "lng": -46.6333},
                    "max_travel_time": 15,
                    "transport_mode": "driving",
                },
            )

            # Verificar resposta
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("zone_id", data)
            self.assertIn("polygon", data)
            self.assertIn("estimated_area", data)
            self.assertEqual(
                len(data["polygon"]), 5
            )  # 4 pontos + 1 para fechar o polígono

        # Executar o teste
        asyncio.run(run_test())


if __name__ == "__main__":
    unittest.main()

from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from pydantic import BaseModel

from ..services.google_maps_service import GoogleMapsService

# Configurar logging
logger = logging.getLogger(__name__)

# Modelos para requisições e respostas da API
class OptimizeRouteRequest(BaseModel):
    courier_id: str
    order_ids: List[str]
    start_location: Dict[str, float]
    end_location: Optional[Dict[str, float]] = None
    optimization_mode: str = "time"  # "time", "distance", "balanced"
    transport_mode: str = "driving"  # "driving", "bicycling", "walking"
    consider_traffic: bool = True

class OptimizeRouteResponse(BaseModel):
    route_id: str
    waypoint_order: List[int]
    estimated_duration: int  # em segundos
    estimated_distance: int  # em metros
    polyline: str

class DeliveryZoneRequest(BaseModel):
    center: Dict[str, float]
    max_travel_time: int = 15  # em minutos
    transport_mode: str = "driving"

class DeliveryZoneResponse(BaseModel):
    zone_id: str
    polygon: List[Dict[str, float]]
    estimated_area: float  # em km²

class GeocodeAddressRequest(BaseModel):
    address: str

class GeocodeAddressResponse(BaseModel):
    formatted_address: str
    location: Dict[str, float]
    place_id: str

# Router para integração com Google Maps
router = APIRouter(
    prefix="/api/delivery/maps",
    tags=["delivery", "maps"],
    responses={404: {"description": "Not found"}},
)

# Dependência para obter o serviço do Google Maps
async def get_maps_service():
    # Em produção, usar injeção de dependência adequada
    return GoogleMapsService()

@router.post("/geocode", response_model=GeocodeAddressResponse)
async def geocode_address(
    request: GeocodeAddressRequest,
    maps_service: GoogleMapsService = Depends(get_maps_service)
):
    """
    Geocodifica um endereço para obter coordenadas geográficas.
    """
    try:
        result = await maps_service.geocode_address(request.address)
        
        return {
            "formatted_address": result["formatted_address"],
            "location": result["location"],
            "place_id": result["place_id"]
        }
    except ValueError as e:
        logger.error(f"Geocoding error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during geocoding: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/optimize-route", response_model=OptimizeRouteResponse)
async def optimize_route(
    request: OptimizeRouteRequest,
    maps_service: GoogleMapsService = Depends(get_maps_service)
):
    """
    Otimiza a rota para um conjunto de entregas.
    """
    try:
        # Verificar se o entregador existe
        # Em produção, consultar banco de dados
        
        # Verificar se os pedidos existem
        # Em produção, consultar banco de dados
        
        # Obter localizações dos pedidos
        # Em produção, consultar banco de dados
        # Aqui estamos usando dados de exemplo
        order_locations = [
            {"lat": -23.5629, "lng": -46.6544},
            {"lat": -23.5529, "lng": -46.6426},
            {"lat": -23.5616, "lng": -46.6709}
        ][:len(request.order_ids)]
        
        # Definir destino final (mesmo que origem se não especificado)
        end_location = request.end_location or request.start_location
        
        # Calcular rota otimizada
        route_result = await maps_service.calculate_route(
            origin=request.start_location,
            destination=end_location,
            waypoints=order_locations,
            mode=request.transport_mode,
            departure_time=int(datetime.now().timestamp()) if request.consider_traffic else None,
            traffic_model="best_guess" if request.consider_traffic else None
        )
        
        # Criar rota no banco de dados
        # Em produção, salvar no banco de dados
        route_id = "r" + str(len(request.order_ids))
        
        # Retornar resultado
        return {
            "route_id": route_id,
            "waypoint_order": route_result.get("waypoint_order", []),
            "estimated_duration": route_result["duration"]["value"],
            "estimated_distance": route_result["distance"]["value"],
            "polyline": route_result["polyline"]
        }
    except ValueError as e:
        logger.error(f"Route optimization error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during route optimization: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/delivery-zone", response_model=DeliveryZoneResponse)
async def calculate_delivery_zone(
    request: DeliveryZoneRequest,
    maps_service: GoogleMapsService = Depends(get_maps_service)
):
    """
    Calcula uma zona de entrega com base no tempo máximo de viagem.
    """
    try:
        # Calcular zona de entrega
        polygon = await maps_service.calculate_delivery_zone(
            center=request.center,
            max_travel_time=request.max_travel_time,
            mode=request.transport_mode
        )
        
        # Calcular área aproximada (simplificada)
        # Em produção, usar algoritmos mais precisos
        area = 0.0
        if len(polygon) > 2:
            # Fórmula da área de um polígono irregular
            n = len(polygon) - 1  # Último ponto é igual ao primeiro
            for i in range(n):
                area += polygon[i]["lat"] * polygon[i+1]["lng"]
                area -= polygon[i]["lng"] * polygon[i+1]["lat"]
            area = abs(area) / 2.0
            # Converter para km² (aproximado)
            area *= 111.32 * 111.32  # 1 grau ≈ 111.32 km no equador
        
        # Criar zona no banco de dados
        # Em produção, salvar no banco de dados
        zone_id = "z" + str(int(datetime.now().timestamp()))
        
        # Retornar resultado
        return {
            "zone_id": zone_id,
            "polygon": polygon,
            "estimated_area": area
        }
    except ValueError as e:
        logger.error(f"Delivery zone calculation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during delivery zone calculation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/routes/{route_id}", response_model=Dict[str, Any])
async def get_route_details(
    route_id: str = Path(..., description="ID da rota"),
    maps_service: GoogleMapsService = Depends(get_maps_service)
):
    """
    Obtém detalhes de uma rota específica.
    """
    try:
        # Em produção, consultar banco de dados
        # Aqui estamos usando dados de exemplo
        if route_id == "r1":
            # Simular rota existente
            return {
                "id": "r1",
                "courier_id": "c2",
                "status": "in_progress",
                "orders": ["order-124"],
                "estimated_start_time": "2025-05-25T21:45:00",
                "estimated_end_time": "2025-05-25T22:15:00",
                "estimated_duration": 1800,  # 30 minutos em segundos
                "estimated_distance": 5000,  # 5 km em metros
                "polyline": "fj~nCnfx{G...",
                "waypoint_order": [0]
            }
        else:
            raise HTTPException(status_code=404, detail="Route not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting route details: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/couriers/{courier_id}/location", response_model=Dict[str, Any])
async def get_courier_location(
    courier_id: str = Path(..., description="ID do entregador"),
    maps_service: GoogleMapsService = Depends(get_maps_service)
):
    """
    Obtém a localização atual de um entregador.
    """
    try:
        # Em produção, consultar banco de dados ou serviço de rastreamento
        # Aqui estamos usando dados de exemplo
        if courier_id == "c1":
            return {
                "courier_id": "c1",
                "location": {"lat": -23.5505, "lng": -46.6333},
                "timestamp": datetime.now().isoformat(),
                "accuracy": 10.0,  # metros
                "heading": 90.0,  # graus (leste)
                "speed": 20.0  # km/h
            }
        elif courier_id == "c2":
            return {
                "courier_id": "c2",
                "location": {"lat": -23.5529, "lng": -46.6426},
                "timestamp": datetime.now().isoformat(),
                "accuracy": 15.0,
                "heading": 180.0,  # graus (sul)
                "speed": 12.0  # km/h
            }
        else:
            raise HTTPException(status_code=404, detail="Courier not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting courier location: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/couriers/{courier_id}/location", status_code=204)
async def update_courier_location(
    location: Dict[str, float],
    courier_id: str = Path(..., description="ID do entregador"),
    maps_service: GoogleMapsService = Depends(get_maps_service)
):
    """
    Atualiza a localização de um entregador.
    """
    try:
        # Validar localização
        if "lat" not in location or "lng" not in location:
            raise HTTPException(status_code=400, detail="Invalid location format")
        
        # Em produção, atualizar no banco de dados
        # Aqui apenas logamos a atualização
        logger.info(f"Updated location for courier {courier_id}: {location}")
        
        # Sem conteúdo na resposta
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error updating courier location: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/distance-matrix", response_model=Dict[str, Any])
async def calculate_distance_matrix(
    origins: str = Query(..., description="Lista de coordenadas de origem no formato 'lat1,lng1|lat2,lng2'"),
    destinations: str = Query(..., description="Lista de coordenadas de destino no formato 'lat1,lng1|lat2,lng2'"),
    mode: str = Query("driving", description="Modo de transporte"),
    maps_service: GoogleMapsService = Depends(get_maps_service)
):
    """
    Calcula uma matriz de distâncias entre múltiplas origens e destinos.
    """
    try:
        # Converter strings para listas de coordenadas
        origins_list = []
        for origin in origins.split("|"):
            lat, lng = origin.split(",")
            origins_list.append({"lat": float(lat), "lng": float(lng)})
        
        destinations_list = []
        for destination in destinations.split("|"):
            lat, lng = destination.split(",")
            destinations_list.append({"lat": float(lat), "lng": float(lng)})
        
        # Calcular matriz de distâncias
        result = await maps_service.calculate_distance_matrix(
            origins=origins_list,
            destinations=destinations_list,
            mode=mode,
            departure_time=int(datetime.now().timestamp()),
            traffic_model="best_guess"
        )
        
        # Retornar resultado simplificado
        return {
            "origins": result["origin_addresses"],
            "destinations": result["destination_addresses"],
            "rows": result["rows"]
        }
    except ValueError as e:
        logger.error(f"Distance matrix calculation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during distance matrix calculation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

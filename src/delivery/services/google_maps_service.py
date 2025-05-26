import os
import json
import requests
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import hashlib
import time

# Configurar logging
logger = logging.getLogger(__name__)

class GoogleMapsService:
    """
    Serviço para integração com a API do Google Maps.
    
    Este serviço fornece métodos para geocodificação, cálculo de rotas,
    matriz de distância e outras funcionalidades do Google Maps.
    """
    
    def __init__(self, api_key: Optional[str] = None, cache_dir: Optional[str] = None):
        """
        Inicializa o serviço do Google Maps.
        
        Args:
            api_key: Chave de API do Google Maps. Se não fornecida, será obtida da variável de ambiente GOOGLE_MAPS_API_KEY.
            cache_dir: Diretório para cache de resultados. Se não fornecido, será usado o diretório padrão.
        """
        self.api_key = api_key or os.environ.get("GOOGLE_MAPS_API_KEY")
        if not self.api_key:
            logger.warning("Google Maps API key not provided. Service will not work properly.")
        
        self.cache_dir = cache_dir or "/tmp/google_maps_cache"
        os.makedirs(self.cache_dir, exist_ok=True)
        
        self.base_url = "https://maps.googleapis.com/maps/api"
        
        # Configurações de cache
        self.cache_enabled = True
        self.cache_ttl = 86400  # 24 horas em segundos
    
    async def geocode_address(self, address: str) -> Dict[str, Any]:
        """
        Geocodifica um endereço para obter coordenadas geográficas.
        
        Args:
            address: Endereço a ser geocodificado
            
        Returns:
            Dicionário com informações de geocodificação, incluindo coordenadas
            
        Raises:
            ValueError: Se o endereço não puder ser geocodificado
        """
        # Verificar cache
        cache_key = f"geocode_{self._generate_cache_key(address)}"
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            return cached_result
        
        # Preparar requisição
        url = f"{self.base_url}/geocode/json"
        params = {
            "address": address,
            "key": self.api_key
        }
        
        # Fazer requisição
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Verificar status da resposta
            if data["status"] != "OK":
                logger.error(f"Geocoding failed: {data['status']} - {data.get('error_message', 'No error message')}")
                raise ValueError(f"Failed to geocode address: {data['status']}")
            
            # Extrair resultado
            result = {
                "formatted_address": data["results"][0]["formatted_address"],
                "location": data["results"][0]["geometry"]["location"],
                "place_id": data["results"][0]["place_id"],
                "address_components": data["results"][0]["address_components"],
                "full_response": data
            }
            
            # Salvar no cache
            self._save_to_cache(cache_key, result)
            
            return result
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error during geocoding: {str(e)}")
            raise ValueError(f"Failed to geocode address: {str(e)}")
    
    async def calculate_route(
        self, 
        origin: Dict[str, float], 
        destination: Dict[str, float],
        waypoints: Optional[List[Dict[str, float]]] = None,
        mode: str = "driving",
        departure_time: Optional[int] = None,
        traffic_model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calcula uma rota entre origem e destino, opcionalmente passando por waypoints.
        
        Args:
            origin: Coordenadas de origem {lat, lng}
            destination: Coordenadas de destino {lat, lng}
            waypoints: Lista opcional de coordenadas de waypoints [{lat, lng}, ...]
            mode: Modo de transporte (driving, walking, bicycling, transit)
            departure_time: Horário de partida em segundos desde a época Unix
            traffic_model: Modelo de tráfego (best_guess, pessimistic, optimistic)
            
        Returns:
            Dicionário com informações da rota
            
        Raises:
            ValueError: Se a rota não puder ser calculada
        """
        # Preparar parâmetros para cache
        cache_params = {
            "origin": f"{origin['lat']},{origin['lng']}",
            "destination": f"{destination['lat']},{destination['lng']}",
            "mode": mode
        }
        
        if waypoints:
            waypoints_str = "|".join([f"{wp['lat']},{wp['lng']}" for wp in waypoints])
            cache_params["waypoints"] = waypoints_str
        
        if departure_time:
            cache_params["departure_time"] = str(departure_time)
        
        if traffic_model:
            cache_params["traffic_model"] = traffic_model
        
        # Verificar cache
        cache_key = f"route_{self._generate_cache_key(json.dumps(cache_params))}"
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            return cached_result
        
        # Preparar requisição
        url = f"{self.base_url}/directions/json"
        params = {
            "origin": f"{origin['lat']},{origin['lng']}",
            "destination": f"{destination['lat']},{destination['lng']}",
            "mode": mode,
            "key": self.api_key
        }
        
        if waypoints:
            params["waypoints"] = "optimize:true|" + "|".join([f"{wp['lat']},{wp['lng']}" for wp in waypoints])
        
        if departure_time:
            params["departure_time"] = departure_time
        
        if traffic_model and mode == "driving":
            params["traffic_model"] = traffic_model
        
        # Fazer requisição
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Verificar status da resposta
            if data["status"] != "OK":
                logger.error(f"Route calculation failed: {data['status']} - {data.get('error_message', 'No error message')}")
                raise ValueError(f"Failed to calculate route: {data['status']}")
            
            # Extrair resultado
            route = data["routes"][0]
            result = {
                "distance": route["legs"][0]["distance"],
                "duration": route["legs"][0]["duration"],
                "steps": route["legs"][0]["steps"],
                "polyline": route["overview_polyline"]["points"],
                "waypoint_order": route.get("waypoint_order", []),
                "full_response": data
            }
            
            # Adicionar informações de tráfego se disponíveis
            if "duration_in_traffic" in route["legs"][0]:
                result["duration_in_traffic"] = route["legs"][0]["duration_in_traffic"]
            
            # Salvar no cache
            self._save_to_cache(cache_key, result)
            
            return result
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error during route calculation: {str(e)}")
            raise ValueError(f"Failed to calculate route: {str(e)}")
    
    async def calculate_distance_matrix(
        self,
        origins: List[Dict[str, float]],
        destinations: List[Dict[str, float]],
        mode: str = "driving",
        departure_time: Optional[int] = None,
        traffic_model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calcula uma matriz de distâncias entre múltiplas origens e destinos.
        
        Args:
            origins: Lista de coordenadas de origem [{lat, lng}, ...]
            destinations: Lista de coordenadas de destino [{lat, lng}, ...]
            mode: Modo de transporte (driving, walking, bicycling, transit)
            departure_time: Horário de partida em segundos desde a época Unix
            traffic_model: Modelo de tráfego (best_guess, pessimistic, optimistic)
            
        Returns:
            Dicionário com matriz de distâncias e durações
            
        Raises:
            ValueError: Se a matriz não puder ser calculada
        """
        # Preparar parâmetros para cache
        cache_params = {
            "origins": [f"{origin['lat']},{origin['lng']}" for origin in origins],
            "destinations": [f"{dest['lat']},{dest['lng']}" for dest in destinations],
            "mode": mode
        }
        
        if departure_time:
            cache_params["departure_time"] = str(departure_time)
        
        if traffic_model:
            cache_params["traffic_model"] = traffic_model
        
        # Verificar cache
        cache_key = f"matrix_{self._generate_cache_key(json.dumps(cache_params))}"
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            return cached_result
        
        # Preparar requisição
        url = f"{self.base_url}/distancematrix/json"
        params = {
            "origins": "|".join([f"{origin['lat']},{origin['lng']}" for origin in origins]),
            "destinations": "|".join([f"{dest['lat']},{dest['lng']}" for dest in destinations]),
            "mode": mode,
            "key": self.api_key
        }
        
        if departure_time:
            params["departure_time"] = departure_time
        
        if traffic_model and mode == "driving":
            params["traffic_model"] = traffic_model
        
        # Fazer requisição
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Verificar status da resposta
            if data["status"] != "OK":
                logger.error(f"Distance matrix calculation failed: {data['status']} - {data.get('error_message', 'No error message')}")
                raise ValueError(f"Failed to calculate distance matrix: {data['status']}")
            
            # Extrair resultado
            result = {
                "origin_addresses": data["origin_addresses"],
                "destination_addresses": data["destination_addresses"],
                "rows": data["rows"],
                "full_response": data
            }
            
            # Salvar no cache
            self._save_to_cache(cache_key, result)
            
            return result
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error during distance matrix calculation: {str(e)}")
            raise ValueError(f"Failed to calculate distance matrix: {str(e)}")
    
    async def optimize_waypoints(
        self,
        origin: Dict[str, float],
        destination: Dict[str, float],
        waypoints: List[Dict[str, float]],
        mode: str = "driving"
    ) -> List[int]:
        """
        Otimiza a ordem dos waypoints para minimizar o tempo total de viagem.
        
        Args:
            origin: Coordenadas de origem {lat, lng}
            destination: Coordenadas de destino {lat, lng}
            waypoints: Lista de coordenadas de waypoints [{lat, lng}, ...]
            mode: Modo de transporte (driving, walking, bicycling, transit)
            
        Returns:
            Lista de índices representando a ordem otimizada dos waypoints
            
        Raises:
            ValueError: Se a otimização não puder ser realizada
        """
        # Usar a API de direções com otimização de waypoints
        route_result = await self.calculate_route(
            origin=origin,
            destination=destination,
            waypoints=waypoints,
            mode=mode
        )
        
        # Retornar a ordem otimizada dos waypoints
        return route_result.get("waypoint_order", list(range(len(waypoints))))
    
    async def get_place_details(self, place_id: str) -> Dict[str, Any]:
        """
        Obtém detalhes de um lugar a partir do seu ID.
        
        Args:
            place_id: ID do lugar no Google Maps
            
        Returns:
            Dicionário com detalhes do lugar
            
        Raises:
            ValueError: Se os detalhes não puderem ser obtidos
        """
        # Verificar cache
        cache_key = f"place_{self._generate_cache_key(place_id)}"
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            return cached_result
        
        # Preparar requisição
        url = f"{self.base_url}/place/details/json"
        params = {
            "place_id": place_id,
            "fields": "address_component,formatted_address,geometry,name,place_id,type,url",
            "key": self.api_key
        }
        
        # Fazer requisição
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Verificar status da resposta
            if data["status"] != "OK":
                logger.error(f"Place details request failed: {data['status']} - {data.get('error_message', 'No error message')}")
                raise ValueError(f"Failed to get place details: {data['status']}")
            
            # Extrair resultado
            result = {
                "name": data["result"].get("name"),
                "formatted_address": data["result"].get("formatted_address"),
                "location": data["result"]["geometry"]["location"],
                "place_id": data["result"]["place_id"],
                "types": data["result"].get("types", []),
                "url": data["result"].get("url"),
                "full_response": data
            }
            
            # Salvar no cache
            self._save_to_cache(cache_key, result)
            
            return result
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error during place details request: {str(e)}")
            raise ValueError(f"Failed to get place details: {str(e)}")
    
    async def snap_to_roads(self, path: List[Dict[str, float]]) -> List[Dict[str, float]]:
        """
        Alinha uma sequência de coordenadas GPS às vias mais próximas.
        
        Args:
            path: Lista de coordenadas [{lat, lng}, ...]
            
        Returns:
            Lista de coordenadas alinhadas às vias
            
        Raises:
            ValueError: Se o alinhamento não puder ser realizado
        """
        # Verificar se há pontos suficientes
        if len(path) < 2:
            return path
        
        # Preparar parâmetros para cache
        path_str = "|".join([f"{point['lat']},{point['lng']}" for point in path])
        cache_key = f"snap_{self._generate_cache_key(path_str)}"
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            return cached_result
        
        # Preparar requisição
        url = f"{self.base_url}/snapToRoads/json"
        params = {
            "path": path_str,
            "interpolate": "true",
            "key": self.api_key
        }
        
        # Fazer requisição
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Verificar se há pontos na resposta
            if "snappedPoints" not in data:
                logger.error("No snapped points returned")
                raise ValueError("Failed to snap points to roads: No snapped points returned")
            
            # Extrair resultado
            result = [
                {
                    "lat": point["location"]["latitude"],
                    "lng": point["location"]["longitude"],
                    "original_index": point.get("originalIndex"),
                    "place_id": point.get("placeId")
                }
                for point in data["snappedPoints"]
            ]
            
            # Salvar no cache
            self._save_to_cache(cache_key, result)
            
            return result
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error during snap to roads: {str(e)}")
            raise ValueError(f"Failed to snap points to roads: {str(e)}")
    
    async def find_nearest_addresses(
        self, 
        location: Dict[str, float], 
        radius: int = 1000,
        type_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Encontra endereços próximos a uma localização.
        
        Args:
            location: Coordenadas da localização central {lat, lng}
            radius: Raio de busca em metros
            type_filter: Filtro opcional por tipo de lugar
            
        Returns:
            Lista de lugares próximos
            
        Raises:
            ValueError: Se a busca não puder ser realizada
        """
        # Preparar parâmetros para cache
        cache_params = {
            "location": f"{location['lat']},{location['lng']}",
            "radius": radius
        }
        
        if type_filter:
            cache_params["type"] = type_filter
        
        # Verificar cache
        cache_key = f"nearby_{self._generate_cache_key(json.dumps(cache_params))}"
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            return cached_result
        
        # Preparar requisição
        url = f"{self.base_url}/place/nearbysearch/json"
        params = {
            "location": f"{location['lat']},{location['lng']}",
            "radius": radius,
            "key": self.api_key
        }
        
        if type_filter:
            params["type"] = type_filter
        
        # Fazer requisição
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Verificar status da resposta
            if data["status"] != "OK" and data["status"] != "ZERO_RESULTS":
                logger.error(f"Nearby search failed: {data['status']} - {data.get('error_message', 'No error message')}")
                raise ValueError(f"Failed to find nearby places: {data['status']}")
            
            # Extrair resultado
            result = []
            for place in data.get("results", []):
                result.append({
                    "name": place.get("name"),
                    "vicinity": place.get("vicinity"),
                    "location": place["geometry"]["location"],
                    "place_id": place["place_id"],
                    "types": place.get("types", []),
                    "rating": place.get("rating")
                })
            
            # Salvar no cache
            self._save_to_cache(cache_key, result)
            
            return result
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error during nearby search: {str(e)}")
            raise ValueError(f"Failed to find nearby places: {str(e)}")
    
    async def calculate_delivery_zone(
        self, 
        center: Dict[str, float], 
        max_travel_time: int = 15,
        mode: str = "driving"
    ) -> List[Dict[str, float]]:
        """
        Calcula uma zona de entrega aproximada com base no tempo de viagem.
        
        Args:
            center: Coordenadas do centro da zona {lat, lng}
            max_travel_time: Tempo máximo de viagem em minutos
            mode: Modo de transporte (driving, walking, bicycling, transit)
            
        Returns:
            Lista de coordenadas que formam um polígono representando a zona de entrega
            
        Raises:
            ValueError: Se a zona não puder ser calculada
        """
        # Esta é uma implementação simplificada que gera pontos em diferentes direções
        # e calcula o tempo de viagem até cada um deles
        
        # Gerar pontos em diferentes direções (8 direções)
        directions = 8
        radius_km = 5  # Raio inicial de busca em km
        points = []
        
        for i in range(directions):
            angle = (i / directions) * 2 * 3.14159  # Ângulo em radianos
            
            # Calcular ponto a uma distância de radius_km na direção do ângulo
            # Fórmula simplificada, não considera curvatura da Terra para distâncias curtas
            lat = center["lat"] + (radius_km / 111.32) * math.cos(angle)
            lng = center["lng"] + (radius_km / (111.32 * math.cos(center["lat"] * 3.14159 / 180))) * math.sin(angle)
            
            points.append({"lat": lat, "lng": lng})
        
        # Calcular tempo de viagem para cada ponto
        zone_points = []
        
        for point in points:
            try:
                # Calcular rota do centro até o ponto
                route = await self.calculate_route(
                    origin=center,
                    destination=point,
                    mode=mode
                )
                
                # Obter tempo de viagem em minutos
                duration_minutes = route["duration"]["value"] / 60
                
                # Se o tempo for menor que o máximo, usar o ponto
                # Caso contrário, calcular um ponto intermediário
                if duration_minutes <= max_travel_time:
                    zone_points.append(point)
                else:
                    # Calcular fator de escala para ajustar o ponto
                    scale = max_travel_time / duration_minutes
                    
                    # Calcular ponto intermediário
                    lat = center["lat"] + (point["lat"] - center["lat"]) * scale
                    lng = center["lng"] + (point["lng"] - center["lng"]) * scale
                    
                    zone_points.append({"lat": lat, "lng": lng})
            
            except ValueError:
                # Em caso de erro, usar um ponto aproximado
                scale = 0.5  # Fator de segurança
                lat = center["lat"] + (point["lat"] - center["lat"]) * scale
                lng = center["lng"] + (point["lng"] - center["lng"]) * scale
                zone_points.append({"lat": lat, "lng": lng})
        
        # Adicionar o primeiro ponto novamente para fechar o polígono
        if zone_points:
            zone_points.append(zone_points[0])
        
        return zone_points
    
    def _generate_cache_key(self, data: str) -> str:
        """
        Gera uma chave de cache a partir dos dados.
        
        Args:
            data: Dados para gerar a chave
            
        Returns:
            Chave de cache (hash MD5)
        """
        return hashlib.md5(data.encode()).hexdigest()
    
    def _get_cache_path(self, key: str) -> str:
        """
        Obtém o caminho do arquivo de cache para uma chave.
        
        Args:
            key: Chave de cache
            
        Returns:
            Caminho do arquivo de cache
        """
        return os.path.join(self.cache_dir, f"{key}.json")
    
    def _get_from_cache(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Obtém dados do cache.
        
        Args:
            key: Chave de cache
            
        Returns:
            Dados do cache ou None se não encontrado ou expirado
        """
        if not self.cache_enabled:
            return None
        
        cache_path = self._get_cache_path(key)
        
        if not os.path.exists(cache_path):
            return None
        
        try:
            # Verificar se o cache expirou
            if time.time() - os.path.getmtime(cache_path) > self.cache_ttl:
                return None
            
            # Ler dados do cache
            with open(cache_path, "r") as f:
                return json.load(f)
        
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"Error reading cache: {str(e)}")
            return None
    
    def _save_to_cache(self, key: str, data: Dict[str, Any]) -> None:
        """
        Salva dados no cache.
        
        Args:
            key: Chave de cache
            data: Dados a serem salvos
        """
        if not self.cache_enabled:
            return
        
        cache_path = self._get_cache_path(key)
        
        try:
            with open(cache_path, "w") as f:
                json.dump(data, f)
        
        except IOError as e:
            logger.warning(f"Error writing to cache: {str(e)}")

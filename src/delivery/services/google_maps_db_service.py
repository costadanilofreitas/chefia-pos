import hashlib
import logging
import os
from typing import Any, Dict, List, Optional

import requests
from fastapi import Depends
from sqlalchemy.orm import Session

from ...core.database.connection import get_db_session
from ..repositories.delivery_repository import DeliveryRepository

# Configure logging
logger = logging.getLogger(__name__)


class GoogleMapsDBService:
    """
    Database-backed Google Maps service.

    This service provides methods for geocoding, route calculation,
    distance matrix and other Google Maps functionalities with
    PostgreSQL-based caching.
    """

    def __init__(self, api_key: Optional[str] = None, db: Optional[Session] = None):
        """
        Initialize the Google Maps service.

        Args:
            api_key: Google Maps API key. If not provided, will be obtained from GOOGLE_MAPS_API_KEY environment variable.
            db: Database session for caching.
        """
        self.api_key = api_key or os.environ.get("GOOGLE_MAPS_API_KEY")
        if not self.api_key:
            logger.warning(
                "Google Maps API key not provided. Service will not work properly."
            )

        if db is None:
            # For now, we'll handle the repository creation differently
            # since get_db_session returns an AsyncGenerator
            self.repository = None
        else:
            self.repository = DeliveryRepository(db)
        self.base_url = "https://maps.googleapis.com/maps/api"

        # Cache settings
        self.cache_enabled = True
        self.cache_ttl_hours = 24

    def _generate_cache_key(self, request_type: str, params: Dict[str, Any]) -> str:
        """Generate cache key from request parameters."""

        # Create a string representation of sorted parameters
        param_string = f"{request_type}:{sorted(params.items())}"

        # Generate SHA-256 hash
        return hashlib.sha256(param_string.encode()).hexdigest()

    async def _get_cached_response(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached response if available and not expired."""

        if not self.cache_enabled:
            return None

        try:
            if self.repository:
                cache_entry = self.repository.get_maps_cache(cache_key)
                if cache_entry:
                    logger.debug(f"Cache hit for key: {cache_key[:8]}...")
                    # Ensure we return a dictionary
                    response_data = getattr(cache_entry, "response_data", None)
                    if isinstance(response_data, dict):
                        return response_data
                    return None
        except Exception as e:
            logger.error(f"Error retrieving cache: {e}")

        return None

    async def _set_cached_response(
        self,
        cache_key: str,
        request_type: str,
        request_params: Dict[str, Any],
        response_data: Dict[str, Any],
    ) -> None:
        """Cache API response."""

        if not self.cache_enabled:
            return

        try:
            if self.repository:
                self.repository.set_maps_cache(
                    cache_key=cache_key,
                    request_type=request_type,
                    request_params=request_params,
                    response_data=response_data,
                    ttl_hours=self.cache_ttl_hours,
                )
                logger.debug(f"Cached response for key: {cache_key[:8]}...")
        except Exception as e:
            logger.error(f"Error caching response: {e}")

    async def _make_api_request(
        self, endpoint: str, params: Dict[str, Any], request_type: str
    ) -> Dict[str, Any]:
        """Make API request with caching."""

        # Add API key to parameters
        params["key"] = self.api_key

        # Generate cache key
        cache_key = self._generate_cache_key(request_type, params)

        # Try to get cached response
        cached_response = await self._get_cached_response(cache_key)
        if cached_response:
            return cached_response

        # Make API request
        try:
            url = f"{self.base_url}{endpoint}"
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()

            response_data = response.json()

            # Cache successful responses
            if response_data.get("status") == "OK":
                await self._set_cached_response(
                    cache_key, request_type, params, response_data
                )

            return response_data

        except requests.RequestException as e:
            logger.error(f"Google Maps API request failed: {e}")
            raise Exception(f"Google Maps API error: {str(e)}") from e

    async def geocode_address(self, address: str) -> Dict[str, Any]:
        """
        Geocode an address to get geographic coordinates.

        Args:
            address: Address to geocode

        Returns:
            Dictionary with geocoding results including coordinates
        """

        params = {
            "address": address,
            "region": "br",  # Bias results to Brazil
        }

        response = await self._make_api_request("/geocode/json", params, "geocode")

        if response.get("status") != "OK":
            logger.error(f"Geocoding failed: {response.get('status')}")
            return {"status": "error", "message": "Geocoding failed"}

        results = response.get("results", [])
        if not results:
            return {"status": "error", "message": "No results found"}

        # Extract relevant information from the first result
        result = results[0]
        location = result["geometry"]["location"]

        return {
            "status": "success",
            "address": result["formatted_address"],
            "latitude": location["lat"],
            "longitude": location["lng"],
            "place_id": result["place_id"],
            "types": result["types"],
            "geometry": result["geometry"],
        }

    async def reverse_geocode(
        self, latitude: float, longitude: float
    ) -> Dict[str, Any]:
        """
        Reverse geocode coordinates to get address.

        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate

        Returns:
            Dictionary with reverse geocoding results
        """

        params = {
            "latlng": f"{latitude},{longitude}",
            "region": "br",
        }

        response = await self._make_api_request(
            "/geocode/json", params, "reverse_geocode"
        )

        if response.get("status") != "OK":
            logger.error(f"Reverse geocoding failed: {response.get('status')}")
            return {"status": "error", "message": "Reverse geocoding failed"}

        results = response.get("results", [])
        if not results:
            return {"status": "error", "message": "No results found"}

        # Return the first (most specific) result
        result = results[0]

        return {
            "status": "success",
            "address": result["formatted_address"],
            "place_id": result["place_id"],
            "types": result["types"],
            "address_components": result["address_components"],
        }

    async def calculate_route(
        self,
        origin: str,
        destination: str,
        waypoints: Optional[List[str]] = None,
        optimize_waypoints: bool = False,
        avoid: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Calculate route between origin and destination.

        Args:
            origin: Starting point
            destination: End point
            waypoints: Optional intermediate points
            optimize_waypoints: Whether to optimize waypoint order
            avoid: Things to avoid (tolls, highways, ferries, indoor)

        Returns:
            Dictionary with route information
        """

        params = {
            "origin": origin,
            "destination": destination,
            "region": "br",
            "units": "metric",
        }

        if waypoints:
            waypoint_str = "|".join(waypoints)
            if optimize_waypoints:
                waypoint_str = f"optimize:true|{waypoint_str}"
            params["waypoints"] = waypoint_str

        if avoid:
            params["avoid"] = "|".join(avoid)

        response = await self._make_api_request(
            "/directions/json", params, "directions"
        )

        if response.get("status") != "OK":
            logger.error(f"Route calculation failed: {response.get('status')}")
            return {"status": "error", "message": "Route calculation failed"}

        routes = response.get("routes", [])
        if not routes:
            return {"status": "error", "message": "No route found"}

        # Process the first route
        route = routes[0]
        leg = route["legs"][0]

        return {
            "status": "success",
            "distance": leg["distance"]["value"],  # in meters
            "distance_text": leg["distance"]["text"],
            "duration": leg["duration"]["value"],  # in seconds
            "duration_text": leg["duration"]["text"],
            "start_address": leg["start_address"],
            "end_address": leg["end_address"],
            "polyline": route["overview_polyline"]["points"],
            "bounds": route["bounds"],
            "steps": leg["steps"],
        }

    async def calculate_distance_matrix(
        self,
        origins: List[str],
        destinations: List[str],
        mode: str = "driving",
        avoid: Optional[List[str]] = None,
        departure_time: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Calculate distance and duration between multiple origins and destinations.

        Args:
            origins: List of origin points
            destinations: List of destination points
            mode: Travel mode (driving, walking, bicycling, transit)
            avoid: Things to avoid
            departure_time: Departure time for transit/driving with traffic

        Returns:
            Dictionary with distance matrix results
        """

        params = {
            "origins": "|".join(origins),
            "destinations": "|".join(destinations),
            "mode": mode,
            "region": "br",
            "units": "metric",
        }

        if avoid:
            params["avoid"] = "|".join(avoid)

        if departure_time:
            params["departure_time"] = departure_time

        response = await self._make_api_request(
            "/distancematrix/json", params, "distance_matrix"
        )

        if response.get("status") != "OK":
            logger.error(
                f"Distance matrix calculation failed: {response.get('status')}"
            )
            return {"status": "error", "message": "Distance matrix calculation failed"}

        return {
            "status": "success",
            "origin_addresses": response["origin_addresses"],
            "destination_addresses": response["destination_addresses"],
            "rows": response["rows"],
        }

    async def find_nearby_places(
        self,
        location: str,
        place_type: str,
        radius: int = 1000,
        keyword: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Find nearby places of a specific type.

        Args:
            location: Center point for search
            place_type: Type of place to search for
            radius: Search radius in meters
            keyword: Additional keyword filter

        Returns:
            Dictionary with nearby places
        """

        params = {
            "location": location,
            "radius": radius,
            "type": place_type,
        }

        if keyword:
            params["keyword"] = keyword

        response = await self._make_api_request(
            "/place/nearbysearch/json", params, "nearby_search"
        )

        if response.get("status") != "OK":
            logger.error(f"Nearby search failed: {response.get('status')}")
            return {"status": "error", "message": "Nearby search failed"}

        return {
            "status": "success",
            "results": response.get("results", []),
            "next_page_token": response.get("next_page_token"),
        }

    async def optimize_multi_stop_route(
        self, depot: str, stops: List[str], return_to_depot: bool = True
    ) -> Dict[str, Any]:
        """
        Optimize route for multiple stops.

        Args:
            depot: Starting/ending point
            stops: List of stops to visit
            return_to_depot: Whether to return to starting point

        Returns:
            Dictionary with optimized route information
        """

        if len(stops) > 23:  # Google Maps API limit
            return {"status": "error", "message": "Too many waypoints (max 23)"}

        destination = depot if return_to_depot else stops[-1]
        waypoints = stops if return_to_depot else stops[:-1]

        route_result = await self.calculate_route(
            origin=depot,
            destination=destination,
            waypoints=waypoints,
            optimize_waypoints=True,
        )

        if route_result["status"] != "success":
            return route_result

        return {
            "status": "success",
            "optimized_route": route_result,
            "total_distance": route_result["distance"],
            "total_duration": route_result["duration"],
            "waypoint_order": route_result.get("waypoint_order", []),
        }

    async def validate_address(self, address: str) -> Dict[str, Any]:
        """
        Validate and standardize an address.

        Args:
            address: Address to validate

        Returns:
            Dictionary with validation results
        """

        geocode_result = await self.geocode_address(address)

        if geocode_result["status"] != "success":
            return {"status": "invalid", "message": "Address could not be geocoded"}

        # Check if the result is a precise location
        geometry_type = geocode_result.get("geometry", {}).get("location_type", "")

        if geometry_type in ["ROOFTOP", "RANGE_INTERPOLATED"]:
            precision = "high"
        elif geometry_type == "GEOMETRIC_CENTER":
            precision = "medium"
        else:
            precision = "low"

        return {
            "status": "valid",
            "precision": precision,
            "formatted_address": geocode_result["address"],
            "coordinates": {
                "latitude": geocode_result["latitude"],
                "longitude": geocode_result["longitude"],
            },
            "place_id": geocode_result["place_id"],
        }

    async def cleanup_expired_cache(self) -> int:
        """Clean up expired cache entries."""

        try:
            if self.repository:
                deleted_count = self.repository.cleanup_expired_cache()
                logger.info(f"Cleaned up {deleted_count} expired cache entries")
                return deleted_count
            else:
                return 0
        except Exception as e:
            logger.error(f"Error cleaning up cache: {e}")
            return 0


# Dependency function to get the service
def get_google_maps_service(
    db: Session = Depends(get_db_session),
) -> GoogleMapsDBService:
    """Get GoogleMapsDBService instance with database session."""
    return GoogleMapsDBService(db=db)

import os
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

CONFIG_DIR = "/home/ubuntu/pos-modern/config"

# Define paths that require instance ID check and the corresponding query parameter name
INSTANCE_CHECK_PATHS = {
    "/api/v1/kds/": "kds_id",
    "/api/v1/pos/": "pos_id",
    "/api/v1/waiter/": "waiter_id",
}


class LicenseMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        module_name = None
        instance_id_param = None

        # Check if the request path starts with a path requiring license check
        for check_path, param_name in INSTANCE_CHECK_PATHS.items():
            if path.startswith(check_path):
                module_name = check_path.split("/")[
                    3
                ]  # Extract module name (kds, pos, waiter)
                instance_id_param = param_name
                break

        # If the path requires a check, extract the instance ID from query params
        if module_name and instance_id_param:
            instance_id_str = request.query_params.get(instance_id_param)

            # Some routes might not require the ID (e.g., listing all sessions without filter)
            # Only enforce check if the parameter is actually provided
            if instance_id_str:
                try:
                    instance_id = int(instance_id_str)
                    config_file_path = os.path.join(
                        CONFIG_DIR, module_name, f"{instance_id}.json"
                    )

                    if not os.path.exists(config_file_path):
                        # Return 403 Forbidden immediately if not licensed
                        return JSONResponse(
                            status_code=403,
                            content={
                                "detail": f"Instance ID {instance_id} for module {module_name} is not licensed."
                            },
                        )
                except ValueError:
                    # Handle cases where the ID is not a valid integer
                    return JSONResponse(
                        status_code=400,
                        content={
                            "detail": f"Invalid instance ID format for {instance_id_param}."
                        },
                    )

        # If licensed or path doesn't require check, proceed with the request
        response = await call_next(request)
        return response

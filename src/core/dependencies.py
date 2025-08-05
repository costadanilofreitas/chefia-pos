import os
from fastapi import HTTPException, Query

CONFIG_DIR = "/home/ubuntu/pos-modern/config"


def check_instance_license(module_name: str):
    """FastAPI dependency factory to check if an instance is licensed based on config file existence.

    Args:
        module_name: The name of the module (e.g., 'pos', 'kds', 'waiter').
                     This determines the expected query parameter name (e.g., 'pos_id').

    Returns:
        A dependency function that checks the license.
    """
    param_name = f"{module_name}_id"

    async def _check_license(
        instance_id: int = Query(
            ...,
            alias=param_name,
            description=f"Licensed instance ID for the {module_name} module",
        )
    ) -> int:
        """Checks for the existence of the instance configuration file using the alias."""
        config_file_path = os.path.join(CONFIG_DIR, module_name, f"{instance_id}.json")

        if not os.path.exists(config_file_path):
            raise HTTPException(
                status_code=403,
                detail=f"Instance ID {instance_id} for module {module_name} is not licensed or configured.",
            )

        # You could potentially load and return the config content here if needed
        # For now, just checking existence is enough for licensing

        return instance_id

    return _check_license

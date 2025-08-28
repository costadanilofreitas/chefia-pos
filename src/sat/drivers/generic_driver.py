"""Driver genérico para SAT."""

from src.sat.drivers.simulated_driver import SimulatedSATDriver
from src.sat.models.sat_models import SATConfig


class GenericDriver(SimulatedSATDriver):
    """Driver genérico para SAT."""

    def __init__(self, config: SATConfig):
        """Inicializa o driver genérico."""
        super().__init__(config)
        self.manufacturer = "Generic"

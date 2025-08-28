"""Driver stub para SAT Dimep."""

from src.sat.drivers.simulated_driver import SimulatedSATDriver
from src.sat.models.sat_models import SATConfig


class DimepDriver(SimulatedSATDriver):
    """Driver para SAT Dimep."""

    def __init__(self, config: SATConfig):
        """Inicializa o driver Dimep."""
        super().__init__(config)
        self.manufacturer = "Dimep"

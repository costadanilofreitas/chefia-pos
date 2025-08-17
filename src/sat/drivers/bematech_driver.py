"""Driver stub para SAT Bematech."""

from src.sat.drivers.simulated_driver import SimulatedSATDriver
from src.sat.models.sat_models import SATConfig


class BematechDriver(SimulatedSATDriver):
    """Driver para SAT Bematech."""
    
    def __init__(self, config: SATConfig):
        """Inicializa o driver Bematech."""
        super().__init__(config)
        self.manufacturer = "Bematech"
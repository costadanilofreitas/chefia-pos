"""Driver stub para SAT Elgin."""

from src.sat.drivers.simulated_driver import SimulatedSATDriver
from src.sat.models.sat_models import SATConfig


class ElginDriver(SimulatedSATDriver):
    """Driver para SAT Elgin."""
    
    def __init__(self, config: SATConfig):
        """Inicializa o driver Elgin."""
        super().__init__(config)
        self.manufacturer = "Elgin"
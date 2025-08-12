from typing import Dict, List, Any, Optional
import json

from src.peripherals.models.peripheral_models import (
    Peripheral,
    PeripheralType,
    PeripheralStatus,
    Printer,
    PrinterConfig,
    PeripheralException,
    ConfigurationException,
)


class PeripheralFactory:
    """Fábrica para criar instâncias de periféricos."""

    @staticmethod
    async def create_peripheral(config: Dict[str, Any]) -> Peripheral:
        """Cria uma instância de periférico com base na configuração."""
        peripheral_type = config.get("type", "").lower()

        if peripheral_type == PeripheralType.PRINTER:
            return await PeripheralFactory.create_printer(config)
        # Adicionar suporte para outros tipos no futuro
        else:
            raise ConfigurationException(
                f"Tipo de periférico não suportado: {peripheral_type}"
            )

    @staticmethod
    async def create_printer(config: Dict[str, Any]) -> Printer:
        """Cria uma instância de impressora com base na configuração."""
        brand = config.get("brand", "").lower()

        # Importar implementações específicas aqui para evitar importação circular
        if brand == "epson":
            from src.peripherals.drivers.epson.epson_printer import EpsonPrinter

            printer_config = PrinterConfig(**config)
            return EpsonPrinter(printer_config)
        elif brand == "simulated":
            from src.peripherals.drivers.simulated_printer import SimulatedPrinter

            printer_config = PrinterConfig(**config)
            return SimulatedPrinter(printer_config)
        # Adicionar suporte para outras marcas no futuro

        raise ConfigurationException(f"Marca de impressora não suportada: {brand}")


class PeripheralManager:
    """Gerenciador central de periféricos."""

    def __init__(self):
        self.peripherals: Dict[str, Peripheral] = {}
        self.config: Dict[str, Any] = {}
        self.initialized = False

    async def initialize(self, config_path: str) -> None:
        """Inicializa o gerenciador com configurações de um arquivo."""
        if self.initialized:
            return

        # Carregar configuração
        try:
            with open(config_path, "r") as f:
                self.config = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            raise ConfigurationException(f"Erro ao carregar configuração: {str(e)}")

        # Inicializar periféricos configurados
        for peripheral_id, peripheral_config in self.config.get(
            "peripherals", {}
        ).items():
            if peripheral_config.get("enabled", True):
                try:
                    await self.add_peripheral(peripheral_id, peripheral_config)
                except Exception as e:
                    print(f"Erro ao inicializar periférico {peripheral_id}: {str(e)}")
                    # Em produção, registrar em log

        self.initialized = True

    async def add_peripheral(self, peripheral_id: str, config: Dict[str, Any]) -> None:
        """Adiciona um periférico ao gerenciador."""
        if peripheral_id in self.peripherals:
            raise ConfigurationException(f"Periférico com ID {peripheral_id} já existe")

        # Garantir que o ID na configuração corresponda ao ID fornecido
        config["id"] = peripheral_id

        try:
            # Criar o periférico
            peripheral = await PeripheralFactory.create_peripheral(config)

            # Inicializar o periférico
            success = await peripheral.initialize()
            if not success:
                raise PeripheralException(
                    f"Falha ao inicializar periférico: {peripheral_id}"
                )

            # Armazenar o periférico
            self.peripherals[peripheral_id] = peripheral
        except Exception as e:
            raise PeripheralException(
                f"Erro ao adicionar periférico {peripheral_id}: {str(e)}"
            )

    async def get_peripheral(self, peripheral_id: str) -> Optional[Peripheral]:
        """Obtém um periférico pelo ID."""
        return self.peripherals.get(peripheral_id)

    async def get_printer(self, printer_id: str) -> Optional[Printer]:
        """Obtém uma impressora pelo ID."""
        peripheral = await self.get_peripheral(printer_id)
        if peripheral and isinstance(peripheral, Printer):
            return peripheral
        return None

    async def list_peripherals(
        self, peripheral_type: Optional[PeripheralType] = None
    ) -> List[Dict[str, Any]]:
        """Lista todos os periféricos, opcionalmente filtrados por tipo."""
        result = []

        for peripheral in self.peripherals.values():
            if peripheral_type is None or peripheral.config.type == peripheral_type:
                result.append(peripheral.to_dict())

        return result

    async def remove_peripheral(self, peripheral_id: str) -> bool:
        """Remove um periférico do gerenciador."""
        peripheral = self.peripherals.get(peripheral_id)
        if not peripheral:
            return False

        # Finalizar o periférico
        try:
            await peripheral.shutdown()
        except Exception as e:
            print(f"Erro ao finalizar periférico {peripheral_id}: {str(e)}")
            # Em produção, registrar em log

        # Remover do dicionário
        del self.peripherals[peripheral_id]

        return True

    async def update_peripheral_config(
        self, peripheral_id: str, config: Dict[str, Any]
    ) -> bool:
        """Atualiza a configuração de um periférico."""
        # Remover o periférico existente
        removed = await self.remove_peripheral(peripheral_id)
        if not removed:
            return False

        # Adicionar com a nova configuração
        try:
            await self.add_peripheral(peripheral_id, config)
            return True
        except Exception as e:
            print(f"Erro ao atualizar periférico {peripheral_id}: {str(e)}")
            # Em produção, registrar em log
            return False

    async def check_peripherals_status(self) -> Dict[str, Any]:
        """Verifica o status de todos os periféricos."""
        result = {}

        for peripheral_id, peripheral in self.peripherals.items():
            try:
                status = await peripheral.get_status()
                result[peripheral_id] = status
            except Exception as e:
                result[peripheral_id] = {
                    "status": PeripheralStatus.ERROR,
                    "error": str(e),
                }

        return result

    async def shutdown(self) -> None:
        """Finaliza todos os periféricos."""
        for peripheral_id, peripheral in list(self.peripherals.items()):
            try:
                await peripheral.shutdown()
            except Exception as e:
                print(f"Erro ao finalizar periférico {peripheral_id}: {str(e)}")
                # Em produção, registrar em log

        self.peripherals.clear()
        self.initialized = False


# Singleton para o gerenciador de periféricos
_peripheral_manager_instance = None


def get_peripheral_manager() -> PeripheralManager:
    """Retorna a instância singleton do gerenciador de periféricos."""
    global _peripheral_manager_instance
    if _peripheral_manager_instance is None:
        _peripheral_manager_instance = PeripheralManager()
    return _peripheral_manager_instance

import asyncio
import json
import logging
import os
import socket
import time
from typing import Any, Dict, Optional

from src.peripherals.models.peripheral_models import (
    BasePeripheralDriver,
    PaymentTerminalConfig,
    PeripheralException,
    PeripheralFactory,
    PeripheralStatus,
)


class SiTefTerminal(BasePeripheralDriver):
    """Driver para terminais de pagamento SiTef."""

    def __init__(self, config: PaymentTerminalConfig):
        # Convert PaymentTerminalConfig to PeripheralConfig for BasePeripheralDriver
        peripheral_config = PeripheralFactory.create_peripheral_config(
            config, "payment_terminal", "sitef_terminal"
        )
        super().__init__(peripheral_config)
        self.host = config.host
        self.port = config.port
        self.address = config.host  # Add address attribute for compatibility
        self.company_id = config.options.get("company_id", "00000000")
        self.terminal_id = config.options.get("terminal_id", "00000000")
        self.timeout = config.timeout
        self.initialized = False
        self.connection: Optional[socket.socket] = None
        self.transaction_lock = asyncio.Lock()
        self.current_transaction: Optional[Dict[str, Any]] = None

    async def initialize(self) -> bool:
        """Inicializa o terminal de pagamento."""
        try:
            # Verificar se já está inicializado
            if self.initialized:
                return True

            # Tentar conectar ao servidor SiTef
            self.connection = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.connection.settimeout(10)
            self.connection.connect((self.host, self.port))

            # Enviar comando de inicialização
            init_command = {
                "command": "INIT",
                "company_id": self.company_id,
                "terminal_id": self.terminal_id,
                "version": "1.0",
            }

            response = await self._send_command(init_command)

            if not response or response.get("status") != "OK":
                error_msg = (
                    response.get("message", "Erro desconhecido")
                    if response
                    else "Sem resposta"
                )
                logging.error(f"Erro ao inicializar terminal SiTef: {error_msg}")
                await self.update_status(PeripheralStatus.ERROR, error_msg)
                return False

            self.initialized = True
            await self.update_status(PeripheralStatus.ONLINE)
            return True
        except Exception as e:
            logging.error(f"Erro ao inicializar terminal SiTef: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def shutdown(self) -> bool:
        """Finaliza o terminal de pagamento."""
        try:
            # Verificar se há transação em andamento
            if self.current_transaction:
                # Tentar cancelar a transação
                await self.cancel_transaction()

            # Enviar comando de finalização
            if self.initialized and self.connection:
                end_command = {
                    "command": "END",
                    "company_id": self.company_id,
                    "terminal_id": self.terminal_id,
                }

                try:
                    await self._send_command(end_command)
                except Exception:
                    pass

            # Fechar conexão
            if self.connection:
                try:
                    self.connection.close()
                except Exception:
                    pass
                self.connection = None

            self.initialized = False
            await self.update_status(PeripheralStatus.OFFLINE)
            return True
        except Exception as e:
            logging.error(f"Erro ao finalizar terminal SiTef: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual do terminal de pagamento."""
        if not self.initialized:
            return {
                "status": PeripheralStatus.OFFLINE,
                "message": "Terminal não inicializado",
                "details": {},
            }

        try:
            # Enviar comando de status
            status_command = {
                "command": "STATUS",
                "company_id": self.company_id,
                "terminal_id": self.terminal_id,
            }

            response = await self._send_command(status_command)

            if not response:
                await self.update_status(
                    PeripheralStatus.ERROR, "Sem resposta do terminal"
                )
                return {
                    "status": PeripheralStatus.ERROR,
                    "message": "Sem resposta do terminal",
                    "details": {},
                }

            # Interpretar resposta
            if response.get("status") == "OK":
                terminal_status = PeripheralStatus.ONLINE
                message = "Terminal online"

                # Verificar se há transação em andamento
                if self.current_transaction:
                    terminal_status = PeripheralStatus.BUSY
                    message = f"Transação em andamento: {self.current_transaction.get('type', 'desconhecida')}"
            else:
                terminal_status = PeripheralStatus.ERROR
                message = response.get("message", "Erro desconhecido")

            await self.update_status(terminal_status, message)

            return {
                "status": terminal_status,
                "message": message,
                "details": {
                    "address": self.address,
                    "port": self.port,
                    "company_id": self.company_id,
                    "terminal_id": self.terminal_id,
                    "current_transaction": self.current_transaction,
                },
            }
        except Exception as e:
            logging.error(f"Erro ao obter status do terminal SiTef: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return {"status": PeripheralStatus.ERROR, "message": str(e), "details": {}}

    async def process_payment(
        self, amount: float, options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Processa um pagamento."""
        if options is None:
            options = {}

        # Build payment_data from amount and options for backward compatibility
        payment_data = {"amount": amount, **options}

        async with self.transaction_lock:
            if not self.initialized:
                await self.update_status(
                    PeripheralStatus.ERROR, "Terminal não inicializado"
                )
                return {
                    "success": False,
                    "message": "Terminal não inicializado",
                    "transaction_id": None,
                    "details": {},
                }

            try:
                # Verificar se já há uma transação em andamento
                if self.current_transaction:
                    return {
                        "success": False,
                        "message": "Já existe uma transação em andamento",
                        "transaction_id": self.current_transaction.get("id"),
                        "details": self.current_transaction,
                    }

                # Preparar dados da transação
                amount = payment_data.get("amount", 0)
                payment_type = payment_data.get("type", "CREDIT")
                installments = payment_data.get("installments", 1)

                # Criar comando de pagamento
                payment_command = {
                    "command": "PAYMENT",
                    "company_id": self.company_id,
                    "terminal_id": self.terminal_id,
                    "amount": amount,
                    "type": payment_type,
                    "installments": installments,
                    "reference": payment_data.get("reference", ""),
                    "options": payment_data.get("options", {}),
                }

                # Registrar transação atual
                transaction_id = f"TX{int(time.time())}"
                self.current_transaction = {
                    "id": transaction_id,
                    "type": payment_type,
                    "amount": amount,
                    "start_time": time.time(),
                    "status": "PROCESSING",
                }

                # Atualizar status
                await self.update_status(
                    PeripheralStatus.BUSY, f"Processando pagamento {payment_type}"
                )

                # Enviar comando
                response = await self._send_command(payment_command)

                if not response:
                    self.current_transaction["status"] = "ERROR"
                    self.current_transaction["end_time"] = time.time()
                    self.current_transaction = None

                    await self.update_status(
                        PeripheralStatus.ERROR, "Sem resposta do terminal"
                    )
                    return {
                        "success": False,
                        "message": "Sem resposta do terminal",
                        "transaction_id": transaction_id,
                        "details": {},
                    }

                # Processar resposta
                success = response.get("status") == "APPROVED"
                message = response.get("message", "")

                # Atualizar transação
                self.current_transaction["status"] = response.get("status", "UNKNOWN")
                self.current_transaction["end_time"] = time.time()
                self.current_transaction["response"] = response

                # Limpar transação atual se concluída
                if response.get("status") in ["APPROVED", "DECLINED", "ERROR"]:
                    current_tx = self.current_transaction
                    self.current_transaction = None
                else:
                    current_tx = self.current_transaction

                # Atualizar status
                if success:
                    await self.update_status(
                        PeripheralStatus.ONLINE, "Pagamento aprovado"
                    )
                else:
                    await self.update_status(
                        PeripheralStatus.WARNING, f"Pagamento recusado: {message}"
                    )

                return {
                    "success": success,
                    "message": message,
                    "transaction_id": transaction_id,
                    "details": {
                        "authorization_code": response.get("authorization_code"),
                        "card_brand": response.get("card_brand"),
                        "card_bin": response.get("card_bin"),
                        "transaction": current_tx,
                    },
                }
            except Exception as e:
                logging.error(f"Erro ao processar pagamento: {str(e)}")

                # Atualizar transação em caso de erro
                if self.current_transaction:
                    self.current_transaction["status"] = "ERROR"
                    self.current_transaction["end_time"] = time.time()
                    self.current_transaction["error"] = str(e)
                    current_tx = self.current_transaction
                    self.current_transaction = None
                else:
                    current_tx = None

                await self.update_status(PeripheralStatus.ERROR, str(e))
                return {
                    "success": False,
                    "message": str(e),
                    "transaction_id": current_tx.get("id") if current_tx else None,
                    "details": {"transaction": current_tx},
                }

    async def cancel_transaction(
        self, options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Cancela uma transação."""
        if options is None:
            options = {}
        transaction_id = options.get("transaction_id")

        async with self.transaction_lock:
            if not self.initialized:
                await self.update_status(
                    PeripheralStatus.ERROR, "Terminal não inicializado"
                )
                return {
                    "success": False,
                    "message": "Terminal não inicializado",
                    "details": {},
                }

            try:
                # Verificar se há uma transação em andamento
                if self.current_transaction and not transaction_id:
                    transaction_id = self.current_transaction.get("id")

                if not transaction_id:
                    return {
                        "success": False,
                        "message": "Nenhuma transação especificada para cancelamento",
                        "details": {},
                    }

                # Criar comando de cancelamento
                cancel_command = {
                    "command": "CANCEL",
                    "company_id": self.company_id,
                    "terminal_id": self.terminal_id,
                    "transaction_id": transaction_id,
                }

                # Atualizar status
                await self.update_status(PeripheralStatus.BUSY, "Cancelando transação")

                # Enviar comando
                response = await self._send_command(cancel_command)

                if not response:
                    await self.update_status(
                        PeripheralStatus.ERROR, "Sem resposta do terminal"
                    )
                    return {
                        "success": False,
                        "message": "Sem resposta do terminal",
                        "details": {},
                    }

                # Processar resposta
                success = response.get("status") == "OK"
                message = response.get("message", "")

                # Limpar transação atual se for a mesma
                if (
                    self.current_transaction
                    and self.current_transaction.get("id") == transaction_id
                ):
                    self.current_transaction = None

                # Atualizar status
                if success:
                    await self.update_status(
                        PeripheralStatus.ONLINE, "Transação cancelada"
                    )
                else:
                    await self.update_status(
                        PeripheralStatus.WARNING, f"Falha ao cancelar: {message}"
                    )

                return {"success": success, "message": message, "details": response}
            except Exception as e:
                logging.error(f"Erro ao cancelar transação: {str(e)}")
                await self.update_status(PeripheralStatus.ERROR, str(e))
                return {"success": False, "message": str(e), "details": {}}

    async def print_receipt(self, transaction_id: str) -> bool:
        """Imprime o recibo de uma transação."""
        if not self.initialized:
            await self.update_status(
                PeripheralStatus.ERROR, "Terminal não inicializado"
            )
            return False

        try:
            # Criar comando de impressão
            print_command = {
                "command": "PRINT",
                "company_id": self.company_id,
                "terminal_id": self.terminal_id,
                "transaction_id": transaction_id,
            }

            # Enviar comando
            response = await self._send_command(print_command)

            if not response or response.get("status") != "OK":
                error_msg = (
                    response.get("message", "Erro desconhecido")
                    if response
                    else "Sem resposta"
                )
                logging.error(f"Erro ao imprimir recibo: {error_msg}")
                return False

            return True
        except Exception as e:
            logging.error(f"Erro ao imprimir recibo: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def _send_command(self, command: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Envia um comando para o terminal e aguarda resposta."""
        if not self.connection:
            raise PeripheralException("Conexão não estabelecida")

        try:
            # Converter comando para JSON
            command_json = json.dumps(command)

            # Adicionar terminador
            command_bytes = command_json.encode("utf-8") + b"\n"

            # Enviar comando
            self.connection.sendall(command_bytes)

            # Aguardar resposta
            response_data = b""
            start_time = time.time()

            while time.time() - start_time < self.timeout:
                try:
                    chunk = self.connection.recv(4096)
                    if not chunk:
                        break

                    response_data += chunk

                    # Verificar se chegou ao fim da resposta
                    if response_data.endswith(b"\n"):
                        break
                except socket.timeout:
                    # Continuar aguardando
                    await asyncio.sleep(0.1)
                    continue

            if not response_data:
                return None

            # Decodificar resposta
            response_json = response_data.decode("utf-8").strip()
            response = json.loads(response_json)

            return response
        except json.JSONDecodeError as e:
            logging.error(f"Erro ao decodificar resposta: {str(e)}")
            return None
        except Exception as e:
            logging.error(f"Erro ao enviar comando: {str(e)}")
            raise


class SimulatedPaymentTerminal(BasePeripheralDriver):
    """Driver para simulação de terminal de pagamento."""

    def __init__(self, config: PaymentTerminalConfig):
        # Convert PaymentTerminalConfig to PeripheralConfig for BasePeripheralDriver
        from src.peripherals.models.peripheral_models import PeripheralConfig

        peripheral_config = PeripheralConfig(
            id=config.id,
            type="payment_terminal",
            driver="simulated_payment_terminal",
            name=config.name,
            address=f"{config.host}:{config.port}",
            options=config.options,
        )
        super().__init__(peripheral_config)
        self.initialized = False
        self.transaction_lock = asyncio.Lock()
        self.current_transaction: Optional[Dict[str, Any]] = None
        self.transaction_history: list = []
        self.decline_rate = config.options.get("decline_rate", 0.1)  # 10% de recusa
        self.error_rate = config.options.get("error_rate", 0.05)  # 5% de erro

    async def initialize(self) -> bool:
        """Inicializa o terminal simulado."""
        try:
            self.initialized = True
            await self.update_status(PeripheralStatus.ONLINE)
            return True
        except Exception as e:
            logging.error(f"Erro ao inicializar terminal simulado: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def shutdown(self) -> bool:
        """Finaliza o terminal simulado."""
        try:
            self.initialized = False
            await self.update_status(PeripheralStatus.OFFLINE)
            return True
        except Exception as e:
            logging.error(f"Erro ao finalizar terminal simulado: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual do terminal simulado."""
        if not self.initialized:
            return {
                "status": PeripheralStatus.OFFLINE,
                "message": "Terminal não inicializado",
                "details": {},
            }

        # Verificar se há transação em andamento
        if self.current_transaction:
            status = PeripheralStatus.BUSY
            message = f"Transação em andamento: {self.current_transaction.get('type', 'desconhecida')}"
        else:
            status = PeripheralStatus.ONLINE
            message = "Terminal simulado online"

        await self.update_status(status, message)

        return {
            "status": status,
            "message": message,
            "details": {
                "type": "simulated",
                "current_transaction": self.current_transaction,
                "transaction_count": len(self.transaction_history),
            },
        }

    async def process_payment(
        self, amount: float, options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Processa um pagamento simulado."""
        if options is None:
            options = {}

        # Build payment_data from amount and options for backward compatibility
        payment_data = {"amount": amount, **options}

        async with self.transaction_lock:
            if not self.initialized:
                await self.update_status(
                    PeripheralStatus.ERROR, "Terminal não inicializado"
                )
                return {
                    "success": False,
                    "message": "Terminal não inicializado",
                    "transaction_id": None,
                    "details": {},
                }

            try:
                # Verificar se já há uma transação em andamento
                if self.current_transaction:
                    return {
                        "success": False,
                        "message": "Já existe uma transação em andamento",
                        "transaction_id": self.current_transaction.get("id"),
                        "details": self.current_transaction,
                    }

                # Preparar dados da transação
                amount = payment_data.get("amount", 0)
                payment_type = payment_data.get("type", "CREDIT")
                installments = payment_data.get("installments", 1)

                # Registrar transação atual
                transaction_id = f"SIM{int(time.time())}"
                self.current_transaction = {
                    "id": transaction_id,
                    "type": payment_type,
                    "amount": amount,
                    "installments": installments,
                    "start_time": time.time(),
                    "status": "PROCESSING",
                }

                # Atualizar status
                await self.update_status(
                    PeripheralStatus.BUSY, f"Processando pagamento {payment_type}"
                )

                # Simular processamento
                await asyncio.sleep(2)

                # Simular resultado
                import random

                rand_val = random.random()

                if rand_val < self.error_rate:
                    # Simular erro
                    status = "ERROR"
                    message = "Erro de comunicação com o servidor"
                    success = False
                    authorization_code = None
                elif rand_val < (self.error_rate + self.decline_rate):
                    # Simular recusa
                    status = "DECLINED"
                    message = random.choice(
                        [
                            "Transação recusada pelo emissor",
                            "Saldo insuficiente",
                            "Cartão expirado",
                            "Limite excedido",
                        ]
                    )
                    success = False
                    authorization_code = None
                else:
                    # Simular aprovação
                    status = "APPROVED"
                    message = "Transação aprovada"
                    success = True
                    authorization_code = f"{random.randint(100000, 999999)}"

                # Atualizar transação
                if self.current_transaction is not None:
                    self.current_transaction["status"] = status
                    self.current_transaction["end_time"] = time.time()
                    self.current_transaction["message"] = message
                    self.current_transaction["authorization_code"] = authorization_code

                    # Adicionar ao histórico
                    self.transaction_history.append(self.current_transaction.copy())

                # Limpar transação atual
                current_tx = self.current_transaction
                self.current_transaction = None

                # Atualizar status
                if success:
                    await self.update_status(
                        PeripheralStatus.ONLINE, "Pagamento aprovado"
                    )
                else:
                    await self.update_status(
                        PeripheralStatus.WARNING, f"Pagamento recusado: {message}"
                    )

                # Gerar detalhes adicionais para transações aprovadas
                details = {}
                if success:
                    card_brands = ["VISA", "MASTERCARD", "ELO", "AMEX"]
                    details = {
                        "authorization_code": authorization_code,
                        "card_brand": random.choice(card_brands),
                        "card_bin": f"{random.randint(400000, 599999)}",
                        "transaction": current_tx,
                    }
                else:
                    details = {"transaction": current_tx}

                return {
                    "success": success,
                    "message": message,
                    "transaction_id": transaction_id,
                    "details": details,
                }
            except Exception as e:
                logging.error(f"Erro ao processar pagamento simulado: {str(e)}")

                # Atualizar transação em caso de erro
                if self.current_transaction:
                    self.current_transaction["status"] = "ERROR"
                    self.current_transaction["end_time"] = time.time()
                    self.current_transaction["error"] = str(e)
                    current_tx = self.current_transaction
                    self.current_transaction = None
                else:
                    current_tx = None

                await self.update_status(PeripheralStatus.ERROR, str(e))
                return {
                    "success": False,
                    "message": str(e),
                    "transaction_id": current_tx.get("id") if current_tx else None,
                    "details": {"transaction": current_tx},
                }

    async def cancel_transaction(
        self, options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Cancela uma transação simulada."""
        if options is None:
            options = {}
        transaction_id = options.get("transaction_id")

        async with self.transaction_lock:
            if not self.initialized:
                await self.update_status(
                    PeripheralStatus.ERROR, "Terminal não inicializado"
                )
                return {
                    "success": False,
                    "message": "Terminal não inicializado",
                    "details": {},
                }

            try:
                # Verificar se há uma transação em andamento
                if self.current_transaction and not transaction_id:
                    transaction_id = self.current_transaction.get("id")

                if not transaction_id:
                    return {
                        "success": False,
                        "message": "Nenhuma transação especificada para cancelamento",
                        "details": {},
                    }

                # Atualizar status
                await self.update_status(PeripheralStatus.BUSY, "Cancelando transação")

                # Simular processamento
                await asyncio.sleep(1)

                # Verificar se a transação existe no histórico
                found = False
                for tx in self.transaction_history:
                    if tx.get("id") == transaction_id:
                        found = True
                        break

                # Limpar transação atual se for a mesma
                if (
                    self.current_transaction
                    and self.current_transaction.get("id") == transaction_id
                ):
                    self.current_transaction = None
                    found = True

                if not found:
                    await self.update_status(
                        PeripheralStatus.WARNING, "Transação não encontrada"
                    )
                    return {
                        "success": False,
                        "message": "Transação não encontrada",
                        "details": {},
                    }

                # Simular resultado
                import random

                success = random.random() > 0.1  # 10% de falha no cancelamento

                if success:
                    message = "Transação cancelada com sucesso"
                    await self.update_status(
                        PeripheralStatus.ONLINE, "Transação cancelada"
                    )
                else:
                    message = "Falha ao cancelar transação"
                    await self.update_status(
                        PeripheralStatus.WARNING, "Falha ao cancelar"
                    )

                return {
                    "success": success,
                    "message": message,
                    "details": {"transaction_id": transaction_id},
                }
            except Exception as e:
                logging.error(f"Erro ao cancelar transação simulada: {str(e)}")
                await self.update_status(PeripheralStatus.ERROR, str(e))
                return {"success": False, "message": str(e), "details": {}}

    async def print_receipt(self, transaction_id: str) -> bool:
        """Simula a impressão do recibo de uma transação."""
        if not self.initialized:
            await self.update_status(
                PeripheralStatus.ERROR, "Terminal não inicializado"
            )
            return False

        try:
            # Verificar se a transação existe no histórico
            found = False
            transaction = None

            for tx in self.transaction_history:
                if tx.get("id") == transaction_id:
                    found = True
                    transaction = tx
                    break

            if not found or transaction is None:
                logging.error(f"Transação não encontrada: {transaction_id}")
                return False

            # Simular impressão
            logging.info(
                f"Simulando impressão de recibo para transação {transaction_id}"
            )

            # Criar arquivo de log para simular a impressão
            log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
            os.makedirs(log_dir, exist_ok=True)

            log_file = os.path.join(log_dir, "payment_receipts.log")
            with open(log_file, "a") as f:
                f.write("\n--- RECIBO DE PAGAMENTO ---\n")
                f.write(f"Data: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Transação: {transaction_id}\n")
                f.write(f"Tipo: {transaction.get('type', 'N/A')}\n")
                f.write(f"Valor: R$ {transaction.get('amount', 0):.2f}\n")
                f.write(f"Status: {transaction.get('status', 'N/A')}\n")
                if transaction.get("authorization_code"):
                    f.write(f"Autorização: {transaction.get('authorization_code')}\n")
                f.write("---------------------------\n")

            return True
        except Exception as e:
            logging.error(f"Erro ao simular impressão de recibo: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

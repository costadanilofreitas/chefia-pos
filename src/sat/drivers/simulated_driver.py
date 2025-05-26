import asyncio
import uuid
import random
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any

from src.sat.models.sat_models import (
    SATConfig,
    SATStatus,
    SATResponse,
    SATStatusResponse,
    CFe
)
from src.sat.services.sat_service import SATDriver


class SimulatedSATDriver(SATDriver):
    """Driver simulado para testes do SAT sem hardware real."""
    
    def __init__(self, config: SATConfig):
        super().__init__(config)
        self.status = SATStatus.UNKNOWN
        self.emitted_cfes = []
        self.canceled_cfes = []
        self.error_probability = 0.05  # 5% de chance de erro simulado
        self.delay_min = 0.5  # Delay mínimo em segundos
        self.delay_max = 2.0  # Delay máximo em segundos
        self.initialized = False
    
    async def initialize(self) -> bool:
        """Inicializa o driver simulado."""
        if self.initialized:
            return True
        
        # Simular inicialização
        await asyncio.sleep(random.uniform(self.delay_min, self.delay_max))
        
        # Chance de falha na inicialização
        if random.random() < self.error_probability:
            self.status = SATStatus.ERROR
            self.last_error = "Erro simulado na inicialização"
            logging.warning(f"Simulação: {self.last_error}")
            return False
        
        self.status = SATStatus.READY
        self.last_communication = datetime.now()
        self.initialized = True
        logging.info("Simulação: SAT inicializado com sucesso")
        return True
    
    async def get_status(self) -> SATStatusResponse:
        """Obtém o status simulado do SAT."""
        # Simular delay
        await asyncio.sleep(random.uniform(self.delay_min, self.delay_max))
        
        # Atualizar timestamp
        self.last_communication = datetime.now()
        
        # Chance de status aleatório para simular problemas
        if random.random() < self.error_probability:
            random_status = random.choice([
                SATStatus.BUSY,
                SATStatus.ERROR,
                SATStatus.BLOCKED
            ])
            message = f"Status simulado: {random_status}"
            logging.warning(f"Simulação: {message}")
            return SATStatusResponse(
                status=random_status,
                message=message,
                last_communication=self.last_communication,
                details={"simulated": True}
            )
        
        return SATStatusResponse(
            status=self.status,
            message=f"Status simulado: {self.status}",
            last_communication=self.last_communication,
            details={"simulated": True}
        )
    
    async def emit_cfe(self, cfe: CFe) -> SATResponse:
        """Emite um CF-e simulado."""
        # Verificar se está inicializado
        if not self.initialized:
            return SATResponse(
                success=False,
                message="Driver SAT não inicializado",
                details={"simulated": True}
            )
        
        # Simular delay
        await asyncio.sleep(random.uniform(self.delay_min, self.delay_max))
        
        # Atualizar timestamp
        self.last_communication = datetime.now()
        
        # Chance de erro simulado
        if random.random() < self.error_probability:
            error_message = random.choice([
                "Erro de comunicação simulado",
                "Timeout simulado",
                "Erro de validação simulado",
                "SAT ocupado (simulado)"
            ])
            logging.warning(f"Simulação: {error_message}")
            return SATResponse(
                success=False,
                message=error_message,
                details={"simulated": True}
            )
        
        # Simular emissão bem-sucedida
        cfe_copy = cfe.copy()
        cfe_copy.status = "emitido"
        cfe_copy.chave_acesso = f"CFe{random.randint(10000000000000, 99999999999999)}"
        cfe_copy.numero_serie = f"900{random.randint(100000, 999999)}"
        cfe_copy.data_emissao = datetime.now()
        cfe_copy.qrcode = f"https://satsp.fazenda.sp.gov.br/NFCE/consulta?p={cfe_copy.chave_acesso}"
        cfe_copy.numero_extrato = f"{random.randint(1, 9999):04d}"
        
        # Simular XML
        cfe_copy.xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<CFe>
  <infCFe versaoDadosEnt="0.07">
    <ide>
      <CNPJ>{cfe_copy.cnpj_emitente}</CNPJ>
      <signAC>{self.config.signature_ac}</signAC>
      <numeroCaixa>001</numeroCaixa>
    </ide>
    <emit>
      <CNPJ>{cfe_copy.cnpj_emitente}</CNPJ>
      <IE>{cfe_copy.ie_emitente}</IE>
      <indRatISSQN>N</indRatISSQN>
    </emit>
    <dest>
      <CPF>{cfe_copy.cpf_destinatario or ''}</CPF>
      <CNPJ>{cfe_copy.cnpj_destinatario or ''}</CNPJ>
    </dest>
    <!-- Itens omitidos para brevidade -->
    <total>
      <vCFe>{cfe_copy.valor_total:.2f}</vCFe>
    </total>
  </infCFe>
</CFe>"""
        
        # Armazenar CF-e emitido
        self.emitted_cfes.append(cfe_copy)
        
        logging.info(f"Simulação: CF-e emitido com sucesso. Chave: {cfe_copy.chave_acesso}")
        
        return SATResponse(
            success=True,
            message="CF-e emitido com sucesso (simulado)",
            cfe=cfe_copy,
            details={
                "simulated": True,
                "chave_acesso": cfe_copy.chave_acesso,
                "numero_serie": cfe_copy.numero_serie
            }
        )
    
    async def cancel_cfe(self, cfe: CFe, reason: str) -> SATResponse:
        """Cancela um CF-e simulado."""
        # Verificar se está inicializado
        if not self.initialized:
            return SATResponse(
                success=False,
                message="Driver SAT não inicializado",
                details={"simulated": True}
            )
        
        # Simular delay
        await asyncio.sleep(random.uniform(self.delay_min, self.delay_max))
        
        # Atualizar timestamp
        self.last_communication = datetime.now()
        
        # Verificar se o CF-e existe
        cfe_found = None
        for emitted_cfe in self.emitted_cfes:
            if emitted_cfe.id == cfe.id:
                cfe_found = emitted_cfe
                break
        
        if not cfe_found:
            return SATResponse(
                success=False,
                message=f"CF-e {cfe.id} não encontrado (simulado)",
                details={"simulated": True}
            )
        
        # Verificar se já foi cancelado
        for canceled_cfe in self.canceled_cfes:
            if canceled_cfe.id == cfe.id:
                return SATResponse(
                    success=False,
                    message=f"CF-e {cfe.id} já cancelado (simulado)",
                    details={"simulated": True}
                )
        
        # Chance de erro simulado
        if random.random() < self.error_probability:
            error_message = random.choice([
                "Erro de comunicação simulado",
                "Timeout simulado",
                "Prazo para cancelamento expirado (simulado)",
                "SAT ocupado (simulado)"
            ])
            logging.warning(f"Simulação: {error_message}")
            return SATResponse(
                success=False,
                message=error_message,
                details={"simulated": True}
            )
        
        # Simular cancelamento bem-sucedido
        cfe_copy = cfe_found.copy()
        cfe_copy.status = "cancelado"
        
        # Armazenar CF-e cancelado
        self.canceled_cfes.append(cfe_copy)
        
        logging.info(f"Simulação: CF-e cancelado com sucesso. ID: {cfe_copy.id}")
        
        return SATResponse(
            success=True,
            message=f"CF-e cancelado com sucesso (simulado). Motivo: {reason}",
            cfe=cfe_copy,
            details={
                "simulated": True,
                "reason": reason
            }
        )
    
    async def test_connection(self) -> bool:
        """Testa a conexão simulada com o SAT."""
        # Simular delay
        await asyncio.sleep(random.uniform(self.delay_min, self.delay_max))
        
        # Atualizar timestamp
        self.last_communication = datetime.now()
        
        # Chance de falha na conexão
        if random.random() < self.error_probability:
            self.status = SATStatus.ERROR
            self.last_error = "Erro simulado na conexão"
            logging.warning(f"Simulação: {self.last_error}")
            return False
        
        self.status = SATStatus.READY
        logging.info("Simulação: Conexão SAT testada com sucesso")
        return True
    
    async def shutdown(self) -> bool:
        """Finaliza a conexão simulada com o SAT."""
        # Simular delay
        await asyncio.sleep(random.uniform(self.delay_min, self.delay_max))
        
        # Atualizar status
        self.status = SATStatus.OFFLINE
        self.initialized = False
        
        logging.info("Simulação: SAT finalizado com sucesso")
        return True

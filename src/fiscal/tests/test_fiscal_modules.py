"""
Módulo de testes para validação dos módulos fiscais avançados
"""

import unittest
import os
import sys
from datetime import datetime
from unittest.mock import MagicMock, patch

# Adiciona o diretório raiz ao path para importação dos módulos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.fiscal.models.nfce_models import NFCeDocument, NFCeStatus
from src.fiscal.models.cfe_models import CFeDocument, CFeStatus
from src.fiscal.models.mfe_models import MFEEquipment, MFEStatus
from src.fiscal.models.accounting_models import AccountingExportStatus

from src.fiscal.services.nfce_service import NFCeService
from src.fiscal.services.cfe_service import CFeService
from src.fiscal.services.mfe_service import MFEService
from src.fiscal.services.accounting_service import AccountingService


class TestFiscalModules(unittest.TestCase):
    """Testes para os módulos fiscais avançados"""

    def setUp(self):
        """Configuração inicial para os testes"""
        # Mock para o serviço de banco de dados
        self.db_service = MagicMock()
        
        # Mock para o serviço de certificados
        self.certificate_service = MagicMock()
        
        # Mock para o serviço SAT
        self.sat_service = MagicMock()
        
        # Mock para o serviço de configuração
        self.config_service = MagicMock()
        
        # Inicializa os serviços com os mocks
        self.nfce_service = NFCeService(self.db_service, self.certificate_service, self.config_service)
        self.cfe_service = CFeService(self.db_service, self.sat_service, self.config_service)
        self.mfe_service = MFEService(self.db_service, self.config_service)
        self.accounting_service = AccountingService(self.db_service, self.nfce_service, self.cfe_service, self.config_service)
        
        # Dados de exemplo para testes
        self.sample_nfce_data = {
            "number": "123456",
            "series": "001",
            "issue_date": datetime.now(),
            "items": [
                {
                    "product_code": "001",
                    "product_description": "Produto Teste",
                    "quantity": 1,
                    "unit_price": 10.0,
                    "total_price": 10.0
                }
            ],
            "payments": [
                {
                    "type": "CREDIT_CARD",
                    "value": 10.0
                }
            ],
            "issuer": {
                "name": "Empresa Teste",
                "cnpj": "12345678901234"
            },
            "total_value": 10.0,
            "total_taxes": 1.0,
            "state_code": "SP"
        }
        
        self.sample_cfe_data = {
            "number": "123456",
            "issue_date": datetime.now(),
            "items": [
                {
                    "product_code": "001",
                    "product_description": "Produto Teste",
                    "quantity": 1,
                    "unit_price": 10.0,
                    "total_price": 10.0
                }
            ],
            "payments": [
                {
                    "type": "CREDIT_CARD",
                    "value": 10.0
                }
            ],
            "issuer": {
                "name": "Empresa Teste",
                "cnpj": "12345678901234"
            },
            "total_value": 10.0,
            "total_taxes": 1.0,
            "state_code": "SP"
        }
        
        self.sample_mfe_data = {
            "serial_number": "MFE12345",
            "model": "Modelo Teste",
            "manufacturer": "Fabricante Teste",
            "firmware_version": "1.0.0",
            "state_code": "SP",
            "store_id": "STORE001"
        }
        
        self.sample_accounting_provider_data = {
            "name": "Contabilizei",
            "provider_type": "ACCOUNTING_SYSTEM",
            "api_url": "https://api.contabilizei.com/v1",
            "auth_method": "API_KEY",
            "export_format": "json",
            "api_key": "test_key"
        }

    def test_nfce_creation(self):
        """Testa a criação de uma NFC-e"""
        # Configura o mock para retornar um ID
        self.db_service.insert_one.return_value = "123"
        
        # Executa o método
        nfce = self.nfce_service.create_nfce(self.sample_nfce_data)
        
        # Verifica se o método insert_one foi chamado
        self.db_service.insert_one.assert_called_once()
        
        # Verifica se o objeto retornado é do tipo correto
        self.assertIsInstance(nfce, NFCeDocument)
        
        # Verifica se o status inicial é DRAFT
        self.assertEqual(nfce.status, NFCeStatus.DRAFT)

    def test_cfe_creation(self):
        """Testa a criação de um CF-e"""
        # Configura o mock para retornar um ID
        self.db_service.insert_one.return_value = "123"
        
        # Executa o método
        cfe = self.cfe_service.create_cfe(self.sample_cfe_data)
        
        # Verifica se o método insert_one foi chamado
        self.db_service.insert_one.assert_called_once()
        
        # Verifica se o objeto retornado é do tipo correto
        self.assertIsInstance(cfe, CFeDocument)
        
        # Verifica se o status inicial é DRAFT
        self.assertEqual(cfe.status, CFeStatus.DRAFT)

    def test_mfe_equipment_registration(self):
        """Testa o registro de um equipamento MFE"""
        # Configura o mock para retornar um ID
        self.db_service.insert_one.return_value = "123"
        
        # Executa o método
        equipment = self.mfe_service.register_equipment(self.sample_mfe_data)
        
        # Verifica se o método insert_one foi chamado
        self.db_service.insert_one.assert_called_once()
        
        # Verifica se o objeto retornado é do tipo correto
        self.assertIsInstance(equipment, MFEEquipment)
        
        # Verifica se o status inicial é INACTIVE
        self.assertEqual(equipment.status, MFEStatus.INACTIVE)

    def test_accounting_provider_registration(self):
        """Testa o registro de um provedor de serviços contábeis"""
        # Configura o mock para retornar None (provedor não existe)
        self.db_service.find_one.return_value = None
        
        # Executa o método
        provider = self.accounting_service.register_provider(self.sample_accounting_provider_data)
        
        # Verifica se o método insert_one foi chamado
        self.db_service.insert_one.assert_called_once()
        
        # Verifica se o objeto retornado tem o nome correto
        self.assertEqual(provider.name, "Contabilizei")

    def test_nfce_update(self):
        """Testa a atualização de uma NFC-e"""
        # Configura o mock para retornar um documento existente
        existing_nfce = {
            "id": "123",
            "number": "123456",
            "series": "001",
            "status": NFCeStatus.DRAFT,
            "issue_date": datetime.now(),
            "items": [],
            "payments": [],
            "issuer": {
                "name": "Empresa Teste",
                "cnpj": "12345678901234"
            },
            "total_value": 0.0,
            "total_taxes": 0.0,
            "state_code": "SP",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        self.db_service.find_one.return_value = existing_nfce
        
        # Dados para atualização
        update_data = {
            "total_value": 20.0,
            "total_taxes": 2.0
        }
        
        # Executa o método
        updated_nfce = self.nfce_service.update_nfce("123", update_data)
        
        # Verifica se o método update_one foi chamado
        self.db_service.update_one.assert_called_once()
        
        # Verifica se o objeto retornado tem os valores atualizados
        self.assertEqual(updated_nfce.total_value, 20.0)
        self.assertEqual(updated_nfce.total_taxes, 2.0)

    def test_cfe_update(self):
        """Testa a atualização de um CF-e"""
        # Configura o mock para retornar um documento existente
        existing_cfe = {
            "id": "123",
            "number": "123456",
            "status": CFeStatus.DRAFT,
            "issue_date": datetime.now(),
            "items": [],
            "payments": [],
            "issuer": {
                "name": "Empresa Teste",
                "cnpj": "12345678901234"
            },
            "total_value": 0.0,
            "total_taxes": 0.0,
            "state_code": "SP",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        self.db_service.find_one.return_value = existing_cfe
        
        # Dados para atualização
        update_data = {
            "total_value": 20.0,
            "total_taxes": 2.0
        }
        
        # Executa o método
        updated_cfe = self.cfe_service.update_cfe("123", update_data)
        
        # Verifica se o método update_one foi chamado
        self.db_service.update_one.assert_called_once()
        
        # Verifica se o objeto retornado tem os valores atualizados
        self.assertEqual(updated_cfe.total_value, 20.0)
        self.assertEqual(updated_cfe.total_taxes, 2.0)

    def test_mfe_equipment_update(self):
        """Testa a atualização de um equipamento MFE"""
        # Configura o mock para retornar um equipamento existente
        existing_equipment = {
            "id": "123",
            "serial_number": "MFE12345",
            "model": "Modelo Teste",
            "manufacturer": "Fabricante Teste",
            "firmware_version": "1.0.0",
            "state_code": "SP",
            "store_id": "STORE001",
            "status": MFEStatus.INACTIVE,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        self.db_service.find_one.return_value = existing_equipment
        
        # Dados para atualização
        update_data = {
            "firmware_version": "2.0.0"
        }
        
        # Executa o método
        updated_equipment = self.mfe_service.update_equipment("123", update_data)
        
        # Verifica se o método update_one foi chamado
        self.db_service.update_one.assert_called_once()
        
        # Verifica se o objeto retornado tem os valores atualizados
        self.assertEqual(updated_equipment.firmware_version, "2.0.0")

    def test_accounting_export_batch_creation(self):
        """Testa a criação de um lote de exportação contábil"""
        # Configura o mock para retornar um provedor existente
        self.db_service.find_one.return_value = self.sample_accounting_provider_data
        
        # Executa o método
        batch = self.accounting_service.create_export_batch(
            reference_period="2025-05",
            export_destination="provider_id",
            created_by="test_user",
            notes="Teste de exportação"
        )
        
        # Verifica se o método insert_one foi chamado
        self.db_service.insert_one.assert_called_once()
        
        # Verifica se o objeto retornado tem o status correto
        self.assertEqual(batch.status, AccountingExportStatus.PENDING)
        
        # Verifica se o período de referência está correto
        self.assertEqual(batch.reference_period, "2025-05")

    def test_nfce_send(self):
        """Testa o envio de uma NFC-e para a SEFAZ"""
        # Configura o mock para retornar um documento existente
        existing_nfce = {
            "id": "123",
            "number": "123456",
            "series": "001",
            "status": NFCeStatus.DRAFT,
            "issue_date": datetime.now(),
            "items": [
                {
                    "product_code": "001",
                    "product_description": "Produto Teste",
                    "quantity": 1,
                    "unit_price": 10.0,
                    "total_price": 10.0
                }
            ],
            "payments": [
                {
                    "type": "CREDIT_CARD",
                    "value": 10.0
                }
            ],
            "issuer": {
                "name": "Empresa Teste",
                "cnpj": "12345678901234"
            },
            "total_value": 10.0,
            "total_taxes": 1.0,
            "state_code": "SP",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        self.db_service.find_one.return_value = existing_nfce
        
        # Mock para o método _send_to_sefaz
        with patch.object(self.nfce_service, '_send_to_sefaz') as mock_send:
            # Configura o mock para retornar sucesso
            mock_send.return_value = (True, "Documento enviado com sucesso", {
                "authorization_date": datetime.now(),
                "authorization_protocol": "123456789",
                "access_key": "12345678901234567890123456789012345678901234"
            })
            
            # Executa o método
            success, message, response = self.nfce_service.send_nfce("123")
            
            # Verifica se o método _send_to_sefaz foi chamado
            mock_send.assert_called_once()
            
            # Verifica se o resultado é sucesso
            self.assertTrue(success)
            
            # Verifica se o método update_one foi chamado (para atualizar o status)
            self.db_service.update_one.assert_called()

    def test_cfe_send(self):
        """Testa o envio de um CF-e para o SAT/MFE"""
        # Configura o mock para retornar um documento existente
        existing_cfe = {
            "id": "123",
            "number": "123456",
            "status": CFeStatus.DRAFT,
            "issue_date": datetime.now(),
            "items": [
                {
                    "product_code": "001",
                    "product_description": "Produto Teste",
                    "quantity": 1,
                    "unit_price": 10.0,
                    "total_price": 10.0
                }
            ],
            "payments": [
                {
                    "type": "CREDIT_CARD",
                    "value": 10.0
                }
            ],
            "issuer": {
                "name": "Empresa Teste",
                "cnpj": "12345678901234"
            },
            "total_value": 10.0,
            "total_taxes": 1.0,
            "state_code": "SP",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        self.db_service.find_one.return_value = existing_cfe
        
        # Mock para o método _send_to_sat
        with patch.object(self.cfe_service, '_send_to_sat') as mock_send:
            # Configura o mock para retornar sucesso
            mock_send.return_value = (True, "Documento enviado com sucesso", {
                "authorization_date": datetime.now(),
                "authorization_protocol": "123456789",
                "access_key": "12345678901234567890123456789012345678901234",
                "sat_serial_number": "SAT123456"
            })
            
            # Executa o método
            success, message, response = self.cfe_service.send_cfe("123")
            
            # Verifica se o método _send_to_sat foi chamado
            mock_send.assert_called_once()
            
            # Verifica se o resultado é sucesso
            self.assertTrue(success)
            
            # Verifica se o método update_one foi chamado (para atualizar o status)
            self.db_service.update_one.assert_called()

    def test_mfe_activation(self):
        """Testa a ativação de um equipamento MFE"""
        # Configura o mock para retornar um equipamento existente
        existing_equipment = {
            "id": "123",
            "serial_number": "MFE12345",
            "model": "Modelo Teste",
            "manufacturer": "Fabricante Teste",
            "firmware_version": "1.0.0",
            "state_code": "SP",
            "store_id": "STORE001",
            "status": MFEStatus.INACTIVE,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        self.db_service.find_one.return_value = existing_equipment
        
        # Mock para o método _activate_mfe
        with patch.object(self.mfe_service, '_activate_mfe') as mock_activate:
            # Configura o mock para retornar sucesso
            mock_activate.return_value = (True, "Equipamento ativado com sucesso")
            
            # Executa o método
            success, message = self.mfe_service.activate_equipment("123", "ACTIVATION_CODE")
            
            # Verifica se o método _activate_mfe foi chamado
            mock_activate.assert_called_once()
            
            # Verifica se o resultado é sucesso
            self.assertTrue(success)
            
            # Verifica se o método update_one foi chamado (para atualizar o status)
            self.db_service.update_one.assert_called()

    def test_accounting_export_batch_processing(self):
        """Testa o processamento de um lote de exportação contábil"""
        # Configura o mock para retornar um lote existente
        existing_batch = {
            "id": "123",
            "reference_period": "2025-05",
            "status": AccountingExportStatus.PENDING,
            "start_date": datetime.now(),
            "document_count": 0,
            "total_value": 0.0,
            "export_destination": "provider_id",
            "created_by": "test_user",
            "notes": "Teste de exportação",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        # Configura o mock para retornar um provedor existente
        existing_provider = {
            "id": "provider_id",
            "name": "Contabilizei",
            "provider_type": "ACCOUNTING_SYSTEM",
            "api_url": "https://api.contabilizei.com/v1",
            "auth_method": "API_KEY",
            "export_format": "json",
            "api_key": "test_key",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        # Configura o mock para retornar documentos fiscais
        nfce_documents = [
            NFCeDocument(
                id="nfce_id",
                number="123456",
                series="001",
                status=NFCeStatus.AUTHORIZED,
                issue_date=datetime.now(),
                items=[],
                payments=[],
                issuer={
                    "name": "Empresa Teste",
                    "cnpj": "12345678901234"
                },
                total_value=10.0,
                total_taxes=1.0,
                state_code="SP",
                response={
                    "authorization_date": datetime.now(),
                    "authorization_protocol": "123456789",
                    "access_key": "12345678901234567890123456789012345678901234"
                },
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        ]
        
        cfe_documents = [
            CFeDocument(
                id="cfe_id",
                number="123456",
                status=CFeStatus.AUTHORIZED,
                issue_date=datetime.now(),
                items=[],
                payments=[],
                issuer={
                    "name": "Empresa Teste",
                    "cnpj": "12345678901234"
                },
                total_value=10.0,
                total_taxes=1.0,
                state_code="SP",
                response={
                    "authorization_date": datetime.now(),
                    "authorization_protocol": "123456789",
                    "access_key": "12345678901234567890123456789012345678901234",
                    "sat_serial_number": "SAT123456"
                },
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        ]
        
        # Configura os mocks
        self.db_service.find_one.side_effect = [existing_batch, existing_provider]
        
        # Mock para os métodos de obtenção de documentos fiscais
        with patch.object(self.nfce_service, 'get_nfce_for_accounting') as mock_get_nfce, \
             patch.object(self.cfe_service, 'get_cfe_for_accounting') as mock_get_cfe, \
             patch.object(self.accounting_service, '_generate_export_file') as mock_generate_file, \
             patch.object(self.nfce_service, 'mark_as_exported') as mock_mark_nfce, \
             patch.object(self.cfe_service, 'mark_as_exported') as mock_mark_cfe:
            
            # Configura os mocks para retornar documentos
            mock_get_nfce.return_value = nfce_documents
            mock_get_cfe.return_value = cfe_documents
            
            # Configura o mock para retornar um caminho de arquivo
            mock_generate_file.return_value = "/tmp/export_file.json"
            
            # Executa o método
            success, message, file_path = self.accounting_service.process_export_batch("123")
            
            # Verifica se os métodos foram chamados
            mock_get_nfce.assert_called_once()
            mock_get_cfe.assert_called_once()
            mock_generate_file.assert_called_once()
            mock_mark_nfce.assert_called_once()
            mock_mark_cfe.assert_called_once()
            
            # Verifica se o resultado é sucesso
            self.assertTrue(success)
            
            # Verifica se o caminho do arquivo foi retornado
            self.assertEqual(file_path, "/tmp/export_file.json")


if __name__ == '__main__':
    unittest.main()

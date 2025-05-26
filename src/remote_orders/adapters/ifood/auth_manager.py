"""
Módulo de autenticação e gerenciamento de tokens para a API do iFood.

Este módulo implementa a autenticação OAuth2 com a API do iFood,
gerenciamento de tokens de acesso e renovação automática.
"""

import os
import json
import time
import logging
import requests
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class IFoodAuthManager:
    """Gerenciador de autenticação e tokens para a API do iFood."""
    
    def __init__(self, 
                 client_id: str = None, 
                 client_secret: str = None,
                 merchant_id: str = None):
        """
        Inicializa o gerenciador de autenticação do iFood.
        
        Args:
            client_id: ID do cliente na API do iFood (opcional, padrão do ambiente)
            client_secret: Segredo do cliente na API do iFood (opcional, padrão do ambiente)
            merchant_id: ID do estabelecimento no iFood (opcional, padrão do ambiente)
        """
        # Configurações da API
        self.client_id = client_id or os.environ.get('IFOOD_CLIENT_ID')
        self.client_secret = client_secret or os.environ.get('IFOOD_CLIENT_SECRET')
        self.merchant_id = merchant_id or os.environ.get('IFOOD_MERCHANT_ID')
        
        # URL base da API
        self.base_url = "https://merchant-api.ifood.com.br"
        self.auth_url = f"{self.base_url}/oauth/token"
        
        # Armazenamento de token
        self.access_token = None
        self.refresh_token = None
        self.token_expiry = None
        
        # Validar configurações
        if not self.client_id or not self.client_secret:
            logger.warning("Credenciais do iFood não configuradas. A integração não funcionará corretamente.")
        
        logger.info("Gerenciador de autenticação do iFood inicializado")
    
    async def authenticate(self) -> Dict[str, Any]:
        """
        Autentica com a API do iFood e obtém token de acesso.
        
        Returns:
            Dict[str, Any]: Resultado da autenticação
        """
        if not self.client_id or not self.client_secret:
            logger.error("Credenciais do iFood não configuradas")
            return {"success": False, "error": "Credenciais do iFood não configuradas"}
        
        try:
            # Preparar dados para autenticação
            auth_data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "client_credentials"
            }
            
            headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            }
            
            # Fazer requisição de autenticação
            response = requests.post(
                self.auth_url,
                data=auth_data,
                headers=headers
            )
            
            # Verificar resposta
            response.raise_for_status()
            token_data = response.json()
            
            # Armazenar token
            self.access_token = token_data.get("access_token")
            self.refresh_token = token_data.get("refresh_token")
            
            # Calcular expiração (padrão: 1 hora)
            expires_in = token_data.get("expires_in", 3600)
            self.token_expiry = datetime.now() + timedelta(seconds=expires_in)
            
            logger.info(f"Autenticação com iFood bem-sucedida, token válido até {self.token_expiry}")
            return {
                "success": True,
                "access_token": self.access_token,
                "refresh_token": self.refresh_token,
                "expires_in": expires_in,
                "token_expiry": self.token_expiry.isoformat()
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro na autenticação com iFood: {str(e)}")
            error_response = None
            try:
                error_response = e.response.json() if hasattr(e, 'response') else None
            except:
                pass
                
            return {
                "success": False,
                "error": str(e),
                "error_response": error_response
            }
    
    async def refresh_access_token(self) -> Dict[str, Any]:
        """
        Renova o token de acesso usando o refresh token.
        
        Returns:
            Dict[str, Any]: Resultado da renovação
        """
        if not self.refresh_token:
            logger.error("Refresh token não disponível, é necessário autenticar novamente")
            return await self.authenticate()
        
        try:
            # Preparar dados para renovação
            refresh_data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "refresh_token",
                "refresh_token": self.refresh_token
            }
            
            headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            }
            
            # Fazer requisição de renovação
            response = requests.post(
                self.auth_url,
                data=refresh_data,
                headers=headers
            )
            
            # Verificar resposta
            response.raise_for_status()
            token_data = response.json()
            
            # Atualizar token
            self.access_token = token_data.get("access_token")
            self.refresh_token = token_data.get("refresh_token")
            
            # Calcular expiração (padrão: 1 hora)
            expires_in = token_data.get("expires_in", 3600)
            self.token_expiry = datetime.now() + timedelta(seconds=expires_in)
            
            logger.info(f"Token do iFood renovado com sucesso, válido até {self.token_expiry}")
            return {
                "success": True,
                "access_token": self.access_token,
                "refresh_token": self.refresh_token,
                "expires_in": expires_in,
                "token_expiry": self.token_expiry.isoformat()
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro na renovação do token do iFood: {str(e)}")
            # Se falhar a renovação, tentar autenticação completa
            logger.info("Tentando autenticação completa após falha na renovação")
            return await self.authenticate()
    
    async def get_valid_token(self) -> str:
        """
        Obtém um token de acesso válido, renovando se necessário.
        
        Returns:
            str: Token de acesso válido
        """
        # Verificar se o token atual é válido
        if self.access_token and self.token_expiry:
            # Adicionar margem de segurança (5 minutos)
            if datetime.now() < (self.token_expiry - timedelta(minutes=5)):
                return self.access_token
        
        # Se não tiver token ou estiver próximo da expiração, renovar
        if self.refresh_token:
            result = await self.refresh_access_token()
        else:
            result = await self.authenticate()
        
        if result.get("success"):
            return self.access_token
        else:
            logger.error("Não foi possível obter um token válido")
            return None
    
    async def get_auth_headers(self) -> Dict[str, str]:
        """
        Obtém cabeçalhos de autenticação para requisições à API.
        
        Returns:
            Dict[str, str]: Cabeçalhos de autenticação
        """
        token = await self.get_valid_token()
        
        if not token:
            logger.error("Token não disponível para cabeçalhos de autenticação")
            return {}
        
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

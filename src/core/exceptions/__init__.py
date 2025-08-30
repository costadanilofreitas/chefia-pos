"""
Core exceptions for the POS system
"""

from src.core.exceptions.base_exceptions import (
    AuthorizationException,
    BusinessRuleException,
    CoreException,
    DatabaseException,
    ExternalServiceException,
    ResourceNotFoundException,
    ValidationException,
)

# Alias for compatibility
BusinessException = BusinessRuleException
ConflictException = CoreException
ServiceException = ExternalServiceException

__all__ = [
    'CoreException',
    'ValidationException',
    'ResourceNotFoundException',
    'AuthorizationException',
    'ExternalServiceException',
    'DatabaseException',
    'BusinessRuleException',
    'BusinessException',
    'ConflictException',
    'ServiceException'
]

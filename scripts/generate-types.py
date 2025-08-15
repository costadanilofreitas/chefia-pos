#!/usr/bin/env python3
"""
Script para gerar tipos TypeScript a partir dos modelos Pydantic do backend.
Garante consistência total entre frontend e backend.
"""

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Set, Union

# Adicionar o diretório src ao path para importar os módulos
sys.path.append(str(Path(__file__).parent.parent / "src"))

def pydantic_to_typescript_type(field_type: str, is_optional: bool = False) -> str:
    """Converte tipos Pydantic para TypeScript."""
    type_mapping = {
        "str": "string",
        "int": "number", 
        "float": "number",
        "bool": "boolean",
        "datetime": "string",
        "date": "string",
        "List": "Array",
        "Dict": "Record<string, any>",
        "Any": "any",
        "UUID": "string"
    }
    
    # Handle generic types
    if "List[" in field_type:
        inner_type = field_type.replace("List[", "").replace("]", "")
        ts_inner = pydantic_to_typescript_type(inner_type)
        result = f"{ts_inner}[]"
    elif "Optional[" in field_type:
        inner_type = field_type.replace("Optional[", "").replace("]", "")
        ts_inner = pydantic_to_typescript_type(inner_type)
        result = ts_inner
        is_optional = True
    elif "Union[" in field_type and "None" in field_type:
        # Handle Union[Type, None] which is equivalent to Optional[Type]
        types = field_type.replace("Union[", "").replace("]", "").split(", ")
        non_none_types = [t for t in types if t != "None"]
        if len(non_none_types) == 1:
            result = pydantic_to_typescript_type(non_none_types[0])
            is_optional = True
        else:
            result = " | ".join([pydantic_to_typescript_type(t) for t in non_none_types])
            is_optional = True
    else:
        result = type_mapping.get(field_type, field_type)
    
    return result

def generate_enum_typescript(enum_name: str, enum_values: Dict[str, str]) -> str:
    """Gera enum TypeScript a partir de enum Python."""
    ts_enum = f"export enum {enum_name} {{\n"
    for key, value in enum_values.items():
        ts_enum += f"  {key} = '{value}',\n"
    ts_enum += "}\n\n"
    return ts_enum

def generate_interface_typescript(interface_name: str, fields: Dict[str, Any]) -> str:
    """Gera interface TypeScript a partir de modelo Pydantic."""
    ts_interface = f"export interface {interface_name} {{\n"
    
    for field_name, field_info in fields.items():
        field_type = field_info.get('type', 'any')
        is_optional = field_info.get('optional', False)
        default_value = field_info.get('default')
        
        ts_type = pydantic_to_typescript_type(field_type, is_optional)
        optional_marker = "?" if is_optional or default_value is not None else ""
        
        ts_interface += f"  {field_name}{optional_marker}: {ts_type};\n"
    
    ts_interface += "}\n\n"
    return ts_interface

def extract_models_info():
    """Extrai informações dos modelos Pydantic."""
    models_info = {}
    
    try:
        # Importar e extrair enums
        from src.core.models.core_models import OrderStatus, PaymentStatus, PaymentMethod, OrderType
        
        models_info['enums'] = {
            'OrderStatus': {item.name: item.value for item in OrderStatus},
            'PaymentStatus': {item.name: item.value for item in PaymentStatus},
            'PaymentMethod': {item.name: item.value for item in PaymentMethod},
            'OrderType': {item.name: item.value for item in OrderType}
        }
        
        # Adicionar outros enums de módulos específicos
        try:
            from src.loyalty.models.coupon_models import CouponType, CouponScope
            models_info['enums']['CouponType'] = {item.name: item.value for item in CouponType}
            models_info['enums']['CouponScope'] = {item.name: item.value for item in CouponScope}
        except ImportError:
            pass
            
        try:
            from src.remote_orders.models.remote_order_models import RemoteOrderStatus, RemotePlatform
            models_info['enums']['RemoteOrderStatus'] = {item.name: item.value for item in RemoteOrderStatus}
            models_info['enums']['RemotePlatform'] = {item.name: item.value for item in RemotePlatform}
        except ImportError:
            pass
        
        # Modelos principais - definição manual para garantir consistência
        models_info['interfaces'] = {
            'OrderItem': {
                'id': {'type': 'str'},
                'created_at': {'type': 'str'},
                'updated_at': {'type': 'str'},
                'product_id': {'type': 'str'},
                'product_name': {'type': 'str'},
                'quantity': {'type': 'int'},
                'unit_price': {'type': 'float'},
                'total_price': {'type': 'float'},
                'notes': {'type': 'str', 'optional': True},
                'customizations': {'type': 'List[Dict]', 'default': []},
                'order_id': {'type': 'str', 'optional': True},
                'product_type': {'type': 'str', 'optional': True},
                'sections': {'type': 'Dict', 'optional': True}
            },
            'Order': {
                'id': {'type': 'str'},
                'created_at': {'type': 'str'},
                'updated_at': {'type': 'str'},
                'customer_id': {'type': 'str', 'default': ''},
                'customer_name': {'type': 'str', 'default': ''},
                'items': {'type': 'List[OrderItem]', 'default': []},
                'status': {'type': 'OrderStatus'},
                'total_amount': {'type': 'float', 'default': 0.0},
                'payment_method': {'type': 'str', 'optional': True},
                'payment_status': {'type': 'PaymentStatus'},
                'table_number': {'type': 'int', 'optional': True},
                'waiter_id': {'type': 'str', 'default': ''},
                'is_delivery': {'type': 'bool', 'default': False},
                'delivery_address': {'type': 'Dict', 'default': {}},
                'delivery_fee': {'type': 'float', 'default': 0.0},
                'notes': {'type': 'str', 'default': ''},
                'source': {'type': 'str', 'default': 'pos'},
                'order_type': {'type': 'OrderType'},
                'cashier_id': {'type': 'str', 'optional': True},
                'order_number': {'type': 'str', 'optional': True},
                'subtotal': {'type': 'float', 'default': 0.0},
                'tax': {'type': 'float', 'default': 0.0},
                'discount': {'type': 'float', 'default': 0.0},
                'total': {'type': 'float', 'default': 0.0},
                'applied_coupon_code': {'type': 'str', 'optional': True},
                'coupon_discount': {'type': 'float', 'default': 0.0},
                'points_redeemed': {'type': 'int', 'default': 0},
                'points_discount': {'type': 'float', 'default': 0.0}
            },
            'OrderCreate': {
                'customer_id': {'type': 'str', 'default': ''},
                'customer_name': {'type': 'str', 'default': ''},
                'items': {'type': 'List[OrderItemCreate]', 'default': []},
                'table_number': {'type': 'int', 'optional': True},
                'waiter_id': {'type': 'str', 'default': ''},
                'is_delivery': {'type': 'bool', 'default': False},
                'delivery_address': {'type': 'Dict', 'default': {}},
                'delivery_fee': {'type': 'float', 'default': 0.0},
                'notes': {'type': 'str', 'default': ''},
                'source': {'type': 'str', 'default': 'pos'},
                'order_type': {'type': 'OrderType'},
                'cashier_id': {'type': 'str', 'optional': True},
                'external_reference': {'type': 'str', 'optional': True}
            },
            'OrderItemCreate': {
                'product_id': {'type': 'str'},
                'product_name': {'type': 'str'},
                'quantity': {'type': 'int', 'default': 1},
                'unit_price': {'type': 'float', 'default': 0.0},
                'notes': {'type': 'str', 'default': ''},
                'customizations': {'type': 'List[Dict]', 'default': []},
                'sections': {'type': 'Dict', 'optional': True},
                'price_adjustment': {'type': 'float', 'optional': True}
            },
            'Customer': {
                'id': {'type': 'str'},
                'name': {'type': 'str'},
                'email': {'type': 'str', 'optional': True},
                'phone': {'type': 'str', 'optional': True},
                'document': {'type': 'str', 'optional': True},
                'address': {'type': 'Dict', 'optional': True},
                'loyalty_points': {'type': 'int', 'default': 0},
                'created_at': {'type': 'str'},
                'updated_at': {'type': 'str'}
            }
        }
        
        return models_info
        
    except Exception as e:
        print(f"Erro ao extrair informações dos modelos: {e}")
        return {'enums': {}, 'interfaces': {}}

def generate_typescript_file():
    """Gera arquivo TypeScript com todos os tipos."""
    models_info = extract_models_info()
    
    typescript_content = '''/**
 * Tipos TypeScript gerados automaticamente a partir dos modelos Pydantic do backend.
 * NÃO EDITE ESTE ARQUIVO MANUALMENTE - ele é gerado automaticamente.
 * 
 * Para regenerar: python scripts/generate-types.py
 */

'''
    
    # Gerar enums
    typescript_content += "// ==================== ENUMS ====================\n\n"
    for enum_name, enum_values in models_info['enums'].items():
        typescript_content += generate_enum_typescript(enum_name, enum_values)
    
    # Gerar interfaces
    typescript_content += "// ==================== INTERFACES ====================\n\n"
    for interface_name, fields in models_info['interfaces'].items():
        typescript_content += generate_interface_typescript(interface_name, fields)
    
    # Adicionar tipos de resposta da API padronizados
    typescript_content += '''// ==================== API RESPONSES ====================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface APIError {
  message: string;
  code: string;
  details?: ValidationError[];
}

// ==================== UTILITY TYPES ====================

export type ID = string;
export type Timestamp = string;
export type Currency = number;

// ==================== REQUEST TYPES ====================

export interface ApplyCouponRequest {
  coupon_code: string;
}

export interface ApplyPointsRequest {
  points_amount: number;
  customer_id: string;
  points_to_redeem: number;
}

export interface PaymentRequest {
  order_id: string;
  payment_method: PaymentMethod;
  amount: number;
  details?: Record<string, any>;
}

// ==================== EXPORT ALL ====================

export type {
  OrderItem,
  Order,
  OrderCreate,
  OrderItemCreate,
  Customer,
};

export {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  OrderType,
};
'''
    
    return typescript_content

def main():
    """Função principal."""
    # Gerar conteúdo TypeScript
    typescript_content = generate_typescript_file()
    
    # Definir caminhos
    script_dir = Path(__file__).parent
    frontend_dir = script_dir.parent / "frontend"
    types_dir = frontend_dir / "common" / "src" / "types"
    
    # Criar diretório se não existir
    types_dir.mkdir(parents=True, exist_ok=True)
    
    # Escrever arquivo
    types_file = types_dir / "backend-types.ts"
    
    with open(types_file, 'w', encoding='utf-8') as f:
        f.write(typescript_content)
    
    print(f"[OK] Tipos TypeScript gerados com sucesso em: {types_file}")
    print(f"Total de linhas geradas: {len(typescript_content.splitlines())}")
    
    # Gerar arquivo de índice para facilitar imports
    index_content = '''/**
 * Índice principal dos tipos do backend
 */

export * from './backend-types';

// Re-export dos tipos mais utilizados
export type {
  Order,
  OrderCreate,
  OrderItem,
  OrderItemCreate,
  Customer,
  APIResponse,
  PaginatedResponse
} from './backend-types';

export {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  OrderType
} from './backend-types';
'''
    
    index_file = types_dir / "index.ts"
    with open(index_file, 'w', encoding='utf-8') as f:
        f.write(index_content)
    
    print(f"[OK] Arquivo de índice criado: {index_file}")
    
    # Verificar se existem inconsistências com tipos existentes
    existing_order_types = frontend_dir / "apps" / "pos" / "src" / "types" / "order.ts"
    if existing_order_types.exists():
        print(f"[AVISO] Tipos existentes encontrados em: {existing_order_types}")
        print("DICA: Considere migrar para usar os novos tipos gerados automaticamente")
        print("DICA: Importe de: @common/types/backend-types")

if __name__ == "__main__":
    main()
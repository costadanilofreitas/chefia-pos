# Design de Aprimoramento do Módulo de Previsão de Demanda e Otimização Operacional

## 1. Visão Geral

Este documento detalha o design para aprimorar o módulo de previsão de demanda existente no sistema POS Modern, expandindo suas capacidades para incluir otimização operacional em várias áreas críticas do negócio. O design mantém a arquitetura AWS existente e se integra perfeitamente aos componentes atuais.

## 2. Objetivos

- Aprimorar a previsão de demanda automática utilizando dados históricos, clima e eventos
- Implementar otimização operacional para:
  - Escala de funcionários
  - Gestão de estoque
  - Preparação antecipada
  - Operações de delivery
  - Distribuição de mesas
  - Retenção de clientes no totem de autoatendimento
  - Engajamento via bot no WhatsApp

## 3. Arquitetura

### 3.1 Visão Geral da Arquitetura

A arquitetura mantém o design existente baseado em AWS, expandindo-o para incluir novos componentes de otimização operacional:

```
┌─────────────────────────────────────────────────────────────────┐
│                      POS Modern - Módulo de IA                   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Camada de Coleta de Dados                    │
│                                                                 │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────────────┐  │
│  │ Vendas  │   │  Clima  │   │ Eventos │   │ Outros Sistemas │  │
│  └─────────┘   └─────────┘   └─────────┘   └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Camada de Processamento AWS                   │
│                                                                 │
│  ┌─────────────┐   ┌────────────┐   ┌────────────────────────┐  │
│  │    S3       │──▶│   Glue     │──▶│     Amazon Forecast    │  │
│  └─────────────┘   └────────────┘   └────────────────────────┘  │
│                                                │                │
│                                                ▼                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Amazon Personalize                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                │                │
│                                                ▼                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Amazon Bedrock                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Camada de Otimização Operacional               │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ Otimizador de │  │ Otimizador de │  │  Otimizador de    │   │
│  │  Funcionários │  │    Estoque    │  │     Delivery      │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ Otimizador de │  │ Otimizador de │  │  Otimizador de    │   │
│  │     Mesas     │  │    Totem      │  │     WhatsApp      │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Camada de Apresentação                    │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │  Dashboard de │  │  Alertas e    │  │  Recomendações    │   │
│  │   Previsão    │  │ Notificações  │  │   Operacionais    │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Componentes Principais

#### 3.2.1 Camada de Coleta de Dados
- **Adaptadores de Fonte de Dados**: Interfaces para coletar dados de diferentes fontes
- **Processadores de Dados**: Transformam dados brutos em formatos adequados para análise
- **Armazenamento de Dados**: Utiliza S3 para armazenar dados históricos e processados

#### 3.2.2 Camada de Processamento AWS
- **Amazon Forecast**: Para previsão de séries temporais (demanda, tráfego)
- **Amazon Personalize**: Para recomendações personalizadas
- **Amazon Bedrock (Claude)**: Para geração de conteúdo e análise de texto
- **AWS Glue**: Para ETL e preparação de dados

#### 3.2.3 Camada de Otimização Operacional
- **Otimizador de Funcionários**: Recomenda escalas de trabalho com base na demanda prevista
- **Otimizador de Estoque**: Sugere níveis de estoque e compras com base na demanda prevista
- **Otimizador de Delivery**: Otimiza rotas e alocação de entregadores
- **Otimizador de Mesas**: Sugere distribuição de mesas e reservas
- **Otimizador de Totem**: Maximiza conversão e retenção no autoatendimento
- **Otimizador de WhatsApp**: Gerencia campanhas e interações via bot

#### 3.2.4 Camada de Apresentação
- **Dashboard de Previsão**: Interface para visualizar previsões e métricas
- **Alertas e Notificações**: Sistema para notificar sobre eventos importantes
- **Recomendações Operacionais**: Interface para visualizar e aplicar recomendações

## 4. Modelos de Dados

### 4.1 Extensões aos Modelos Existentes

#### 4.1.1 StaffingRecommendation
```python
class StaffingRecommendation(BaseModel):
    """Modelo para recomendação de escala de funcionários."""
    recommendation_id: str
    restaurant_id: str
    created_at: datetime
    date: datetime
    shift: str  # morning, afternoon, evening, night
    role: str  # waiter, cook, cashier, etc.
    recommended_staff_count: int
    current_staff_count: Optional[int] = None
    confidence: float
    reason: str
    forecast_id: str
```

#### 4.1.2 DeliveryOptimization
```python
class DeliveryOptimization(BaseModel):
    """Modelo para otimização de delivery."""
    optimization_id: str
    restaurant_id: str
    created_at: datetime
    date: datetime
    time_window: str  # ex: "18:00-19:00"
    recommended_driver_count: int
    recommended_preparation_time: int  # em minutos
    expected_order_volume: int
    confidence: float
    reason: str
    forecast_id: str
```

#### 4.1.3 TableDistributionRecommendation
```python
class TableDistributionRecommendation(BaseModel):
    """Modelo para recomendação de distribuição de mesas."""
    recommendation_id: str
    restaurant_id: str
    created_at: datetime
    date: datetime
    time_window: str  # ex: "18:00-19:00"
    table_recommendations: List[Dict[str, Any]]  # configurações de mesas
    expected_customer_volume: int
    confidence: float
    reason: str
    forecast_id: str
```

#### 4.1.4 KioskOptimization
```python
class KioskOptimization(BaseModel):
    """Modelo para otimização de totem de autoatendimento."""
    optimization_id: str
    restaurant_id: str
    created_at: datetime
    kiosk_id: str
    recommended_items: List[Dict[str, Any]]  # itens para destacar
    recommended_promotions: List[Dict[str, Any]]  # promoções para destacar
    expected_conversion_lift: float  # aumento percentual esperado
    confidence: float
    reason: str
```

#### 4.1.5 WhatsAppCampaign
```python
class WhatsAppCampaign(BaseModel):
    """Modelo para campanha de WhatsApp."""
    campaign_id: str
    restaurant_id: str
    created_at: datetime
    name: str
    target_segment: Dict[str, Any]  # critérios de segmentação
    message_template: str
    personalization_variables: List[str]
    scheduled_time: Optional[datetime] = None
    status: str  # draft, scheduled, sent, completed
    expected_response_rate: float
    confidence: float
    reason: str
```

### 4.2 Modelos de Configuração

#### 4.2.1 OperationalOptimizationConfig
```python
class OperationalOptimizationConfig(BaseModel):
    """Configuração para otimização operacional."""
    restaurant_id: str
    staffing_optimization_enabled: bool = True
    inventory_optimization_enabled: bool = True
    delivery_optimization_enabled: bool = True
    table_optimization_enabled: bool = True
    kiosk_optimization_enabled: bool = True
    whatsapp_optimization_enabled: bool = True
    staffing_parameters: Dict[str, Any] = {}
    inventory_parameters: Dict[str, Any] = {}
    delivery_parameters: Dict[str, Any] = {}
    table_parameters: Dict[str, Any] = {}
    kiosk_parameters: Dict[str, Any] = {}
    whatsapp_parameters: Dict[str, Any] = {}
```

## 5. Serviços

### 5.1 StaffOptimizationService

Responsável por gerar recomendações de escala de funcionários com base nas previsões de demanda.

```python
class StaffOptimizationService:
    """Serviço para otimização de escala de funcionários."""
    
    async def generate_staff_recommendations(
        self,
        restaurant_id: str,
        start_date: datetime,
        end_date: datetime,
        roles: Optional[List[str]] = None
    ) -> List[StaffingRecommendation]:
        """
        Gera recomendações de escala de funcionários para um período.
        """
        # Implementação
```

### 5.2 DeliveryOptimizationService

Responsável por otimizar operações de delivery com base nas previsões de demanda.

```python
class DeliveryOptimizationService:
    """Serviço para otimização de operações de delivery."""
    
    async def optimize_delivery_operations(
        self,
        restaurant_id: str,
        date: datetime,
        time_windows: Optional[List[str]] = None
    ) -> List[DeliveryOptimization]:
        """
        Otimiza operações de delivery para um dia específico.
        """
        # Implementação
```

### 5.3 TableOptimizationService

Responsável por otimizar a distribuição de mesas com base nas previsões de demanda.

```python
class TableOptimizationService:
    """Serviço para otimização de distribuição de mesas."""
    
    async def optimize_table_distribution(
        self,
        restaurant_id: str,
        date: datetime,
        time_windows: Optional[List[str]] = None
    ) -> List[TableDistributionRecommendation]:
        """
        Otimiza distribuição de mesas para um dia específico.
        """
        # Implementação
```

### 5.4 KioskOptimizationService

Responsável por otimizar a experiência do totem de autoatendimento para maximizar conversão.

```python
class KioskOptimizationService:
    """Serviço para otimização de totem de autoatendimento."""
    
    async def optimize_kiosk_experience(
        self,
        restaurant_id: str,
        kiosk_id: Optional[str] = None
    ) -> List[KioskOptimization]:
        """
        Otimiza experiência do totem para maximizar conversão.
        """
        # Implementação
```

### 5.5 WhatsAppCampaignService

Responsável por gerar e gerenciar campanhas de marketing via WhatsApp.

```python
class WhatsAppCampaignService:
    """Serviço para campanhas de WhatsApp."""
    
    async def generate_campaign_recommendations(
        self,
        restaurant_id: str,
        campaign_type: str,
        target_segment: Optional[Dict[str, Any]] = None
    ) -> List[WhatsAppCampaign]:
        """
        Gera recomendações de campanhas de WhatsApp.
        """
        # Implementação
    
    async def schedule_campaign(
        self,
        campaign_id: str,
        scheduled_time: datetime
    ) -> WhatsAppCampaign:
        """
        Agenda uma campanha de WhatsApp.
        """
        # Implementação
```

### 5.6 OperationalOptimizationService

Serviço principal que coordena todos os serviços de otimização operacional.

```python
class OperationalOptimizationService:
    """Serviço principal para otimização operacional."""
    
    def __init__(self):
        self.staff_service = StaffOptimizationService()
        self.delivery_service = DeliveryOptimizationService()
        self.table_service = TableOptimizationService()
        self.kiosk_service = KioskOptimizationService()
        self.whatsapp_service = WhatsAppCampaignService()
    
    async def generate_all_recommendations(
        self,
        restaurant_id: str,
        start_date: datetime,
        end_date: datetime,
        config: Optional[OperationalOptimizationConfig] = None
    ) -> Dict[str, Any]:
        """
        Gera todas as recomendações de otimização operacional.
        """
        # Implementação
```

## 6. APIs

### 6.1 Endpoints de Otimização Operacional

```python
@router.post("/staff/recommendations", response_model=List[StaffingRecommendation])
async def generate_staff_recommendations(
    restaurant_id: str,
    start_date: datetime,
    end_date: datetime,
    roles: Optional[List[str]] = Query(None),
    service: OperationalOptimizationService = Depends(get_optimization_service)
):
    """
    Gera recomendações de escala de funcionários.
    """
    # Implementação

@router.post("/delivery/optimize", response_model=List[DeliveryOptimization])
async def optimize_delivery_operations(
    restaurant_id: str,
    date: datetime,
    time_windows: Optional[List[str]] = Query(None),
    service: OperationalOptimizationService = Depends(get_optimization_service)
):
    """
    Otimiza operações de delivery.
    """
    # Implementação

@router.post("/tables/optimize", response_model=List[TableDistributionRecommendation])
async def optimize_table_distribution(
    restaurant_id: str,
    date: datetime,
    time_windows: Optional[List[str]] = Query(None),
    service: OperationalOptimizationService = Depends(get_optimization_service)
):
    """
    Otimiza distribuição de mesas.
    """
    # Implementação

@router.post("/kiosk/optimize", response_model=List[KioskOptimization])
async def optimize_kiosk_experience(
    restaurant_id: str,
    kiosk_id: Optional[str] = Query(None),
    service: OperationalOptimizationService = Depends(get_optimization_service)
):
    """
    Otimiza experiência do totem.
    """
    # Implementação

@router.post("/whatsapp/campaigns/recommend", response_model=List[WhatsAppCampaign])
async def recommend_whatsapp_campaigns(
    restaurant_id: str,
    campaign_type: str,
    target_segment: Optional[Dict[str, Any]] = None,
    service: OperationalOptimizationService = Depends(get_optimization_service)
):
    """
    Recomenda campanhas de WhatsApp.
    """
    # Implementação

@router.post("/whatsapp/campaigns/{campaign_id}/schedule", response_model=WhatsAppCampaign)
async def schedule_whatsapp_campaign(
    campaign_id: str,
    scheduled_time: datetime,
    service: OperationalOptimizationService = Depends(get_optimization_service)
):
    """
    Agenda uma campanha de WhatsApp.
    """
    # Implementação

@router.post("/optimize/all", response_model=Dict[str, Any])
async def generate_all_recommendations(
    restaurant_id: str,
    start_date: datetime,
    end_date: datetime,
    config: Optional[OperationalOptimizationConfig] = None,
    service: OperationalOptimizationService = Depends(get_optimization_service)
):
    """
    Gera todas as recomendações de otimização operacional.
    """
    # Implementação
```

## 7. Interface do Usuário

### 7.1 Componentes de UI

#### 7.1.1 StaffingRecommendationCard

Componente para exibir recomendações de escala de funcionários.

```jsx
// StaffingRecommendationCard.jsx
import React from 'react';
import { Card, Typography, Table, Tag, Button } from 'antd';
import { UserOutlined, ClockCircleOutlined } from '@ant-design/icons';

const StaffingRecommendationCard = ({ recommendations, onApply }) => {
  // Implementação
};

export default StaffingRecommendationCard;
```

#### 7.1.2 DeliveryOptimizationCard

Componente para exibir otimizações de delivery.

```jsx
// DeliveryOptimizationCard.jsx
import React from 'react';
import { Card, Typography, Table, Tag, Button } from 'antd';
import { CarOutlined, ClockCircleOutlined } from '@ant-design/icons';

const DeliveryOptimizationCard = ({ optimizations, onApply }) => {
  // Implementação
};

export default DeliveryOptimizationCard;
```

#### 7.1.3 TableOptimizationCard

Componente para exibir otimizações de distribuição de mesas.

```jsx
// TableOptimizationCard.jsx
import React from 'react';
import { Card, Typography, Table, Tag, Button } from 'antd';
import { TableOutlined, TeamOutlined } from '@ant-design/icons';

const TableOptimizationCard = ({ recommendations, onApply }) => {
  // Implementação
};

export default TableOptimizationCard;
```

#### 7.1.4 KioskOptimizationCard

Componente para exibir otimizações de totem.

```jsx
// KioskOptimizationCard.jsx
import React from 'react';
import { Card, Typography, List, Tag, Button } from 'antd';
import { ShopOutlined, RiseOutlined } from '@ant-design/icons';

const KioskOptimizationCard = ({ optimizations, onApply }) => {
  // Implementação
};

export default KioskOptimizationCard;
```

#### 7.1.5 WhatsAppCampaignCard

Componente para exibir e gerenciar campanhas de WhatsApp.

```jsx
// WhatsAppCampaignCard.jsx
import React from 'react';
import { Card, Typography, List, Tag, Button, Modal, Form, DatePicker } from 'antd';
import { MessageOutlined, SendOutlined } from '@ant-design/icons';

const WhatsAppCampaignCard = ({ campaigns, onSchedule }) => {
  // Implementação
};

export default WhatsAppCampaignCard;
```

### 7.2 Páginas de UI

#### 7.2.1 OperationalOptimizationDashboard

Página principal para visualizar e gerenciar todas as otimizações operacionais.

```jsx
// OperationalOptimizationDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Layout, Tabs, DatePicker, Button, Space, message } from 'antd';
import { 
  UserOutlined, CarOutlined, TableOutlined, 
  ShopOutlined, MessageOutlined, AppstoreOutlined 
} from '@ant-design/icons';

import StaffingRecommendationCard from './components/StaffingRecommendationCard';
import DeliveryOptimizationCard from './components/DeliveryOptimizationCard';
import TableOptimizationCard from './components/TableOptimizationCard';
import KioskOptimizationCard from './components/KioskOptimizationCard';
import WhatsAppCampaignCard from './components/WhatsAppCampaignCard';

import { optimizationApi } from '../services/optimizationApi';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Content } = Layout;

const OperationalOptimizationDashboard = () => {
  // Implementação
};

export default OperationalOptimizationDashboard;
```

## 8. Integração com Sistemas Existentes

### 8.1 Integração com o Módulo de Previsão de Demanda

O módulo de otimização operacional se integra diretamente com o módulo de previsão de demanda existente, utilizando as previsões geradas como base para as recomendações operacionais.

### 8.2 Integração com o Sistema de Gestão de Funcionários

Integração com o sistema de gestão de funcionários para obter informações sobre disponibilidade e aplicar recomendações de escala.

### 8.3 Integração com o Sistema de Delivery

Integração com o sistema de delivery para otimizar rotas e alocação de entregadores.

### 8.4 Integração com o Sistema de Mesas

Integração com o sistema de mesas para aplicar recomendações de distribuição.

### 8.5 Integração com o Sistema de Totem

Integração com o sistema de totem para aplicar otimizações de experiência.

### 8.6 Integração com o Sistema de WhatsApp

Integração com o sistema de WhatsApp para enviar mensagens e campanhas.

## 9. Considerações de Performance

Para garantir que o sistema não comprometa o desempenho da máquina do cliente:

1. **Processamento em Nuvem**: Todo o processamento pesado é realizado na AWS, não na máquina do cliente.
2. **Caching Inteligente**: Resultados de previsões e otimizações são armazenados em cache para minimizar recálculos.
3. **Carregamento Assíncrono**: A UI carrega dados de forma assíncrona para não bloquear a interface.
4. **Paginação e Carregamento Sob Demanda**: Dados são carregados em pequenos lotes conforme necessário.
5. **Otimização de Recursos**: Minimização de uso de CPU e memória no cliente.

## 10. Plano de Implementação

### 10.1 Fase 1: Implementação do Backend

1. Implementar modelos de dados estendidos
2. Implementar serviços de otimização operacional
3. Implementar APIs REST
4. Integrar com sistemas existentes

### 10.2 Fase 2: Implementação do Frontend

1. Implementar componentes de UI
2. Implementar páginas de dashboard
3. Integrar com APIs de backend
4. Implementar visualizações e gráficos

### 10.3 Fase 3: Testes e Validação

1. Testes unitários para serviços e componentes
2. Testes de integração para fluxos completos
3. Testes de performance para garantir responsividade
4. Validação com dados reais

### 10.4 Fase 4: Implantação e Monitoramento

1. Implantação em ambiente de produção
2. Configuração de monitoramento e alertas
3. Treinamento de usuários
4. Coleta de feedback e melhorias contínuas

## 11. Conclusão

Este design de aprimoramento do módulo de previsão de demanda e otimização operacional fornece uma solução abrangente para as necessidades do POS Modern, mantendo a arquitetura AWS existente e expandindo as capacidades para incluir otimização de funcionários, estoque, delivery, mesas, totem e WhatsApp. A implementação seguirá uma abordagem faseada, garantindo integração perfeita com os sistemas existentes e performance adequada para os clientes.

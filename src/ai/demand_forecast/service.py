import os
import logging
from datetime import datetime, timedelta
from fastapi import HTTPException

# Configurar logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class DemandForecastService:
    """Serviço para previsão de demanda."""

    def __init__(self):
        """
        Inicializa o serviço de previsão de demanda.
        """
        # Configurações para AWS
        self.aws_config = {
            "region": os.environ.get("AWS_REGION", "us-east-1"),
            "forecast_role_arn": os.environ.get("FORECAST_ROLE_ARN", ""),
            "s3_bucket": os.environ.get("FORECAST_S3_BUCKET", ""),
        }

    async def create_forecast(self, request):
        """
        Cria uma previsão de demanda.

        Args:
            request: Solicitação de previsão

        Returns:
            ForecastResult: Resultado da previsão
        """
        logger.info(f"Creating forecast for restaurant {request.restaurant_id}")

        try:
            # Em produção, enviar solicitação para Amazon Forecast
            # Por enquanto, retornar previsão simulada

            # Simular pontos de previsão
            from .models import ForecastResult, ForecastPoint
            import random
            import uuid

            points = []
            current_date = request.start_date
            while current_date <= request.end_date:
                # Simular diferentes valores para diferentes horas do dia
                for hour in range(10, 23):  # 10h às 22h
                    # Valor base (clientes por hora)
                    base_value = 40

                    # Ajustar para hora do dia (pico no almoço e jantar)
                    if 11 <= hour <= 14:  # Almoço
                        time_factor = 2.0
                    elif 18 <= hour <= 21:  # Jantar
                        time_factor = 2.2
                    else:
                        time_factor = 0.4

                    # Ajustar para dia da semana (mais movimento no fim de semana)
                    weekday = current_date.weekday()
                    if weekday >= 5:  # Fim de semana
                        day_factor = 1.8
                    else:
                        day_factor = 1.0

                    # Calcular valor final
                    value = base_value * time_factor * day_factor

                    # Adicionar alguma variação aleatória
                    value = value * (0.9 + 0.2 * random.random())

                    # Criar ponto de previsão
                    point = ForecastPoint(
                        timestamp=datetime.combine(
                            current_date.date(), datetime.min.time().replace(hour=hour)
                        ),
                        value=value,
                        lower_bound=value * 0.8,
                        upper_bound=value * 1.2,
                        dimension_values={"restaurant": request.restaurant_id},
                    )

                    points.append(point)

                # Avançar para o próximo dia
                current_date += timedelta(days=1)

            # Criar objeto de previsão
            forecast = ForecastResult(
                request_id=f"forecast-{request.restaurant_id}-{uuid.uuid4().hex[:8]}",
                restaurant_id=request.restaurant_id,
                created_at=datetime.now(),
                start_date=request.start_date,
                end_date=request.end_date,
                granularity=request.granularity,
                model_type=request.model_type,
                dimensions=request.dimensions,
                points=points,
                metrics={"MAPE": 16.8, "RMSE": 9.3},
                data_sources_used=["sales_history", "weather", "events", "holidays"],
            )

            return forecast

        except Exception as e:
            logger.error(f"Error creating forecast: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, detail=f"Error creating forecast: {str(e)}"
            )

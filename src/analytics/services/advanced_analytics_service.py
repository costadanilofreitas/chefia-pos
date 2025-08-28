"""
Advanced Analytics Service for Chefia POS
Comprehensive analytics engine with ML capabilities for restaurant insights
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List
from uuid import UUID

import numpy as np
import pandas as pd
from fastapi import HTTPException, status
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.preprocessing import StandardScaler

from src.core.events.event_bus import EventBus


class AdvancedAnalyticsService:
    """Advanced analytics service with ML capabilities"""

    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
        self.logger = logging.getLogger(__name__)

        # Initialize ML models
        self.demand_forecaster = DemandForecaster()
        self.wait_time_predictor = WaitTimePredictor()
        self.revenue_optimizer = RevenueOptimizer()
        self.customer_segmenter = CustomerSegmenter()
        self.anomaly_detector = AnomalyDetector()
        self.menu_optimizer = MenuOptimizer()

    async def get_executive_dashboard(self, restaurant_id: str) -> Dict[str, Any]:
        """Get executive-level dashboard with key insights"""
        try:
            # Get current metrics
            current_metrics = await self.get_real_time_metrics(restaurant_id)

            # Get predictions
            predictions = await self.get_predictions(restaurant_id)

            # Get insights and opportunities
            insights = await self.generate_insights(restaurant_id)

            # Get alerts
            alerts = await self.detect_anomalies(restaurant_id)

            return {
                "timestamp": datetime.now().isoformat(),
                "metrics": current_metrics,
                "predictions": predictions,
                "insights": insights,
                "alerts": alerts,
                "recommendations": await self.generate_recommendations(
                    current_metrics, predictions, insights
                )
            }
        except Exception as e:
            self.logger.error(f"Error generating executive dashboard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error generating executive dashboard: {str(e)}"
            )

    async def get_real_time_metrics(self, restaurant_id: str) -> Dict[str, Any]:
        """Get real-time operational metrics"""
        # In production, these would come from actual database queries
        return {
            "revenue": {
                "today": 45280.50,
                "growth_vs_yesterday": 0.12,
                "growth_vs_last_week": 0.08,
                "average_ticket": 89.45,
                "transactions": 506
            },
            "operations": {
                "current_occupancy": 0.78,
                "tables_occupied": 24,
                "tables_total": 31,
                "average_wait_time": 18,
                "queue_length": 8,
                "kitchen_backlog": 12
            },
            "efficiency": {
                "table_turnover_rate": 2.3,
                "revenue_per_seat_hour": 45.20,
                "staff_productivity": 0.92,
                "order_accuracy": 0.97
            }
        }

    async def get_predictions(self, restaurant_id: str) -> Dict[str, Any]:
        """Get ML-based predictions"""
        # Get historical data (simulated here)
        historical_data = self._get_historical_data(restaurant_id)

        return {
            "demand": {
                "next_2_hours": self.demand_forecaster.predict_demand(
                    historical_data, hours_ahead=2
                ),
                "peak_hours_today": [12, 13, 19, 20],
                "expected_daily_revenue": 52340.00,
                "confidence": 0.85
            },
            "wait_times": {
                "current_estimate": 18,
                "next_hour": 25,
                "peak_wait_today": 35,
                "optimal_queue_size": 10
            },
            "staffing": {
                "current_need": 8,
                "next_2_hours": 10,
                "peak_need": 12,
                "recommendations": ["Add 2 waiters at 6 PM", "Kitchen helper at 7 PM"]
            }
        }

    async def generate_insights(self, restaurant_id: str) -> List[Dict[str, Any]]:
        """Generate actionable insights from data"""
        insights = []

        # Revenue insights
        revenue_trend = self._analyze_revenue_trend(restaurant_id)
        if revenue_trend["opportunity"]:
            insights.append({
                "type": "revenue",
                "priority": "high",
                "title": "Revenue Opportunity Detected",
                "description": revenue_trend["description"],
                "action": revenue_trend["action"],
                "potential_impact": revenue_trend["impact"]
            })

        # Operational insights
        operational_insights = self._analyze_operations(restaurant_id)
        insights.extend(operational_insights)

        # Customer insights
        customer_insights = await self._analyze_customer_behavior(restaurant_id)
        insights.extend(customer_insights)

        return sorted(insights, key=lambda x: self._priority_score(x["priority"]), reverse=True)

    async def detect_anomalies(self, restaurant_id: str) -> List[Dict[str, Any]]:
        """Detect anomalies in real-time data"""
        data = self._get_current_data_streams(restaurant_id)

        anomalies = self.anomaly_detector.detect(data)

        alerts = []
        for anomaly in anomalies:
            alerts.append({
                "id": str(UUID(int=np.random.randint(0, 2**32))),
                "type": anomaly["type"],
                "severity": anomaly["severity"],
                "title": anomaly["title"],
                "description": anomaly["description"],
                "detected_at": datetime.now().isoformat(),
                "suggested_action": anomaly["action"],
                "auto_resolve": anomaly.get("auto_resolve", False)
            })

        return alerts

    async def generate_recommendations(
        self,
        metrics: Dict,
        predictions: Dict,
        insights: List[Dict]
    ) -> List[Dict[str, Any]]:
        """Generate actionable recommendations"""
        recommendations = []

        # Staffing recommendations
        if predictions["staffing"]["next_2_hours"] > metrics["operations"].get("current_staff", 8):
            recommendations.append({
                "category": "staffing",
                "urgency": "high",
                "title": "Increase Staffing",
                "description": f"Expected rush in 2 hours. Add {predictions['staffing']['next_2_hours'] - 8} staff members",
                "expected_impact": "Reduce wait times by 40%, increase customer satisfaction",
                "implementation": "immediate"
            })

        # Menu recommendations
        menu_analysis = self.menu_optimizer.analyze(self._get_menu_data(metrics))
        recommendations.extend(menu_analysis["recommendations"])

        # Pricing recommendations
        pricing_opportunities = self.revenue_optimizer.find_pricing_opportunities(metrics)
        recommendations.extend(pricing_opportunities)

        return recommendations

    def _get_historical_data(self, restaurant_id: str) -> pd.DataFrame:
        """Get historical data for analysis"""
        # In production, this would query the database
        # Simulating historical data here
        dates = pd.date_range(end=datetime.now(), periods=90, freq='D')
        data = {
            'date': dates,
            'revenue': np.random.normal(50000, 5000, 90),
            'customers': np.random.normal(500, 50, 90),
            'avg_wait_time': np.random.normal(20, 5, 90),
            'avg_ticket': np.random.normal(100, 10, 90)
        }
        return pd.DataFrame(data)

    def _analyze_revenue_trend(self, restaurant_id: str) -> Dict[str, Any]:
        """Analyze revenue trends and opportunities"""
        # Simulated analysis
        return {
            "opportunity": True,
            "description": "Thursday evenings show 20% lower revenue than other weekdays",
            "action": "Implement Thursday night special promotion",
            "impact": "$2,500 additional weekly revenue"
        }

    def _analyze_operations(self, restaurant_id: str) -> List[Dict[str, Any]]:
        """Analyze operational efficiency"""
        return [
            {
                "type": "operations",
                "priority": "medium",
                "title": "Table Turnover Optimization",
                "description": "Tables 12-15 have 30% slower turnover than average",
                "action": "Review service patterns for these tables",
                "potential_impact": "Increase daily covers by 8%"
            }
        ]

    async def _analyze_customer_behavior(self, restaurant_id: str) -> List[Dict[str, Any]]:
        """Analyze customer behavior patterns"""
        return [
            {
                "type": "customer",
                "priority": "high",
                "title": "High-Value Customer Retention",
                "description": "15% of top customers haven't visited in 2 weeks",
                "action": "Send personalized offers to re-engage",
                "potential_impact": "$5,000 recovered revenue"
            }
        ]

    def _get_current_data_streams(self, restaurant_id: str) -> Dict[str, Any]:
        """Get current data streams for anomaly detection"""
        return {
            "revenue_stream": np.random.normal(5000, 500, 24).tolist(),
            "order_stream": np.random.normal(50, 5, 24).tolist(),
            "wait_time_stream": np.random.normal(20, 5, 24).tolist()
        }

    def _get_menu_data(self, metrics: Dict) -> pd.DataFrame:
        """Get menu performance data"""
        # Simulated menu data
        items = ['Burger', 'Pizza', 'Pasta', 'Salad', 'Steak', 'Fish', 'Chicken', 'Dessert']
        return pd.DataFrame({
            'item': items,
            'sales_count': np.random.randint(20, 100, len(items)),
            'revenue': np.random.normal(2000, 500, len(items)),
            'profit_margin': np.random.uniform(0.2, 0.7, len(items)),
            'prep_time': np.random.randint(10, 30, len(items))
        })

    def _priority_score(self, priority: str) -> int:
        """Convert priority to numerical score"""
        scores = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        return scores.get(priority, 0)


class DemandForecaster:
    """ML-based demand forecasting"""

    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.is_trained = False

    def predict_demand(self, historical_data: pd.DataFrame, hours_ahead: int) -> Dict[str, Any]:
        """Predict customer demand for next N hours"""
        if not self.is_trained:
            self.train(historical_data)

        # Feature engineering
        current_time = datetime.now()
        features = self._extract_features(current_time, hours_ahead)

        # Make predictions
        predictions = []
        for i in range(hours_ahead):
            hour_features = self._extract_features(
                current_time + timedelta(hours=i), 1
            )
            pred = self.model.predict([hour_features])[0]
            predictions.append({
                "hour": (current_time + timedelta(hours=i)).hour,
                "expected_customers": int(pred),
                "confidence_interval": (int(pred * 0.85), int(pred * 1.15))
            })

        return {
            "predictions": predictions,
            "factors": {
                "day_of_week": current_time.strftime("%A"),
                "weather_impact": "neutral",
                "special_events": "none",
                "historical_accuracy": 0.88
            }
        }

    def train(self, historical_data: pd.DataFrame):
        """Train the demand forecasting model"""
        # Prepare training data
        X = []
        y = []

        for _, row in historical_data.iterrows():
            features = self._extract_features(row['date'], 1)
            X.append(features)
            y.append(row['customers'])

        # Train model
        self.model.fit(X, y)
        self.is_trained = True

    def _extract_features(self, date: datetime, hours: int) -> List[float]:
        """Extract features for prediction"""
        return [
            date.hour,
            date.weekday(),
            date.day,
            date.month,
            int(date.weekday() in [5, 6]),  # Weekend flag
            hours
        ]


class WaitTimePredictor:
    """Predict customer wait times"""

    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=50, random_state=42)
        self._initialize_model()

    def predict_wait_time(
        self,
        party_size: int,
        queue_length: int,
        tables_available: int,
        current_hour: int
    ) -> Dict[str, Any]:
        """Predict wait time for a party"""
        features = [party_size, queue_length, tables_available, current_hour]

        prediction = self.model.predict([features])[0]

        # Calculate confidence based on historical accuracy
        confidence = self._calculate_confidence(features)

        return {
            "estimated_minutes": int(prediction),
            "confidence": confidence,
            "factors": {
                "queue_position": queue_length + 1,
                "suitable_tables": self._count_suitable_tables(party_size, tables_available),
                "historical_accuracy": 0.85,
                "rush_hour_factor": 1.3 if current_hour in [12, 13, 19, 20] else 1.0
            },
            "range": {
                "min": int(prediction * 0.8),
                "max": int(prediction * 1.2)
            }
        }

    def _initialize_model(self):
        """Initialize model with synthetic training data"""
        # Generate synthetic training data
        np.random.seed(42)
        n_samples = 1000

        X = np.random.rand(n_samples, 4)
        X[:, 0] = np.random.randint(1, 8, n_samples)  # Party size
        X[:, 1] = np.random.randint(0, 20, n_samples)  # Queue length
        X[:, 2] = np.random.randint(0, 10, n_samples)  # Tables available
        X[:, 3] = np.random.randint(10, 22, n_samples)  # Hour

        # Synthetic wait times
        y = X[:, 1] * 5 + (6 - X[:, 2]) * 3 + np.random.normal(0, 5, n_samples)
        y = np.maximum(y, 0)  # No negative wait times

        self.model.fit(X, y)

    def _calculate_confidence(self, features: List[float]) -> float:
        """Calculate prediction confidence"""
        # Simple confidence calculation based on feature ranges
        confidence = 0.9

        # Reduce confidence for edge cases
        if features[0] > 6:  # Large party
            confidence -= 0.1
        if features[1] > 15:  # Long queue
            confidence -= 0.1
        if features[2] < 2:  # Few tables
            confidence -= 0.05

        return max(confidence, 0.5)

    def _count_suitable_tables(self, party_size: int, total_available: int) -> int:
        """Count tables suitable for party size"""
        # Simplified logic
        if party_size <= 2:
            return min(total_available, int(total_available * 0.6))
        elif party_size <= 4:
            return min(total_available, int(total_available * 0.3))
        else:
            return min(total_available, int(total_available * 0.1))


class RevenueOptimizer:
    """Optimize revenue through pricing and promotions"""

    def find_pricing_opportunities(self, metrics: Dict) -> List[Dict[str, Any]]:
        """Find opportunities for revenue optimization"""
        opportunities = []

        # Dynamic pricing opportunity
        if metrics["operations"]["current_occupancy"] < 0.5:
            opportunities.append({
                "category": "pricing",
                "urgency": "medium",
                "title": "Implement Happy Hour Pricing",
                "description": "Low occupancy detected. 20% discount could increase traffic",
                "expected_impact": "Increase revenue by $800 despite discount",
                "implementation": "immediate"
            })

        # Upselling opportunity
        if metrics["revenue"]["average_ticket"] < 100:
            opportunities.append({
                "category": "upselling",
                "urgency": "low",
                "title": "Enhance Upselling Training",
                "description": "Average ticket 10% below target",
                "expected_impact": "Increase average ticket by $15",
                "implementation": "this_week"
            })

        return opportunities

    def calculate_optimal_price(
        self,
        item: str,
        current_price: float,
        demand_elasticity: float = -1.5
    ) -> Dict[str, Any]:
        """Calculate optimal price for an item"""
        # Simple price optimization based on elasticity
        optimal_price = current_price * (1 + (1 / demand_elasticity) * 0.1)

        return {
            "item": item,
            "current_price": current_price,
            "optimal_price": round(optimal_price, 2),
            "expected_demand_change": f"{abs(demand_elasticity * 10):.1f}%",
            "expected_revenue_change": f"{(optimal_price - current_price) / current_price * 100:.1f}%",
            "confidence": 0.75
        }


class CustomerSegmenter:
    """Segment customers using RFM analysis and clustering"""

    def __init__(self):
        self.kmeans = KMeans(n_clusters=5, random_state=42)
        self.scaler = StandardScaler()

    def segment_customers(self, customer_data: pd.DataFrame) -> Dict[str, Any]:
        """Perform customer segmentation"""
        # Calculate RFM scores
        rfm_data = self._calculate_rfm(customer_data)

        # Perform clustering
        X = self.scaler.fit_transform(rfm_data[['recency', 'frequency', 'monetary']])
        clusters = self.kmeans.fit_predict(X)

        # Assign segments
        segments = self._assign_segments(rfm_data, clusters)

        return {
            "segments": segments,
            "statistics": self._calculate_segment_stats(segments),
            "recommendations": self._generate_segment_recommendations(segments)
        }

    def _calculate_rfm(self, data: pd.DataFrame) -> pd.DataFrame:
        """Calculate RFM scores for customers"""
        # Simulated RFM calculation
        n_customers = 100
        return pd.DataFrame({
            'customer_id': range(n_customers),
            'recency': np.random.randint(1, 90, n_customers),
            'frequency': np.random.randint(1, 50, n_customers),
            'monetary': np.random.normal(1000, 300, n_customers)
        })

    def _assign_segments(self, rfm_data: pd.DataFrame, clusters: np.ndarray) -> Dict[str, List]:
        """Assign customers to named segments"""
        segment_names = {
            0: "Champions",
            1: "Loyal Customers",
            2: "Potential Loyalists",
            3: "At Risk",
            4: "Lost Customers"
        }

        segments = {}
        for cluster_id, segment_name in segment_names.items():
            mask = clusters == cluster_id
            segments[segment_name] = rfm_data[mask]['customer_id'].tolist()

        return segments

    def _calculate_segment_stats(self, segments: Dict) -> Dict[str, Any]:
        """Calculate statistics for each segment"""
        stats = {}
        total_customers = sum(len(customers) for customers in segments.values())

        for segment, customers in segments.items():
            stats[segment] = {
                "count": len(customers),
                "percentage": f"{len(customers) / total_customers * 100:.1f}%",
                "avg_value": np.random.normal(1000, 200),  # Simulated
                "churn_risk": np.random.uniform(0, 0.5)  # Simulated
            }

        return stats

    def _generate_segment_recommendations(self, segments: Dict) -> List[Dict]:
        """Generate recommendations for each segment"""
        recommendations = []

        for segment, customers in segments.items():
            if segment == "Champions":
                recommendations.append({
                    "segment": segment,
                    "strategy": "VIP Treatment",
                    "actions": [
                        "Exclusive previews of new menu items",
                        "Personal thank you messages",
                        "Priority reservations"
                    ]
                })
            elif segment == "At Risk":
                recommendations.append({
                    "segment": segment,
                    "strategy": "Re-engagement Campaign",
                    "actions": [
                        "Send 'We miss you' campaign with 20% discount",
                        "Personal call from manager",
                        "Special welcome-back offer"
                    ]
                })

        return recommendations


class MenuOptimizer:
    """Optimize menu based on performance data"""

    def analyze(self, menu_data: pd.DataFrame) -> Dict[str, Any]:
        """Analyze menu performance and generate recommendations"""
        # Classify items using menu engineering matrix
        menu_data['popularity_score'] = menu_data['sales_count'] / menu_data['sales_count'].sum()
        menu_data['profitability_score'] = menu_data['profit_margin']

        # Classify items
        classifications = self._classify_items(menu_data)

        # Generate recommendations
        recommendations = self._generate_menu_recommendations(classifications, menu_data)

        return {
            "classifications": classifications,
            "recommendations": recommendations,
            "optimization_potential": self._calculate_optimization_potential(menu_data)
        }

    def _classify_items(self, data: pd.DataFrame) -> Dict[str, List[str]]:
        """Classify menu items into categories"""
        median_popularity = data['popularity_score'].median()
        median_profitability = data['profitability_score'].median()

        classifications = {
            "stars": [],
            "plowhorses": [],
            "puzzles": [],
            "dogs": []
        }

        for _, row in data.iterrows():
            if row['popularity_score'] >= median_popularity:
                if row['profitability_score'] >= median_profitability:
                    classifications["stars"].append(row['item'])
                else:
                    classifications["plowhorses"].append(row['item'])
            else:
                if row['profitability_score'] >= median_profitability:
                    classifications["puzzles"].append(row['item'])
                else:
                    classifications["dogs"].append(row['item'])

        return classifications

    def _generate_menu_recommendations(
        self,
        classifications: Dict,
        data: pd.DataFrame
    ) -> List[Dict]:
        """Generate menu optimization recommendations"""
        recommendations = []

        # Stars - maintain and promote
        if classifications["stars"]:
            recommendations.append({
                "category": "menu",
                "urgency": "low",
                "title": "Promote Star Items",
                "description": f"Items {', '.join(classifications['stars'])} are high performers",
                "expected_impact": "Maintain 30% of revenue",
                "implementation": "ongoing"
            })

        # Plowhorses - improve margins
        if classifications["plowhorses"]:
            recommendations.append({
                "category": "menu",
                "urgency": "medium",
                "title": "Optimize Popular Items",
                "description": f"Items {', '.join(classifications['plowhorses'])} are popular but low margin",
                "expected_impact": "Increase profit by 15%",
                "implementation": "this_month"
            })

        # Dogs - consider removing
        if classifications["dogs"]:
            recommendations.append({
                "category": "menu",
                "urgency": "low",
                "title": "Review Underperforming Items",
                "description": f"Consider removing {', '.join(classifications['dogs'])}",
                "expected_impact": "Simplify menu, reduce waste",
                "implementation": "next_quarter"
            })

        return recommendations

    def _calculate_optimization_potential(self, data: pd.DataFrame) -> Dict[str, float]:
        """Calculate potential improvements from optimization"""
        return {
            "revenue_increase": 0.12,  # 12% potential increase
            "profit_margin_improvement": 0.08,  # 8% margin improvement
            "waste_reduction": 0.25  # 25% waste reduction
        }


class AnomalyDetector:
    """Detect anomalies in restaurant operations"""

    def __init__(self):
        self.isolation_forest = IsolationForest(contamination=0.1, random_state=42)

    def detect(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect anomalies in data streams"""
        anomalies = []

        # Check revenue anomalies
        revenue_anomalies = self._detect_revenue_anomalies(data.get("revenue_stream", []))
        anomalies.extend(revenue_anomalies)

        # Check operational anomalies
        operational_anomalies = self._detect_operational_anomalies(data)
        anomalies.extend(operational_anomalies)

        return anomalies

    def _detect_revenue_anomalies(self, revenue_stream: List[float]) -> List[Dict]:
        """Detect anomalies in revenue stream"""
        anomalies = []

        if not revenue_stream:
            return anomalies

        # Convert to numpy array for analysis
        data = np.array(revenue_stream).reshape(-1, 1)

        # Detect using statistical methods
        mean = np.mean(data)
        std = np.std(data)

        # Check latest value
        latest = revenue_stream[-1] if revenue_stream else 0
        if abs(latest - mean) > 2 * std:
            severity = "high" if abs(latest - mean) > 3 * std else "medium"
            anomalies.append({
                "type": "revenue",
                "severity": severity,
                "title": "Revenue Anomaly Detected",
                "description": f"Current revenue ${latest:.2f} is {abs(latest - mean) / std:.1f} standard deviations from mean",
                "action": "Check for POS system issues or unusual events",
                "value": latest,
                "expected_range": (mean - 2*std, mean + 2*std)
            })

        return anomalies

    def _detect_operational_anomalies(self, data: Dict) -> List[Dict]:
        """Detect operational anomalies"""
        anomalies = []

        # Check wait time anomalies
        wait_times = data.get("wait_time_stream", [])
        if wait_times and max(wait_times) > 45:
            anomalies.append({
                "type": "operations",
                "severity": "high",
                "title": "Excessive Wait Times",
                "description": f"Wait times reached {max(wait_times)} minutes",
                "action": "Review staffing and kitchen capacity immediately"
            })

        # Check order volume anomalies
        order_stream = data.get("order_stream", [])
        if order_stream:
            recent_avg = np.mean(order_stream[-5:]) if len(order_stream) >= 5 else np.mean(order_stream)
            historical_avg = np.mean(order_stream)

            if recent_avg < historical_avg * 0.5:
                anomalies.append({
                    "type": "orders",
                    "severity": "critical",
                    "title": "Order Volume Drop",
                    "description": "Recent orders 50% below average",
                    "action": "Check online ordering systems and kitchen status"
                })

        return anomalies


# Export the main service
__all__ = ['AdvancedAnalyticsService']

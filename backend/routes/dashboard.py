from flask import Blueprint, request, jsonify
from backend.services.analytics_engine import AnalyticsEngine
from backend.services.alert_engine import AlertEngine

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

@dashboard_bp.route("/summary", methods=["GET"])
def get_summary():
    store_id = request.args.get("store_id")
    try:
        kpis = AnalyticsEngine.get_dashboard_kpis(store_id=store_id)
        alert_data = AlertEngine.evaluate_all_alerts(store_id=store_id)
        trends = AnalyticsEngine.get_sales_trends(timeframe="daily", days=14, store_id=store_id)
        categories = AnalyticsEngine.get_category_performance(days=30, store_id=store_id)

        return jsonify({
            "kpis": kpis,
            "priority_summary": {
                "critical_count": len([p for p in alert_data["todays_priorities"] if p["priority_level"] == "Critical"]),
                "high_count": len([p for p in alert_data["todays_priorities"] if p["priority_level"] == "High"]),
                "total_revenue_at_risk": alert_data["total_revenue_at_risk"]
            },
            "top_priorities": alert_data["todays_priorities"][:5],
            "recent_trends": trends,
            "category_performance": categories[:5],
            "data_quality_issues_count": len(alert_data["data_quality_issues"])
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to calculate dashboard summary: {str(e)}"}), 500

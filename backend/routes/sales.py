from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta
from sqlalchemy import func, desc
from backend.database import db_session
from backend.models import Product, Sale, Store
from backend.services.analytics_engine import AnalyticsEngine

sales_bp = Blueprint("sales", __name__, url_prefix="/api/sales")

@sales_bp.route("/analytics", methods=["GET"])
def get_sales_analytics():
    timeframe = request.args.get("timeframe", "daily") # daily, weekly, monthly
    days = int(request.args.get("days", 30))
    store_id = request.args.get("store_id")

    try:
        trends = AnalyticsEngine.get_sales_trends(timeframe=timeframe, days=days, store_id=store_id)
        categories = AnalyticsEngine.get_category_performance(days=days, store_id=store_id)
        best_and_worst = AnalyticsEngine.get_best_and_worst_selling_products(days=days, limit=15, store_id=store_id)
        anomalies = AnalyticsEngine.detect_sales_anomalies(days_window=7, comparison_days=days, store_id=store_id)

        # Overall summary figures
        ref_date = AnalyticsEngine.get_reference_date()
        start_date = ref_date - timedelta(days=days)

        totals_q = db_session.query(
            func.sum(Sale.total_amount).label("total_revenue"),
            func.sum(Sale.quantity_sold).label("total_units"),
            func.count(Sale.sale_id).label("total_orders"),
            func.avg(Sale.selling_price).label("avg_selling_price")
        ).filter(Sale.sale_date >= start_date, Sale.sale_date <= ref_date)

        if store_id:
            totals_q = totals_q.filter(Sale.store_id == store_id)

        totals = totals_q.first()
        total_rev = float(totals.total_revenue or 0.0)
        total_units = int(totals.total_units or 0)
        total_orders = int(totals.total_orders or 0)
        avg_price = float(totals.avg_selling_price or 0.0)

        return jsonify({
            "timeframe": timeframe,
            "days_evaluated": days,
            "date_range": {
                "start": start_date.isoformat(),
                "end": ref_date.isoformat()
            },
            "summary": {
                "total_revenue": round(total_rev, 2),
                "total_units_sold": total_units,
                "total_orders": total_orders,
                "average_order_value": round(total_rev / total_orders, 2) if total_orders > 0 else 0.0,
                "average_selling_price": round(avg_price, 2)
            },
            "trends": trends,
            "categories": categories,
            "best_sellers": best_and_worst["best_sellers"],
            "slow_movers": best_and_worst["slow_movers"],
            "sales_spikes": anomalies["sales_spikes"],
            "sales_drops": anomalies["sales_drops"]
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve sales analytics: {str(e)}"}), 500

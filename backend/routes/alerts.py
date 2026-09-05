from flask import Blueprint, request, jsonify
from backend.services.alert_engine import AlertEngine

alerts_bp = Blueprint("alerts", __name__, url_prefix="/api/alerts")

@alerts_bp.route("", methods=["GET"])
def get_alerts():
    store_id = request.args.get("store_id")
    try:
        data = AlertEngine.evaluate_all_alerts(store_id=store_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": f"Failed to compute alerts: {str(e)}"}), 500

@alerts_bp.route("/priorities", methods=["GET"])
def get_priorities():
    store_id = request.args.get("store_id")
    try:
        data = AlertEngine.evaluate_all_alerts(store_id=store_id)
        return jsonify({
            "todays_priorities": data["todays_priorities"],
            "total_revenue_at_risk": data["total_revenue_at_risk"]
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to compute priorities: {str(e)}"}), 500

@alerts_bp.route("/revenue-at-risk", methods=["GET"])
def get_revenue_at_risk():
    store_id = request.args.get("store_id")
    try:
        data = AlertEngine.evaluate_all_alerts(store_id=store_id)
        return jsonify({
            "revenue_at_risk": data["revenue_at_risk"],
            "total_at_risk": data["total_revenue_at_risk"]
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to compute revenue at risk: {str(e)}"}), 500

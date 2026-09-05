from flask import Blueprint, request, jsonify
from backend.services.simulator_engine import SimulatorEngine
from backend.database import db_session
from backend.models import Product

simulator_bp = Blueprint("simulator", __name__, url_prefix="/api/simulator")

@simulator_bp.route("/run", methods=["POST"])
def run_simulation():
    data = request.get_json() or {}
    product_id = data.get("product_id")
    
    if not product_id:
        # Default to the first active product if none provided
        first_prod = db_session.query(Product).filter(Product.active_status == True).first()
        if not first_prod:
            return jsonify({"error": "No products found in database for simulation"}), 404
        product_id = first_prod.product_id

    try:
        demand_pct = float(data.get("demand_change_pct", 0.0))
        future_days = int(data.get("future_days", 30))
        lead_time = int(data["lead_time_override"]) if "lead_time_override" in data and data["lead_time_override"] is not None else None
        restock_qty = int(data.get("restock_qty", 0))
        restock_day = int(data["restock_day"]) if "restock_day" in data and data["restock_day"] is not None else None

        result = SimulatorEngine.simulate_product_scenario(
            product_id=product_id,
            demand_change_pct=demand_pct,
            future_days=future_days,
            lead_time_override=lead_time,
            restock_qty=restock_qty,
            restock_day=restock_day
        )

        if "error" in result:
            return jsonify(result), 400

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"Simulation failed: {str(e)}"}), 500

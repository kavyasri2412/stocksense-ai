from flask import Blueprint, request, jsonify
from backend.services.ai_copilot import AICopilotService
from backend.database import db_session
from backend.models import AIQueryHistory

copilot_bp = Blueprint("copilot", __name__, url_prefix="/api/copilot")

@copilot_bp.route("/chat", methods=["POST"])
def chat():
    data = request.get_json() or {}
    user_query = data.get("query", "").strip()
    store_id = data.get("store_id")

    if not user_query:
        return jsonify({"error": "Query is required"}), 400

    try:
        response = AICopilotService.answer_query(user_query=user_query, store_id=store_id)
        return jsonify(response), 200
    except Exception as e:
        return jsonify({"error": f"AI Copilot failed: {str(e)}"}), 500

@copilot_bp.route("/history", methods=["GET"])
def get_history():
    limit = int(request.args.get("limit", 20))
    history_items = db_session.query(AIQueryHistory).order_by(
        AIQueryHistory.created_at.desc()
    ).limit(limit).all()

    return jsonify({"history": [h.to_dict() for h in history_items]}), 200

@copilot_bp.route("/history", methods=["DELETE"])
def clear_history():
    db_session.query(AIQueryHistory).delete()
    db_session.commit()
    return jsonify({"message": "AI query history cleared"}), 200

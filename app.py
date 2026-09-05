import os
from pathlib import Path
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
from backend.config import Config
from backend.database import init_db, db_session, check_db_connection
from backend.models import Product, Sale
# Blueprints
from backend.routes.auth import auth_bp
from backend.routes.dashboard import dashboard_bp
from backend.routes.products import products_bp
from backend.routes.inventory import inventory_bp
from backend.routes.sales import sales_bp
from backend.routes.alerts import alerts_bp
from backend.routes.simulator import simulator_bp
from backend.routes.copilot import copilot_bp
from backend.routes.data_mgmt import data_mgmt_bp

def create_app():
    init_db()
    app = Flask(__name__, static_folder=str(Config.FRONTEND_BUILD_DIR), static_url_path="")
    app.config.from_object(Config)

    # Enable CORS for development frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Teardown database session
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(sales_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(simulator_bp)
    app.register_blueprint(copilot_bp)
    app.register_blueprint(data_mgmt_bp)

    # API Health Check
    @app.route("/api/health", methods=["GET"])
    def health_check():
        db_status = check_db_connection()
        prod_count = 0
        sale_count = 0
        try:
            prod_count = db_session.query(Product).count()
            sale_count = db_session.query(Sale).count()
        except Exception:
            pass

        return jsonify({
            "service": "StockSense AI",
            "status": "healthy",
            "database": {
                **db_status,
                "is_empty": (prod_count == 0 and sale_count == 0),
                "products_count": prod_count,
                "sales_count": sale_count
            },
            "version": "2.4.0",
            "gemini_api_configured": bool(Config.GEMINI_API_KEY)
        }), 200

    # Serve React Frontend SPA build
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/"):
            return jsonify({"error": "API route not found"}), 404

        static_dir = Config.FRONTEND_BUILD_DIR
        if (static_dir / path).exists() and path != "":
            return send_from_directory(str(static_dir), path)
        elif (static_dir / "index.html").exists():
            return send_from_directory(str(static_dir), "index.html")
        else:
            return jsonify({
                "message": "StockSense AI Backend API is running smoothly!",
                "endpoints": {
                    "health": "/api/health",
                    "dashboard": "/api/dashboard/summary",
                    "inventory": "/api/inventory",
                    "sales": "/api/sales/analytics",
                    "alerts": "/api/alerts",
                    "simulator": "/api/simulator/run",
                    "copilot": "/api/copilot/chat",
                    "data_mgmt": "/api/data/db-status"
                },
                "frontend_status": "Build frontend with 'npm run build' inside frontend/ to serve SPA through Flask."
            }), 200

    return app

def initialize_application():
    """Initializes tables without auto-populating mock/seed records."""
    print("[StockSense AI] Initializing database schema...")
    init_db()
    prod_count = db_session.query(Product).count()
    sale_count = db_session.query(Sale).count()
    print(f"[StockSense AI] Database schema initialized. Current real records: {prod_count} products, {sale_count} sales transactions.")

if __name__ == "__main__":
    initialize_application()
    app = create_app()
    print(f"\n========================================================")
    print(f"  StockSense AI Server Running on http://{Config.HOST}:{Config.PORT}")
    print(f"  Sales & Inventory Copilot Active")
    print(f"========================================================\n")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)

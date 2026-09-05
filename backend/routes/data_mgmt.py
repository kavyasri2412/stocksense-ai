import os
import io
import pandas as pd
from flask import Blueprint, request, jsonify, Response
from backend.services.data_importer import DataImporterService
from backend.seeds.sample_data import seed_sample_database
from backend.database import db_session, check_db_connection
from backend.models import Product, Inventory, Sale, Supplier, Store, AIQueryHistory

data_mgmt_bp = Blueprint("data_mgmt", __name__, url_prefix="/api/data")

@data_mgmt_bp.route("/import", methods=["POST"])
def import_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files["file"]
    entity_type = request.form.get("entity_type", "").strip().lower()

    if not file or file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not entity_type:
        return jsonify({"error": "entity_type is required ('products', 'inventory', 'sales', 'suppliers', 'stores')"}), 400

    try:
        filename = file.filename.lower()
        if filename.endswith(".csv"):
            df = pd.read_csv(file)
        elif filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(file)
        else:
            return jsonify({"error": "Unsupported file format. Please upload CSV or Excel (.xlsx) file."}), 400

        result = DataImporterService.import_dataframe(df, entity_type)
        return jsonify(result), (200 if result["success"] else 400)
    except Exception as e:
        return jsonify({"error": f"Failed to parse file: {str(e)}"}), 500

@data_mgmt_bp.route("/template/<entity_type>", methods=["GET"])
def download_template(entity_type):
    csv_content = DataImporterService.get_csv_template(entity_type)
    if not csv_content:
        return jsonify({"error": f"Template for '{entity_type}' not found"}), 404

    return Response(
        csv_content,
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename=stocksense_{entity_type}_template.csv"}
    )

@data_mgmt_bp.route("/quality-report", methods=["GET"])
def get_quality_report():
    try:
        report = DataImporterService.audit_data_quality()
        return jsonify(report), 200
    except Exception as e:
        return jsonify({"error": f"Audit failed: {str(e)}"}), 500

@data_mgmt_bp.route("/seed-sample", methods=["POST"])
def seed_sample():
    try:
        res = seed_sample_database(clear_existing=True)
        return jsonify({
            "message": "Realistic 60-day retail dataset seeded successfully!",
            "details": res
        }), 200
    except Exception as e:
        return jsonify({"error": f"Seeding failed: {str(e)}"}), 500

@data_mgmt_bp.route("/db-status", methods=["GET"])
def get_db_status():
    health = check_db_connection()
    counts = {
        "products": db_session.query(Product).count(),
        "inventory": db_session.query(Inventory).count(),
        "sales": db_session.query(Sale).count(),
        "suppliers": db_session.query(Supplier).count(),
        "stores": db_session.query(Store).count()
    }
    return jsonify({
        "connection": health,
        "record_counts": counts,
        "is_ready": counts["products"] > 0 and counts["sales"] > 0
    }), 200

@data_mgmt_bp.route("/purge", methods=["POST"])
def purge_all_data():
    try:
        db_session.query(AIQueryHistory).delete()
        db_session.query(Sale).delete()
        db_session.query(Inventory).delete()
        db_session.query(Product).delete()
        db_session.query(Supplier).delete()
        db_session.query(Store).delete()
        db_session.commit()
        return jsonify({"message": "All operational records purged successfully"}), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({"error": f"Purge failed: {str(e)}"}), 500

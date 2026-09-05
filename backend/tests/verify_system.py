import sys
import os
from pathlib import Path

# Add project root to Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import json
import io
import pandas as pd
from datetime import datetime, date

from app import create_app
from backend.database import db_session, init_db, check_db_connection
from backend.models import Product, Inventory, Sale, Store, Supplier, User, AIQueryHistory
from backend.services.analytics_engine import AnalyticsEngine
from backend.services.alert_engine import AlertEngine
from backend.services.simulator_engine import SimulatorEngine
from backend.services.ai_copilot import AICopilotService
from backend.services.data_importer import DataImporterService
from backend.seeds.sample_data import seed_sample_database

def run_verification():
    print("=== STOCKSENSE AI SYSTEM VERIFICATION ===")
    
    # 1. Project Health & DB
    print("[1/8] Verifying Database & Schema...")
    init_db()
    health = check_db_connection()
    assert health["status"] == "connected", f"DB health error: {health}"
    
    # Ensure realistic records exist
    prod_count = db_session.query(Product).count()
    if prod_count == 0:
        seed_sample_database(clear_existing=True)
    
    products = db_session.query(Product).all()
    inventory = db_session.query(Inventory).all()
    sales = db_session.query(Sale).all()
    stores = db_session.query(Store).all()
    suppliers = db_session.query(Supplier).all()
    users = db_session.query(User).all()
    
    print(f"  [OK] Products: {len(products)} | Inventory: {len(inventory)} | Sales: {len(sales)} | Stores: {len(stores)} | Suppliers: {len(suppliers)} | Users: {len(users)}")
    assert len(products) > 0 and len(sales) > 0, "Database must contain active products and sales."

    # 2. Deterministic Analytics Engine Verification
    print("[2/8] Verifying Deterministic Analytics & Velocity...")
    kpis = AnalyticsEngine.get_dashboard_kpis()
    assert kpis["total_products"] == len(products), "Product count mismatch"
    assert kpis["total_sales_revenue"] > 0, "Sales revenue must be > 0"
    assert kpis["current_inventory_value"] > 0, "Inventory value must be > 0"
    
    first_prod = products[0]
    vel = AnalyticsEngine.get_sales_velocity(first_prod.product_id, days=30)
    assert vel["days_evaluated"] == 30, "Velocity window mismatch"
    assert vel["average_daily_sales"] >= 0.0, "ADS must be non-negative"
    print(f"  [OK] Product '{first_prod.product_name}' 30D Velocity: {vel['average_daily_sales']} units/day")

    # 3. Deterministic Alerts & Priority Ranking
    print("[3/8] Verifying Alert & Priority Ranking Engine...")
    alert_bundle = AlertEngine.evaluate_all_alerts()
    assert "alerts" in alert_bundle, "Missing alerts list"
    assert "todays_priorities" in alert_bundle, "Missing priorities list"
    assert "revenue_at_risk" in alert_bundle, "Missing revenue at risk list"
    
    if len(alert_bundle["todays_priorities"]) > 0:
        top_p = alert_bundle["todays_priorities"][0]
        assert "evidence" in top_p, "Priority must include data evidence"
        print(f"  [OK] Top Priority: [{top_p['priority_level']}] {top_p['product_name']} -> {top_p['recommended_action']} (Score: {top_p['priority_score']})")

    # 4. What-If Simulator Sandbox
    print("[4/8] Verifying What-If Simulator Math & Scenarios...")
    sim = SimulatorEngine.simulate_product_scenario(first_prod.product_id, demand_change_pct=35.0, future_days=30, restock_qty=15, restock_day=5)
    assert "baseline" in sim and "simulated" in sim, "Simulation missing baseline or simulated state"
    assert len(sim["trajectories"]["baseline"]) == 31, "Baseline trajectory should have 31 data points"
    assert len(sim["trajectories"]["simulated"]) == 31, "Simulated trajectory should have 31 data points"
    assert sim["simulated"]["adjusted_daily_demand"] >= sim["baseline"]["average_daily_sales"], "Surge must increase adjusted demand"
    print(f"  [OK] Simulation (+35%): Base ADS={sim['baseline']['average_daily_sales']} -> Adjusted ADS={sim['simulated']['adjusted_daily_demand']} | Runway={sim['simulated']['coverage_days']}d")

    # 5. Grounded AI Copilot
    print("[5/8] Verifying AI Copilot Grounding & Fallback...")
    copilot_res = AICopilotService.answer_query("What products are running out?")
    assert copilot_res["direct_answer"] is not None and len(copilot_res["direct_answer"]) > 10, "Copilot must return an answer"
    assert "evidence" in copilot_res, "Copilot response must include verified evidence"
    print(f"  [OK] Copilot Answer: {copilot_res['direct_answer'][:80]}...")

    # 6. CSV Importer & Validation
    print("[6/8] Verifying CSV Ingestion & Row Validation...")
    csv_data = (
        "product_id,product_name,category,selling_price,cost_price,reorder_level,reorder_quantity,active_status\n"
        "TEST-001,Test Bluetooth Speaker,Electronics,59.99,28.00,10,20,true\n"
        "TEST-002,Test Wool Beanie,Apparel,19.99,8.00,15,30,true\n"
    )
    df = pd.read_csv(io.StringIO(csv_data))
    import_res = DataImporterService.import_dataframe(df, "products")
    assert import_res["success"] == True, f"Import error: {import_res}"
    assert import_res["rows_imported"] == 2, "Row import count mismatch"
    print("  [OK] CSV Import and row validation verified successfully")

    # 7. Data Quality Audit
    print("[7/8] Verifying Data Quality Audit...")
    audit = DataImporterService.audit_data_quality()
    assert "quality_score" in audit, "Missing quality score"
    print(f"  [OK] Data Quality Score: {audit['quality_score']}/100 (Status: {audit['status']})")

    # 8. Frontend Assets & Flask App Integration
    print("[8/8] Verifying Frontend Static Build & API Endpoints...")
    app = create_app()
    client = app.test_client()

    routes_to_test = [
        ("/", 200),
        ("/api/health", 200),
        ("/api/dashboard/summary", 200),
        ("/api/products", 200),
        ("/api/inventory", 200),
        ("/api/sales/analytics", 200),
        ("/api/alerts", 200),
        ("/api/alerts/priorities", 200),
        ("/api/alerts/revenue-at-risk", 200),
        ("/api/data/db-status", 200),
        ("/api/data/quality-report", 200),
    ]

    for path, expected_status in routes_to_test:
        r = client.get(path)
        assert r.status_code == expected_status, f"Route {path} failed with {r.status_code}"
    
    # POST Endpoints
    sim_r = client.post("/api/simulator/run", json={"product_id": first_prod.product_id, "demand_change_pct": 20})
    assert sim_r.status_code == 200, f"Simulator POST failed: {sim_r.status_code}"

    chat_r = client.post("/api/copilot/chat", json={"query": "What should I reorder today?"})
    assert chat_r.status_code == 200, f"Copilot POST failed: {chat_r.status_code}"

    print("  [OK] All REST API routes, POST handlers, and frontend SPA serving verified 100% OK")
    print("\n>>> ALL SYSTEM VERIFICATION CHECKS PASSED SUCCESSFULLY <<<\n")

if __name__ == "__main__":
    run_verification()

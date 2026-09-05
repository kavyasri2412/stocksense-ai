import unittest
import json
from app import create_app
from backend.database import init_db, db_session
from backend.seeds.sample_data import seed_sample_database

class TestApiEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_sample_database(clear_existing=True)
        cls.app = create_app()
        cls.client = cls.app.test_client()

    @classmethod
    def tearDownClass(cls):
        from sqlalchemy import text
        for table in ['sales', 'inventory', 'products', 'stores', 'suppliers', 'users', 'ai_query_history']:
            try:
                db_session.execute(text(f"DELETE FROM {table}"))
            except Exception:
                pass
        db_session.commit()
        db_session.remove()

    def test_health_endpoint(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "healthy")

    def test_dashboard_summary(self):
        res = self.client.get("/api/dashboard/summary")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("kpis", data)
        self.assertIn("top_priorities", data)

    def test_products_list(self):
        res = self.client.get("/api/products")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertGreater(data["total_count"], 0)

    def test_inventory_list(self):
        res = self.client.get("/api/inventory")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("inventory", data)
        self.assertGreater(data["total_items"], 0)

    def test_sales_analytics(self):
        res = self.client.get("/api/sales/analytics?timeframe=daily&days=30")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("summary", data)
        self.assertIn("trends", data)
        self.assertIn("categories", data)

    def test_alerts_and_priorities(self):
        res = self.client.get("/api/alerts")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("alerts", data)
        self.assertIn("todays_priorities", data)

    def test_simulator_run(self):
        payload = {"demand_change_pct": 20, "future_days": 30}
        res = self.client.post("/api/simulator/run", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("simulated", data)
        self.assertIn("trajectories", data)

    def test_copilot_chat(self):
        payload = {"query": "What products are running out?"}
        res = self.client.post("/api/copilot/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("direct_answer", data)
        self.assertIn("evidence", data)

    def test_data_status(self):
        res = self.client.get("/api/data/db-status")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["is_ready"])

if __name__ == "__main__":
    unittest.main()

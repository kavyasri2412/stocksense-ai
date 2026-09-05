import unittest
from backend.database import db_session, init_db
from backend.services.alert_engine import AlertEngine
from backend.seeds.sample_data import seed_sample_database

class TestAlertEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_sample_database(clear_existing=True)

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

    def test_alert_generation(self):
        alert_bundle = AlertEngine.evaluate_all_alerts()
        self.assertIn("alerts", alert_bundle)
        self.assertIn("todays_priorities", alert_bundle)
        self.assertIn("revenue_at_risk", alert_bundle)
        self.assertIn("total_revenue_at_risk", alert_bundle)

        self.assertIsInstance(alert_bundle["alerts"], list)
        self.assertIsInstance(alert_bundle["todays_priorities"], list)
        self.assertGreater(len(alert_bundle["todays_priorities"]), 0)

        top_item = alert_bundle["todays_priorities"][0]
        self.assertIn("priority_level", top_item)
        self.assertIn(top_item["priority_level"], ["Critical", "High", "Medium", "Low"])
        self.assertIn("evidence", top_item)
        self.assertIn("formula", top_item["evidence"])

    def test_revenue_at_risk_calculation(self):
        alert_bundle = AlertEngine.evaluate_all_alerts()
        for item in alert_bundle["revenue_at_risk"]:
            self.assertGreaterEqual(item["revenue_at_risk"], 0.0)
            self.assertIn("evidence", item)

if __name__ == "__main__":
    unittest.main()

import unittest
from datetime import date, timedelta
from backend.database import db_session, init_db
from backend.models import Product, Inventory, Sale, Supplier, Store
from backend.services.analytics_engine import AnalyticsEngine
from backend.seeds.sample_data import seed_sample_database

class TestAnalyticsEngine(unittest.TestCase):
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

    def test_dashboard_kpis_calculation(self):
        kpis = AnalyticsEngine.get_dashboard_kpis()
        self.assertIsNotNone(kpis)
        self.assertGreater(kpis["total_products"], 0)
        self.assertGreater(kpis["total_inventory_units"], 0)
        self.assertGreater(kpis["total_sales_revenue"], 0)
        self.assertIn("current_inventory_value", kpis)
        self.assertIn("products_requiring_attention_today", kpis)

    def test_sales_velocity(self):
        prod = db_session.query(Product).first()
        self.assertIsNotNone(prod)
        vel = AnalyticsEngine.get_sales_velocity(prod.product_id, days=30)
        self.assertGreaterEqual(vel["average_daily_sales"], 0.0)
        self.assertEqual(vel["days_evaluated"], 30)

    def test_sales_trends(self):
        daily_trends = AnalyticsEngine.get_sales_trends(timeframe="daily", days=14)
        self.assertIsInstance(daily_trends, list)
        self.assertGreater(len(daily_trends), 0)

        weekly_trends = AnalyticsEngine.get_sales_trends(timeframe="weekly", days=30)
        self.assertIsInstance(weekly_trends, list)

    def test_category_performance(self):
        categories = AnalyticsEngine.get_category_performance(days=30)
        self.assertIsInstance(categories, list)
        self.assertGreater(len(categories), 0)
        first_cat = categories[0]
        self.assertIn("category", first_cat)
        self.assertIn("revenue", first_cat)
        self.assertIn("gross_margin_pct", first_cat)

    def test_sales_anomalies(self):
        anomalies = AnalyticsEngine.detect_sales_anomalies(days_window=7, comparison_days=30)
        self.assertIn("sales_spikes", anomalies)
        self.assertIn("sales_drops", anomalies)

if __name__ == "__main__":
    unittest.main()

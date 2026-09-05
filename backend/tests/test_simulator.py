import unittest
from backend.database import init_db, db_session
from backend.models import Product
from backend.services.simulator_engine import SimulatorEngine
from backend.seeds.sample_data import seed_sample_database

class TestSimulatorEngine(unittest.TestCase):
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

    def test_simulation_run(self):
        prod = db_session.query(Product).first()
        self.assertIsNotNone(prod)

        sim = SimulatorEngine.simulate_product_scenario(
            product_id=prod.product_id,
            demand_change_pct=30.0,
            future_days=30,
            restock_qty=20,
            restock_day=7
        )

        self.assertEqual(sim["product_id"], prod.product_id)
        self.assertIn("baseline", sim)
        self.assertIn("simulated", sim)
        self.assertIn("comparison", sim)
        self.assertIn("trajectories", sim)
        self.assertEqual(len(sim["trajectories"]["baseline"]), 31)
        self.assertEqual(len(sim["trajectories"]["simulated"]), 31)
        self.assertIn("evidence", sim)

if __name__ == "__main__":
    unittest.main()

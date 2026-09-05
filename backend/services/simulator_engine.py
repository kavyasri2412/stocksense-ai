from datetime import datetime, date, timedelta
from sqlalchemy import func
from backend.database import db_session
from backend.models import Product, Inventory, Sale, Supplier
from backend.services.analytics_engine import AnalyticsEngine

class SimulatorEngine:
    @staticmethod
    def simulate_product_scenario(
        product_id,
        demand_change_pct=0.0,
        future_days=30,
        lead_time_override=None,
        restock_qty=0,
        restock_day=None
    ):
        """
        Runs deterministic What-If simulation for a specific product.
        """
        ref_date = AnalyticsEngine.get_reference_date()
        thirty_days_ago = ref_date - timedelta(days=30)

        product = db_session.query(Product).filter(Product.product_id == product_id).first()
        if not product:
            return {"error": f"Product with ID '{product_id}' not found"}

        # Fetch current stock
        current_stock = db_session.query(func.sum(Inventory.current_stock)).filter(
            Inventory.product_id == product_id
        ).scalar() or 0

        # Fetch 30-day sales for baseline ADS
        total_sold_30d = db_session.query(func.sum(Sale.quantity_sold)).filter(
            Sale.product_id == product_id,
            Sale.sale_date >= thirty_days_ago,
            Sale.sale_date <= ref_date
        ).scalar() or 0

        baseline_ads = float(total_sold_30d) / 30.0
        adjusted_ads = max(0.0, baseline_ads * (1.0 + (demand_change_pct / 100.0)))

        lead_time = lead_time_override if lead_time_override is not None else (
            product.supplier_rel.lead_time_days if product.supplier_rel else 7
        )

        arrival_day = restock_day if restock_day is not None else lead_time
        selling_price = float(product.selling_price or 0.0)

        # Generate Day-by-Day Trajectory
        baseline_trajectory = []
        simulated_trajectory = []

        baseline_stock_tracker = float(current_stock)
        simulated_stock_tracker = float(current_stock)

        baseline_stockout_day = None
        simulated_stockout_day = None

        baseline_total_demand = 0.0
        simulated_total_demand = 0.0

        for day in range(0, future_days + 1):
            curr_sim_date = ref_date + timedelta(days=day)
            date_label = curr_sim_date.strftime("%b %d")

            # Check if restock arrives today in simulated scenario
            if day == arrival_day and restock_qty > 0:
                simulated_stock_tracker += restock_qty

            baseline_trajectory.append({
                "day": day,
                "date": curr_sim_date.isoformat(),
                "date_label": date_label,
                "stock": max(0.0, round(baseline_stock_tracker, 1)),
                "is_stockout": baseline_stock_tracker <= 0
            })

            simulated_trajectory.append({
                "day": day,
                "date": curr_sim_date.isoformat(),
                "date_label": date_label,
                "stock": max(0.0, round(simulated_stock_tracker, 1)),
                "is_stockout": simulated_stock_tracker <= 0
            })

            if baseline_stock_tracker <= 0 and baseline_stockout_day is None and day > 0:
                baseline_stockout_day = day
            if simulated_stock_tracker <= 0 and simulated_stockout_day is None and day > 0:
                simulated_stockout_day = day

            if day > 0:
                baseline_stock_tracker -= baseline_ads
                simulated_stock_tracker -= adjusted_ads
                baseline_total_demand += baseline_ads
                simulated_total_demand += adjusted_ads

        # Coverage and shortage calculations
        baseline_coverage_days = round(current_stock / baseline_ads, 1) if baseline_ads > 0 else (999.0 if current_stock > 0 else 0.0)
        simulated_coverage_days = round(current_stock / adjusted_ads, 1) if adjusted_ads > 0 else (999.0 if current_stock > 0 else 0.0)

        simulated_shortage_units = max(0.0, (simulated_total_demand - (current_stock + (restock_qty if arrival_day <= future_days else 0))))
        simulated_rev_at_risk = round(simulated_shortage_units * selling_price, 2)

        baseline_shortage_units = max(0.0, (baseline_total_demand - current_stock))
        baseline_rev_at_risk = round(baseline_shortage_units * selling_price, 2)

        # Risk level determination
        if simulated_stockout_day is not None and simulated_stockout_day <= lead_time:
            risk_level = "Critical"
            action = f"Immediate Reorder Required: Stock will deplete on day {simulated_stockout_day}, before supplier lead time of {lead_time} days."
        elif simulated_stockout_day is not None and simulated_stockout_day <= future_days:
            risk_level = "High"
            action = f"Plan Restock: Stockout anticipated around day {simulated_stockout_day}. Place order before day {max(1, simulated_stockout_day - lead_time)}."
        elif simulated_coverage_days > (future_days * 2) and demand_change_pct < -20:
            risk_level = "Overstock Warning"
            action = "Overstock Risk: Demand decline extends stock coverage significantly. Consider pausing scheduled purchase orders."
        else:
            risk_level = "Safe / Healthy"
            action = f"Inventory Sufficient: Current stock covers the full {future_days}-day horizon under this scenario."

        return {
            "product_id": product.product_id,
            "product_name": product.product_name,
            "category": product.category,
            "selling_price": selling_price,
            "parameters": {
                "demand_change_pct": demand_change_pct,
                "future_days": future_days,
                "lead_time_days": lead_time,
                "restock_qty": restock_qty,
                "restock_day": arrival_day
            },
            "baseline": {
                "current_stock": current_stock,
                "average_daily_sales": round(baseline_ads, 2),
                "coverage_days": baseline_coverage_days,
                "stockout_day": baseline_stockout_day,
                "stockout_date": (ref_date + timedelta(days=baseline_stockout_day)).isoformat() if baseline_stockout_day else None,
                "total_demand": round(baseline_total_demand, 1),
                "shortage_units": round(baseline_shortage_units, 1),
                "revenue_at_risk": baseline_rev_at_risk
            },
            "simulated": {
                "adjusted_daily_demand": round(adjusted_ads, 2),
                "coverage_days": simulated_coverage_days,
                "stockout_day": simulated_stockout_day,
                "stockout_date": (ref_date + timedelta(days=simulated_stockout_day)).isoformat() if simulated_stockout_day else None,
                "total_demand": round(simulated_total_demand, 1),
                "shortage_units": round(simulated_shortage_units, 1),
                "revenue_at_risk": simulated_rev_at_risk,
                "risk_level": risk_level,
                "recommended_action": action
            },
            "comparison": {
                "demand_diff_units": round(simulated_total_demand - baseline_total_demand, 1),
                "shortage_diff_units": round(simulated_shortage_units - baseline_shortage_units, 1),
                "revenue_risk_diff": round(simulated_rev_at_risk - baseline_rev_at_risk, 2),
                "runway_diff_days": round(simulated_coverage_days - baseline_coverage_days, 1) if baseline_coverage_days < 900 else "N/A"
            },
            "trajectories": {
                "baseline": baseline_trajectory,
                "simulated": simulated_trajectory
            },
            "evidence": {
                "source_tables": ["products", "inventory", "sales", "suppliers"],
                "date_range": f"{thirty_days_ago.isoformat()} to {ref_date.isoformat()}",
                "formula": "AdjustedADS = BaseADS * (1 + DemandShift%); Stock(t) = Stock(t-1) - AdjustedADS + Restock(t)",
                "disclaimer": "Scenario estimates are based on 30-day historical sales velocity and do not guarantee future performance."
            }
        }

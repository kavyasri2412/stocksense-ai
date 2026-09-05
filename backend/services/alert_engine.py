from datetime import datetime, date, timedelta
from sqlalchemy import func
from backend.database import db_session
from backend.models import Product, Inventory, Sale, Supplier
from backend.services.analytics_engine import AnalyticsEngine

class AlertEngine:
    @staticmethod
    def evaluate_all_alerts(store_id=None):
        """
        Executes deterministic rules across all active inventory and sales records.
        Returns categorized alerts and Today's Priority ranking.
        """
        ref_date = AnalyticsEngine.get_reference_date()
        thirty_days_ago = ref_date - timedelta(days=30)
        seven_days_ago = ref_date - timedelta(days=7)

        # 1. Fetch products and their suppliers
        products = db_session.query(Product).filter(Product.active_status == True).all()

        # 2. Fetch inventory aggregated per product
        inv_records = db_session.query(
            Inventory.product_id,
            func.sum(Inventory.current_stock).label("total_stock"),
            func.sum(Inventory.reserved_stock).label("total_reserved"),
            func.max(Inventory.last_restock_date).label("last_restocked"),
            func.max(Inventory.updated_at).label("last_updated")
        ).group_by(Inventory.product_id).all()
        stock_map = {r.product_id: r for r in inv_records}

        # 3. Fetch 30-day and 7-day sales per product
        sales_30d = db_session.query(
            Sale.product_id,
            func.sum(Sale.quantity_sold).label("units_30d"),
            func.sum(Sale.total_amount).label("rev_30d"),
            func.count(Sale.sale_id).label("tx_30d")
        ).filter(Sale.sale_date >= thirty_days_ago, Sale.sale_date <= ref_date)
        if store_id:
            sales_30d = sales_30d.filter(Sale.store_id == store_id)
        sales_30d_map = {r.product_id: r for r in sales_30d.group_by(Sale.product_id).all()}

        sales_7d = db_session.query(
            Sale.product_id,
            func.sum(Sale.quantity_sold).label("units_7d")
        ).filter(Sale.sale_date > seven_days_ago, Sale.sale_date <= ref_date)
        if store_id:
            sales_7d = sales_7d.filter(Sale.store_id == store_id)
        sales_7d_map = {r.product_id: r.units_7d for r in sales_7d.group_by(Sale.product_id).all()}

        alerts = []
        priorities = []
        revenue_at_risk_list = []
        data_quality_issues = []

        for prod in products:
            prod_id = prod.product_id
            stock_data = stock_map.get(prod_id)
            current_stock = int(stock_data.total_stock) if stock_data and stock_data.total_stock is not None else None
            reserved_stock = int(stock_data.total_reserved) if stock_data and stock_data.total_reserved is not None else 0
            
            s_30 = sales_30d_map.get(prod_id)
            units_30d = int(s_30.units_30d) if s_30 and s_30.units_30d is not None else 0
            rev_30d = float(s_30.rev_30d) if s_30 and s_30.rev_30d is not None else 0.0
            
            units_7d = int(sales_7d_map.get(prod_id, 0) or 0)

            ads_30d = float(units_30d) / 30.0
            ads_7d = float(units_7d) / 7.0

            lead_time = prod.supplier_rel.lead_time_days if prod.supplier_rel else 7
            reorder_lvl = prod.reorder_level or 10
            reorder_qty = prod.reorder_quantity or 20
            price = float(prod.selling_price or 0.0)

            # Check Data Quality / Missing data
            missing_fields = []
            if current_stock is None:
                missing_fields.append("No Inventory Record")
            if price <= 0:
                missing_fields.append("Missing Selling Price")
            if not prod.supplier_rel and not prod.supplier:
                missing_fields.append("No Supplier Details")
            if s_30 is None:
                missing_fields.append("No Sales History in last 30 days")

            if missing_fields:
                data_quality_issues.append({
                    "product_id": prod_id,
                    "product_name": prod.product_name,
                    "category": prod.category,
                    "missing_fields": missing_fields,
                    "severity": "Warning" if current_stock is not None else "Critical",
                    "reason": f"Product has incomplete data: {', '.join(missing_fields)}."
                })

            if current_stock is None:
                # Cannot compute stock metrics without inventory
                continue

            # Days remaining calculation
            if ads_30d > 0:
                days_remaining = round(current_stock / ads_30d, 1)
            else:
                days_remaining = 999.0 if current_stock > 0 else 0.0

            # -------------------------------------------------------------
            # 1. Stock-out Risk & Revenue at Risk
            # -------------------------------------------------------------
            # Expected demand during supplier lead time: ADS * Lead Time
            lead_time_demand = round(ads_30d * lead_time, 1)
            shortage_risk = max(0.0, lead_time_demand - current_stock)
            rev_at_risk = round(shortage_risk * price, 2)

            is_stockout = current_stock == 0
            is_imminent_stockout = (days_remaining <= lead_time) and (ads_30d > 0)
            is_low_stock = (current_stock <= reorder_lvl) and not is_stockout

            if rev_at_risk > 0 or is_stockout or is_imminent_stockout:
                revenue_at_risk_list.append({
                    "product_id": prod_id,
                    "product_name": prod.product_name,
                    "category": prod.category,
                    "current_stock": current_stock,
                    "average_daily_sales": round(ads_30d, 2),
                    "lead_time_days": lead_time,
                    "expected_demand_during_lead_time": lead_time_demand,
                    "estimated_shortage": round(shortage_risk, 1),
                    "selling_price": price,
                    "revenue_at_risk": rev_at_risk,
                    "days_remaining": days_remaining,
                    "recommended_action": "Reorder immediately" if (is_stockout or days_remaining <= 3) else "Reorder soon",
                    "evidence": {
                        "source_tables": ["inventory", "sales", "products", "suppliers"],
                        "date_range": f"{thirty_days_ago.isoformat()} to {ref_date.isoformat()}",
                        "formula": "Shortage = max(0, (ADS * LeadTime) - CurrentStock); RevenueAtRisk = Shortage * SellingPrice",
                        "values_used": {
                            "current_stock": current_stock,
                            "ads_30d": round(ads_30d, 2),
                            "lead_time_days": lead_time,
                            "selling_price": price
                        },
                        "last_updated": stock_data.last_updated.isoformat() if stock_data and stock_data.last_updated else datetime.utcnow().isoformat()
                    }
                })

            # -------------------------------------------------------------
            # 2. Deterministic Alerts
            # -------------------------------------------------------------
            if is_stockout:
                alerts.append({
                    "alert_id": f"ALT-SO-{prod_id}",
                    "product_id": prod_id,
                    "product_name": prod.product_name,
                    "category": prod.category,
                    "alert_type": "Stock-out",
                    "severity": "Critical",
                    "message": f"Stock is depleted (0 units). Daily demand is {ads_30d:.1f} units.",
                    "metric_value": f"0 units ({days_remaining} days)",
                    "action": "Reorder immediately",
                    "reorder_quantity": reorder_qty
                })
            elif is_imminent_stockout:
                alerts.append({
                    "alert_id": f"ALT-IMS-{prod_id}",
                    "product_id": prod_id,
                    "product_name": prod.product_name,
                    "category": prod.category,
                    "alert_type": "Imminent Stock-out Risk",
                    "severity": "Critical",
                    "message": f"Runway ({days_remaining:.1f} days) is less than supplier lead time ({lead_time} days).",
                    "metric_value": f"{days_remaining:.1f} days runway",
                    "action": "Reorder immediately",
                    "reorder_quantity": reorder_qty
                })
            elif is_low_stock:
                alerts.append({
                    "alert_id": f"ALT-LOW-{prod_id}",
                    "product_id": prod_id,
                    "product_name": prod.product_name,
                    "category": prod.category,
                    "alert_type": "Low Stock",
                    "severity": "Warning",
                    "message": f"Current stock ({current_stock}) is at or below reorder threshold ({reorder_lvl}).",
                    "metric_value": f"{current_stock} / {reorder_lvl} units",
                    "action": "Reorder soon",
                    "reorder_quantity": reorder_qty
                })

            # Overstock alert
            if days_remaining > 60 and current_stock > (reorder_lvl * 2.5) and current_stock > 15:
                excess_units = current_stock - (reorder_lvl * 2)
                tied_capital = round(excess_units * (prod.cost_price or (price * 0.6)), 2)
                alerts.append({
                    "alert_id": f"ALT-OVS-{prod_id}",
                    "product_id": prod_id,
                    "product_name": prod.product_name,
                    "category": prod.category,
                    "alert_type": "Overstock",
                    "severity": "Info",
                    "message": f"Excess inventory detected ({days_remaining:.0f} days runway). Approx ${tied_capital:,.2f} tied in excess stock.",
                    "metric_value": f"{days_remaining:.0f} days runway",
                    "action": "Review pricing / Run promotional bundle",
                    "reorder_quantity": 0
                })

            # Slow mover
            if ads_30d < 0.15 and current_stock > 10 and units_30d <= 2:
                alerts.append({
                    "alert_id": f"ALT-SLO-{prod_id}",
                    "product_id": prod_id,
                    "product_name": prod.product_name,
                    "category": prod.category,
                    "alert_type": "Slow Moving",
                    "severity": "Info",
                    "message": f"Only {units_30d} units sold in past 30 days while holding {current_stock} units.",
                    "metric_value": f"{ads_30d:.2f} units/day",
                    "action": "Monitor sales / Discount clearance",
                    "reorder_quantity": 0
                })

            # -------------------------------------------------------------
            # 3. Priority Ranking Score Calculation
            # -------------------------------------------------------------
            # Priority Score factors:
            # - Urgency score: lower days remaining -> higher score (0 to 50 pts)
            # - Financial impact: revenue at risk (0 to 30 pts)
            # - Sales velocity: ADS (0 to 20 pts)
            urgency_score = 0
            if current_stock == 0 and ads_30d > 0:
                urgency_score = 50
            elif days_remaining <= 3:
                urgency_score = 45
            elif days_remaining <= lead_time:
                urgency_score = 40
            elif days_remaining <= 14:
                urgency_score = 25
            elif days_remaining <= 30:
                urgency_score = 10
            
            rev_risk_score = min(30.0, (rev_at_risk / 100.0) * 5.0)  # capped at 30
            velocity_score = min(20.0, ads_30d * 4.0)  # capped at 20

            total_priority_score = round(urgency_score + rev_risk_score + velocity_score, 1)

            priority_level = "Low"
            action_type = "No action required"
            reason = "Stock levels and sales velocity are in healthy equilibrium."

            if current_stock == 0 and ads_30d > 0:
                priority_level = "Critical"
                action_type = "Reorder immediately"
                reason = f"Stock is completely exhausted while demand is {ads_30d:.1f} units/day."
            elif is_imminent_stockout:
                priority_level = "Critical" if rev_at_risk > 200 else "High"
                action_type = "Reorder immediately"
                reason = f"Stock will deplete in {days_remaining:.1f} days, which is less than supplier lead time ({lead_time} days)."
            elif is_low_stock:
                priority_level = "High" if ads_30d >= 1.0 else "Medium"
                action_type = "Reorder soon"
                reason = f"Stock ({current_stock} units) has breached the reorder threshold ({reorder_lvl} units)."
            elif days_remaining > 60 and current_stock > (reorder_lvl * 2):
                priority_level = "Medium"
                action_type = "Review pricing / Run promotion"
                reason = f"Holding {days_remaining:.0f} days of inventory. Capital is tied up."
            elif ads_30d == 0 and current_stock > 0:
                priority_level = "Low"
                action_type = "Monitor sales"
                reason = "No sales recorded in the past 30 days."

            priorities.append({
                "product_id": prod_id,
                "product_name": prod.product_name,
                "category": prod.category,
                "priority_level": priority_level,
                "priority_score": total_priority_score,
                "current_stock": current_stock,
                "reorder_level": reorder_lvl,
                "reorder_quantity": reorder_qty,
                "average_daily_sales": round(ads_30d, 2),
                "lead_time_days": lead_time,
                "days_remaining": days_remaining,
                "revenue_at_risk": rev_at_risk,
                "reason": reason,
                "recommended_action": action_type,
                "supplier": prod.supplier_rel.supplier_name if prod.supplier_rel else (prod.supplier or "Supplier not assigned"),
                "evidence": {
                    "source_tables": ["products", "inventory", "sales", "suppliers"],
                    "date_range": f"{thirty_days_ago.isoformat()} to {ref_date.isoformat()}",
                    "formula": "PriorityScore = Urgency(DaysRemaining, LeadTime) + Impact(RevenueAtRisk) + Velocity(ADS)",
                    "values_used": {
                        "current_stock": current_stock,
                        "ads_30d": round(ads_30d, 2),
                        "days_remaining": days_remaining,
                        "lead_time_days": lead_time,
                        "revenue_at_risk": rev_at_risk
                    }
                }
            })

        # Sort priority rankings by score descending
        priorities.sort(key=lambda x: (
            {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}.get(x["priority_level"], 0),
            x["priority_score"]
        ), reverse=True)

        revenue_at_risk_list.sort(key=lambda x: x["revenue_at_risk"], reverse=True)

        return {
            "alerts": alerts,
            "todays_priorities": priorities[:15],
            "revenue_at_risk": revenue_at_risk_list[:15],
            "total_revenue_at_risk": round(sum(item["revenue_at_risk"] for item in revenue_at_risk_list), 2),
            "data_quality_issues": data_quality_issues
        }

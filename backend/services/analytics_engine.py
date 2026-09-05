from datetime import datetime, date, timedelta
from sqlalchemy import func, desc, and_, or_
from backend.database import db_session
from backend.models import Product, Inventory, Sale, Store, Supplier

class AnalyticsEngine:
    @staticmethod
    def get_reference_date():
        """
        Returns the reference 'current' date for analytics calculations.
        If sales data is historical, picks the latest sale date or today's date.
        """
        latest_sale = db_session.query(func.max(Sale.sale_date)).scalar()
        if latest_sale:
            return latest_sale
        return date.today()

    @staticmethod
    def get_dashboard_kpis(store_id=None):
        """
        Calculates all headline KPI numbers directly from real database records.
        """
        ref_date = AnalyticsEngine.get_reference_date()
        today = ref_date
        yesterday = today - timedelta(days=1)
        thirty_days_ago = today - timedelta(days=30)
        seven_days_ago = today - timedelta(days=7)

        # 1. Total Active Products
        prod_query = db_session.query(Product).filter(Product.active_status == True)
        total_products = prod_query.count()

        # 2. Total Sales & Today's Revenue
        sales_query = db_session.query(Sale)
        if store_id:
            sales_query = sales_query.filter(Sale.store_id == store_id)

        total_sales_revenue = sales_query.with_entities(func.sum(Sale.total_amount)).scalar() or 0.0
        total_units_sold = sales_query.with_entities(func.sum(Sale.quantity_sold)).scalar() or 0

        today_revenue = sales_query.filter(Sale.sale_date == today).with_entities(func.sum(Sale.total_amount)).scalar() or 0.0
        yesterday_revenue = sales_query.filter(Sale.sale_date == yesterday).with_entities(func.sum(Sale.total_amount)).scalar() or 0.0

        today_units = sales_query.filter(Sale.sale_date == today).with_entities(func.sum(Sale.quantity_sold)).scalar() or 0

        # 7-day revenue & 30-day revenue
        rev_7d = sales_query.filter(Sale.sale_date >= seven_days_ago).with_entities(func.sum(Sale.total_amount)).scalar() or 0.0
        rev_30d = sales_query.filter(Sale.sale_date >= thirty_days_ago).with_entities(func.sum(Sale.total_amount)).scalar() or 0.0

        # 3. Current Inventory Value & Units
        inv_query = db_session.query(Inventory, Product).join(Product, Inventory.product_id == Product.product_id)
        if store_id:
            # Match store name or ID if inventory has store identifier
            inv_query = inv_query.filter(or_(Inventory.warehouse_or_store == store_id, Inventory.warehouse_or_store.like(f"%{store_id}%")))
        
        all_inventory_items = inv_query.all()
        
        total_inventory_units = 0
        total_inventory_cost_value = 0.0
        total_inventory_retail_value = 0.0
        
        product_stock_map = {}
        for inv, prod in all_inventory_items:
            stock = inv.current_stock or 0
            cost = prod.cost_price if prod.cost_price is not None else (prod.selling_price * 0.6)
            retail = prod.selling_price or 0.0
            
            total_inventory_units += stock
            total_inventory_cost_value += (stock * cost)
            total_inventory_retail_value += (stock * retail)
            
            if prod.product_id not in product_stock_map:
                product_stock_map[prod.product_id] = {
                    "product": prod,
                    "current_stock": 0,
                    "reserved_stock": 0,
                    "warehouse_or_store": inv.warehouse_or_store
                }
            product_stock_map[prod.product_id]["current_stock"] += stock
            product_stock_map[prod.product_id]["reserved_stock"] += (inv.reserved_stock or 0)

        # 4. Product Velocity & Stock Categorization
        low_stock_count = 0
        critical_stock_count = 0
        overstock_count = 0
        fast_moving_count = 0
        slow_moving_count = 0
        attention_count = 0
        
        # Calculate 30-day sales per product for velocity
        thirty_day_sales = db_session.query(
            Sale.product_id,
            func.sum(Sale.quantity_sold).label("total_qty"),
            func.sum(Sale.total_amount).label("total_rev")
        ).filter(Sale.sale_date >= thirty_days_ago)
        if store_id:
            thirty_day_sales = thirty_day_sales.filter(Sale.store_id == store_id)
        thirty_day_sales = thirty_day_sales.group_by(Sale.product_id).all()
        
        sales_30d_map = {item.product_id: {"qty": item.total_qty, "rev": item.total_rev} for item in thirty_day_sales}
        
        all_products = prod_query.all()
        for prod in all_products:
            stock_info = product_stock_map.get(prod.product_id, {"current_stock": 0, "reserved_stock": 0})
            current_stock = stock_info["current_stock"]
            reorder_lvl = prod.reorder_level or 10
            
            p_sales = sales_30d_map.get(prod.product_id, {"qty": 0, "rev": 0.0})
            ads = p_sales["qty"] / 30.0  # Average Daily Sales over 30 days
            
            days_remaining = (current_stock / ads) if ads > 0 else (999.0 if current_stock > 0 else 0.0)
            
            # Stock Status logic
            if current_stock == 0:
                critical_stock_count += 1
                attention_count += 1
            elif current_stock <= reorder_lvl or days_remaining <= 5:
                low_stock_count += 1
                attention_count += 1
            elif days_remaining > 60 and current_stock > (reorder_lvl * 2.5):
                overstock_count += 1
                attention_count += 1
            
            # Velocity logic
            if ads >= 3.0:
                fast_moving_count += 1
            elif ads < 0.2 and p_sales["qty"] <= 2:
                slow_moving_count += 1

        # Calculate revenue growth compared to previous day
        revenue_growth_day_pct = 0.0
        if yesterday_revenue > 0:
            revenue_growth_day_pct = round(((today_revenue - yesterday_revenue) / yesterday_revenue) * 100, 1)

        return {
            "reference_date": ref_date.isoformat(),
            "total_sales_revenue": round(total_sales_revenue, 2),
            "today_revenue": round(today_revenue, 2),
            "yesterday_revenue": round(yesterday_revenue, 2),
            "revenue_growth_day_pct": revenue_growth_day_pct,
            "revenue_7d": round(rev_7d, 2),
            "revenue_30d": round(rev_30d, 2),
            "total_units_sold": int(total_units_sold),
            "today_units": int(today_units),
            "total_products": total_products,
            "total_inventory_units": int(total_inventory_units),
            "current_inventory_value": round(total_inventory_cost_value, 2),
            "current_inventory_retail_value": round(total_inventory_retail_value, 2),
            "low_stock_products": low_stock_count + critical_stock_count,
            "critical_stock_products": critical_stock_count,
            "overstocked_products": overstock_count,
            "fast_moving_products": fast_moving_count,
            "slow_moving_products": slow_moving_count,
            "products_requiring_attention_today": attention_count
        }

    @staticmethod
    def get_sales_velocity(product_id, days=30, store_id=None):
        """
        Calculates exact deterministic average daily sales (ADS) for a product over N days.
        """
        ref_date = AnalyticsEngine.get_reference_date()
        start_date = ref_date - timedelta(days=days)

        query = db_session.query(
            func.sum(Sale.quantity_sold).label("total_sold"),
            func.sum(Sale.total_amount).label("total_rev"),
            func.count(Sale.sale_id).label("transactions")
        ).filter(
            Sale.product_id == product_id,
            Sale.sale_date >= start_date,
            Sale.sale_date <= ref_date
        )

        if store_id:
            query = query.filter(Sale.store_id == store_id)

        result = query.first()
        total_sold = result.total_sold or 0
        total_rev = result.total_rev or 0.0
        transactions = result.transactions or 0

        ads = float(total_sold) / float(days)
        return {
            "days_evaluated": days,
            "start_date": start_date.isoformat(),
            "end_date": ref_date.isoformat(),
            "total_units_sold": int(total_sold),
            "total_revenue": round(float(total_rev), 2),
            "transactions_count": int(transactions),
            "average_daily_sales": round(ads, 3)
        }

    @staticmethod
    def get_sales_trends(timeframe="daily", days=30, store_id=None):
        """
        Returns real database sales aggregates by day, week, or month.
        """
        ref_date = AnalyticsEngine.get_reference_date()
        start_date = ref_date - timedelta(days=days)

        query = db_session.query(
            Sale.sale_date,
            func.sum(Sale.total_amount).label("daily_revenue"),
            func.sum(Sale.quantity_sold).label("daily_units"),
            func.count(Sale.sale_id).label("order_count")
        ).filter(
            Sale.sale_date >= start_date,
            Sale.sale_date <= ref_date
        )

        if store_id:
            query = query.filter(Sale.store_id == store_id)

        daily_records = query.group_by(Sale.sale_date).order_by(Sale.sale_date.asc()).all()

        if timeframe == "daily":
            return [
                {
                    "date": rec.sale_date.isoformat(),
                    "label": rec.sale_date.strftime("%b %d"),
                    "revenue": round(float(rec.daily_revenue or 0.0), 2),
                    "units": int(rec.daily_units or 0),
                    "orders": int(rec.order_count or 0)
                }
                for rec in daily_records
            ]
        elif timeframe == "weekly":
            # Group by ISO week
            weekly_map = {}
            for rec in daily_records:
                year, week_num, _ = rec.sale_date.isocalendar()
                key = f"{year}-W{week_num:02d}"
                if key not in weekly_map:
                    weekly_map[key] = {
                        "date": rec.sale_date.isoformat(),
                        "label": f"Week {week_num}",
                        "revenue": 0.0,
                        "units": 0,
                        "orders": 0
                    }
                weekly_map[key]["revenue"] += float(rec.daily_revenue or 0.0)
                weekly_map[key]["units"] += int(rec.daily_units or 0)
                weekly_map[key]["orders"] += int(rec.order_count or 0)
            
            return [
                {
                    "date": item["date"],
                    "label": item["label"],
                    "revenue": round(item["revenue"], 2),
                    "units": item["units"],
                    "orders": item["orders"]
                }
                for item in sorted(weekly_map.values(), key=lambda x: x["date"])
            ]
        elif timeframe == "monthly":
            # Group by Year-Month
            monthly_map = {}
            for rec in daily_records:
                key = rec.sale_date.strftime("%Y-%m")
                label = rec.sale_date.strftime("%b %Y")
                if key not in monthly_map:
                    monthly_map[key] = {
                        "date": rec.sale_date.isoformat(),
                        "label": label,
                        "revenue": 0.0,
                        "units": 0,
                        "orders": 0
                    }
                monthly_map[key]["revenue"] += float(rec.daily_revenue or 0.0)
                monthly_map[key]["units"] += int(rec.daily_units or 0)
                monthly_map[key]["orders"] += int(rec.order_count or 0)

            return [
                {
                    "date": item["date"],
                    "label": item["label"],
                    "revenue": round(item["revenue"], 2),
                    "units": item["units"],
                    "orders": item["orders"]
                }
                for item in sorted(monthly_map.values(), key=lambda x: x["date"])
            ]
        return []

    @staticmethod
    def get_category_performance(days=30, store_id=None):
        """
        Computes revenue, units, and margin by product category.
        """
        ref_date = AnalyticsEngine.get_reference_date()
        start_date = ref_date - timedelta(days=days)

        query = db_session.query(
            Product.category,
            func.sum(Sale.total_amount).label("category_revenue"),
            func.sum(Sale.quantity_sold).label("category_units"),
            func.count(Sale.sale_id).label("sale_count"),
            func.sum(Sale.quantity_sold * Product.cost_price).label("total_cost")
        ).join(Sale, Product.product_id == Sale.product_id).filter(
            Sale.sale_date >= start_date,
            Sale.sale_date <= ref_date
        )

        if store_id:
            query = query.filter(Sale.store_id == store_id)

        results = query.group_by(Product.category).all()
        total_revenue_all = sum(float(r.category_revenue or 0.0) for r in results) or 1.0

        categories = []
        for r in results:
            rev = float(r.category_revenue or 0.0)
            cost = float(r.total_cost or (rev * 0.6))
            profit = rev - cost
            margin_pct = (profit / rev * 100.0) if rev > 0 else 0.0
            share_pct = (rev / total_revenue_all) * 100.0

            categories.append({
                "category": r.category or "Uncategorized",
                "revenue": round(rev, 2),
                "units": int(r.category_units or 0),
                "sales_count": int(r.sale_count or 0),
                "gross_profit": round(profit, 2),
                "gross_margin_pct": round(margin_pct, 1),
                "revenue_share_pct": round(share_pct, 1)
            })

        return sorted(categories, key=lambda x: x["revenue"], reverse=True)

    @staticmethod
    def get_best_and_worst_selling_products(days=30, limit=10, store_id=None):
        """
        Returns top selling products and slow moving products with metrics.
        """
        ref_date = AnalyticsEngine.get_reference_date()
        start_date = ref_date - timedelta(days=days)

        query = db_session.query(
            Product.product_id,
            Product.product_name,
            Product.category,
            Product.selling_price,
            Product.cost_price,
            func.sum(Sale.quantity_sold).label("total_units"),
            func.sum(Sale.total_amount).label("total_revenue")
        ).join(Sale, Product.product_id == Sale.product_id).filter(
            Sale.sale_date >= start_date,
            Sale.sale_date <= ref_date
        )

        if store_id:
            query = query.filter(Sale.store_id == store_id)

        top_results = query.group_by(
            Product.product_id, Product.product_name, Product.category, Product.selling_price, Product.cost_price
        ).order_by(desc("total_revenue")).limit(limit).all()

        best_sellers = []
        for r in top_results:
            rev = float(r.total_revenue or 0.0)
            cost = float(r.cost_price or 0.0) * int(r.total_units or 0)
            margin = ((rev - cost) / rev * 100.0) if rev > 0 and cost > 0 else 0.0
            ads = float(r.total_units or 0) / float(days)

            best_sellers.append({
                "product_id": r.product_id,
                "product_name": r.product_name,
                "category": r.category,
                "selling_price": round(float(r.selling_price or 0.0), 2),
                "total_units": int(r.total_units or 0),
                "total_revenue": round(rev, 2),
                "average_daily_sales": round(ads, 2),
                "gross_margin_pct": round(margin, 1)
            })

        # All products including those with 0 sales
        all_prods = db_session.query(Product).filter(Product.active_status == True).all()
        sold_prod_ids = {r.product_id for r in db_session.query(Sale.product_id).filter(Sale.sale_date >= start_date).distinct().all()}

        slow_movers = []
        for prod in all_prods:
            if prod.product_id not in sold_prod_ids:
                # Find current stock
                stock_val = db_session.query(func.sum(Inventory.current_stock)).filter(Inventory.product_id == prod.product_id).scalar() or 0
                slow_movers.append({
                    "product_id": prod.product_id,
                    "product_name": prod.product_name,
                    "category": prod.category,
                    "selling_price": round(float(prod.selling_price or 0.0), 2),
                    "current_stock": int(stock_val),
                    "total_units_sold_30d": 0,
                    "total_revenue_30d": 0.0,
                    "average_daily_sales": 0.0,
                    "status": "Zero Sales in Period"
                })

        return {
            "best_sellers": best_sellers,
            "slow_movers": slow_movers[:limit]
        }

    @staticmethod
    def detect_sales_anomalies(days_window=7, comparison_days=30, store_id=None):
        """
        Deterministic anomaly detection comparing recent sales velocity (last 7 days)
        against historical baseline (previous 30 days).
        - Sales Spike: recent ADS > 1.5x baseline ADS (and min 3 units sold)
        - Sales Drop: recent ADS < 0.5x baseline ADS (and baseline was active)
        """
        ref_date = AnalyticsEngine.get_reference_date()
        recent_start = ref_date - timedelta(days=days_window)
        baseline_start = recent_start - timedelta(days=comparison_days)

        # 1. Recent Sales
        recent_q = db_session.query(
            Sale.product_id,
            func.sum(Sale.quantity_sold).label("recent_units"),
            func.sum(Sale.total_amount).label("recent_rev")
        ).filter(
            Sale.sale_date > recent_start,
            Sale.sale_date <= ref_date
        )
        if store_id:
            recent_q = recent_q.filter(Sale.store_id == store_id)
        recent_records = {r.product_id: {"units": r.recent_units, "rev": r.recent_rev} for r in recent_q.group_by(Sale.product_id).all()}

        # 2. Baseline Sales
        base_q = db_session.query(
            Sale.product_id,
            func.sum(Sale.quantity_sold).label("base_units"),
            func.sum(Sale.total_amount).label("base_rev")
        ).filter(
            Sale.sale_date >= baseline_start,
            Sale.sale_date <= recent_start
        )
        if store_id:
            base_q = base_q.filter(Sale.store_id == store_id)
        base_records = {r.product_id: {"units": r.base_units, "rev": r.base_rev} for r in base_q.group_by(Sale.product_id).all()}

        spikes = []
        drops = []

        products = db_session.query(Product).filter(Product.active_status == True).all()
        for prod in products:
            rec = recent_records.get(prod.product_id, {"units": 0, "rev": 0.0})
            base = base_records.get(prod.product_id, {"units": 0, "rev": 0.0})

            recent_ads = float(rec["units"] or 0) / float(days_window)
            base_ads = float(base["units"] or 0) / float(comparison_days)

            # Check for Spike
            if base_ads > 0 and (recent_ads / base_ads) >= 1.5 and rec["units"] >= 3:
                pct_change = round(((recent_ads - base_ads) / base_ads) * 100.0, 1)
                spikes.append({
                    "product_id": prod.product_id,
                    "product_name": prod.product_name,
                    "category": prod.category,
                    "recent_ads": round(recent_ads, 2),
                    "baseline_ads": round(base_ads, 2),
                    "percent_change": pct_change,
                    "recent_units_sold": int(rec["units"] or 0),
                    "recent_revenue": round(float(rec["rev"] or 0.0), 2),
                    "anomaly_type": "Sales Spike",
                    "severity": "High" if pct_change > 100 else "Medium",
                    "reason": f"Sales velocity increased by {pct_change}% in the last {days_window} days compared to previous {comparison_days} days baseline."
                })
            elif base_ads >= 0.5 and (recent_ads / base_ads) <= 0.5:
                pct_drop = round(((base_ads - recent_ads) / base_ads) * 100.0, 1)
                drops.append({
                    "product_id": prod.product_id,
                    "product_name": prod.product_name,
                    "category": prod.category,
                    "recent_ads": round(recent_ads, 2),
                    "baseline_ads": round(base_ads, 2),
                    "percent_change": -pct_drop,
                    "recent_units_sold": int(rec["units"] or 0),
                    "recent_revenue": round(float(rec["rev"] or 0.0), 2),
                    "anomaly_type": "Sales Drop",
                    "severity": "Critical" if pct_drop >= 75 else "Warning",
                    "reason": f"Sales velocity fell by {pct_drop}% in the last {days_window} days compared to historical baseline."
                })

        return {
            "evaluation_window_days": days_window,
            "baseline_window_days": comparison_days,
            "sales_spikes": sorted(spikes, key=lambda x: x["percent_change"], reverse=True),
            "sales_drops": sorted(drops, key=lambda x: x["percent_change"])
        }

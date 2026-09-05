import random
from datetime import datetime, date, timedelta
from werkzeug.security import generate_password_hash
from backend.database import db_session, init_db
from backend.models import Product, Inventory, Sale, Store, Supplier, User, AIQueryHistory

def seed_sample_database(clear_existing=True):
    """
    Seeds a rich, realistic retail dataset representing 60 days of live retail operations.
    """
    init_db()

    if clear_existing:
        db_session.query(AIQueryHistory).delete()
        db_session.query(Sale).delete()
        db_session.query(Inventory).delete()
        db_session.query(Product).delete()
        db_session.query(Supplier).delete()
        db_session.query(Store).delete()
        db_session.query(User).delete()
        db_session.commit()

    # 1. Users
    users_data = [
        User(
            user_id="USR-001",
            name="Elena Rostova",
            email="manager@stocksense.ai",
            role="Store Manager",
            password_hash=generate_password_hash("manager123")
        ),
        User(
            user_id="USR-002",
            name="Marcus Chen",
            email="analyst@stocksense.ai",
            role="Inventory Analyst",
            password_hash=generate_password_hash("analyst123")
        ),
        User(
            user_id="USR-003",
            name="Sarah Jenkins",
            email="admin@stocksense.ai",
            role="Business Owner / Admin",
            password_hash=generate_password_hash("admin123")
        )
    ]
    for u in users_data:
        db_session.add(u)

    # 2. Stores
    stores_data = [
        Store(store_id="STR-01", store_name="Downtown Flagship", location="452 Market St, San Francisco, CA"),
        Store(store_id="STR-02", store_name="Westside Galleria", location="1200 Wilshire Blvd, Los Angeles, CA"),
        Store(store_id="STR-03", store_name="Metro Center", location="88 5th Ave, New York, NY"),
        Store(store_id="STR-04", store_name="Oakridge Hub", location="300 Pine St, Seattle, WA")
    ]
    for s in stores_data:
        db_session.add(s)

    # 3. Suppliers
    suppliers_data = [
        Supplier(supplier_id="SUP-01", supplier_name="Apex Global Electronics", contact_details="b2b@apexelectronics.com | +1-800-273-9001", lead_time_days=7),
        Supplier(supplier_id="SUP-02", supplier_name="Urban Thread Apparel Co.", contact_details="orders@urbanthread.co | +1-888-441-2290", lead_time_days=10),
        Supplier(supplier_id="SUP-03", supplier_name="FreshHarvest Food Dist.", contact_details="dispatch@freshharvest.io | +1-800-992-1100", lead_time_days=3),
        Supplier(supplier_id="SUP-04", supplier_name="Nordic Living Decor & Home", contact_details="supply@nordicliving.de | +1-877-331-5544", lead_time_days=14),
        Supplier(supplier_id="SUP-05", supplier_name="ProAudio & Gadget Lab", contact_details="support@proaudiolab.com | +1-800-450-8822", lead_time_days=5)
    ]
    for sup in suppliers_data:
        db_session.add(sup)

    # 4. Products across 4 retail categories
    products_catalog = [
        # Electronics
        ("PRD-101", "Wireless Noise-Canceling ANC Headphones", "Electronics", "SUP-01", 179.99, 95.00, 15, 30, 8, 4.5), # low stock / high velocity
        ("PRD-102", "Ultra-Fast 65W GaN USB-C Charger", "Electronics", "SUP-01", 39.99, 14.50, 25, 50, 48, 6.2), # healthy fast seller
        ("PRD-103", "Ergonomic Mechanical Keyboard (RGB)", "Electronics", "SUP-05", 119.99, 62.00, 10, 25, 3, 2.8), # critical imminent stockout
        ("PRD-104", "Smart 4K Web Camera w/ Dual Mic", "Electronics", "SUP-05", 89.99, 44.00, 12, 25, 0, 3.2), # STOCKOUT
        ("PRD-105", "Braided 2M Lightning/USB-C Cable", "Electronics", "SUP-01", 19.99, 4.20, 30, 100, 185, 1.1), # Overstocked slow
        ("PRD-106", "True Wireless Earbuds with Wireless Case", "Electronics", "SUP-05", 69.99, 32.00, 15, 40, 22, 3.5),

        # Apparel & Footwear
        ("PRD-201", "Organic Cotton Classic Crewneck (Navy)", "Apparel", "SUP-02", 34.99, 12.50, 20, 60, 18, 2.5), # Low stock
        ("PRD-202", "Heavyweight Fleece Pullover Hoodie", "Apparel", "SUP-02", 64.99, 26.00, 15, 45, 55, 3.0), # Healthy
        ("PRD-203", "All-Weather Breathable Running Jacket", "Apparel", "SUP-02", 98.99, 42.00, 10, 25, 6, 1.8), # Critical
        ("PRD-204", "Slim-Fit Stretch Denim Jeans (Dark Indigo)", "Apparel", "SUP-02", 79.99, 31.00, 15, 30, 42, 2.2), # Healthy
        ("PRD-205", "Merino Wool Thermal Crew Socks (3-Pack)", "Apparel", "SUP-02", 24.99, 7.50, 25, 50, 140, 0.4), # Overstock / slow

        # Grocery & Gourmet Pantry
        ("PRD-301", "Artisan Roasted Whole Bean Coffee (1kg)", "Grocery", "SUP-03", 26.99, 13.20, 20, 40, 9, 5.8), # Critical fast seller
        ("PRD-302", "Organic Raw Wildflower Honey (500g)", "Grocery", "SUP-03", 15.99, 7.00, 15, 30, 35, 2.1), # Healthy
        ("PRD-303", "Cold-Pressed Extra Virgin Olive Oil (750ml)", "Grocery", "SUP-03", 22.99, 11.50, 15, 35, 4, 3.1), # Imminent stockout
        ("PRD-304", "Matcha Green Tea Ceremonial Grade (100g)", "Grocery", "SUP-03", 29.99, 14.00, 10, 25, 0, 2.0), # STOCKOUT
        ("PRD-305", "Gourmet Himalayan Pink Salt Grinder", "Grocery", "SUP-03", 11.99, 3.80, 20, 50, 160, 0.3), # Overstock

        # Home & Living
        ("PRD-401", "Aromatherapy Ceramic Essential Oil Diffuser", "Home Goods", "SUP-04", 48.99, 19.50, 12, 30, 14, 2.2), # Low stock
        ("PRD-402", "Double-Walled Stainless Insulated Tumbler", "Home Goods", "SUP-04", 28.99, 9.80, 20, 50, 75, 4.0), # Healthy
        ("PRD-403", "Hand-Poured Soy Wax Scented Candle (Amber)", "Home Goods", "SUP-04", 22.99, 6.50, 15, 40, 8, 1.9), # Low stock
        ("PRD-404", "Minimalist Matte Ceramic Planter & Saucer", "Home Goods", "SUP-04", 32.99, 12.00, 10, 20, 28, 0.9), # Healthy
        ("PRD-405", "Vintage Brass Table Lamp with Linen Shade", "Home Goods", "SUP-04", 89.99, 38.00, 8, 15, 2, 0.5), # Low stock slow
    ]

    products_entities = []
    inventory_entities = []
    
    for pid, pname, cat, supp, price, cost, reorder_lvl, reorder_qty, current_stk, target_ads in products_catalog:
        prod = Product(
            product_id=pid,
            product_name=pname,
            category=cat,
            supplier_id=supp,
            selling_price=price,
            cost_price=cost,
            reorder_level=reorder_lvl,
            reorder_quantity=reorder_qty,
            active_status=True,
            created_at=datetime.utcnow() - timedelta(days=90)
        )
        products_entities.append(prod)
        db_session.add(prod)

        # Inventory record for Flagship store
        inv = Inventory(
            inventory_id=f"INV-{pid}-01",
            product_id=pid,
            current_stock=current_stk,
            reserved_stock=random.randint(0, min(3, current_stk)),
            warehouse_or_store="Downtown Flagship",
            last_restock_date=datetime.utcnow() - timedelta(days=random.randint(10, 35)),
            updated_at=datetime.utcnow()
        )
        inventory_entities.append(inv)
        db_session.add(inv)

    db_session.commit()

    # 5. Generate 60 Days of Realistic Daily Sales Transactions
    today = date.today()
    sales_records = []
    sale_counter = 10001

    random.seed(42) # Deterministic for consistent repeatable metrics

    for day_offset in range(60, -1, -1):
        sale_date = today - timedelta(days=day_offset)
        is_weekend = sale_date.weekday() in (5, 6)
        weekend_multiplier = 1.35 if is_weekend else 1.0

        for pid, pname, cat, supp, price, cost, reorder_lvl, reorder_qty, current_stk, target_ads in products_catalog:
            # Add realistic daily variation
            # Spikes on recent days for some products
            recent_spike_mult = 1.0
            if pid == "PRD-102" and day_offset <= 7:
                recent_spike_mult = 1.8  # sales spike
            elif pid == "PRD-203" and day_offset <= 7:
                recent_spike_mult = 0.3  # sales drop

            expected_qty = target_ads * weekend_multiplier * recent_spike_mult
            
            # Poisson/binomial style randomization
            num_tx = max(0, int(random.gauss(expected_qty, 1.2)))
            if target_ads < 0.5:
                num_tx = 1 if random.random() < target_ads else 0

            if num_tx > 0:
                # Divide into 1 to 3 customer orders
                remaining = num_tx
                while remaining > 0:
                    sold_qty = min(remaining, random.choice([1, 2, 3]))
                    remaining -= sold_qty
                    tot_amt = round(sold_qty * price, 2)
                    store_choice = random.choice(["STR-01", "STR-01", "STR-02", "STR-03"])

                    sale = Sale(
                        sale_id=f"SL-{sale_counter}",
                        product_id=pid,
                        quantity_sold=sold_qty,
                        selling_price=price,
                        total_amount=tot_amt,
                        sale_date=sale_date,
                        store_id=store_choice
                    )
                    sales_records.append(sale)
                    sale_counter += 1

    # Bulk insert sales for speed
    db_session.bulk_save_objects(sales_records)
    db_session.commit()

    print(f"Successfully seeded database: {len(products_entities)} products, {len(inventory_entities)} inventory records, {len(sales_records)} sales records.")
    return {
        "products_seeded": len(products_entities),
        "inventory_seeded": len(inventory_entities),
        "sales_seeded": len(sales_records),
        "stores_seeded": len(stores_data),
        "suppliers_seeded": len(suppliers_data)
    }

if __name__ == "__main__":
    seed_sample_database()

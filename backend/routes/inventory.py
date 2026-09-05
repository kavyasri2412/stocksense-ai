from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from sqlalchemy import func, or_
from backend.database import db_session
from backend.models import Product, Inventory, Sale, Supplier, Store
from backend.services.analytics_engine import AnalyticsEngine

inventory_bp = Blueprint("inventory", __name__, url_prefix="/api/inventory")

@inventory_bp.route("", methods=["GET"])
def get_inventory_list():
    search = request.args.get("search", "").strip().lower()
    category = request.args.get("category")
    status_filter = request.args.get("status")
    store_filter = request.args.get("store")
    sort_by = request.args.get("sort_by", "urgency") # urgency, stock_asc, stock_desc, value_desc, name_asc

    ref_date = AnalyticsEngine.get_reference_date()
    thirty_days_ago = ref_date - timedelta(days=30)

    # Fetch 30-day sales per product for ADS
    sales_query = db_session.query(
        Sale.product_id,
        func.sum(Sale.quantity_sold).label("units_sold"),
        func.sum(Sale.total_amount).label("revenue")
    ).filter(Sale.sale_date >= thirty_days_ago, Sale.sale_date <= ref_date)
    if store_filter and store_filter != "All":
        sales_query = sales_query.filter(Sale.store_id == store_filter)
    
    sales_map = {r.product_id: r for r in sales_query.group_by(Sale.product_id).all()}

    # Query Products and Inventory
    query = db_session.query(Product, Inventory).outerjoin(
        Inventory, Product.product_id == Inventory.product_id
    ).filter(Product.active_status == True)

    if category and category != "All":
        query = query.filter(Product.category == category)
    if store_filter and store_filter != "All":
        query = query.filter(or_(Inventory.warehouse_or_store == store_filter, Inventory.warehouse_or_store.like(f"%{store_filter}%")))
    if search:
        query = query.filter(or_(
            Product.product_name.ilike(f"%{search}%"),
            Product.product_id.ilike(f"%{search}%"),
            Product.category.ilike(f"%{search}%")
        ))

    results = query.all()

    # Deduplicate product items if multiple inventory rows exist
    items = []
    seen_products = {}

    for prod, inv in results:
        pid = prod.product_id
        if pid not in seen_products:
            stock = inv.current_stock if inv else 0
            reserved = inv.reserved_stock if inv else 0
            location = inv.warehouse_or_store if inv else "Main Store"
            last_restock = inv.last_restock_date.isoformat() if (inv and inv.last_restock_date) else None
            
            s = sales_map.get(pid)
            units_sold = int(s.units_sold) if s and s.units_sold else 0
            ads = float(units_sold) / 30.0
            reorder_lvl = int(prod.reorder_level or 10)
            reorder_qty = int(prod.reorder_quantity or 20)
            price = float(prod.selling_price or 0.0)
            cost = float(prod.cost_price or (price * 0.6))
            lead_time = prod.supplier_rel.lead_time_days if prod.supplier_rel else 7

            # Status classification
            if units_sold == 0 and stock > 0:
                status = "No sales data"
                action = "Monitor sales"
                days_rem = 999.0
            elif stock == 0:
                status = "Critical"
                action = "Reorder immediately"
                days_rem = 0.0
            elif (stock / ads if ads > 0 else 999) <= lead_time or stock <= reorder_lvl:
                status = "Low stock"
                action = "Reorder soon"
                days_rem = round(stock / ads, 1) if ads > 0 else 999.0
            elif ads > 0 and (stock / ads) > 60 and stock > (reorder_lvl * 2):
                status = "Overstock"
                action = "Review pricing / Promo"
                days_rem = round(stock / ads, 1)
            else:
                status = "Healthy"
                action = "Stock optimal"
                days_rem = round(stock / ads, 1) if ads > 0 else 999.0

            item = {
                "product_id": pid,
                "product_name": prod.product_name,
                "category": prod.category,
                "supplier": prod.supplier_rel.supplier_name if prod.supplier_rel else (prod.supplier or "Standard Supplier"),
                "supplier_id": prod.supplier_id,
                "lead_time_days": lead_time,
                "current_stock": stock,
                "reserved_stock": reserved,
                "available_stock": max(0, stock - reserved),
                "reorder_level": reorder_lvl,
                "reorder_quantity": reorder_qty,
                "selling_price": price,
                "cost_price": cost,
                "inventory_cost_value": round(stock * cost, 2),
                "inventory_retail_value": round(stock * price, 2),
                "average_daily_sales": round(ads, 2),
                "units_sold_30d": units_sold,
                "estimated_days_remaining": days_rem,
                "stock_status": status,
                "recommended_action": action,
                "warehouse_or_store": location,
                "last_restock_date": last_restock
            }
            seen_products[pid] = item
            items.append(item)

    # Filter by stock status if requested
    if status_filter and status_filter != "All":
        items = [i for i in items if i["stock_status"].lower() == status_filter.lower()]

    # Sorting
    if sort_by == "urgency":
        status_weights = {"Critical": 4, "Low stock": 3, "Overstock": 2, "Healthy": 1, "No sales data": 0}
        items.sort(key=lambda x: (status_weights.get(x["stock_status"], 0), -x["estimated_days_remaining"]), reverse=True)
    elif sort_by == "stock_asc":
        items.sort(key=lambda x: x["current_stock"])
    elif sort_by == "stock_desc":
        items.sort(key=lambda x: x["current_stock"], reverse=True)
    elif sort_by == "value_desc":
        items.sort(key=lambda x: x["inventory_cost_value"], reverse=True)
    elif sort_by == "name_asc":
        items.sort(key=lambda x: x["product_name"].lower())

    stores = [r[0] for r in db_session.query(Store.store_name).distinct().all() if r[0]]
    if "Downtown Flagship" not in stores:
        stores.insert(0, "Downtown Flagship")

    return jsonify({
        "inventory": items,
        "total_items": len(items),
        "available_stores": stores
    }), 200

@inventory_bp.route("/restock", methods=["POST"])
def trigger_restock():
    data = request.get_json() or {}
    product_id = data.get("product_id")
    quantity = int(data.get("quantity", 0))
    store_name = data.get("warehouse_or_store", "Downtown Flagship")

    if not product_id or quantity <= 0:
        return jsonify({"error": "Valid product_id and positive quantity are required"}), 400

    inv = db_session.query(Inventory).filter(
        Inventory.product_id == product_id
    ).first()

    if inv:
        inv.current_stock = (inv.current_stock or 0) + quantity
        inv.last_restock_date = datetime.utcnow()
        inv.updated_at = datetime.utcnow()
    else:
        inv = Inventory(
            inventory_id=f"INV-{product_id}-01",
            product_id=product_id,
            current_stock=quantity,
            reserved_stock=0,
            warehouse_or_store=store_name,
            last_restock_date=datetime.utcnow()
        )
        db_session.add(inv)

    db_session.commit()
    return jsonify({
        "message": f"Successfully received {quantity} units for {product_id}",
        "new_stock": inv.current_stock
    }), 200

@inventory_bp.route("/adjust", methods=["POST"])
def adjust_stock():
    data = request.get_json() or {}
    product_id = data.get("product_id")
    new_stock = int(data.get("current_stock", 0))

    if not product_id or new_stock < 0:
        return jsonify({"error": "Valid product_id and non-negative current_stock required"}), 400

    inv = db_session.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inv:
        return jsonify({"error": "Inventory record not found"}), 404

    inv.current_stock = new_stock
    inv.updated_at = datetime.utcnow()
    db_session.commit()

    return jsonify({"message": "Stock adjusted successfully", "new_stock": inv.current_stock}), 200

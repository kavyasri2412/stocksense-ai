from flask import Blueprint, request, jsonify
from sqlalchemy import or_
from datetime import datetime
from backend.database import db_session
from backend.models import Product, Inventory, Sale, Supplier
from backend.services.analytics_engine import AnalyticsEngine
from backend.services.simulator_engine import SimulatorEngine

products_bp = Blueprint("products", __name__, url_prefix="/api/products")

@products_bp.route("", methods=["GET"])
def get_products():
    search = request.args.get("search", "").strip().lower()
    category = request.args.get("category")
    active_only = request.args.get("active_only", "true").lower() == "true"

    query = db_session.query(Product)
    if active_only:
        query = query.filter(Product.active_status == True)
    if category and category != "All":
        query = query.filter(Product.category == category)
    if search:
        query = query.filter(or_(
            Product.product_name.ilike(f"%{search}%"),
            Product.product_id.ilike(f"%{search}%"),
            Product.category.ilike(f"%{search}%")
        ))

    products = query.order_by(Product.product_name.asc()).all()
    categories = [r[0] for r in db_session.query(Product.category).distinct().all() if r[0]]

    return jsonify({
        "products": [p.to_dict() for p in products],
        "total_count": len(products),
        "available_categories": categories
    }), 200

@products_bp.route("/<product_id>", methods=["GET"])
def get_product_details(product_id):
    product = db_session.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        return jsonify({"error": f"Product '{product_id}' not found"}), 404

    # Fetch inventory records
    inventory_items = db_session.query(Inventory).filter(Inventory.product_id == product_id).all()
    total_stock = sum(i.current_stock or 0 for i in inventory_items)
    
    # Calculate velocity
    velocity_7d = AnalyticsEngine.get_sales_velocity(product_id, days=7)
    velocity_30d = AnalyticsEngine.get_sales_velocity(product_id, days=30)
    velocity_90d = AnalyticsEngine.get_sales_velocity(product_id, days=90)

    # Calculate 30-day simulator baseline
    simulation = SimulatorEngine.simulate_product_scenario(product_id, demand_change_pct=0, future_days=30)

    # Recent sales records
    recent_sales = db_session.query(Sale).filter(
        Sale.product_id == product_id
    ).order_by(Sale.sale_date.desc()).limit(15).all()

    return jsonify({
        "product": product.to_dict(),
        "inventory": {
            "total_stock": total_stock,
            "locations": [i.to_dict() for i in inventory_items]
        },
        "velocities": {
            "7d": velocity_7d,
            "30d": velocity_30d,
            "90d": velocity_90d
        },
        "runway_simulation": simulation,
        "recent_sales": [s.to_dict() for s in recent_sales]
    }), 200

@products_bp.route("", methods=["POST"])
def create_product():
    data = request.get_json() or {}
    pid = str(data.get("product_id", "")).strip()
    pname = str(data.get("product_name", "")).strip()
    cat = str(data.get("category", "General")).strip()
    price = float(data.get("selling_price", 0.0))
    cost = float(data.get("cost_price", price * 0.6))
    reorder_lvl = int(data.get("reorder_level", 10))
    reorder_qty = int(data.get("reorder_quantity", 20))
    initial_stock = int(data.get("initial_stock", 20))
    supp_id = data.get("supplier_id")

    if not pid or not pname:
        return jsonify({"error": "product_id and product_name are required"}), 400

    existing = db_session.query(Product).filter(Product.product_id == pid).first()
    if existing:
        return jsonify({"error": f"Product with ID '{pid}' already exists"}), 400

    prod = Product(
        product_id=pid,
        product_name=pname,
        category=cat,
        supplier_id=supp_id,
        selling_price=price,
        cost_price=cost,
        reorder_level=reorder_lvl,
        reorder_quantity=reorder_qty,
        active_status=True
    )
    db_session.add(prod)

    # Create initial inventory record
    inv = Inventory(
        inventory_id=f"INV-{pid}-01",
        product_id=pid,
        current_stock=initial_stock,
        reserved_stock=0,
        warehouse_or_store=data.get("store_name", "Main Store"),
        last_restock_date=datetime.utcnow()
    )
    db_session.add(inv)
    db_session.commit()

    return jsonify({"message": "Product created successfully", "product": prod.to_dict()}), 201

@products_bp.route("/<product_id>", methods=["PUT"])
def update_product(product_id):
    prod = db_session.query(Product).filter(Product.product_id == product_id).first()
    if not prod:
        return jsonify({"error": "Product not found"}), 404

    data = request.get_json() or {}
    if "product_name" in data: prod.product_name = data["product_name"]
    if "category" in data: prod.category = data["category"]
    if "selling_price" in data: prod.selling_price = float(data["selling_price"])
    if "cost_price" in data: prod.cost_price = float(data["cost_price"])
    if "reorder_level" in data: prod.reorder_level = int(data["reorder_level"])
    if "reorder_quantity" in data: prod.reorder_quantity = int(data["reorder_quantity"])
    if "active_status" in data: prod.active_status = bool(data["active_status"])
    if "supplier_id" in data: prod.supplier_id = data["supplier_id"]

    db_session.commit()
    return jsonify({"message": "Product updated successfully", "product": prod.to_dict()}), 200

@products_bp.route("/<product_id>", methods=["DELETE"])
def delete_product(product_id):
    prod = db_session.query(Product).filter(Product.product_id == product_id).first()
    if not prod:
        return jsonify({"error": "Product not found"}), 404

    db_session.delete(prod)
    db_session.commit()
    return jsonify({"message": "Product deleted successfully"}), 200

import os
import csv
import io
import pandas as pd
from datetime import datetime, date
from backend.database import db_session
from backend.models import Product, Inventory, Sale, Store, Supplier, User

class DataImporterService:
    @staticmethod
    def get_csv_template(entity_type):
        """
        Generates CSV template with headers and sample rows for any entity.
        """
        templates = {
            "products": {
                "headers": ["product_id", "product_name", "category", "supplier_id", "selling_price", "cost_price", "reorder_level", "reorder_quantity", "active_status"],
                "sample": ["PRD-001", "Wireless Noise-Canceling Headphones", "Electronics", "SUP-01", 149.99, 85.00, 15, 30, "true"]
            },
            "inventory": {
                "headers": ["inventory_id", "product_id", "current_stock", "reserved_stock", "warehouse_or_store", "last_restock_date"],
                "sample": ["INV-001", "PRD-001", 12, 2, "Main Downtown Store", "2024-03-01"]
            },
            "sales": {
                "headers": ["sale_id", "product_id", "quantity_sold", "selling_price", "total_amount", "sale_date", "store_id"],
                "sample": ["SL-001", "PRD-001", 3, 149.99, 449.97, "2024-03-10", "STR-01"]
            },
            "suppliers": {
                "headers": ["supplier_id", "supplier_name", "contact_details", "lead_time_days"],
                "sample": ["SUP-01", "Apex Electronics Supply", "orders@apexsupply.com | +1-800-555-0199", 7]
            },
            "stores": {
                "headers": ["store_id", "store_name", "location"],
                "sample": ["STR-01", "Downtown Flagship Store", "452 Market St, San Francisco, CA"]
            }
        }
        
        template_info = templates.get(entity_type.lower())
        if not template_info:
            return None
            
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(template_info["headers"])
        writer.writerow(template_info["sample"])
        return output.getvalue()

    @staticmethod
    def import_dataframe(df, entity_type):
        """
        Validates and imports tabular records from pandas DataFrame into SQLAlchemy models.
        Returns a dict containing: success (bool), rows_imported, errors (list), warnings (list).
        """
        entity = entity_type.lower().strip()
        errors = []
        warnings = []
        valid_records = []

        # Standardize column headers: lowercase and stripped
        df.columns = [str(col).lower().strip().replace(" ", "_") for col in df.columns]

        if entity == "products":
            req_cols = ["product_id", "product_name", "category", "selling_price"]
            for col in req_cols:
                if col not in df.columns:
                    return {"success": False, "errors": [f"Missing mandatory column: '{col}'"], "rows_imported": 0}

            for idx, row in df.iterrows():
                row_num = idx + 2
                pid = str(row.get("product_id", "")).strip()
                pname = str(row.get("product_name", "")).strip()
                cat = str(row.get("category", "General")).strip()
                
                if not pid or pid.lower() == "nan":
                    errors.append(f"Row {row_num}: 'product_id' cannot be empty.")
                    continue
                if not pname or pname.lower() == "nan":
                    errors.append(f"Row {row_num}: 'product_name' cannot be empty.")
                    continue

                try:
                    price = float(row.get("selling_price", 0.0))
                    if price < 0:
                        errors.append(f"Row {row_num}: 'selling_price' must be non-negative.")
                        continue
                except Exception:
                    errors.append(f"Row {row_num}: Invalid 'selling_price' format.")
                    continue

                cost = None
                if "cost_price" in row and pd.notna(row["cost_price"]):
                    try:
                        cost = float(row["cost_price"])
                    except Exception:
                        cost = price * 0.6

                reorder_lvl = 10
                if "reorder_level" in row and pd.notna(row["reorder_level"]):
                    try:
                        reorder_lvl = int(row["reorder_level"])
                    except Exception:
                        pass

                reorder_qty = 20
                if "reorder_quantity" in row and pd.notna(row["reorder_quantity"]):
                    try:
                        reorder_qty = int(row["reorder_quantity"])
                    except Exception:
                        pass

                active = True
                if "active_status" in row and pd.notna(row["active_status"]):
                    val = str(row["active_status"]).lower()
                    active = val in ("true", "1", "yes", "active")

                supp_id = str(row.get("supplier_id", "")).strip() if pd.notna(row.get("supplier_id")) else None
                if supp_id and supp_id.lower() == "nan":
                    supp_id = None

                valid_records.append({
                    "product_id": pid,
                    "product_name": pname,
                    "category": cat,
                    "supplier_id": supp_id,
                    "selling_price": price,
                    "cost_price": cost,
                    "reorder_level": reorder_lvl,
                    "reorder_quantity": reorder_qty,
                    "active_status": active
                })

            if errors and len(errors) > (len(df) * 0.5):
                return {"success": False, "errors": errors[:25], "rows_imported": 0}

            # Upsert into database
            imported_count = 0
            for r in valid_records:
                existing = db_session.query(Product).filter(Product.product_id == r["product_id"]).first()
                if existing:
                    existing.product_name = r["product_name"]
                    existing.category = r["category"]
                    existing.supplier_id = r["supplier_id"]
                    existing.selling_price = r["selling_price"]
                    existing.cost_price = r["cost_price"]
                    existing.reorder_level = r["reorder_level"]
                    existing.reorder_quantity = r["reorder_quantity"]
                    existing.active_status = r["active_status"]
                else:
                    db_session.add(Product(**r))
                imported_count += 1

            db_session.commit()
            return {"success": True, "rows_imported": imported_count, "errors": errors[:10], "warnings": warnings}

        elif entity == "inventory":
            req_cols = ["product_id", "current_stock"]
            for col in req_cols:
                if col not in df.columns:
                    return {"success": False, "errors": [f"Missing mandatory column: '{col}'"], "rows_imported": 0}

            for idx, row in df.iterrows():
                row_num = idx + 2
                pid = str(row.get("product_id", "")).strip()
                inv_id = str(row.get("inventory_id", f"INV-{pid}")).strip()

                if not pid or pid.lower() == "nan":
                    errors.append(f"Row {row_num}: 'product_id' is missing.")
                    continue

                try:
                    stock = int(float(row.get("current_stock", 0)))
                except Exception:
                    errors.append(f"Row {row_num}: Invalid current_stock value.")
                    continue

                reserved = 0
                if "reserved_stock" in row and pd.notna(row["reserved_stock"]):
                    try:
                        reserved = int(float(row["reserved_stock"]))
                    except Exception:
                        pass

                location = str(row.get("warehouse_or_store", "Main Store")).strip()
                
                restock_dt = None
                if "last_restock_date" in row and pd.notna(row["last_restock_date"]):
                    try:
                        restock_dt = pd.to_datetime(row["last_restock_date"]).to_pydatetime()
                    except Exception:
                        restock_dt = datetime.utcnow()

                valid_records.append({
                    "inventory_id": inv_id,
                    "product_id": pid,
                    "current_stock": stock,
                    "reserved_stock": reserved,
                    "warehouse_or_store": location,
                    "last_restock_date": restock_dt
                })

            imported_count = 0
            for r in valid_records:
                # Ensure product exists or create placeholder
                prod = db_session.query(Product).filter(Product.product_id == r["product_id"]).first()
                if not prod:
                    db_session.add(Product(
                        product_id=r["product_id"],
                        product_name=f"Product {r['product_id']}",
                        category="General",
                        selling_price=19.99,
                        cost_price=10.00
                    ))
                    db_session.flush()

                existing = db_session.query(Inventory).filter(Inventory.inventory_id == r["inventory_id"]).first()
                if existing:
                    existing.current_stock = r["current_stock"]
                    existing.reserved_stock = r["reserved_stock"]
                    existing.warehouse_or_store = r["warehouse_or_store"]
                    existing.last_restock_date = r["last_restock_date"]
                else:
                    db_session.add(Inventory(**r))
                imported_count += 1

            db_session.commit()
            return {"success": True, "rows_imported": imported_count, "errors": errors[:10], "warnings": warnings}

        elif entity == "sales":
            req_cols = ["product_id", "quantity_sold", "sale_date"]
            for col in req_cols:
                if col not in df.columns:
                    return {"success": False, "errors": [f"Missing mandatory column: '{col}'"], "rows_imported": 0}

            for idx, row in df.iterrows():
                row_num = idx + 2
                pid = str(row.get("product_id", "")).strip()
                sid = str(row.get("sale_id", f"SL-{idx+1}")).strip()

                if not pid or pid.lower() == "nan":
                    errors.append(f"Row {row_num}: Missing 'product_id'.")
                    continue

                try:
                    qty = int(float(row.get("quantity_sold", 1)))
                    if qty <= 0:
                        errors.append(f"Row {row_num}: 'quantity_sold' must be > 0.")
                        continue
                except Exception:
                    errors.append(f"Row {row_num}: Invalid 'quantity_sold'.")
                    continue

                try:
                    sdate = pd.to_datetime(row.get("sale_date")).date()
                except Exception:
                    errors.append(f"Row {row_num}: Invalid 'sale_date' format (use YYYY-MM-DD).")
                    continue

                price = 0.0
                if "selling_price" in row and pd.notna(row["selling_price"]):
                    try:
                        price = float(row["selling_price"])
                    except Exception:
                        price = 0.0

                total = qty * price
                if "total_amount" in row and pd.notna(row["total_amount"]):
                    try:
                        total = float(row["total_amount"])
                    except Exception:
                        pass

                store_id = str(row.get("store_id", "STR-01")).strip() if pd.notna(row.get("store_id")) else "STR-01"

                valid_records.append({
                    "sale_id": sid,
                    "product_id": pid,
                    "quantity_sold": qty,
                    "selling_price": price,
                    "total_amount": total,
                    "sale_date": sdate,
                    "store_id": store_id
                })

            imported_count = 0
            for r in valid_records:
                existing = db_session.query(Sale).filter(Sale.sale_id == r["sale_id"]).first()
                if existing:
                    existing.quantity_sold = r["quantity_sold"]
                    existing.selling_price = r["selling_price"]
                    existing.total_amount = r["total_amount"]
                    existing.sale_date = r["sale_date"]
                    existing.store_id = r["store_id"]
                else:
                    db_session.add(Sale(**r))
                imported_count += 1

            db_session.commit()
            return {"success": True, "rows_imported": imported_count, "errors": errors[:10], "warnings": warnings}

        elif entity == "suppliers":
            for idx, row in df.iterrows():
                row_num = idx + 2
                supp_id = str(row.get("supplier_id", f"SUP-{idx+1}")).strip()
                name = str(row.get("supplier_name", "Supplier")).strip()
                contact = str(row.get("contact_details", "")).strip() if pd.notna(row.get("contact_details")) else ""
                lead = 7
                if "lead_time_days" in row and pd.notna(row["lead_time_days"]):
                    try:
                        lead = int(float(row["lead_time_days"]))
                    except Exception:
                        lead = 7

                existing = db_session.query(Supplier).filter(Supplier.supplier_id == supp_id).first()
                if existing:
                    existing.supplier_name = name
                    existing.contact_details = contact
                    existing.lead_time_days = lead
                else:
                    db_session.add(Supplier(supplier_id=supp_id, supplier_name=name, contact_details=contact, lead_time_days=lead))

            db_session.commit()
            return {"success": True, "rows_imported": len(df), "errors": [], "warnings": []}

        elif entity == "stores":
            for idx, row in df.iterrows():
                str_id = str(row.get("store_id", f"STR-{idx+1}")).strip()
                name = str(row.get("store_name", "Store Location")).strip()
                loc = str(row.get("location", "")).strip() if pd.notna(row.get("location")) else ""

                existing = db_session.query(Store).filter(Store.store_id == str_id).first()
                if existing:
                    existing.store_name = name
                    existing.location = loc
                else:
                    db_session.add(Store(store_id=str_id, store_name=name, location=loc))

            db_session.commit()
            return {"success": True, "rows_imported": len(df), "errors": [], "warnings": []}

        return {"success": False, "errors": [f"Unsupported entity type: '{entity_type}'"], "rows_imported": 0}

    @staticmethod
    def audit_data_quality():
        """
        Runs comprehensive data quality checks on current database tables.
        """
        products = db_session.query(Product).all()
        inventory = db_session.query(Inventory).all()
        sales = db_session.query(Sale).all()
        suppliers = db_session.query(Supplier).all()
        stores = db_session.query(Store).all()

        prod_ids = {p.product_id for p in products}
        inv_prod_ids = {i.product_id for i in inventory}
        sales_prod_ids = {s.product_id for s in sales}
        supp_ids = {s.supplier_id for s in suppliers}

        missing_price = [p.product_id for p in products if not p.selling_price or p.selling_price <= 0]
        missing_cost = [p.product_id for p in products if p.cost_price is None]
        orphan_inventory = [i.product_id for i in inventory if i.product_id not in prod_ids]
        orphan_sales = [s.product_id for s in sales if s.product_id not in prod_ids]
        zero_stock = [i.product_id for i in inventory if (i.current_stock or 0) <= 0]
        no_sales_30d = [p.product_id for p in products if p.product_id not in sales_prod_ids]
        missing_supplier = [p.product_id for p in products if not p.supplier_id and not p.supplier]

        quality_score = 100
        penalties = 0
        if missing_price: penalties += 20
        if orphan_inventory: penalties += 15
        if orphan_sales: penalties += 15
        if missing_supplier: penalties += 10
        quality_score = max(0, 100 - penalties)

        return {
            "quality_score": quality_score,
            "status": "Excellent" if quality_score >= 90 else ("Good" if quality_score >= 70 else "Needs Attention"),
            "table_counts": {
                "products": len(products),
                "inventory": len(inventory),
                "sales": len(sales),
                "suppliers": len(suppliers),
                "stores": len(stores)
            },
            "findings": {
                "missing_selling_price_count": len(missing_price),
                "missing_cost_price_count": len(missing_cost),
                "orphan_inventory_records": len(orphan_inventory),
                "orphan_sales_records": len(orphan_sales),
                "zero_stock_items": len(zero_stock),
                "products_with_zero_sales": len(no_sales_30d),
                "products_without_supplier": len(missing_supplier)
            },
            "recommendations": [
                "Ensure all active products have valid selling and cost prices for accurate gross margin tracking.",
                "Assign supplier lead times to SKUs to enable predictive stock-out alerts.",
                "Maintain continuous inventory reconciliation to prevent phantom stock anomalies."
            ]
        }

from datetime import datetime, date
import json
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.database import Base

class Product(Base):
    __tablename__ = "products"

    product_id = Column(String(50), primary_key=True)
    product_name = Column(String(200), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    supplier_id = Column(String(50), ForeignKey("suppliers.supplier_id"), nullable=True)
    supplier = Column(String(150), nullable=True)  # Fallback supplier name
    selling_price = Column(Float, nullable=False, default=0.0)
    cost_price = Column(Float, nullable=True, default=0.0)
    reorder_level = Column(Integer, nullable=False, default=10)
    reorder_quantity = Column(Integer, nullable=False, default=20)
    active_status = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    supplier_rel = relationship("Supplier", back_populates="products", lazy="joined")
    inventory_items = relationship("Inventory", back_populates="product_rel", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="product_rel", cascade="all, delete-orphan")

    def to_dict(self):
        supplier_name = self.supplier_rel.supplier_name if self.supplier_rel else (self.supplier or "Unknown Supplier")
        lead_time = self.supplier_rel.lead_time_days if self.supplier_rel else 5
        return {
            "product_id": self.product_id,
            "product_name": self.product_name,
            "category": self.category,
            "supplier_id": self.supplier_id,
            "supplier": supplier_name,
            "lead_time_days": lead_time,
            "selling_price": round(float(self.selling_price or 0.0), 2),
            "cost_price": round(float(self.cost_price or 0.0), 2) if self.cost_price is not None else None,
            "reorder_level": int(self.reorder_level or 0),
            "reorder_quantity": int(self.reorder_quantity or 0),
            "active_status": bool(self.active_status),
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Inventory(Base):
    __tablename__ = "inventory"

    inventory_id = Column(String(50), primary_key=True)
    product_id = Column(String(50), ForeignKey("products.product_id", ondelete="CASCADE"), nullable=False, index=True)
    current_stock = Column(Integer, nullable=False, default=0)
    reserved_stock = Column(Integer, nullable=False, default=0)
    last_restock_date = Column(DateTime, nullable=True)
    warehouse_or_store = Column(String(100), nullable=False, default="Main Store", index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    product_rel = relationship("Product", back_populates="inventory_items")

    def to_dict(self):
        return {
            "inventory_id": self.inventory_id,
            "product_id": self.product_id,
            "current_stock": int(self.current_stock or 0),
            "reserved_stock": int(self.reserved_stock or 0),
            "available_stock": max(0, int(self.current_stock or 0) - int(self.reserved_stock or 0)),
            "last_restock_date": self.last_restock_date.isoformat() if self.last_restock_date else None,
            "warehouse_or_store": self.warehouse_or_store,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class Sale(Base):
    __tablename__ = "sales"

    sale_id = Column(String(50), primary_key=True)
    product_id = Column(String(50), ForeignKey("products.product_id", ondelete="CASCADE"), nullable=False, index=True)
    quantity_sold = Column(Integer, nullable=False, default=1)
    selling_price = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    sale_date = Column(Date, nullable=False, index=True)
    store_id = Column(String(50), ForeignKey("stores.store_id"), nullable=True, index=True)

    # Relationships
    product_rel = relationship("Product", back_populates="sales")
    store_rel = relationship("Store", back_populates="sales", lazy="joined")

    def to_dict(self):
        return {
            "sale_id": self.sale_id,
            "product_id": self.product_id,
            "product_name": self.product_rel.product_name if self.product_rel else "Unknown Product",
            "category": self.product_rel.category if self.product_rel else "General",
            "quantity_sold": int(self.quantity_sold or 0),
            "selling_price": round(float(self.selling_price or 0.0), 2),
            "total_amount": round(float(self.total_amount or (self.quantity_sold * self.selling_price)), 2),
            "sale_date": self.sale_date.isoformat() if self.sale_date else None,
            "store_id": self.store_id,
            "store_name": self.store_rel.store_name if self.store_rel else "Main Store"
        }


class Store(Base):
    __tablename__ = "stores"

    store_id = Column(String(50), primary_key=True)
    store_name = Column(String(150), nullable=False)
    location = Column(String(200), nullable=True)

    sales = relationship("Sale", back_populates="store_rel")

    def to_dict(self):
        return {
            "store_id": self.store_id,
            "store_name": self.store_name,
            "location": self.location
        }


class Supplier(Base):
    __tablename__ = "suppliers"

    supplier_id = Column(String(50), primary_key=True)
    supplier_name = Column(String(150), nullable=False)
    contact_details = Column(String(255), nullable=True)
    lead_time_days = Column(Integer, nullable=False, default=7)

    products = relationship("Product", back_populates="supplier_rel")

    def to_dict(self):
        return {
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier_name,
            "contact_details": self.contact_details,
            "lead_time_days": int(self.lead_time_days or 7)
        }


class User(Base):
    __tablename__ = "users"

    user_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    role = Column(String(50), nullable=False, default="Store Manager")
    password_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class AIQueryHistory(Base):
    __tablename__ = "ai_query_history"

    query_id = Column(String(50), primary_key=True)
    user_query = Column(Text, nullable=False)
    generated_answer = Column(Text, nullable=False)
    supporting_data = Column(Text, nullable=True)  # JSON string of evidence/metrics
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        data = {}
        if self.supporting_data:
            try:
                data = json.loads(self.supporting_data)
            except Exception:
                data = {"raw": self.supporting_data}
        return {
            "query_id": self.query_id,
            "user_query": self.user_query,
            "generated_answer": self.generated_answer,
            "supporting_data": data,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

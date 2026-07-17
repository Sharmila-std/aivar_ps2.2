from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
import datetime
from ..database import Base

class Order(Base):
    __tablename__ = 'orders'

    order_id = Column(String(20), primary_key=True)
    customer_id = Column(String(20), ForeignKey('customers.customer_id', ondelete='CASCADE'), nullable=False)
    product_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    order_date = Column(DateTime, default=datetime.datetime.utcnow)
    delivery_address = Column(Text, nullable=False)
    payment_method = Column(String(50), nullable=False)
    payment_status = Column(String(20), nullable=False)
    order_status = Column(String(20), nullable=False)
    expected_delivery = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class PendingOrder(Base):
    __tablename__ = 'pending_orders'

    order_id = Column(String(20), primary_key=True)
    customer_id = Column(String(20), ForeignKey('customers.customer_id', ondelete='CASCADE'), nullable=False)
    product_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    delivery_address = Column(Text, nullable=False)
    payment_method = Column(String(50), nullable=False)
    payment_status = Column(String(20), nullable=False)
    order_status = Column(String(20), nullable=False)  # e.g., 'Placed'
    order_date = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    customer = relationship("Customer")

    @property
    def updated_at(self):
        return self.order_date

    @property
    def items(self):
        return []

class OrderItem(Base):
    __tablename__ = 'order_items'

    item_id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String(20), ForeignKey('orders.order_id', ondelete='CASCADE'), nullable=False)
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items")

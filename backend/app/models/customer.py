from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from ..database import Base

class Customer(Base):
    __tablename__ = 'customers'

    customer_id = Column(String(20), primary_key=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50), unique=True, nullable=False)
    address = Column(Text, nullable=False)
    profile_image = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False)
    aadhaar_number = Column(String(20), nullable=True)
    pan_number = Column(String(20), nullable=True)
    card_number = Column(String(20), nullable=True)
    region = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")
    activities = relationship("CustomerActivity", back_populates="customer", cascade="all, delete-orphan")

    @property
    def employee_id(self) -> str:
        return self.customer_id

    @property
    def role_id(self) -> int:
        return 0

    @property
    def role(self) -> str:
        return "customer"

class PendingCustomer(Base):
    __tablename__ = 'pending_customers'

    request_id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    address = Column(Text, nullable=False)
    profile_image = Column(String(255), nullable=True)
    request_status = Column(String(20), nullable=False)  # Pending, Approved, Rejected
    aadhaar_number = Column(String(20), nullable=True)
    pan_number = Column(String(20), nullable=True)
    card_number = Column(String(20), nullable=True)
    region = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class PendingCustomerUpdate(Base):
    __tablename__ = 'pending_customer_updates'

    request_id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(String(20), ForeignKey('customers.customer_id', ondelete='CASCADE'), nullable=False)
    updates_json = Column(Text, nullable=False)  # JSON-serialized fields and values dict
    request_status = Column(String(20), default="Pending", nullable=False)  # Pending, Approved, Rejected
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    customer = relationship("Customer")

class CustomerActivity(Base):
    __tablename__ = 'customer_activity'

    activity_id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(String(20), ForeignKey('customers.customer_id', ondelete='CASCADE'), nullable=False)
    activity_type = Column(String(100), nullable=False)
    activity_description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="activities")

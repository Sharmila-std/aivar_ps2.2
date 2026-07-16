from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# Order Item Schemas
class OrderItemBase(BaseModel):
    product_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemOut(OrderItemBase):
    item_id: int
    order_id: str

    model_config = ConfigDict(from_attributes=True)

# Order Schemas
class OrderBase(BaseModel):
    customer_id: str
    product_name: str
    category: str
    quantity: int
    price: Decimal
    delivery_address: str
    payment_method: str
    payment_status: str
    order_status: str
    expected_delivery: Optional[datetime] = None

class OrderCreate(OrderBase):
    order_id: str
    items: Optional[List[OrderItemCreate]] = []

class OrderUpdate(BaseModel):
    product_name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[Decimal] = None
    delivery_address: Optional[str] = None
    payment_method: Optional[str] = None
    payment_status: Optional[str] = None
    order_status: Optional[str] = None
    expected_delivery: Optional[datetime] = None

class OrderOut(OrderBase):
    order_id: str
    order_date: datetime
    updated_at: datetime
    items: List[OrderItemOut] = []

    model_config = ConfigDict(from_attributes=True)

# Refund Schemas
class RefundBase(BaseModel):
    customer_id: str
    order_id: str
    refund_reason: str
    refund_amount: Decimal
    refund_status: str

class RefundCreate(RefundBase):
    refund_id: str

class RefundUpdate(BaseModel):
    refund_status: Optional[str] = None
    refund_reason: Optional[str] = None
    refund_amount: Optional[Decimal] = None

class RefundOut(RefundBase):
    refund_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaginatedOrders(BaseModel):
    items: List[OrderOut]
    total: int
    skip: int
    limit: int

class PaginatedRefunds(BaseModel):
    items: List[RefundOut]
    total: int
    skip: int
    limit: int

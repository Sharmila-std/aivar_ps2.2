from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from ..database import get_db
from ..services.order_service import OrderService
from ..schemas.order import OrderCreate, OrderUpdate, OrderOut, PaginatedOrders, RefundCreate, RefundUpdate, RefundOut, PaginatedRefunds
from ..utils.auth import get_current_employee
from ..models.employee import Employee

router = APIRouter(tags=["Orders & Refunds"])
service = OrderService()

# Orders Endpoints
@router.get("/api/orders", response_model=PaginatedOrders)
def get_orders(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: str = Query("order_date"),
    sort_desc: bool = Query(True),
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    from ..models.customer import Customer
    customer_id = None
    region = None
    if isinstance(current_employee, Customer):
        customer_id = current_employee.customer_id
    elif getattr(current_employee, "role_name", None) == "Manager":
        region = current_employee.region

    items, total = service.get_orders(db, search, status, sort_by, sort_desc, skip, limit, customer_id=customer_id, region=region)
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/api/orders/{order_id}", response_model=OrderOut)
def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.get_order(db, order_id)

@router.post("/api/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    user_id = getattr(current_employee, "employee_id", None) or getattr(current_employee, "customer_id", None)
    return service.create_order(db, order_in, user_id)

@router.put("/api/orders/{order_id}", response_model=OrderOut)
def update_order(
    order_id: str,
    order_in: OrderUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.update_order(db, order_id, order_in, current_employee.employee_id)

@router.delete("/api/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    user_id = getattr(current_employee, "employee_id", None) or getattr(current_employee, "customer_id", None)
    service.delete_order(db, order_id, user_id)
    return None

@router.put("/api/orders/pending/{order_id}")
def process_pending_order(
    order_id: str,
    action: str = Query(...),
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    role_name = getattr(current_employee, "role", "Support")
    user_id = getattr(current_employee, "employee_id", None) or getattr(current_employee, "customer_id", None)
    region = getattr(current_employee, "region", None)
    return service.process_pending_order(db, order_id, action, user_id, role_name, region)

# Refunds Endpoints
@router.get("/api/refunds", response_model=PaginatedRefunds)
def get_refunds(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_desc: bool = Query(True),
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    from ..models.customer import Customer
    customer_id = None
    region = None
    if isinstance(current_employee, Customer):
        customer_id = current_employee.customer_id
    elif getattr(current_employee, "role_name", None) == "Manager":
        region = current_employee.region

    items, total = service.get_refunds(db, search, status, sort_by, sort_desc, skip, limit, customer_id=customer_id, region=region)
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/api/refunds/{refund_id}", response_model=RefundOut)
def get_refund(
    refund_id: str,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.get_refund(db, refund_id)

@router.post("/api/refunds", response_model=RefundOut, status_code=status.HTTP_201_CREATED)
def create_refund(
    refund_in: RefundCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.create_refund(db, refund_in, current_employee.employee_id)

@router.put("/api/refunds/{refund_id}", response_model=RefundOut)
def update_refund(
    refund_id: str,
    refund_in: RefundUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.update_refund(db, refund_id, refund_in, current_employee.employee_id)

@router.delete("/api/refunds/{refund_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_refund(
    refund_id: str,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    service.delete_refund(db, refund_id, current_employee.employee_id)
    return None

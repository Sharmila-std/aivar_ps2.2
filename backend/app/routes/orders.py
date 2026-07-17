from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from ..database import get_db
from ..services.order_service import OrderService
from ..schemas.order import OrderCreate, OrderUpdate, OrderOut, PaginatedOrders
from ..utils.auth import get_current_employee
from ..models.employee import Employee
from ..services.gateway import enforce_regional_boundary_rest

router = APIRouter(tags=["Orders"])
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
    elif getattr(current_employee, "role", None) in ("manager", "Manager"):
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
    current_employee: Any = Depends(get_current_employee)
):
    order = service.get_order(db, order_id)
    from ..models.customer import Customer
    cust = db.query(Customer).filter(Customer.customer_id == order.customer_id).first()
    if cust:
        enforce_regional_boundary_rest(db, current_employee, cust.region, "READ", order_id)
    return order

@router.post("/api/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    from ..models.customer import Customer
    cust = db.query(Customer).filter(Customer.customer_id == order_in.customer_id.upper()).first()
    if cust:
        enforce_regional_boundary_rest(db, current_employee, cust.region, "CREATE", order_in.order_id)
    user_id = getattr(current_employee, "employee_id", None) or getattr(current_employee, "customer_id", None)
    return service.create_order(db, order_in, user_id)

@router.put("/api/orders/{order_id}", response_model=OrderOut)
def update_order(
    order_id: str,
    order_in: OrderUpdate,
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    order = service.get_order(db, order_id)
    from ..models.customer import Customer
    cust = db.query(Customer).filter(Customer.customer_id == order.customer_id).first()
    if cust:
        enforce_regional_boundary_rest(db, current_employee, cust.region, "UPDATE", order_id)
    return service.update_order(db, order_id, order_in, getattr(current_employee, "employee_id", None))

@router.delete("/api/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    order = service.get_order(db, order_id)
    from ..models.customer import Customer
    cust = db.query(Customer).filter(Customer.customer_id == order.customer_id).first()
    if cust:
        enforce_regional_boundary_rest(db, current_employee, cust.region, "DELETE", order_id)
    user_id = getattr(current_employee, "employee_id", None) or getattr(current_employee, "customer_id", None)
    service.delete_order(db, order_id, user_id)
    return None

from pydantic import BaseModel
from fastapi import HTTPException

class OrderProcessAction(BaseModel):
    action: str

@router.put("/api/orders/pending/{order_id}")
def process_pending_order(
    order_id: str,
    action_in: Optional[OrderProcessAction] = None,
    action: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    role_name = getattr(current_employee, "role", "Support")
    user_id = getattr(current_employee, "employee_id", None) or getattr(current_employee, "customer_id", None)
    region = getattr(current_employee, "region", None)
    
    resolved_action = None
    if action:
        resolved_action = action
    elif action_in:
        resolved_action = action_in.action
        
    if not resolved_action:
        raise HTTPException(status_code=400, detail="action is required either in query parameters or request body")
        
    order = service.repo.get_by_id(db, order_id)
    if not order:
        order = service.repo.get_pending_by_id(db, order_id)
    if order:
        from ..models.customer import Customer
        cust = db.query(Customer).filter(Customer.customer_id == order.customer_id).first()
        if cust:
            enforce_regional_boundary_rest(db, current_employee, cust.region, "PROCESS", order_id)

    return service.process_pending_order(db, order_id, resolved_action, user_id, role_name, region)

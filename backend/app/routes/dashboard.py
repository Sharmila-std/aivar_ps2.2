from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.customer import Customer
from ..models.order import Order
from ..models.employee import Employee
from ..utils.auth import get_current_employee

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("", response_model=dict)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_employee = Depends(get_current_employee)
):
    # Total counts
    total_customers = db.query(Customer).count()
    total_orders = db.query(Order).count()
    total_employees = db.query(Employee).count()

    # Recent lists
    recent_customers = db.query(Customer).order_by(Customer.created_at.desc()).limit(5).all()
    recent_orders = db.query(Order).order_by(Order.order_date.desc()).limit(5).all()

    # Format lists
    recent_customers_list = [
        {
            "customer_id": c.customer_id,
            "full_name": c.full_name,
            "email": c.email,
            "status": c.status,
            "created_at": c.created_at
        }
        for c in recent_customers
    ]

    recent_orders_list = [
        {
            "order_id": o.order_id,
            "customer_id": o.customer_id,
            "product_name": o.product_name,
            "price": float(o.price),
            "order_status": o.order_status,
            "order_date": o.order_date
        }
        for o in recent_orders
    ]

    return {
        "kpis": {
            "total_customers": total_customers,
            "total_orders": total_orders,
            "total_employees": total_employees
        },
        "recent_customers": recent_customers_list,
        "recent_orders": recent_orders_list
    }

from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List, Tuple, Optional, Any
from decimal import Decimal
from ..repositories.order_repository import OrderRepository
from ..models.order import Order, OrderItem, PendingOrder
from ..models.security import AuditLog
from ..schemas.order import OrderCreate, OrderUpdate

class OrderService:
    def __init__(self):
        self.repo = OrderRepository()

    # Orders Services
    def get_order(self, db: Session, order_id: str) -> Order:
        db_order = self.repo.get_by_id(db, order_id)
        if not db_order:
            # Fallback check pending orders
            db_order = self.repo.get_pending_by_id(db, order_id)
            if not db_order:
                raise HTTPException(status_code=404, detail="Order not found")
        return db_order

    def get_orders(
        self,
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "order_date",
        sort_desc: bool = True,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[str] = None,
        region: Optional[str] = None
    ) -> Tuple[List[Any], int]:
        if status == "Placed":
            return self.repo.get_pending_all(db, search, status, skip, limit, customer_id=customer_id, region=region)
        return self.repo.get_all(db, search, status, sort_by, sort_desc, skip, limit, customer_id=customer_id, region=region)

    def create_order(self, db: Session, order_in: OrderCreate, operator_id: Optional[str] = None) -> Order:
        # Check if ID exists in active or pending orders
        if self.repo.get_by_id(db, order_in.order_id) or self.repo.get_pending_by_id(db, order_in.order_id):
            raise HTTPException(status_code=400, detail="Order ID already exists")

        # Auto-lookup predefined product details
        products_db = {
            "Premium Support Contract (Annual)": {"price": 2500.0, "category": "Support Contracts"},
            "Gold Support Plan": {"price": 1500.0, "category": "Support Contracts"},
            "Silver Support Plan": {"price": 800.0, "category": "Support Contracts"},
            "Enterprise Gateway License": {"price": 5000.0, "category": "Licenses"},
            "Threat Intelligence Feed": {"price": 1200.0, "category": "Feeds"}
        }
        
        if order_in.product_name in products_db:
            prod_info = products_db[order_in.product_name]
            order_in.category = prod_info["category"]
            order_in.price = Decimal(str(prod_info["price"] * order_in.quantity))

        # Force Placed if operator is a customer
        is_customer = operator_id and operator_id.startswith("CUS")
        status_val = order_in.order_status
        if is_customer:
            status_val = "Placed"
            order_in.customer_id = operator_id

        if is_customer:
            import datetime
            db_pending = PendingOrder(
                order_id=order_in.order_id,
                customer_id=order_in.customer_id,
                product_name=order_in.product_name,
                category=order_in.category,
                quantity=order_in.quantity,
                price=order_in.price,
                delivery_address=order_in.delivery_address,
                payment_method=order_in.payment_method,
                payment_status=order_in.payment_status,
                order_status=status_val,
                order_date=datetime.datetime.utcnow()
            )
            created = self.repo.create_pending(db, db_pending)
        else:
            import datetime
            db_order = Order(
                order_id=order_in.order_id,
                customer_id=order_in.customer_id,
                product_name=order_in.product_name,
                category=order_in.category,
                quantity=order_in.quantity,
                price=order_in.price,
                delivery_address=order_in.delivery_address,
                payment_method=order_in.payment_method,
                payment_status=order_in.payment_status,
                order_status=status_val,
                order_date=datetime.datetime.utcnow(),
                expected_delivery=order_in.expected_delivery
            )
            created = self.repo.create(db, db_order)

            # Create child items if provided
            for item in order_in.items:
                db_item = OrderItem(
                    order_id=created.order_id,
                    product_name=item.product_name,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    subtotal=item.subtotal
                )
                self.repo.create_item(db, db_item)

        # Add audit log
        action_name = "Order creation requested" if is_customer else "Order created successfully"
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name="create_order",
            operation="CREATE",
            resource="orders",
            decision="Allowed",
            reason=f"{action_name} for ID {created.order_id}.",
            risk_score=0,
            status="success"
        ))
        db.commit()
        return created

    def update_order(self, db: Session, order_id: str, order_in: OrderUpdate, operator_id: Optional[str] = None) -> Order:
        db_order = self.get_order(db, order_id)
        
        update_data = order_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_order, key, value)
            
        updated = self.repo.update(db, db_order)

        # Add audit log
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name="update_order",
            operation="UPDATE",
            resource="orders",
            decision="Allowed",
            reason=f"Order {order_id} updated.",
            risk_score=0,
            status="success"
        ))
        db.commit()
        return updated

    def delete_order(self, db: Session, order_id: str, operator_id: Optional[str] = None) -> None:
        db_order = self.get_order(db, order_id)
        from ..models.customer import Customer
        from ..models.employee import Employee

        customer = db.query(Customer).filter(Customer.customer_id == db_order.customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer associated with this order not found")

        if operator_id:
            if operator_id.startswith("CUS"):
                if db_order.customer_id != operator_id:
                    raise HTTPException(status_code=403, detail="You can only request deletion of your own orders.")
                
                db_order.order_status = "PENDING_DELETE"
                db.commit()
                
                db.add(AuditLog(
                    user_id=operator_id,
                    tool_name="delete_order",
                    operation="UPDATE",
                    resource="orders",
                    decision="Allowed",
                    reason=f"Order deletion requested for ID {order_id} by customer {operator_id}.",
                    risk_score=0,
                    status="success"
                ))
                db.commit()
                return
            else:
                emp = db.query(Employee).filter(Employee.employee_id == operator_id).first()
                if emp:
                    role_lower = emp.role.lower()
                    if role_lower == "manager":
                        if db_order.order_status != "PENDING_DELETE":
                            raise HTTPException(status_code=400, detail="Manager can only delete orders that are in a PENDING_DELETE status.")
                        if not emp.region or (customer.region and customer.region.lower() != emp.region.lower()):
                            raise HTTPException(
                                status_code=403,
                                detail=f"Only managers assigned to the {customer.region} region can delete this order."
                            )
                    elif role_lower == "admin":
                        pass
                    else:
                        raise HTTPException(status_code=403, detail="This role is not authorized to delete orders.")

        self.repo.delete(db, db_order)

        # Add audit log
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name="delete_order",
            operation="DELETE",
            resource="orders",
            decision="Allowed",
            reason=f"Order {order_id} deleted.",
            risk_score=0,
            status="success"
        ))
        db.commit()

    def process_pending_order(self, db: Session, order_id: str, action: str, operator_id: str, operator_role: str, operator_region: Optional[str] = None) -> Any:
        order = self.repo.get_by_id(db, order_id)
        is_pending_create = False
        if not order:
            order = self.repo.get_pending_by_id(db, order_id)
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            is_pending_create = True
            
        from ..models.customer import Customer
        customer = db.query(Customer).filter(Customer.customer_id == order.customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer associated with this order not found")
            
        # Regional manager check
        if operator_role.lower() == "manager":
            if not operator_region or (customer.region and customer.region.lower() != operator_region.lower()):
                raise HTTPException(
                    status_code=403, 
                    detail=f"Only managers assigned to the {customer.region} region can process this order request."
                )

        initial_status = order.order_status

        if action.upper() == "APPROVE":
            if is_pending_create:
                db_order = Order(
                    order_id=order.order_id,
                    customer_id=order.customer_id,
                    product_name=order.product_name,
                    category=order.category,
                    quantity=order.quantity,
                    price=order.price,
                    delivery_address=order.delivery_address,
                    payment_method=order.payment_method,
                    payment_status=order.payment_status,
                    order_status="Placed",
                    order_date=order.order_date
                )
                self.repo.create(db, db_order)
                self.repo.delete_pending(db, order)
                
                db.add(AuditLog(
                    user_id=operator_id,
                    tool_name="approve_order_creation",
                    operation="CREATE",
                    resource="orders",
                    decision="Allowed",
                    reason=f"Order {order_id} creation approved by manager {operator_id}.",
                    risk_score=0,
                    status="success"
                ))
                db.commit()
                return db_order
            elif initial_status == "PENDING_DELETE":
                self.repo.delete(db, order)
                db.add(AuditLog(
                    user_id=operator_id,
                    tool_name="approve_order_deletion",
                    operation="DELETE",
                    resource="orders",
                    decision="Allowed",
                    reason=f"Order {order_id} deletion approved by manager {operator_id}.",
                    risk_score=0,
                    status="success"
                ))
                db.commit()
                return order
        elif action.upper() == "REJECT":
            if is_pending_create:
                self.repo.delete_pending(db, order)
                db.add(AuditLog(
                    user_id=operator_id,
                    tool_name="reject_order_creation",
                    operation="DELETE",
                    resource="orders",
                    decision="Allowed",
                    reason=f"Order {order_id} creation rejected by manager {operator_id}.",
                    risk_score=0,
                    status="success"
                ))
                db.commit()
                return order
            elif initial_status == "PENDING_DELETE":
                order.order_status = "Delivered"
                db.commit()
                db.add(AuditLog(
                    user_id=operator_id,
                    tool_name="reject_order_deletion",
                    operation="UPDATE",
                    resource="orders",
                    decision="Allowed",
                    reason=f"Order {order_id} deletion rejected by manager {operator_id}.",
                    risk_score=0,
                    status="success"
                ))
                db.commit()
                return order
        else:
            raise HTTPException(status_code=400, detail="Invalid action. Must be APPROVE or REJECT.")

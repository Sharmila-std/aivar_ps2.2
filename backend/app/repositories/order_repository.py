from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Tuple, Optional
from ..models.order import Order, OrderItem, PendingOrder

class OrderRepository:
    # Order CRUD
    def get_by_id(self, db: Session, order_id: str) -> Optional[Order]:
        return db.query(Order).filter(Order.order_id == order_id).first()

    def get_all(
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
    ) -> Tuple[List[Order], int]:
        query = db.query(Order)

        # If region is provided, query customers in that region first
        if region:
            from ..models.customer import Customer
            customers = db.query(Customer).filter(Customer.region.ilike(region)).all()
            customer_ids = [c.customer_id for c in customers]
            query = query.filter(Order.customer_id.in_(customer_ids))

        # Customer specific filter
        if customer_id:
            query = query.filter(Order.customer_id == customer_id)

        # Filter
        if status and status != "All":
            query = query.filter(Order.order_status == status)

        # Search
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Order.order_id.ilike(search_pattern),
                    Order.customer_id.ilike(search_pattern),
                    Order.product_name.ilike(search_pattern),
                    Order.category.ilike(search_pattern)
                )
            )

        # Count total
        total = query.count()

        # Sort
        sort_col = getattr(Order, sort_by, Order.order_date)
        if sort_desc:
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        # Paginate
        results = query.offset(skip).limit(limit).all()
        return results, total

    def create(self, db: Session, order: Order) -> Order:
        db.add(order)
        db.commit()
        db.refresh(order)
        return order

    def update(self, db: Session, order: Order) -> Order:
        db.commit()
        db.refresh(order)
        return order

    def delete(self, db: Session, order: Order) -> None:
        db.delete(order)
        db.commit()

    # Order Item
    def create_item(self, db: Session, item: OrderItem) -> OrderItem:
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    # Pending Order CRUD
    def get_pending_by_id(self, db: Session, order_id: str) -> Optional[PendingOrder]:
        return db.query(PendingOrder).filter(PendingOrder.order_id == order_id).first()

    def get_pending_all(
        self,
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[str] = None,
        region: Optional[str] = None
    ) -> Tuple[List[PendingOrder], int]:
        query = db.query(PendingOrder)

        # Region filter
        if region:
            from ..models.customer import Customer
            customers = db.query(Customer).filter(Customer.region.ilike(region)).all()
            customer_ids = [c.customer_id for c in customers]
            query = query.filter(PendingOrder.customer_id.in_(customer_ids))

        # Customer specific filter
        if customer_id:
            query = query.filter(PendingOrder.customer_id == customer_id)

        # Filter
        if status and status != "All":
            query = query.filter(PendingOrder.order_status == status)

        # Search
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    PendingOrder.order_id.ilike(search_pattern),
                    PendingOrder.customer_id.ilike(search_pattern),
                    PendingOrder.product_name.ilike(search_pattern),
                    PendingOrder.category.ilike(search_pattern)
                )
            )

        total = query.count()
        results = query.order_by(PendingOrder.order_date.desc()).offset(skip).limit(limit).all()
        return results, total

    def create_pending(self, db: Session, pending_order: PendingOrder) -> PendingOrder:
        db.add(pending_order)
        db.commit()
        db.refresh(pending_order)
        return pending_order

    def delete_pending(self, db: Session, pending_order: PendingOrder) -> None:
        db.delete(pending_order)
        db.commit()

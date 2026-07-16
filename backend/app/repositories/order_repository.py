from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Tuple, Optional
from ..models.order import Order, OrderItem, Refund

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

        # If region is provided, join with Customer to filter
        if region:
            from ..models.customer import Customer
            query = query.join(Customer, Order.customer_id == Customer.customer_id).filter(Customer.region == region)

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

    # Refund CRUD
    def get_refund_by_id(self, db: Session, refund_id: str) -> Optional[Refund]:
        return db.query(Refund).filter(Refund.refund_id == refund_id).first()

    def get_refund_all(
        self,
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_desc: bool = True,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[str] = None,
        region: Optional[str] = None
    ) -> Tuple[List[Refund], int]:
        query = db.query(Refund)

        # If region is provided, join with Customer to filter
        if region:
            from ..models.customer import Customer
            query = query.join(Customer, Refund.customer_id == Customer.customer_id).filter(Customer.region == region)

        # Customer specific filter
        if customer_id:
            query = query.filter(Refund.customer_id == customer_id)

        # Filter
        if status and status != "All":
            query = query.filter(Refund.refund_status == status)

        # Search
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Refund.refund_id.ilike(search_pattern),
                    Refund.order_id.ilike(search_pattern),
                    Refund.customer_id.ilike(search_pattern),
                    Refund.refund_reason.ilike(search_pattern)
                )
            )

        # Count total
        total = query.count()

        # Sort
        sort_col = getattr(Refund, sort_by, Refund.created_at)
        if sort_desc:
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        # Paginate
        results = query.offset(skip).limit(limit).all()
        return results, total

    def create_refund(self, db: Session, refund: Refund) -> Refund:
        db.add(refund)
        db.commit()
        db.refresh(refund)
        return refund

    def update_refund(self, db: Session, refund: Refund) -> Refund:
        db.commit()
        db.refresh(refund)
        return refund

    def delete_refund(self, db: Session, refund: Refund) -> None:
        db.delete(refund)
        db.commit()

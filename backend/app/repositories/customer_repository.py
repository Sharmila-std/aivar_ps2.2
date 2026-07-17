from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Tuple, Optional
from ..models.customer import Customer, PendingCustomer, CustomerActivity, PendingCustomerUpdate

class CustomerRepository:
    def get_by_id(self, db: Session, customer_id: str) -> Optional[Customer]:
        return db.query(Customer).filter(Customer.customer_id == customer_id).first()

    def get_by_email(self, db: Session, email: str) -> Optional[Customer]:
        return db.query(Customer).filter(Customer.email == email).first()

    def get_all(
        self,
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "customer_id",
        sort_desc: bool = False,
        skip: int = 0,
        limit: int = 100,
        region: Optional[str] = None
    ) -> Tuple[List[Customer], int]:
        query = db.query(Customer)

        if region:
            query = query.filter(Customer.region.ilike(region))

        # Filtering
        if status and status.upper() != "ALL":
            query = query.filter(Customer.status == status)

        # Search
        if search:
            search_term = search
            if ":" in search:
                search_term = search.split(":", 1)[1]
            search_pattern = f"%{search_term}%"
            query = query.filter(
                or_(
                    Customer.full_name.ilike(search_pattern),
                    Customer.email.ilike(search_pattern),
                    Customer.phone.ilike(search_pattern),
                    Customer.address.ilike(search_pattern),
                    Customer.region.ilike(search_pattern)
                )
            )

        # Count total
        total = query.count()

        # Sorting
        sort_col = getattr(Customer, sort_by, Customer.customer_id)
        if sort_desc:
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        # Pagination
        results = query.offset(skip).limit(limit).all()
        return results, total

    def create(self, db: Session, customer: Customer) -> Customer:
        db.add(customer)
        db.commit()
        db.refresh(customer)
        return customer

    def update(self, db: Session, customer: Customer) -> Customer:
        db.commit()
        db.refresh(customer)
        return customer

    def delete(self, db: Session, customer: Customer) -> None:
        db.delete(customer)
        db.commit()

    # Pending Customer Methods
    def get_pending_by_id(self, db: Session, request_id: int) -> Optional[PendingCustomer]:
        return db.query(PendingCustomer).filter(PendingCustomer.request_id == request_id).first()

    def get_pending_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[PendingCustomer]:
        return db.query(PendingCustomer).order_by(PendingCustomer.created_at.desc()).offset(skip).limit(limit).all()

    def create_pending(self, db: Session, pending: PendingCustomer) -> PendingCustomer:
        db.add(pending)
        db.commit()
        db.refresh(pending)
        return pending

    def update_pending(self, db: Session, pending: PendingCustomer) -> PendingCustomer:
        db.commit()
        db.refresh(pending)
        return pending

    # Customer Activity
    def log_activity(self, db: Session, activity: CustomerActivity) -> CustomerActivity:
        db.add(activity)
        db.commit()
        db.refresh(activity)
        return activity

    def get_activities_by_customer(self, db: Session, customer_id: str) -> List[CustomerActivity]:
        return db.query(CustomerActivity).filter(CustomerActivity.customer_id == customer_id).order_by(CustomerActivity.created_at.desc()).all()

    # Pending Customer Update Requests
    def get_pending_update_by_id(self, db: Session, request_id: int) -> Optional[PendingCustomerUpdate]:
        return db.query(PendingCustomerUpdate).filter(PendingCustomerUpdate.request_id == request_id).first()

    def get_pending_updates_all(self, db: Session, skip: int = 0, limit: int = 100, region: Optional[str] = None) -> List[PendingCustomerUpdate]:
        query = db.query(PendingCustomerUpdate).filter(PendingCustomerUpdate.request_status == "Pending")
        if region:
            from ..models.customer import Customer
            matching_customers = db.query(Customer).filter(Customer.region.ilike(region)).all()
            cust_ids = [c.customer_id for c in matching_customers]
            all_cased_ids = []
            for cid in cust_ids:
                all_cased_ids.extend([cid, cid.upper(), cid.lower()])
            all_cased_ids = list(set(all_cased_ids))
            query = query.filter(PendingCustomerUpdate.customer_id.in_(all_cased_ids))
        return query.order_by(PendingCustomerUpdate.created_at.desc()).offset(skip).limit(limit).all()

    def create_pending_update(self, db: Session, pending_update: PendingCustomerUpdate) -> PendingCustomerUpdate:
        db.add(pending_update)
        db.commit()
        db.refresh(pending_update)
        return pending_update

    def update_pending_update(self, db: Session, pending_update: PendingCustomerUpdate) -> PendingCustomerUpdate:
        db.commit()
        db.refresh(pending_update)
        return pending_update

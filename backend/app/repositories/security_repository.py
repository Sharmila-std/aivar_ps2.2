from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Tuple, Optional
from ..models.security import PermissionManifest, AuditLog, BlockedSession, SecurityAlert, UserWarning

class SecurityRepository:
    # Permission Manifest CRUD
    def get_manifest_by_id(self, db: Session, manifest_id: int) -> Optional[PermissionManifest]:
        return db.query(PermissionManifest).filter(PermissionManifest.manifest_id == manifest_id).first()

    def get_manifest_all(
        self,
        db: Session,
        role: Optional[str] = None,
        tool_name: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[PermissionManifest], int]:
        query = db.query(PermissionManifest)
        if role:
            query = query.filter(PermissionManifest.role == role)
        if tool_name:
            query = query.filter(PermissionManifest.tool_name.ilike(f"%{tool_name}%"))
        total = query.count()
        results = query.offset(skip).limit(limit).all()
        return results, total

    def create_manifest(self, db: Session, manifest: PermissionManifest) -> PermissionManifest:
        db.add(manifest)
        db.commit()
        db.refresh(manifest)
        return manifest

    def update_manifest(self, db: Session, manifest: PermissionManifest) -> PermissionManifest:
        db.commit()
        db.refresh(manifest)
        return manifest

    def delete_manifest(self, db: Session, manifest: PermissionManifest) -> None:
        db.delete(manifest)
        db.commit()

    # Audit Logs CRUD
    def get_audit_log_by_id(self, db: Session, log_id: int) -> Optional[AuditLog]:
        return db.query(AuditLog).filter(AuditLog.log_id == log_id).first()

    def get_audit_logs_all(
        self,
        db: Session,
        user_id: Optional[str] = None,
        operation: Optional[str] = None,
        resource: Optional[str] = None,
        decision: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[str] = None,
        order_id: Optional[str] = None,
        request_id: Optional[str] = None,
        session_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        user_role: Optional[str] = None,
        region: Optional[str] = None,
        attack_category: Optional[str] = None,
        tool_name: Optional[str] = None
    ) -> Tuple[List[AuditLog], int]:
        import datetime
        from ..models.customer import Customer
        from ..models.employee import Employee

        query = db.query(AuditLog)

        # Filters by simple parameters
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if operation:
            query = query.filter(AuditLog.operation == operation)
        if resource:
            query = query.filter(AuditLog.resource == resource)
        if decision:
            query = query.filter(AuditLog.decision == decision)
        if tool_name:
            query = query.filter(AuditLog.tool_name == tool_name)
        if session_id:
            query = query.filter(AuditLog.session_id == session_id)

        # Request ID (log_id)
        if request_id:
            try:
                val = request_id.upper().replace("REQ", "").lstrip("0")
                if val:
                    query = query.filter(AuditLog.log_id == int(val))
            except ValueError:
                pass

        # Customer ID and Order ID searches (checking in user_id, tool params, reason, trace)
        if customer_id:
            query = query.filter(
                (AuditLog.user_id == customer_id) | 
                (AuditLog.generated_tool.like(f"%{customer_id}%")) | 
                (AuditLog.reason.like(f"%{customer_id}%")) |
                (AuditLog.decision_trace.like(f"%{customer_id}%"))
            )
        if order_id:
            query = query.filter(
                (AuditLog.generated_tool.like(f"%{order_id}%")) | 
                (AuditLog.reason.like(f"%{order_id}%")) |
                (AuditLog.decision_trace.like(f"%{order_id}%"))
            )

        # Date Range filters
        if start_date:
            try:
                dt_start = datetime.datetime.fromisoformat(start_date)
                query = query.filter(AuditLog.timestamp >= dt_start)
            except Exception:
                pass
        if end_date:
            try:
                dt_end = datetime.datetime.fromisoformat(end_date)
                query = query.filter(AuditLog.timestamp <= dt_end)
            except Exception:
                pass

        # User Role filters
        if user_role and user_role.lower() != "all":
            if user_role.lower() == "customer":
                cust_ids = [c.customer_id for c in db.query(Customer.customer_id).all()]
                query = query.filter(AuditLog.user_id.in_(cust_ids))
            else:
                emp_ids = [e.employee_id for e in db.query(Employee.employee_id).filter(Employee.role.ilike(user_role)).all()]
                query = query.filter(AuditLog.user_id.in_(emp_ids))

        # Region filters
        if region and region.lower() != "all":
            cust_ids = [c.customer_id for c in db.query(Customer.customer_id).filter(Customer.region.ilike(region)).all()]
            emp_ids = [e.employee_id for e in db.query(Employee.employee_id).filter(Employee.region.ilike(region)).all()]
            query = query.filter(AuditLog.user_id.in_(cust_ids + emp_ids))

        # Attack Category filter via matching alerts
        if attack_category and attack_category.lower() != "all":
            alert_ids = [a.alert_id for a in db.query(SecurityAlert.alert_id).filter(SecurityAlert.alert_type.ilike(f"%{attack_category}%")).all()]
            query = query.filter(AuditLog.security_alert_id.in_(alert_ids))

        total = query.count()
        results = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
        return results, total

    def create_audit_log(self, db: Session, log: AuditLog) -> AuditLog:
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    # Blocked Sessions CRUD
    def get_blocked_session_by_id(self, db: Session, block_id: int) -> Optional[BlockedSession]:
        return db.query(BlockedSession).filter(BlockedSession.block_id == block_id).first()

    def get_blocked_sessions_all(
        self,
        db: Session,
        user_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[BlockedSession], int]:
        query = db.query(BlockedSession)
        if user_id:
            query = query.filter(BlockedSession.user_id == user_id)
        if is_active is not None:
            query = query.filter(BlockedSession.is_active == is_active)
        
        total = query.count()
        results = query.order_by(BlockedSession.blocked_at.desc()).offset(skip).limit(limit).all()
        return results, total

    def create_blocked_session(self, db: Session, block: BlockedSession) -> BlockedSession:
        db.add(block)
        db.commit()
        db.refresh(block)
        return block

    def update_blocked_session(self, db: Session, block: BlockedSession) -> BlockedSession:
        db.commit()
        db.refresh(block)
        return block

    # Security Alerts CRUD
    def get_alert_by_id(self, db: Session, alert_id: int) -> Optional[SecurityAlert]:
        return db.query(SecurityAlert).filter(SecurityAlert.alert_id == alert_id).first()

    def get_alerts_all(
        self,
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[SecurityAlert], int]:
        query = db.query(SecurityAlert)
        if status:
            if status in ("Pending Investigation", "PENDING", "OPEN"):
                query = query.filter(or_(
                    SecurityAlert.status == "Pending Investigation",
                    SecurityAlert.status == "PENDING",
                    SecurityAlert.status == "OPEN"
                ))
            else:
                query = query.filter(SecurityAlert.status == status)
        if severity:
            query = query.filter(SecurityAlert.severity == severity)
        
        total = query.count()
        results = query.order_by(SecurityAlert.created_at.desc()).offset(skip).limit(limit).all()
        return results, total

    def create_alert(self, db: Session, alert: SecurityAlert) -> SecurityAlert:
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert

    def update_alert(self, db: Session, alert: SecurityAlert) -> SecurityAlert:
        db.commit()
        db.refresh(alert)
        return alert

    # User Warnings CRUD
    def get_warnings_all(self, db: Session, user_id: Optional[str] = None) -> List[UserWarning]:
        query = db.query(UserWarning)
        if user_id:
            query = query.filter(UserWarning.user_id == user_id)
        return query.order_by(UserWarning.created_at.desc()).all()

    def create_warning(self, db: Session, warning: UserWarning) -> UserWarning:
        db.add(warning)
        db.commit()
        db.refresh(warning)
        return warning

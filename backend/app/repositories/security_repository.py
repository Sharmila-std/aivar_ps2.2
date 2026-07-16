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
        limit: int = 100
    ) -> Tuple[List[AuditLog], int]:
        query = db.query(AuditLog)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if operation:
            query = query.filter(AuditLog.operation == operation)
        if resource:
            query = query.filter(AuditLog.resource == resource)
        if decision:
            query = query.filter(AuditLog.decision == decision)
        
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

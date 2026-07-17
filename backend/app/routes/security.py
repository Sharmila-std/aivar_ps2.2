from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..services.security_service import SecurityService
from ..schemas.security import (
    PermissionManifestCreate, PermissionManifestUpdate, PermissionManifestOut, PaginatedPermissionManifests,
    AuditLogOut, PaginatedAuditLogs, BlockedSessionOut, BlockedSessionUpdate, PaginatedBlockedSessions,
    SecurityAlertOut, SecurityAlertUpdate, PaginatedSecurityAlerts
)
from ..utils.auth import get_current_employee
from ..models.employee import Employee

router = APIRouter(tags=["Security & Telemetry"])
service = SecurityService()

# Permission Manifest
@router.get("/api/permission-manifest", response_model=PaginatedPermissionManifests)
def get_manifests(
    role: Optional[str] = Query(None),
    tool_name: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    items, total = service.get_manifests(db, role, tool_name, skip, limit)
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/api/permission-manifest/{manifest_id}", response_model=PermissionManifestOut)
def get_manifest(
    manifest_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.get_manifest(db, manifest_id)

@router.post("/api/permission-manifest", response_model=PermissionManifestOut, status_code=status.HTTP_201_CREATED)
def create_manifest(
    manifest_in: PermissionManifestCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.create_manifest(db, manifest_in)

@router.put("/api/permission-manifest/{manifest_id}", response_model=PermissionManifestOut)
def update_manifest(
    manifest_id: int,
    manifest_in: PermissionManifestUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.update_manifest(db, manifest_id, manifest_in)

@router.delete("/api/permission-manifest/{manifest_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_manifest(
    manifest_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    service.delete_manifest(db, manifest_id)
    return None

# Audit Logs
@router.get("/api/audit-logs", response_model=PaginatedAuditLogs)
def get_audit_logs(
    user_id: Optional[str] = Query(None),
    operation: Optional[str] = Query(None),
    resource: Optional[str] = Query(None),
    decision: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    customer_id: Optional[str] = Query(None),
    order_id: Optional[str] = Query(None),
    request_id: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    attack_category: Optional[str] = Query(None),
    tool_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    items, total = service.get_audit_logs(
        db, user_id, operation, resource, decision, skip, limit,
        customer_id=customer_id, order_id=order_id, request_id=request_id,
        session_id=session_id, start_date=start_date, end_date=end_date,
        user_role=user_role, region=region, attack_category=attack_category,
        tool_name=tool_name
    )
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/api/audit-logs/{log_id}/details")
def get_audit_log_details(
    log_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.get_audit_log_details(db, log_id)

# Blocked Sessions
@router.get("/api/blocked-sessions", response_model=PaginatedBlockedSessions)
def get_blocked_sessions(
    user_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    items, total = service.get_blocked_sessions(db, user_id, is_active, skip, limit)
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.put("/api/blocked-sessions/{block_id}", response_model=BlockedSessionOut)
def toggle_session_block(
    block_id: int,
    block_in: BlockedSessionUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.toggle_session_block(db, block_id, block_in.is_active, current_employee.employee_id)

# Security Alerts
@router.get("/api/alerts", response_model=PaginatedSecurityAlerts)
def get_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    items, total = service.get_alerts(db, status, severity, skip, limit)
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.put("/api/alerts/{alert_id}", response_model=SecurityAlertOut)
def update_alert(
    alert_id: int,
    alert_in: SecurityAlertUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.update_alert(db, alert_id, alert_in, current_employee.employee_id)

@router.get("/api/alerts/{alert_id}/details")
def get_alert_details(
    alert_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.get_alert_details(db, alert_id)

@router.post("/api/alerts/{alert_id}/warn")
def send_warning(
    alert_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.send_warning_email_and_unlock(db, alert_id, current_employee.employee_id)

@router.post("/api/alerts/{alert_id}/disable")
def disable_account(
    alert_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.disable_account_permanently(db, alert_id, current_employee.employee_id)

@router.get("/api/alerts/{alert_id}/replay")
def get_alert_replay(
    alert_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.get_alert_replay(db, alert_id)

# ── Attack Replay Center (Admin-only) ────────────────────────────────────────
@router.get("/api/attack-replay")
def get_attack_replay_list(
    skip: int = Query(0),
    limit: int = Query(50),
    user_id: Optional[str] = Query(None),
    request_id: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None),
    attack_category: Optional[str] = Query(None),
    threat_level: Optional[str] = Query(None),
    decision: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.get_attack_replay_list(
        db, skip=skip, limit=limit,
        user_id=user_id, request_id=request_id,
        region=region, user_role=user_role,
        attack_category=attack_category, threat_level=threat_level,
        decision=decision, start_date=start_date, end_date=end_date
    )

@router.get("/api/attack-replay/{log_id}")
def get_attack_replay_detail(
    log_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.get_attack_replay_detail(db, log_id)


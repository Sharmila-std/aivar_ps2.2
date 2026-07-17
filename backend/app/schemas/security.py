from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# Permission Manifest
class PermissionManifestBase(BaseModel):
    role: str
    tool_name: str
    operation: str
    resource: str
    allowed: bool
    scope_rule: str
    description: Optional[str] = None

class PermissionManifestCreate(PermissionManifestBase):
    pass

class PermissionManifestUpdate(BaseModel):
    role: Optional[str] = None
    tool_name: Optional[str] = None
    operation: Optional[str] = None
    resource: Optional[str] = None
    allowed: Optional[bool] = None
    scope_rule: Optional[str] = None
    description: Optional[str] = None

class PermissionManifestOut(PermissionManifestBase):
    manifest_id: int

    model_config = ConfigDict(from_attributes=True)

# Audit Log
class AuditLogBase(BaseModel):
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    tool_name: Optional[str] = None
    operation: Optional[str] = None
    resource: Optional[str] = None
    decision: str
    reason: Optional[str] = None
    risk_score: Optional[int] = None
    execution_time: Optional[float] = None
    status: Optional[str] = None
    original_prompt: Optional[str] = None
    generated_tool: Optional[str] = None
    decision_trace: Optional[str] = None
    security_alert_id: Optional[int] = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogOut(AuditLogBase):
    log_id: int
    timestamp: datetime
    user_role: Optional[str] = None
    region: Optional[str] = None
    severity: Optional[str] = None
    request_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# Blocked Session
class BlockedSessionBase(BaseModel):
    session_id: Optional[str] = None
    user_id: str
    blocked_reason: str
    risk_score: int
    blocked_by: str
    is_active: bool

class BlockedSessionCreate(BlockedSessionBase):
    pass

class BlockedSessionUpdate(BaseModel):
    is_active: Optional[bool] = None
    blocked_reason: Optional[str] = None

class BlockedSessionOut(BlockedSessionBase):
    block_id: int
    blocked_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Security Alert
class SecurityAlertBase(BaseModel):
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    alert_type: str
    severity: str
    risk_score: int
    reason: str
    decision_trace: Optional[str] = None
    status: str
    threat_level: Optional[str] = None
    violation_count: Optional[int] = 0
    triggered_rule: Optional[str] = None
    user_role: Optional[str] = None
    resolution_notes: Optional[str] = None
    investigation_notes: Optional[str] = None

class SecurityAlertCreate(SecurityAlertBase):
    pass

class SecurityAlertUpdate(BaseModel):
    status: Optional[str] = None
    resolution_notes: Optional[str] = None
    investigation_notes: Optional[str] = None
    resolved_by: Optional[str] = None

class SecurityAlertOut(SecurityAlertBase):
    alert_id: int
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# User Warning
class UserWarningBase(BaseModel):
    user_id: str
    alert_id: int
    warning_number: int
    warning_message: str
    email_sent: bool

class UserWarningCreate(UserWarningBase):
    pass

class UserWarningOut(UserWarningBase):
    warning_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaginatedPermissionManifests(BaseModel):
    items: List[PermissionManifestOut]
    total: int
    skip: int
    limit: int

class PaginatedAuditLogs(BaseModel):
    items: List[AuditLogOut]
    total: int
    skip: int
    limit: int

class PaginatedBlockedSessions(BaseModel):
    items: List[BlockedSessionOut]
    total: int
    skip: int
    limit: int

class PaginatedSecurityAlerts(BaseModel):
    items: List[SecurityAlertOut]
    total: int
    skip: int
    limit: int

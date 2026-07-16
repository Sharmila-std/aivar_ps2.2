from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
import datetime
from ..database import Base

class PermissionManifest(Base):
    __tablename__ = 'permission_manifest'

    manifest_id = Column(Integer, primary_key=True, autoincrement=True)
    role = Column(String(50), nullable=False)
    tool_name = Column(String(100), nullable=False)
    operation = Column(String(20), nullable=False)
    resource = Column(String(50), nullable=False)
    allowed = Column(Boolean, nullable=False)
    scope_rule = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    session_id = Column(String(64), nullable=True)
    user_id = Column(String(20), nullable=True)
    tool_name = Column(String(100), nullable=True)
    operation = Column(String(20), nullable=True)
    resource = Column(String(50), nullable=True)
    decision = Column(String(50), nullable=False)  # Allowed, Blocked, etc.
    reason = Column(Text, nullable=True)
    risk_score = Column(Integer, nullable=True)
    execution_time = Column(Float, nullable=True)
    status = Column(String(20), nullable=True)  # success, failure
    original_prompt = Column(Text, nullable=True)
    generated_tool = Column(Text, nullable=True)
    decision_trace = Column(Text, nullable=True)
    security_alert_id = Column(Integer, nullable=True)

class BlockedSession(Base):
    __tablename__ = 'blocked_sessions'

    block_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), nullable=True)
    user_id = Column(String(20), nullable=False)
    blocked_reason = Column(Text, nullable=False)
    risk_score = Column(Integer, nullable=False)
    blocked_at = Column(DateTime, default=datetime.datetime.utcnow)
    blocked_by = Column(String(20), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

class SecurityAlert(Base):
    __tablename__ = 'security_alerts'

    alert_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), nullable=True)
    user_id = Column(String(20), nullable=True)
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    risk_score = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    decision_trace = Column(Text, nullable=True)
    status = Column(String(20), nullable=False)  # OPEN, RESOLVED, INVESTIGATING
    threat_level = Column(String(50), default="Safe", nullable=True)
    violation_count = Column(Integer, default=0, nullable=False)
    triggered_rule = Column(String(255), nullable=True)
    user_role = Column(String(50), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    investigation_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(20), nullable=True)

    # Relationships
    warnings = relationship("UserWarning", back_populates="alert", cascade="all, delete-orphan")

class UserWarning(Base):
    __tablename__ = 'user_warnings'

    warning_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(20), nullable=False)
    alert_id = Column(Integer, ForeignKey('security_alerts.alert_id', ondelete='CASCADE'), nullable=False)
    warning_number = Column(Integer, nullable=False)
    warning_message = Column(Text, nullable=False)
    email_sent = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    alert = relationship("SecurityAlert", back_populates="warnings")

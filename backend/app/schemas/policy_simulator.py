from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class LiveSettingsResponse(BaseModel):
    customer_permissions: List[str]
    manager_permissions: List[str]
    allow_rules: List[str]
    deny_rules: List[str]

class SimulationFilters(BaseModel):
    user_role: str = "All"
    region: str = "All"
    attack_category: str = "All"
    tool: str = "All"
    operation: str = "All"
    allowed_requests: bool = True
    blocked_requests: bool = True

class SimulationRequest(BaseModel):
    customer_permissions: List[str]
    manager_permissions: List[str]
    allow_rules: List[str]
    deny_rules: List[str]
    log_limit: int = 100
    filters: Optional[SimulationFilters] = None

class ReplayedRequest(BaseModel):
    request_id: str
    log_id: int
    user_id: Optional[str]
    user_role: str
    tool_name: Optional[str]
    operation: Optional[str]
    old_decision: str  # ALLOW or BLOCK
    new_decision: str  # ALLOW or BLOCK
    changed: bool
    reason: str

class TransitionStats(BaseModel):
    allow_to_allow: int = 0
    allow_to_block: int = 0
    block_to_allow: int = 0
    block_to_block: int = 0

class SummaryStats(BaseModel):
    total_replayed: int = 0
    changed_count: int = 0
    unchanged_count: int = 0
    percentage_affected: float = 0.0
    old_allowed: int = 0
    old_blocked: int = 0
    new_allowed: int = 0
    new_blocked: int = 0
    transitions: TransitionStats

class ImpactRule(BaseModel):
    rule_name: str
    changes_count: int

class SimulationResponse(BaseModel):
    summary: SummaryStats
    replayed_requests: List[ReplayedRequest]
    top_impacts: List[ImpactRule]
    chart_data: Dict[str, Any]

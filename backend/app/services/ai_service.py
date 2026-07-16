import re
import httpx
import json
import time
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session

from ..config import settings
from .customer_service import CustomerService
from .order_service import OrderService
from .employee_service import EmployeeService
from ..schemas.customer import CustomerCreate, CustomerUpdate
from ..schemas.order import OrderCreate, OrderUpdate, RefundUpdate
from ..schemas.employee import EmployeeCreate, EmployeeUpdate
from ..models.customer import Customer
from ..models.order import Order, Refund
from ..models.employee import Employee

# Define LLM System prompt outlining JSON schema constraints
SYSTEM_PROMPT = """You are an AI Agent operating an Enterprise CRM. Your role is to convert the administrator's natural language request into a JSON object containing a list of structured Tool Calls.
Do not add any explanations or preamble. Output ONLY a valid JSON object.

Format the response as:
{
    "calls": [
        {
            "tool": "crm.tool_name",
            "operation": "operation_name",
            "parameters": { ... }
        },
        ...
    ]
}

The supported tools, operations, and parameter structures are:

1. Customer Tool ("crm.customer"):
   - "read": Read a customer profile. Parameters: {"customer_id": "CUSXXXXXX"}
   - "create": Create a new customer profile. Parameters: {"full_name": "...", "email": "...", "phone": "...", "address": "...", "status": "...", "password": "..."}
   - "update": Update an existing customer profile. Parameters: {"customer_id": "CUSXXXXXX", "full_name": "...", "email": "..."}
   - "delete": Delete a customer profile. Parameters: {"customer_id": "CUSXXXXXX"}
   - "search": Search customer profiles. Parameters: {"query": "..."}
   - "list": List customer profiles. Parameters: {"status": "...", "skip": 0, "limit": 10}

2. Orders Tool ("crm.order"):
   - "read": Read an order details. Parameters: {"order_id": "ORDXXXXXX"}
   - "list": List purchase orders. Parameters: {"status": "...", "skip": 0, "limit": 10}
   - "create": Create order. Parameters: {"customer_id": "...", "product_name": "...", "category": "...", "quantity": 1, "price": 99.99, "delivery_address": "...", "payment_method": "...", "payment_status": "...", "order_status": "..."}
   - "update": Update order details. Parameters: {"order_id": "ORDXXXXXX", "order_status": "..."}
   - "delete": Delete order. Parameters: {"order_id": "ORDXXXXXX"}

3. Refunds Tool ("crm.refund"):
   - "read": Read a refund ticket. Parameters: {"refund_id": "REFXXXXXX"}
   - "list": List refunds. Parameters: {"status": "...", "skip": 0, "limit": 10}
   - "approve": Approve a pending refund. Parameters: {"refund_id": "REFXXXXXX"}
   - "reject": Reject a pending refund. Parameters: {"refund_id": "REFXXXXXX"}
   - "update": Update a refund ticket. Parameters: {"refund_id": "REFXXXXXX", "refund_status": "..."}

4. Employees Tool ("crm.employee"):
   - "read": Read an employee profile. Parameters: {"employee_id": "EMPXXXXXX"}
   - "create": Create employee account. Parameters: {"full_name": "...", "email": "...", "role_id": 1, "password": "..."}
   - "update": Update employee profile or roles. Parameters: {"employee_id": "EMPXXXXXX", "role_id": 2}
   - "delete": Delete employee account. Parameters: {"employee_id": "EMPXXXXXX"}

5. Dashboard Tool ("crm.dashboard"):
   - "show_statistics": Return KPI statistics. Parameters: {}
   - "recent_customers": Return 5 recent customers. Parameters: {}
   - "recent_orders": Return 5 recent orders. Parameters: {}
   - "recent_refunds": Return 5 recent refunds. Parameters: {}
"""

class AIService:
    def __init__(self):
        self.customer_service = CustomerService()
        self.order_service = OrderService()
        self.employee_service = EmployeeService()

    def generate_tool_call(self, prompt: str, db: Optional[Session] = None, role_name: Optional[str] = None, user_id: Optional[str] = None) -> Any:
        """
        Converts human language prompt into structured tool call JSON (dict or list).
        Tries to use Groq if GROQ_API_KEY is defined, otherwise uses regex fallback.
        """
        role_context = ""
        if role_name and user_id:
            role_context = f"\n\nCURRENT USER CONTEXT:\n- User ID: {user_id}\n- Role: {role_name}\nIf the user asks for their own details, mail, or profile (e.g. 'my mail id', 'get my data', 'show my profile'), compile the tool call to use their own ID and the appropriate tool (e.g. crm.customer if role is Customer, or crm.employee if role is Employee)."

        entity_context = ""
        if db:
            resolved = []
            # Check for customer names in prompt
            customers = db.query(Customer).all()
            for cust in customers:
                if cust.full_name.lower() in prompt.lower():
                    resolved.append(f"- Customer '{cust.full_name}' has Customer ID: {cust.customer_id}")
            
            # Check for employee names in prompt
            employees = db.query(Employee).all()
            for emp in employees:
                if emp.full_name.lower() in prompt.lower():
                    resolved.append(f"- Employee '{emp.full_name}' has Employee ID: {emp.employee_id}")
                    
            if resolved:
                entity_context = "\n\nRESOLVED ENTITY CONTEXT:\n" + "\n".join(resolved)

        if settings.GROQ_API_KEY:
            try:
                # Call Groq chat completions API
                with httpx.Client(timeout=10.0) as client:
                    res = client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "llama-3.3-70b-8192" if "llama-3.3-70b" in settings.GROQ_API_KEY else "llama-3.3-70b-versatile",
                            "messages": [
                                {"role": "system", "content": SYSTEM_PROMPT + role_context + entity_context},
                                {"role": "user", "content": prompt}
                            ],
                            "response_format": {"type": "json_object"},
                            "temperature": 0.0
                        }
                    )
                    if res.status_code == 200:
                        content = res.json()["choices"][0]["message"]["content"]
                        parsed = json.loads(content)
                        if isinstance(parsed, dict) and "calls" in parsed:
                            calls = parsed["calls"]
                            if len(calls) == 1:
                                return calls[0]
                            return calls
                        return parsed
            except Exception as e:
                print(f"Groq API error (falling back to local parser): {e}")

        # Fallback to local rule-based regex parser
        return self._local_parser(prompt, role_name=role_name, user_id=user_id)

    def _local_parser(self, prompt: str, role_name: Optional[str] = None, user_id: Optional[str] = None) -> Any:
        p = prompt.strip()
        plow = p.lower()

        # Split prompt by verbs to support multiple tool calls
        verbs = ["show", "read", "get", "delete", "remove", "update", "create", "approve", "reject", "list"]
        matches = []
        for verb in verbs:
            for m in re.finditer(r'\b' + verb + r'\b', plow):
                matches.append((m.start(), verb))
        
        matches.sort()

        if len(matches) > 1:
            parts = []
            for i in range(len(matches)):
                start = matches[i][0]
                end = matches[i+1][0] if i + 1 < len(matches) else len(p)
                part_str = p[start:end].strip()
                # clean conjunctions
                part_str = re.sub(r'^(and|then|then\s+read|then\s+update|then\s+delete|then\s+create|and\s+read|and\s+update|and\s+delete|and\s+create|\s+|,|;)+', '', part_str, flags=re.IGNORECASE).strip()
                if part_str:
                    parts.append(part_str)
            
            results = []
            for part in parts:
                res = self._single_local_parser(part, role_name=role_name, user_id=user_id)
                # Skip generic statistics fallback unless dashboard/statistics is requested explicitly
                if res.get("tool") == "crm.dashboard" and res.get("operation") == "show_statistics" and "dashboard" not in part.lower() and "statistics" not in part.lower():
                    continue
                results.append(res)
            
            # Propagate shared customer_id or other IDs to subcommands missing them
            shared_cust_id = next((r["parameters"]["customer_id"] for r in results if isinstance(r, dict) and "customer_id" in r.get("parameters", {})), None)
            shared_emp_id = next((r["parameters"]["employee_id"] for r in results if isinstance(r, dict) and "employee_id" in r.get("parameters", {})), None)
            shared_ord_id = next((r["parameters"]["order_id"] for r in results if isinstance(r, dict) and "order_id" in r.get("parameters", {})), None)
            shared_ref_id = next((r["parameters"]["refund_id"] for r in results if isinstance(r, dict) and "refund_id" in r.get("parameters", {})), None)

            for r in results:
                if isinstance(r, dict) and "parameters" in r:
                    if shared_cust_id and "customer_id" not in r["parameters"] and r.get("tool") == "crm.customer":
                        r["parameters"]["customer_id"] = shared_cust_id
                    if shared_emp_id and "employee_id" not in r["parameters"] and r.get("tool") == "crm.employee":
                        r["parameters"]["employee_id"] = shared_emp_id
                    if shared_ord_id and "order_id" not in r["parameters"] and r.get("tool") == "crm.order":
                        r["parameters"]["order_id"] = shared_ord_id
                    if shared_ref_id and "refund_id" not in r["parameters"] and r.get("tool") == "crm.refund":
                        r["parameters"]["refund_id"] = shared_ref_id

            if len(results) > 1:
                return results
            elif len(results) == 1:
                return results[0]

        return self._single_local_parser(prompt, role_name=role_name, user_id=user_id)

    def _single_local_parser(self, prompt: str, role_name: Optional[str] = None, user_id: Optional[str] = None) -> Dict[str, Any]:
        p = prompt.strip()
        plow = p.lower()

        # Dashboard Summary
        if "dashboard" in plow or "statistics" in plow or "summary" in plow:
            if "recent customer" in plow:
                return {"tool": "crm.dashboard", "operation": "recent_customers", "parameters": {}}
            elif "recent order" in plow:
                return {"tool": "crm.dashboard", "operation": "recent_orders", "parameters": {}}
            elif "recent refund" in plow:
                return {"tool": "crm.dashboard", "operation": "recent_refunds", "parameters": {}}
            else:
                return {"tool": "crm.dashboard", "operation": "show_statistics", "parameters": {}}

        # Customer update name patterns (e.g. update the cust name to Banu for CUS000004)
        match_cust_update = re.search(r'update\s+(?:the\s+)?cust(?:omer)?\s+name\s+to\s+([a-zA-Z\s]+)\s+for\s+(cus\d+)', plow)
        if match_cust_update:
            name = match_cust_update.group(1).title().strip()
            c_id = match_cust_update.group(2).upper()
            return {"tool": "crm.customer", "operation": "update", "parameters": {"customer_id": c_id, "full_name": name}}

        match_cust_update_alt = re.search(r'update\s+(?:customer\s+)?(cus\d+)\s+name\s+to\s+([a-zA-Z\s]+)', plow)
        if match_cust_update_alt:
            c_id = match_cust_update_alt.group(1).upper()
            name = match_cust_update_alt.group(2).title().strip()
            return {"tool": "crm.customer", "operation": "update", "parameters": {"customer_id": c_id, "full_name": name}}

        # General show/read details
        match_generic_read = re.search(r'\b(show|read|get|details)\b', plow)
        if match_generic_read:
            # Check if user is asking for their own info
            is_own_query = "my" in plow or "me" in plow or "self" in plow
            if is_own_query:
                if role_name == "Customer":
                    return {"tool": "crm.customer", "operation": "read", "parameters": {"customer_id": user_id or "CUSXXXXXX"}}
                else:
                    return {"tool": "crm.employee", "operation": "read", "parameters": {"employee_id": user_id or "EMPXXXXXX"}}

            if "employee" in plow or "emp" in plow:
                e_id_match = re.search(r'(emp\d+)', plow)
                return {"tool": "crm.employee", "operation": "read", "parameters": {"employee_id": e_id_match.group(1).upper() if e_id_match else None}}
            elif "order" in plow or "ord" in plow:
                o_id_match = re.search(r'(ord\d+)', plow)
                return {"tool": "crm.order", "operation": "read", "parameters": {"order_id": o_id_match.group(1).upper() if o_id_match else None}}
            elif "refund" in plow or "ref" in plow:
                r_id_match = re.search(r'(ref\d+)', plow)
                return {"tool": "crm.refund", "operation": "read", "parameters": {"refund_id": r_id_match.group(1).upper() if r_id_match else None}}
            else:
                c_id_match = re.search(r'(cus\d+)', plow)
                return {"tool": "crm.customer", "operation": "read", "parameters": {"customer_id": c_id_match.group(1).upper() if c_id_match else None}}

        # Customer reads & deletes
        match_cust_read = re.search(r'(show|read|get)\s+customer\s+(cus\d+)', plow)
        if match_cust_read:
            c_id = match_cust_read.group(2).upper()
            return {"tool": "crm.customer", "operation": "read", "parameters": {"customer_id": c_id}}

        match_cust_del = re.search(r'(delete|remove)\s+customer\s+(cus\d+)', plow)
        if match_cust_del:
            c_id = match_cust_del.group(2).upper()
            return {"tool": "crm.customer", "operation": "delete", "parameters": {"customer_id": c_id}}

        # Employee reads & deletes
        match_emp_read = re.search(r'(show|read|get)\s+employee\s+(emp\d+)', plow)
        if match_emp_read:
            e_id = match_emp_read.group(2).upper()
            return {"tool": "crm.employee", "operation": "read", "parameters": {"employee_id": e_id}}

        match_emp_del = re.search(r'(delete|remove)\s+employee\s+(emp\d+)', plow)
        if match_emp_del:
            e_id = match_emp_del.group(2).upper()
            return {"tool": "crm.employee", "operation": "delete", "parameters": {"employee_id": e_id}}

        # Order reads & deletes
        match_ord_read = re.search(r'(show|read|get)\s+order\s+(ord\d+)', plow)
        if match_ord_read:
            o_id = match_ord_read.group(2).upper()
            return {"tool": "crm.order", "operation": "read", "parameters": {"order_id": o_id}}

        match_ord_del = re.search(r'(delete|remove)\s+order\s+(ord\d+)', plow)
        if match_ord_del:
            o_id = match_ord_del.group(2).upper()
            return {"tool": "crm.order", "operation": "delete", "parameters": {"order_id": o_id}}

        # Refund approvals & list
        match_ref_approve = re.search(r'approve\s+refund\s+(ref\d+)', plow)
        if match_ref_approve:
            r_id = match_ref_approve.group(1).upper()
            return {"tool": "crm.refund", "operation": "approve", "parameters": {"refund_id": r_id}}

        match_ref_reject = re.search(r'reject\s+refund\s+(ref\d+)', plow)
        if match_ref_reject:
            r_id = match_ref_reject.group(1).upper()
            return {"tool": "crm.refund", "operation": "reject", "parameters": {"refund_id": r_id}}

        match_ref_read = re.search(r'(show|read|get)\s+refund\s+(ref\d+)', plow)
        if match_ref_read:
            r_id = match_ref_read.group(2).upper()
            return {"tool": "crm.refund", "operation": "read", "parameters": {"refund_id": r_id}}

        if "refund" in plow and ("list" in plow or "show" in plow):
            status = "Pending" if "pending" in plow else ("Approved" if "approved" in plow else ("Rejected" if "rejected" in plow else None))
            return {"tool": "crm.refund", "operation": "list", "parameters": {"status": status} if status else {}}

        # Customer Creation (Create customer John Smith, etc.)
        match_cust_create = re.search(r'create\s+customer\s+([a-zA-Z\s]+)', p, re.IGNORECASE)
        if match_cust_create:
            name = match_cust_create.group(1).strip()
            email = "info@example.com"
            phone = "+1555999999"
            address = "New York, USA"
            status = "Approved"
            password = "temporarypassword"
            
            email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', p)
            if email_match:
                email = email_match.group(0)
            
            return {
                "tool": "crm.customer",
                "operation": "create",
                "parameters": {
                    "full_name": name,
                    "email": email,
                    "phone": phone,
                    "address": address,
                    "status": status,
                    "password": password
                }
            }

        # Customer Search
        if "search customer" in plow or "find customer" in plow:
            query = plow.replace("search customer", "").replace("find customer", "").strip()
            return {"tool": "crm.customer", "operation": "search", "parameters": {"query": query}}

        # Generic reads if ID matches directly
        match_cust_id_direct = re.search(r'\b(cus\d+)\b', plow)
        if match_cust_id_direct:
            c_id = match_cust_id_direct.group(1).upper()
            op = "update" if "update" in plow else ("delete" if "delete" in plow or "remove" in plow else "read")
            return {"tool": "crm.customer", "operation": op, "parameters": {"customer_id": c_id}}

        # Default fallback: list customers
        if "customer" in plow:
            return {"tool": "crm.customer", "operation": "list", "parameters": {}}
        if "order" in plow:
            return {"tool": "crm.order", "operation": "list", "parameters": {}}

        # Default fallback generic
        return {
            "tool": "crm.dashboard",
            "operation": "show_statistics",
            "parameters": {}
        }

    def execute_tool_call(self, db: Session, tool_call: Any, operator_id: str) -> Dict[str, Any]:
        """
        Resolves the tool call structure to the service layer.
        Supports either a single dictionary tool call or a list of tool calls.
        """
        if isinstance(tool_call, list):
            start_time = time.perf_counter()
            results = []
            all_success = True
            total_size = 0
            
            for call in tool_call:
                if not isinstance(call, dict):
                    results.append({"success": False, "error": "Invalid tool call object type"})
                    all_success = False
                    continue
                
                tool = call.get("tool")
                operation = call.get("operation")
                params = call.get("parameters", {})
                
                if not tool or not operation:
                    results.append({"success": False, "error": "Tool and operation are required parameters"})
                    all_success = False
                    continue
                
                try:
                    if tool == "crm.customer":
                        res_data = self._execute_customer(db, operation, params)
                    elif tool == "crm.order":
                        res_data = self._execute_order(db, operation, params, operator_id)
                    elif tool == "crm.refund":
                        res_data = self._execute_refund(db, operation, params)
                    elif tool == "crm.employee":
                        res_data = self._execute_employee(db, operation, params)
                    elif tool == "crm.dashboard":
                        res_data = self._execute_dashboard(db, operation)
                    else:
                        raise ValueError(f"Unknown tool target: {tool}")
                    
                    results.append({"success": True, "data": res_data})
                    total_size += len(json.dumps(res_data, default=str).encode('utf-8'))
                except Exception as e:
                    results.append({"success": False, "error": str(e)})
                    all_success = False
            
            # Commit after executing the batch
            try:
                db.commit()
            except Exception:
                pass
            
            duration = (time.perf_counter() - start_time) * 1000
            
            return {
                "success": all_success,
                "data": results,
                "metrics": {
                    "status": "Success" if all_success else "Failed",
                    "execution_time_ms": round(duration, 2),
                    "response_size_bytes": total_size
                }
            }

        # Single tool execution
        tool = tool_call.get("tool")
        operation = tool_call.get("operation")
        params = tool_call.get("parameters", {})

        if not tool or not operation:
            raise ValueError("Tool and operation are required parameters.")

        start_time = time.perf_counter()

        try:
            if tool == "crm.customer":
                result = self._execute_customer(db, operation, params)
            elif tool == "crm.order":
                result = self._execute_order(db, operation, params, operator_id)
            elif tool == "crm.refund":
                result = self._execute_refund(db, operation, params)
            elif tool == "crm.employee":
                result = self._execute_employee(db, operation, params)
            elif tool == "crm.dashboard":
                result = self._execute_dashboard(db, operation)
            else:
                raise ValueError(f"Unknown tool target: {tool}")

            # Commit changes
            try:
                db.commit()
            except Exception:
                pass

            duration = (time.perf_counter() - start_time) * 1000
            
            # Serialize result to check size
            payload_str = json.dumps(result, default=str)
            size_bytes = len(payload_str.encode('utf-8'))

            return {
                "success": True,
                "data": result,
                "metrics": {
                    "status": "Success",
                    "execution_time_ms": round(duration, 2),
                    "response_size_bytes": size_bytes
                }
            }

        except Exception as e:
            duration = (time.perf_counter() - start_time) * 1000
            return {
                "success": False,
                "error": str(e),
                "metrics": {
                    "status": "Failed",
                    "execution_time_ms": round(duration, 2),
                    "response_size_bytes": 0
                }
            }

    def _execute_customer(self, db: Session, operation: str, params: Dict[str, Any]) -> Any:
        if operation == "read":
            customer_id = params.get("customer_id")
            if not customer_id:
                raise ValueError("customer_id is required.")
            res = self.customer_service.get_customer(db, customer_id)
            if not res:
                raise ValueError(f"Customer {customer_id} not found.")
            return {
                "customer_id": res.customer_id,
                "full_name": res.full_name,
                "email": res.email,
                "phone": res.phone,
                "address": res.address,
                "status": res.status,
                "region": res.region,
                "aadhaar_number": res.aadhaar_number,
                "pan_number": res.pan_number,
                "card_number": res.card_number
            }
        elif operation == "create":
            # Generate a random unique customer ID
            c_id = params.get("customer_id") or f"CUS{re.sub('[^0-9]', '', str(time.time()))[:6]}"
            cust_in = CustomerCreate(
                customer_id=c_id,
                full_name=params.get("full_name", ""),
                email=params.get("email", ""),
                phone=params.get("phone", ""),
                address=params.get("address", ""),
                status=params.get("status", "Approved"),
                password=params.get("password", "tempPass123"),
                aadhaar_number=params.get("aadhaar_number"),
                pan_number=params.get("pan_number"),
                card_number=params.get("card_number")
            )
            res = self.customer_service.create_customer(db, cust_in)
            return {"customer_id": res.customer_id, "full_name": res.full_name, "status": res.status}
        elif operation == "update":
            customer_id = params.get("customer_id")
            if not customer_id:
                raise ValueError("customer_id is required.")
            cust_in = CustomerUpdate(**{k: v for k, v in params.items() if k != "customer_id"})
            res = self.customer_service.update_customer(db, customer_id, cust_in)
            return {"customer_id": res.customer_id, "full_name": res.full_name, "status": res.status}
        elif operation == "delete":
            customer_id = params.get("customer_id")
            if not customer_id:
                raise ValueError("customer_id is required.")
            self.customer_service.delete_customer(db, customer_id)
            return {"deleted": True, "customer_id": customer_id}
        elif operation == "search":
            query = params.get("query") or params.get("search", "")
            items, total = self.customer_service.get_customers(db, search=query, limit=10, region=params.get("region"))
            return {
                "items": [
                    {
                        "customer_id": c.customer_id,
                        "full_name": c.full_name,
                        "email": c.email,
                        "phone": c.phone,
                        "address": c.address,
                        "status": c.status,
                        "region": c.region,
                        "aadhaar_number": c.aadhaar_number,
                        "pan_number": c.pan_number,
                        "card_number": c.card_number
                    } for c in items
                ],
                "total": total
            }
        elif operation == "list":
            status = params.get("status")
            skip = params.get("skip", 0)
            limit = params.get("limit", 10)
            items, total = self.customer_service.get_customers(db, status=status, skip=skip, limit=limit, region=params.get("region"))
            return {
                "items": [
                    {
                        "customer_id": c.customer_id,
                        "full_name": c.full_name,
                        "email": c.email,
                        "phone": c.phone,
                        "address": c.address,
                        "status": c.status,
                        "region": c.region,
                        "aadhaar_number": c.aadhaar_number,
                        "pan_number": c.pan_number,
                        "card_number": c.card_number
                    } for c in items
                ],
                "total": total
            }
        else:
            raise ValueError(f"Unsupported operation '{operation}' on tool crm.customer")

    def _execute_order(self, db: Session, operation: str, params: Dict[str, Any], operator_id: str) -> Any:
        if operation == "read":
            order_id = params.get("order_id")
            if not order_id:
                raise ValueError("order_id is required.")
            res = self.order_service.get_order(db, order_id)
            if not res:
                raise ValueError(f"Order {order_id} not found.")
            return {
                "order_id": res.order_id,
                "customer_id": res.customer_id,
                "product_name": res.product_name,
                "price": float(res.price),
                "order_status": res.order_status,
                "items": [{"product_name": i.product_name, "quantity": i.quantity, "subtotal": float(i.subtotal)} for i in res.items]
            }
        elif operation == "list":
            status = params.get("status")
            skip = params.get("skip", 0)
            limit = params.get("limit", 10)
            items, total = self.order_service.get_orders(db, status=status, skip=skip, limit=limit)
            return {
                "items": [{"order_id": o.order_id, "product_name": o.product_name, "order_status": o.order_status, "price": float(o.price)} for o in items],
                "total": total
            }
        elif operation == "create":
            o_id = params.get("order_id") or f"ORD{re.sub('[^0-9]', '', str(time.time()))[:6]}"
            ord_in = OrderCreate(
                order_id=o_id,
                customer_id=params.get("customer_id", ""),
                product_name=params.get("product_name", ""),
                category=params.get("category", "General"),
                quantity=params.get("quantity", 1),
                price=params.get("price", 0.0),
                delivery_address=params.get("delivery_address", ""),
                payment_method=params.get("payment_method", "Credit Card"),
                payment_status=params.get("payment_status", "Paid"),
                order_status=params.get("order_status", "Pending")
            )
            res = self.order_service.create_order(db, ord_in)
            return {"order_id": res.order_id, "product_name": res.product_name, "order_status": res.order_status}
        elif operation == "update":
            order_id = params.get("order_id")
            if not order_id:
                raise ValueError("order_id is required.")
            ord_in = OrderUpdate(**{k: v for k, v in params.items() if k != "order_id"})
            res = self.order_service.update_order(db, order_id, ord_in)
            return {"order_id": res.order_id, "order_status": res.order_status}
        elif operation == "delete":
            order_id = params.get("order_id")
            if not order_id:
                raise ValueError("order_id is required.")
            self.order_service.delete_order(db, order_id, operator_id)
            return {"deleted": True, "order_id": order_id}
        else:
            raise ValueError(f"Unsupported operation '{operation}' on tool crm.order")

    def _execute_refund(self, db: Session, operation: str, params: Dict[str, Any]) -> Any:
        if operation == "read":
            refund_id = params.get("refund_id")
            if not refund_id:
                raise ValueError("refund_id is required.")
            res = self.order_service.get_refund(db, refund_id)
            if not res:
                raise ValueError(f"Refund ticket {refund_id} not found.")
            return {
                "refund_id": res.refund_id,
                "order_id": res.order_id,
                "refund_amount": float(res.refund_amount),
                "refund_status": res.refund_status,
                "refund_reason": res.refund_reason
            }
        elif operation == "list":
            status = params.get("status")
            skip = params.get("skip", 0)
            limit = params.get("limit", 10)
            items, total = self.order_service.get_refunds(db, status=status, skip=skip, limit=limit)
            return {
                "items": [{"refund_id": r.refund_id, "order_id": r.order_id, "refund_status": r.refund_status, "refund_amount": float(r.refund_amount)} for r in items],
                "total": total
            }
        elif operation in ("approve", "reject"):
            refund_id = params.get("refund_id")
            if not refund_id:
                raise ValueError("refund_id is required.")
            status_val = "Approved" if operation == "approve" else "Rejected"
            ref_in = RefundUpdate(refund_status=status_val)
            res = self.order_service.update_refund(db, refund_id, ref_in)
            return {"refund_id": res.refund_id, "refund_status": res.refund_status, "refund_amount": float(res.refund_amount)}
        elif operation == "update":
            refund_id = params.get("refund_id")
            if not refund_id:
                raise ValueError("refund_id is required.")
            ref_in = RefundUpdate(**{k: v for k, v in params.items() if k != "refund_id"})
            res = self.order_service.update_refund(db, refund_id, ref_in)
            return {"refund_id": res.refund_id, "refund_status": res.refund_status}
        else:
            raise ValueError(f"Unsupported operation '{operation}' on tool crm.refund")

    def _execute_employee(self, db: Session, operation: str, params: Dict[str, Any]) -> Any:
        if operation == "read":
            employee_id = params.get("employee_id")
            if not employee_id:
                raise ValueError("employee_id is required.")
            res = self.employee_service.get_employee(db, employee_id)
            if not res:
                raise ValueError(f"Employee {employee_id} not found.")
            return {
                "employee_id": res.employee_id,
                "full_name": res.full_name,
                "email": res.email,
                "role": res.role.role_name if res.role else None
            }
        elif operation == "create":
            e_id = params.get("employee_id") or f"EMP{re.sub('[^0-9]', '', str(time.time()))[:6]}"
            emp_in = EmployeeCreate(
                employee_id=e_id,
                full_name=params.get("full_name", ""),
                email=params.get("email", ""),
                role_id=params.get("role_id", 1),
                password=params.get("password", "tempPass123")
            )
            res = self.employee_service.create_employee(db, emp_in)
            return {"employee_id": res.employee_id, "full_name": res.full_name}
        elif operation == "update":
            employee_id = params.get("employee_id")
            if not employee_id:
                raise ValueError("employee_id is required.")
            emp_in = EmployeeUpdate(**{k: v for k, v in params.items() if k != "employee_id"})
            res = self.employee_service.update_employee(db, employee_id, emp_in)
            return {"employee_id": res.employee_id, "full_name": res.full_name}
        elif operation == "delete":
            employee_id = params.get("employee_id")
            if not employee_id:
                raise ValueError("employee_id is required.")
            self.employee_service.delete_employee(db, employee_id)
            return {"deleted": True, "employee_id": employee_id}
        else:
            raise ValueError(f"Unsupported operation '{operation}' on tool crm.employee")

    def _execute_dashboard(self, db: Session, operation: str) -> Any:
        if operation == "show_statistics":
            return {
                "total_customers": db.query(Customer).count(),
                "total_orders": db.query(Order).count(),
                "pending_refunds": db.query(Refund).filter(Refund.refund_status == "Pending").count(),
                "total_employees": db.query(Employee).count()
            }
        elif operation == "recent_customers":
            items = db.query(Customer).order_by(Customer.created_at.desc()).limit(5).all()
            return [{"customer_id": c.customer_id, "full_name": c.full_name, "email": c.email} for c in items]
        elif operation == "recent_orders":
            items = db.query(Order).order_by(Order.order_date.desc()).limit(5).all()
            return [{"order_id": o.order_id, "product_name": o.product_name, "price": float(o.price)} for o in items]
        elif operation == "recent_refunds":
            items = db.query(Refund).order_by(Refund.created_at.desc()).limit(5).all()
            return [{"refund_id": r.refund_id, "order_id": r.order_id, "refund_amount": float(r.refund_amount)} for r in items]
        else:
            raise ValueError(f"Unsupported operation '{operation}' on tool crm.dashboard")

    def generate_human_explanation(self, prompt: str, result: Dict[str, Any]) -> str:
        """
        Generates a human-friendly generative response explaining the execution results or errors.
        """
        if not settings.GROQ_API_KEY:
            if result.get("success") == False:
                err_info = result.get("error", {})
                reason = err_info.get("reason", "An error occurred.") if isinstance(err_info, dict) else str(err_info)
                return f"Execution failed: {reason}"
            return "Execution completed successfully. (No Groq API Key defined for human explanation generation)."

        system_msg = (
            "You are an Enterprise AI CRM Security & Operations Copilot. "
            "Your task is to take the user's natural language request and the resulting execution/security-gateway response, "
            "and write a friendly, concise, professional human-like generative response (like a GPT assistant would answer).\n"
            "If the request succeeded: explain the output neatly in clean markdown. Summarize details point-wise where helpful.\n"
            "If the request failed or was BLOCKED by the Security Gateway: explain clearly why it was blocked or why it failed in a polite, professional, and clear manner."
        )

        user_msg = (
            f"User Prompt: \"{prompt}\"\n\n"
            f"Gateway/Execution Result JSON:\n{json.dumps(result, indent=2, default=str)}"
        )

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.3-70b-8192" if "llama-3.3-70b" in settings.GROQ_API_KEY else "llama-3.3-70b-versatile",
                        "messages": [
                            {"role": "system", "content": system_msg},
                            {"role": "user", "content": user_msg}
                        ],
                        "temperature": 0.5
                    }
                )
                if res.status_code == 200:
                    content = res.json()["choices"][0]["message"]["content"]
                    return content.strip()
        except Exception:
            pass

        # Fallback explanation
        if result.get("success") == False:
            err_info = result.get("error", {})
            reason = err_info.get("reason", "An error occurred.") if isinstance(err_info, dict) else str(err_info)
            return f"Execution failed: {reason}"
        return "Execution completed successfully."

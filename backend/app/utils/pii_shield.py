from typing import Any, Tuple
import time

def mask_aadhaar(v: str) -> str:
    if not v:
        return v
    # e.g., 8809 5787 4424 -> 8809 **** 4424
    parts = v.split()
    if len(parts) == 3:
        return f"{parts[0]} **** {parts[2]}"
    if len(v) >= 8:
        return v[:4] + "****" + v[-4:]
    return "****"

def mask_pan(v: str) -> str:
    if not v:
        return v
    # e.g., RBLDS7586J -> RBL*****6J
    if len(v) >= 10:
        return v[:3] + "*****" + v[-2:]
    if len(v) > 4:
        return v[:2] + "***" + v[-2:]
    return "*****"

def mask_card(v: str) -> str:
    if not v:
        return v
    # e.g., 4980-3595-5307-3396 -> 4980-****-****-3396
    parts = v.split('-')
    if len(parts) == 4:
        return f"{parts[0]}-****-****-{parts[3]}"
    if len(v) >= 12:
        return v[:4] + "-****-****-" + v[-4:]
    return "****"

def redact_pii_recursively(data: Any, masked_fields: set) -> Any:
    if isinstance(data, dict):
        new_dict = {}
        for k, v in data.items():
            if k == "aadhaar_number" and isinstance(v, str) and v and "****" not in v:
                new_dict[k] = mask_aadhaar(v)
                masked_fields.add("aadhaar_number")
            elif k == "pan_number" and isinstance(v, str) and v and "*****" not in v:
                new_dict[k] = mask_pan(v)
                masked_fields.add("pan_number")
            elif k == "card_number" and isinstance(v, str) and v and "****" not in v:
                new_dict[k] = mask_card(v)
                masked_fields.add("card_number")
            else:
                new_dict[k] = redact_pii_recursively(v, masked_fields)
        return new_dict
    elif isinstance(data, list):
        return [redact_pii_recursively(item, masked_fields) for item in data]
    return data

class PIIOutputShield:
    @staticmethod
    def redact_payload(data: Any) -> Tuple[Any, list, float]:
        t_start = time.perf_counter()
        masked_fields = set()
        redacted_data = redact_pii_recursively(data, masked_fields)
        latency_ms = (time.perf_counter() - t_start) * 1000.0
        return redacted_data, list(masked_fields), round(latency_ms, 3)

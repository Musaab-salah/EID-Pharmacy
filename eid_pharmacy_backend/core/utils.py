"""
Unit conversion helpers. Canonical unit = pill.
"""
from decimal import Decimal


def to_canonical_qty(qty: int | float, unit: str, pills_per_strip: int = 1, strips_per_box: int = 1) -> int:
    """Convert quantity to canonical (pill) units."""
    qty = int(qty or 0)
    unit = (unit or "pill").lower().strip()
    pps = max(1, int(pills_per_strip or 1))
    spb = max(1, int(strips_per_box or 1))
    if unit == "pill":
        return qty
    if unit == "strip":
        return qty * pps
    if unit == "box":
        return qty * spb * pps
    return qty


def strip_to_pills(strips: int | float, pills_per_strip: int = 1) -> int:
    return int((strips or 0) * max(1, pills_per_strip or 1))


def box_to_pills(boxes: int | float, strips_per_box: int = 1, pills_per_strip: int = 1) -> int:
    return int((boxes or 0) * max(1, strips_per_box or 1) * max(1, pills_per_strip or 1))


def normalize_product_identity(s: str) -> str:
    """Normalize product name for grouping: trim, lower, strip symbols."""
    if not s:
        return ""
    import re
    s = str(s).strip().lower()
    s = re.sub(r"[^\w\u0600-\u06FF\s]", "", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()

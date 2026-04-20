from __future__ import annotations

import uuid as uuid_lib
from dataclasses import dataclass
from typing import Any, Protocol


@dataclass
class EInvoiceResult:
    status: str  # submitted|failed
    uuid: str = ""
    qr_text: str = ""
    payload: dict[str, Any] | None = None
    response: dict[str, Any] | None = None
    error: str = ""


class EInvoiceProvider(Protocol):
    name: str

    def generate_payload(self, invoice) -> dict[str, Any]: ...
    def submit(self, payload: dict[str, Any]) -> EInvoiceResult: ...


class DummyProvider:
    name = "dummy"

    def generate_payload(self, invoice) -> dict[str, Any]:
        return {
            "invoice_id": invoice.id,
            "branch_id": invoice.branch_id,
            "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
            "grand_total": float(invoice.grand_total or 0),
        }

    def submit(self, payload: dict[str, Any]) -> EInvoiceResult:
        u = str(uuid_lib.uuid4())
        qr = f"EINV|{u}|{payload.get('invoice_id')}"
        return EInvoiceResult(
            status="submitted",
            uuid=u,
            qr_text=qr,
            payload=payload,
            response={"ok": True},
        )


def get_provider(name: str | None) -> EInvoiceProvider:
    if (name or "").strip().lower() in ("", "dummy"):
        return DummyProvider()
    # Placeholder for future country-specific providers
    return DummyProvider()


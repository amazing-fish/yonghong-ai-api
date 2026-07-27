from __future__ import annotations

from typing import Any

from app.config import Settings


SENSITIVE_KEYS = {
    "authorization",
    "cookie",
    "token",
    "api_key",
    "apikey",
    "yhbessionid",
    "yhbisessionid",
}


def sanitize_rows(rows: list[dict[str, Any]], settings: Settings) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    limited_rows = rows[: max(1, settings.max_rows)]
    sanitized: list[dict[str, Any]] = []

    for row in limited_rows:
        clean: dict[str, Any] = {}
        for key, value in row.items():
            if len(clean) >= settings.max_columns:
                break
            key_text = str(key)
            if key_text.lower() in SENSITIVE_KEYS:
                continue
            clean[key_text] = _sanitize_value(value, settings.max_cell_chars)
        sanitized.append(clean)

    return sanitized, {
        "received_rows": len(rows),
        "sent_rows": len(sanitized),
        "rows_truncated": len(rows) > len(sanitized),
    }


def _sanitize_value(value: Any, max_chars: int) -> Any:
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return value[:max_chars]
    if isinstance(value, (list, tuple)):
        return [_sanitize_value(item, max_chars) for item in value[:50]]
    if isinstance(value, dict):
        return {
            str(key): _sanitize_value(item, max_chars)
            for key, item in list(value.items())[:50]
            if str(key).lower() not in SENSITIVE_KEYS
        }
    return str(value)[:max_chars]

from app.config import Settings
from app.services.context_sanitizer import sanitize_rows


def test_sanitizer_limits_and_removes_sensitive_keys():
    settings = Settings(_env_file=None, max_rows=1, max_columns=2, max_cell_chars=3)
    rows, meta = sanitize_rows([
        {"name": "abcdef", "cookie": "secret", "value": 1, "extra": 2},
        {"name": "second"},
    ], settings)
    assert rows == [{"name": "abc", "value": 1}]
    assert meta["rows_truncated"] is True

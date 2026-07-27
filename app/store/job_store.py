from __future__ import annotations

import asyncio
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4


TERMINAL = {"succeeded", "failed", "cancelled"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class JobStore:
    """SQLite job store using the standard library only.

    Each database operation opens a short-lived connection and runs in a worker
    thread, so FastAPI's event loop is not blocked and no extra SQLite package
    is required.
    """

    def __init__(self, path: Path) -> None:
        self.path = path

    async def initialize(self) -> None:
        await asyncio.to_thread(self._initialize_sync)

    async def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        job_id = await asyncio.to_thread(self._create_sync, payload)
        job = await self.get(job_id)
        if job is None:
            raise RuntimeError("任务创建后无法读取")
        return job

    async def get(self, job_id: str) -> dict[str, Any] | None:
        return await asyncio.to_thread(self._get_sync, job_id)

    async def update(
        self,
        job_id: str,
        *,
        status: str | None = None,
        answer: str | None = None,
        error: str | None = None,
        progress: dict[str, Any] | None = None,
        result_meta: dict[str, Any] | None = None,
        clear_request: bool = False,
    ) -> None:
        await asyncio.to_thread(
            self._update_sync,
            job_id,
            status,
            answer,
            error,
            progress,
            result_meta,
            clear_request,
        )

    async def recover(self) -> list[str]:
        return await asyncio.to_thread(self._recover_sync)

    def _connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path, timeout=30)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA busy_timeout=30000")
        return connection

    def _initialize_sync(self) -> None:
        with self._connect() as db:
            db.execute(
                """
                CREATE TABLE IF NOT EXISTS jobs (
                    job_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    question TEXT NOT NULL,
                    request_json TEXT NOT NULL,
                    answer TEXT,
                    error TEXT,
                    progress_json TEXT NOT NULL,
                    result_meta_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            db.commit()

    def _create_sync(self, payload: dict[str, Any]) -> str:
        job_id = str(uuid4())
        now = now_iso()
        with self._connect() as db:
            db.execute(
                """
                INSERT INTO jobs (
                    job_id, status, question, request_json, answer, error,
                    progress_json, result_meta_json, created_at, updated_at
                ) VALUES (?, 'queued', ?, ?, NULL, NULL, ?, '{}', ?, ?)
                """,
                (
                    job_id,
                    payload["question"],
                    json.dumps(payload, ensure_ascii=False),
                    json.dumps({"message": "任务已进入本地队列"}, ensure_ascii=False),
                    now,
                    now,
                ),
            )
            db.commit()
        return job_id

    def _get_sync(self, job_id: str) -> dict[str, Any] | None:
        with self._connect() as db:
            row = db.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,)).fetchone()
        if row is None:
            return None
        return {
            "job_id": row["job_id"],
            "status": row["status"],
            "question": row["question"],
            "request": json.loads(row["request_json"]),
            "answer": row["answer"],
            "error": row["error"],
            "progress": json.loads(row["progress_json"] or "{}"),
            "result_meta": json.loads(row["result_meta_json"] or "{}"),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def _update_sync(
        self,
        job_id: str,
        status: str | None,
        answer: str | None,
        error: str | None,
        progress: dict[str, Any] | None,
        result_meta: dict[str, Any] | None,
        clear_request: bool,
    ) -> None:
        assignments = ["updated_at = ?"]
        values: list[Any] = [now_iso()]
        for field, value in (("status", status), ("answer", answer), ("error", error)):
            if value is not None:
                assignments.append(f"{field} = ?")
                values.append(value)
        if progress is not None:
            assignments.append("progress_json = ?")
            values.append(json.dumps(progress, ensure_ascii=False))
        if result_meta is not None:
            assignments.append("result_meta_json = ?")
            values.append(json.dumps(result_meta, ensure_ascii=False))
        if clear_request:
            assignments.append("request_json = ?")
            values.append(json.dumps({"question": "[cleared]"}, ensure_ascii=False))
        values.append(job_id)
        with self._connect() as db:
            db.execute(f"UPDATE jobs SET {', '.join(assignments)} WHERE job_id = ?", values)
            db.commit()

    def _recover_sync(self) -> list[str]:
        placeholders = ",".join("?" for _ in TERMINAL)
        with self._connect() as db:
            rows = db.execute(
                f"SELECT job_id FROM jobs WHERE status NOT IN ({placeholders})",
                tuple(TERMINAL),
            ).fetchall()
            ids = [str(row["job_id"]) for row in rows]
            now = now_iso()
            db.executemany(
                "UPDATE jobs SET status='queued', updated_at=? WHERE job_id=?",
                [(now, job_id) for job_id in ids],
            )
            db.commit()
        return ids

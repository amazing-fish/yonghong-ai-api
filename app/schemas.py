from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=20000)


class BoundField(BaseModel):
    source: str = Field(min_length=1, max_length=100, pattern=r"^column\d+$")
    name: str = Field(min_length=1, max_length=300)
    role: str = Field(default="unknown", pattern="^(dimension|measure|unknown)$")


class JobCreateRequest(BaseModel):
    question: str = Field(min_length=1, max_length=10000)
    dashboard: str | None = Field(default=None, max_length=300)
    dataset_name: str | None = Field(default=None, max_length=300)
    filters: dict[str, Any] = Field(default_factory=dict)
    fields: list[BoundField] = Field(default_factory=list, max_length=200)
    rows: list[dict[str, Any]] = Field(default_factory=list)
    history: list[ChatMessage] = Field(default_factory=list)

    @field_validator("history")
    @classmethod
    def limit_history(cls, value: list[ChatMessage]) -> list[ChatMessage]:
        return value[-10:]


class JobAcceptedResponse(BaseModel):
    job_id: str
    status: str
    poll_interval_ms: int


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    question: str
    answer: str | None = None
    error: str | None = None
    progress: dict[str, Any] = Field(default_factory=dict)
    result_meta: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class HealthResponse(BaseModel):
    status: str
    model_configured: bool
    model_name: str | None

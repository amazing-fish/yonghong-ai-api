from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.schemas import HealthResponse, JobAcceptedResponse, JobCreateRequest, JobStatusResponse
from app.services.job_service import JobService
from app.services.model_client import GPTChatClient
from app.services.prompt_builder import PromptBuilder
from app.store.job_store import JobStore


settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    store = JobStore(settings.database_path)
    model = GPTChatClient(settings)
    service = JobService(settings, store, model, PromptBuilder(settings))
    await service.start()
    app.state.store = store
    app.state.service = service
    yield
    await service.stop()


app = FastAPI(title="Yonghong AI POC", version="2.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Type"],
)


@app.middleware("http")
async def private_network_access(request: Request, call_next):
    response = await call_next(request)
    if request.headers.get("access-control-request-private-network") == "true":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    return RedirectResponse("/chat/")


@app.get("/api/v1/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    configured = bool(
        settings.model_base_url
        and settings.model_api_key
        and settings.model_api_key != "replace-me"
        and settings.model_name
    )
    return HealthResponse(
        status="ok",
        model_configured=configured,
        model_name=settings.model_name or None,
    )


@app.post(
    "/api/v1/jobs",
    response_model=JobAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_job(payload: JobCreateRequest, request: Request) -> JobAcceptedResponse:
    job = await request.app.state.service.create(payload)
    return JobAcceptedResponse(
        job_id=job["job_id"],
        status=job["status"],
        poll_interval_ms=settings.job_poll_interval_ms,
    )


@app.get("/api/v1/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job(job_id: str, request: Request) -> JobStatusResponse:
    job = await request.app.state.store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="任务不存在")
    return JobStatusResponse(
        job_id=job["job_id"],
        status=job["status"],
        question=job["question"],
        answer=job["answer"],
        error=job["error"],
        progress=job["progress"],
        result_meta=job["result_meta"],
        created_at=job["created_at"],
        updated_at=job["updated_at"],
    )


static_dir = Path(__file__).resolve().parent / "static"
app.mount("/chat", StaticFiles(directory=static_dir, html=True), name="chat")

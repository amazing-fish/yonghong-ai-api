from __future__ import annotations

import asyncio
import logging

from app.config import Settings
from app.schemas import JobCreateRequest
from app.services.context_sanitizer import sanitize_rows
from app.services.model_client import GPTChatClient, ModelClientError
from app.services.prompt_builder import PromptBuilder
from app.store.job_store import JobStore


logger = logging.getLogger(__name__)


class JobService:
    def __init__(
        self,
        settings: Settings,
        store: JobStore,
        model: GPTChatClient,
        prompt_builder: PromptBuilder,
    ) -> None:
        self.settings = settings
        self.store = store
        self.model = model
        self.prompt_builder = prompt_builder
        self.queue: asyncio.Queue[str] = asyncio.Queue()
        self.workers: list[asyncio.Task[None]] = []
        self.queued: set[str] = set()
        self.lock = asyncio.Lock()

    async def start(self) -> None:
        await self.store.initialize()
        for job_id in await self.store.recover():
            await self.enqueue(job_id)
        self.workers = [
            asyncio.create_task(self._worker(index), name=f"ai-worker-{index}")
            for index in range(max(1, self.settings.worker_concurrency))
        ]
        logger.info("Started %s AI job workers", len(self.workers))

    async def stop(self) -> None:
        for worker in self.workers:
            worker.cancel()
        if self.workers:
            await asyncio.gather(*self.workers, return_exceptions=True)
        await self.model.close()

    async def create(self, request: JobCreateRequest) -> dict:
        job = await self.store.create(request.model_dump(mode="json"))
        await self.enqueue(job["job_id"])
        return job

    async def enqueue(self, job_id: str) -> None:
        async with self.lock:
            if job_id in self.queued:
                return
            self.queued.add(job_id)
            await self.queue.put(job_id)

    async def _worker(self, worker_index: int) -> None:
        while True:
            job_id = await self.queue.get()
            async with self.lock:
                self.queued.discard(job_id)
            try:
                await self._process(job_id)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Unhandled job error: %s", job_id)
                await self.store.update(
                    job_id,
                    status="failed",
                    error="内部任务异常，请查看服务日志。",
                    progress={"message": "任务异常终止"},
                )
            finally:
                self.queue.task_done()
                logger.debug("Worker %s finished %s", worker_index, job_id)

    async def _process(self, job_id: str) -> None:
        job = await self.store.get(job_id)
        if not job:
            return
        request = JobCreateRequest.model_validate(job["request"])
        try:
            await self.store.update(
                job_id,
                status="preparing",
                progress={"message": "正在清洗和限制数据"},
            )
            rows, data_meta = sanitize_rows(request.rows, self.settings)
            messages = self.prompt_builder.build_messages(request, rows, data_meta)

            await self.store.update(
                job_id,
                status="calling_model",
                progress={"message": "正在调用模型", **data_meta},
            )

            async def on_retry(attempt: int, wait_seconds: float, message: str) -> None:
                await self.store.update(
                    job_id,
                    status="waiting_model",
                    progress={
                        "message": "模型资源排队中，后台将自动重新提交",
                        "attempt": attempt,
                        "next_retry_seconds": wait_seconds,
                        "upstream_message": message,
                        **data_meta,
                    },
                )

            result = await self.model.chat(messages, on_retry=on_retry)
            await self.store.update(
                job_id,
                status="succeeded",
                answer=result.content,
                progress={"message": "分析完成"},
                result_meta={
                    "response_id": result.response_id,
                    "model": result.model,
                    "usage": result.usage,
                    "finish_reason": result.finish_reason,
                    **data_meta,
                },
                clear_request=True,
            )
        except ModelClientError as exc:
            await self.store.update(
                job_id,
                status="failed",
                error=str(exc),
                progress={"message": "模型调用失败"},
                clear_request=True,
            )
        except Exception as exc:
            await self.store.update(
                job_id,
                status="failed",
                error=str(exc),
                progress={"message": "任务处理失败"},
                clear_request=True,
            )

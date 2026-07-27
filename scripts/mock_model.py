from __future__ import annotations

import time
from collections import defaultdict
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


app = FastAPI()
attempts: defaultdict[str, int] = defaultdict(int)


@app.post("/v1/chat/completions")
async def chat(request: Request):
    body = await request.json()
    key = str(body.get("messages", [])[-1].get("content", "default"))
    attempts[key] += 1
    if attempts[key] <= 3:
        return JSONResponse(
            status_code=503,
            content={"code": 503, "message": "模拟模型排队中"},
        )
    return {
        "id": f"chatcmpl-{uuid4()}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": body.get("model", "example-model"),
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "模拟调用成功。模型已在前三次 503 后完成回答。",
                    "reasoning_content": "该字段不会返回给前端。",
                },
                "finish_reason": "stop",
                "index": 0,
            }
        ],
        "usage": {"prompt_tokens": 20, "completion_tokens": 20, "total_tokens": 40},
    }

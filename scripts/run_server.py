from __future__ import annotations

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
os.chdir(PROJECT_ROOT)

import uvicorn  # noqa: E402

from app.config import get_settings  # noqa: E402


def main() -> None:
    settings = get_settings()
    cert = PROJECT_ROOT / "certs/localhost-cert.pem"
    key = PROJECT_ROOT / "certs/localhost-key.pem"
    if not cert.is_file() or not key.is_file():
        raise FileNotFoundError("缺少 HTTPS 证书，请先执行 setup.cmd")

    print(f"项目目录：{PROJECT_ROOT}")
    print(f"监听地址：https://{settings.app_host}:{settings.app_port}")
    print(f"健康检查：https://127.0.0.1:{settings.app_port}/api/v1/health")

    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        log_level=settings.log_level.lower(),
        ssl_certfile=str(cert),
        ssl_keyfile=str(key),
        access_log=True,
    )


if __name__ == "__main__":
    main()

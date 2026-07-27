from __future__ import annotations

import asyncio
import inspect
import logging
import ssl
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable

import httpx

from app.config import Settings


logger = logging.getLogger(__name__)
RetryCallback = Callable[[int, float, str], Awaitable[None] | None]


class ModelClientError(RuntimeError):
    """模型客户端配置或请求错误。"""


@dataclass(slots=True)
class ModelResult:
    content: str
    response_id: str | None
    model: str | None
    usage: dict[str, Any]
    finish_reason: str | None


class GPTChatClient:
    def __init__(
        self,
        settings: Settings,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.settings = settings
        self._owns_client = client is None
        self.tls_description = "尚未初始化"

        if client is not None:
            # 单元测试或依赖注入时复用外部 HTTP 客户端。
            self.client = client
            self.tls_description = "外部注入的 HTTP 客户端"
            return

        ssl_context = self._build_ssl_context()
        timeout = httpx.Timeout(
            timeout=settings.model_timeout_seconds,
            connect=min(settings.model_timeout_seconds, 60.0),
        )

        self.client = httpx.AsyncClient(
            timeout=timeout,
            verify=ssl_context,
            trust_env=settings.model_trust_env,
            follow_redirects=True,
        )

        if not settings.model_verify_ssl:
            logger.warning(
                "MODEL_VERIFY_SSL=false：模型接口 TLS 证书校验已关闭。"
                "该配置仅用于 POC 排障，不建议用于正式环境。"
            )
        elif settings.model_ca_bundle_path:
            logger.info(
                "模型接口 TLS 校验已启用，并加载本地 CA：%s",
                settings.model_ca_bundle_path,
            )
        else:
            logger.info("模型接口 TLS 校验已启用，使用系统默认 CA。")

        if settings.model_mtls_enabled:
            logger.info(
                "模型接口 mTLS 已启用，客户端证书：%s",
                settings.model_client_cert_path,
            )

    async def close(self) -> None:
        if self._owns_client:
            await self.client.aclose()

    async def chat(
        self,
        messages: list[dict[str, str]],
        on_retry: RetryCallback | None = None,
    ) -> ModelResult:
        self._validate_model_config()

        url = self.settings.model_base_url.rstrip("/") + "/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.settings.model_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.settings.model_name,
            "messages": messages,
            "temperature": self.settings.model_temperature,
            "stream": False,
        }

        started = time.monotonic()
        attempt = 1
        intervals = self.settings.retry_intervals

        while True:
            try:
                response = await self.client.post(
                    url,
                    headers=headers,
                    json=payload,
                )
            except httpx.TimeoutException as exc:
                raise ModelClientError(
                    f"模型接口连接或读取超时：{exc}"
                ) from exc
            except httpx.ConnectError as exc:
                raise ModelClientError(
                    self._connect_error_message(exc)
                ) from exc
            except httpx.HTTPError as exc:
                raise ModelClientError(
                    f"模型接口连接失败：{exc}"
                ) from exc

            if response.status_code in self.settings.retry_status_codes:
                message = self._error_message(response)
                interval_index = attempt - 1

                if interval_index >= len(intervals):
                    raise ModelClientError(
                        f"模型持续返回 HTTP {response.status_code}，"
                        f"已耗尽重试次数：{message}"
                    )

                wait_seconds = intervals[interval_index]
                elapsed = time.monotonic() - started
                if (
                    elapsed + wait_seconds
                    > self.settings.model_max_total_wait_seconds
                ):
                    raise ModelClientError(
                        "模型排队超过最大等待时间："
                        f"{message}"
                    )

                if on_retry:
                    callback_result = on_retry(
                        attempt,
                        wait_seconds,
                        message,
                    )
                    if inspect.isawaitable(callback_result):
                        await callback_result

                await asyncio.sleep(wait_seconds)
                attempt += 1
                continue

            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise ModelClientError(
                    f"模型接口返回 HTTP {response.status_code}："
                    f"{self._error_message(response)}"
                ) from exc

            try:
                body = response.json()
                choice = body["choices"][0]
                content = choice["message"]["content"]
            except (ValueError, KeyError, IndexError, TypeError) as exc:
                raise ModelClientError(
                    "模型响应缺少 choices[0].message.content"
                ) from exc

            if not isinstance(content, str) or not content.strip():
                raise ModelClientError("模型返回空内容")

            return ModelResult(
                content=content,
                response_id=body.get("id"),
                model=body.get("model"),
                usage=body.get("usage") or {},
                finish_reason=choice.get("finish_reason"),
            )

    def _build_ssl_context(self) -> ssl.SSLContext:
        """构建访问模型网关的 TLS 上下文。

        处理顺序：

        1. ``MODEL_VERIFY_SSL=false``、``VERIFY=false``、
           ``ENV_VERIFY=false`` 或 ``envverify=false`` 会关闭服务端证书校验。
        2. 校验开启时，``MODEL_CA_BUNDLE`` 会把本地 PEM CA 加入系统信任链。
        3. 只有 ``MODEL_MTLS_ENABLED=true`` 时才会加载客户端证书和私钥。
           普通企业 CA 绝对不能放到 ``MODEL_CLIENT_CERT_FILE``。
        """
        if self.settings.model_verify_ssl:
            context = ssl.create_default_context()
            self.tls_description = "启用证书校验，使用系统默认 CA"
        else:
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            self.tls_description = "关闭证书校验"

        self._load_ca_bundle(context)
        self._configure_mtls(context)
        return context

    def _load_ca_bundle(self, context: ssl.SSLContext) -> None:
        ca_bundle = self.settings.model_ca_bundle_path
        if ca_bundle is None:
            return

        if not self.settings.model_verify_ssl:
            logger.warning(
                "MODEL_VERIFY_SSL=false，因此 MODEL_CA_BUNDLE=%s 已忽略。",
                ca_bundle,
            )
            self.tls_description += "；本地 CA 已忽略"
            return

        self._require_file(ca_bundle, "MODEL_CA_BUNDLE")
        try:
            context.load_verify_locations(cafile=str(ca_bundle))
        except (ssl.SSLError, OSError) as exc:
            raise ModelClientError(
                "无法加载 MODEL_CA_BUNDLE。"
                "请确认文件为 PEM 格式，并且内容是 CA 证书或 CA 证书链："
                f"{ca_bundle}。底层错误：{exc}"
            ) from exc

        self.tls_description += f"；本地 CA={ca_bundle}"

    def _configure_mtls(self, context: ssl.SSLContext) -> None:
        client_cert = self.settings.model_client_cert_path
        client_key = self.settings.model_client_key_path

        if not self.settings.model_mtls_enabled:
            if client_cert is not None or client_key is not None:
                logger.warning(
                    "检测到 MODEL_CLIENT_CERT_FILE 或 MODEL_CLIENT_KEY_FILE，"
                    "但 MODEL_MTLS_ENABLED=false，因此客户端证书配置已忽略。"
                    "企业根 CA 应配置在 MODEL_CA_BUNDLE。"
                )
            return

        if client_cert is None or client_key is None:
            raise ModelClientError(
                "MODEL_MTLS_ENABLED=true 时，必须同时配置 "
                "MODEL_CLIENT_CERT_FILE 和 MODEL_CLIENT_KEY_FILE。"
                "企业根 CA/中间 CA 应配置在 MODEL_CA_BUNDLE，"
                "不能作为客户端证书使用。"
            )

        self._require_file(client_cert, "MODEL_CLIENT_CERT_FILE")
        self._require_file(client_key, "MODEL_CLIENT_KEY_FILE")

        password = self.settings.model_client_key_password or None
        try:
            context.load_cert_chain(
                certfile=str(client_cert),
                keyfile=str(client_key),
                password=password,
            )
        except (ssl.SSLError, OSError) as exc:
            raise ModelClientError(
                "无法加载 mTLS 客户端证书或私钥。"
                f"cert={client_cert}, key={client_key}。"
                "请确认客户端证书和私钥均为 PEM 格式且相互匹配。"
                f"底层错误：{exc}"
            ) from exc

        self.tls_description += f"；mTLS 客户端证书={client_cert}"

    def _validate_model_config(self) -> None:
        missing: list[str] = []
        if not self.settings.model_base_url:
            missing.append("MODEL_BASE_URL")
        if (
            not self.settings.model_api_key
            or self.settings.model_api_key == "replace-me"
        ):
            missing.append("MODEL_API_KEY")
        if not self.settings.model_name:
            missing.append("MODEL_NAME")

        if missing:
            raise ModelClientError(
                "缺少模型配置：" + ", ".join(missing)
            )

    def _connect_error_message(self, exc: httpx.ConnectError) -> str:
        text = str(exc)
        upper_text = text.upper()
        certificate_error = any(
            marker in upper_text
            for marker in (
                "CERTIFICATE_VERIFY_FAILED",
                "SELF-SIGNED CERTIFICATE",
                "SELF SIGNED CERTIFICATE",
            )
        )

        if certificate_error:
            return (
                "模型接口 TLS 证书校验失败："
                f"{text}。当前 TLS 模式：{self.tls_description}。"
                "正式方案：MODEL_VERIFY_SSL=true，并把企业根 CA/中间 CA "
                "PEM 文件配置到 MODEL_CA_BUNDLE；"
                "仅 POC 排障可设置 MODEL_VERIFY_SSL=false。"
                "不要把 CA 文件配置到 MODEL_CLIENT_CERT_FILE。"
            )

        return f"模型接口连接失败：{text}"

    @staticmethod
    def _require_file(path: Path, variable_name: str) -> None:
        if not path.is_file():
            raise ModelClientError(
                f"{variable_name} 指向的文件不存在：{path}"
            )

    @staticmethod
    def _error_message(response: httpx.Response) -> str:
        try:
            body = response.json()
            if isinstance(body, dict):
                if body.get("message"):
                    return str(body["message"])
                error = body.get("error")
                if isinstance(error, dict) and error.get("message"):
                    return str(error["message"])
        except ValueError:
            pass

        return response.text[:2000] or "无错误正文"

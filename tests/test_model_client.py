from __future__ import annotations

import ssl

import certifi
import httpx
import pytest

from app.config import Settings
from app.services.model_client import (
    GPTChatClient,
    ModelClientError,
)


@pytest.mark.asyncio
async def test_503_retry_then_success():
    attempts = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts <= 2:
            return httpx.Response(
                503,
                json={"message": "排队中"},
                request=request,
            )
        return httpx.Response(
            200,
            json={
                "id": "test",
                "model": "mock",
                "choices": [
                    {
                        "message": {"content": "成功"},
                        "finish_reason": "stop",
                    }
                ],
                "usage": {"total_tokens": 1},
            },
            request=request,
        )

    settings = Settings(
        _env_file=None,
        model_base_url="https://example.test/v1",
        model_api_key="key",
        model_name="model",
        model_retry_intervals_seconds="0,0",
        model_max_total_wait_seconds=10,
    )
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    model_client = GPTChatClient(settings, client)
    result = await model_client.chat([{"role": "user", "content": "test"}])

    assert attempts == 3
    assert result.content == "成功"
    await client.aclose()


def build_context(settings: Settings) -> ssl.SSLContext:
    client = object.__new__(GPTChatClient)
    client.settings = settings
    client.tls_description = ""
    return client._build_ssl_context()


def test_verify_false_builds_unverified_context():
    settings = Settings(
        _env_file=None,
        model_verify_ssl=False,
    )
    context = build_context(settings)

    assert context.verify_mode == ssl.CERT_NONE
    assert context.check_hostname is False


def test_local_ca_bundle_is_loaded():
    settings = Settings(
        _env_file=None,
        model_verify_ssl=True,
        model_ca_bundle=certifi.where(),
    )
    context = build_context(settings)

    assert context.verify_mode == ssl.CERT_REQUIRED
    assert context.check_hostname is True


def test_client_cert_is_ignored_when_mtls_disabled():
    settings = Settings(
        _env_file=None,
        model_verify_ssl=True,
        model_mtls_enabled=False,
        model_client_cert_file=certifi.where(),
    )
    context = build_context(settings)

    assert context.verify_mode == ssl.CERT_REQUIRED


def test_mtls_requires_both_cert_and_key():
    settings = Settings(
        _env_file=None,
        model_mtls_enabled=True,
        model_client_cert_file=certifi.where(),
        model_client_key_file="",
    )

    with pytest.raises(ModelClientError, match="必须同时配置"):
        build_context(settings)


@pytest.mark.parametrize(
    "variable_name",
    [
        "MODEL_VERIFY_SSL",
        "VERIFY",
        "ENV_VERIFY",
        "ENVVERIFY",
        "envverify",
    ],
)
def test_verify_false_environment_aliases(monkeypatch, variable_name: str):
    for name in (
        "MODEL_VERIFY_SSL",
        "VERIFY",
        "ENV_VERIFY",
        "ENVVERIFY",
        "envverify",
    ):
        monkeypatch.delenv(name, raising=False)

    monkeypatch.setenv(variable_name, "false")
    settings = Settings(_env_file=None)

    assert settings.model_verify_ssl is False

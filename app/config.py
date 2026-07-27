from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    """应用配置。

    模型 TLS 配置兼容以下写法：

    - ``MODEL_VERIFY_SSL=false``：推荐写法。
    - ``VERIFY=false``：兼容旧配置。
    - ``ENV_VERIFY=false``：兼容旧配置。
    - ``ENVVERIFY=false`` / ``envverify=false``：兼容无下划线写法。

    ``MODEL_CA_BUNDLE`` 用于信任模型服务端证书链；
    ``MODEL_CLIENT_CERT_FILE`` / ``MODEL_CLIENT_KEY_FILE`` 仅用于网关明确要求
    mTLS 客户端认证的场景，两者与 CA bundle 不是同一种证书。
    """

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        populate_by_name=True,
    )

    app_host: str = "127.0.0.1"
    app_port: int = 8443
    log_level: str = "INFO"

    model_base_url: str = ""
    model_api_key: str = ""
    model_name: str = ""
    model_timeout_seconds: float = 180.0
    model_temperature: float = 0.2
    model_retry_status_codes: str = "503"
    model_retry_intervals_seconds: str = "15,20,30,45,60"
    model_max_total_wait_seconds: float = 300.0

    # 推荐：MODEL_VERIFY_SSL=true|false
    # 兼容：VERIFY / ENV_VERIFY / ENVVERIFY / envverify
    model_verify_ssl: bool = Field(
        default=True,
        validation_alias=AliasChoices(
            "MODEL_VERIFY_SSL",
            "VERIFY",
            "ENV_VERIFY",
            "ENVVERIFY",
            "envverify",
        ),
    )

    # 企业根 CA、中间 CA，或包含完整链的 PEM bundle。
    # 这是“信任模型服务端证书”配置，不是客户端证书。
    model_ca_bundle: str = ""

    # 是否启用 mTLS 客户端认证。默认关闭，避免误把 CA 文件当客户端证书加载。
    model_mtls_enabled: bool = False
    model_client_cert_file: str = ""
    model_client_key_file: str = ""
    model_client_key_password: str = ""

    # 是否读取 HTTP_PROXY、HTTPS_PROXY、NO_PROXY 等环境变量。
    model_trust_env: bool = True

    job_db_path: str = "data/jobs.db"
    worker_concurrency: int = 2
    job_poll_interval_ms: int = 2000

    max_rows: int = 300
    max_columns: int = 40
    max_cell_chars: int = 4000
    max_context_chars: int = 120000

    allowed_origins: str = (
        "https://your-yonghong.example.com,"
        "https://127.0.0.1:8443"
    )

    @property
    def database_path(self) -> Path:
        path = Path(self.job_db_path).expanduser()
        if path.is_absolute():
            return path.resolve()
        return (PROJECT_ROOT / path).resolve()

    @property
    def retry_status_codes(self) -> set[int]:
        return {
            int(item.strip())
            for item in self.model_retry_status_codes.split(",")
            if item.strip()
        }

    @property
    def retry_intervals(self) -> list[float]:
        values = [
            float(item.strip())
            for item in self.model_retry_intervals_seconds.split(",")
            if item.strip()
        ]
        return values or [15.0, 20.0, 30.0, 45.0, 60.0]

    @property
    def origin_list(self) -> list[str]:
        return [
            item.strip()
            for item in self.allowed_origins.split(",")
            if item.strip()
        ]

    def resolve_optional_path(self, value: str) -> Path | None:
        """解析可选文件路径；相对路径以项目根目录为基准。"""
        text = value.strip()
        if not text:
            return None

        path = Path(text).expanduser()
        if not path.is_absolute():
            path = PROJECT_ROOT / path
        return path.resolve()

    @property
    def model_ca_bundle_path(self) -> Path | None:
        return self.resolve_optional_path(self.model_ca_bundle)

    @property
    def model_client_cert_path(self) -> Path | None:
        return self.resolve_optional_path(self.model_client_cert_file)

    @property
    def model_client_key_path(self) -> Path | None:
        return self.resolve_optional_path(self.model_client_key_file)


@lru_cache
def get_settings() -> Settings:
    return Settings()

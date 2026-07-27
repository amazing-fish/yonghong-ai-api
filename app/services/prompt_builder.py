from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml

from app.config import PROJECT_ROOT, Settings
from app.schemas import JobCreateRequest


class PromptBuilder:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.business_context = self._load_yaml(PROJECT_ROOT / "app/config_data/business_context.yaml")
        self.data_dictionary = self._load_yaml(PROJECT_ROOT / "app/config_data/data_dictionary.yaml")

    def build_messages(
        self,
        request: JobCreateRequest,
        rows: list[dict[str, Any]],
        data_meta: dict[str, Any],
    ) -> list[dict[str, str]]:
        system = self._system_prompt()
        context = {
            "dashboard": request.dashboard,
            "dataset_name": request.dataset_name,
            "filters": request.filters,
            "data_meta": data_meta,
            "rows": rows,
        }
        context_text = json.dumps(context, ensure_ascii=False, default=str)
        if len(context_text) > self.settings.max_context_chars:
            context_text = context_text[: self.settings.max_context_chars] + "...[上下文被截断]"

        user_text = (
            "请只依据下面的业务上下文与数据回答。"
            "数据不足时必须明确说明，不得虚构。\n\n"
            f"数据上下文：\n{context_text}\n\n"
            f"用户问题：\n{request.question}"
        )

        messages: list[dict[str, str]] = [{"role": "system", "content": system}]
        messages.extend(item.model_dump() for item in request.history[-10:])
        messages.append({"role": "user", "content": user_text})
        return messages

    def _system_prompt(self) -> str:
        return (
            "你是永洪 BI 数据分析助手。\n"
            "回答顺序：结论、数据依据、可能原因、待验证项。\n"
            "根因只能表述为初步判断，不能把相关性写成因果。\n"
            "必须说明时间范围、筛选条件和数据限制。\n\n"
            "业务背景：\n"
            + yaml.safe_dump(self.business_context, allow_unicode=True, sort_keys=False)
            + "\n指标与字段字典：\n"
            + yaml.safe_dump(self.data_dictionary, allow_unicode=True, sort_keys=False)
        )

    @staticmethod
    def _load_yaml(path: Path) -> dict[str, Any]:
        if not path.exists():
            return {}
        with path.open("r", encoding="utf-8") as file:
            return yaml.safe_load(file) or {}

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.schemas import BoundField, JobCreateRequest
from app.services.prompt_builder import PromptBuilder


def test_prompt_includes_bound_field_metadata():
    settings = Settings(_env_file=None)
    request = JobCreateRequest(
        question="分析失败率",
        fields=[
            BoundField(source="column1", name="os_name", role="dimension"),
            BoundField(source="column2", name="failure_rate", role="measure"),
        ],
        rows=[{"os_name": "Android", "failure_rate": 0.1}],
    )

    messages = PromptBuilder(settings).build_messages(
        request,
        request.rows,
        {"received_rows": 1, "sent_rows": 1, "rows_truncated": False},
    )

    user_message = messages[-1]["content"]
    assert '"source": "column1"' in user_message
    assert '"name": "os_name"' in user_message
    assert '"role": "measure"' in user_message



def test_prompt_includes_every_bound_field():
    settings = Settings(_env_file=None)
    fields = [
        BoundField(
            source=f"column{index}",
            name=f"business_field_{index}",
            role="dimension" if index <= 6 else "measure",
        )
        for index in range(1, 13)
    ]
    row = {field.name: index for index, field in enumerate(fields, start=1)}
    request = JobCreateRequest(question="分析全部字段", fields=fields, rows=[row])

    messages = PromptBuilder(settings).build_messages(
        request,
        request.rows,
        {"received_rows": 1, "sent_rows": 1, "rows_truncated": False},
    )

    user_message = messages[-1]["content"]
    for index in range(1, 13):
        assert f'"source": "column{index}"' in user_message
        assert f'"name": "business_field_{index}"' in user_message


@pytest.mark.parametrize(
    "fields",
    [
        [
            BoundField(source="column1", name="first", role="dimension"),
            BoundField(source="column1", name="second", role="measure"),
        ],
        [
            BoundField(source="column1", name="same", role="dimension"),
            BoundField(source="column2", name="same", role="measure"),
        ],
    ],
)
def test_request_rejects_duplicate_field_sources_or_names(fields):
    with pytest.raises(ValidationError):
        JobCreateRequest(question="验证字段", fields=fields)

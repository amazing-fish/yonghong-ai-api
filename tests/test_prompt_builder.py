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

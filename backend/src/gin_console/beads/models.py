from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict

from gin_console.quota.source import clean

# lone surrogates are valid JSON escapes but cannot be encoded in a response
Text = Annotated[str, AfterValidator(clean)]


class BeadSummary(BaseModel):
    model_config = ConfigDict(strict=True)

    id: Text
    title: Text
    status: Text
    priority: int
    issue_type: Text
    labels: list[Text] = []
    owner: Text | None = None
    assignee: Text | None = None
    parent: Text | None = None
    created_at: Text
    updated_at: Text
    dependency_count: int = 0
    dependent_count: int = 0
    comment_count: int = 0
    closed_at: Text | None = None
    ready: bool = False
    blocked: bool = False


class Relation(BaseModel):
    model_config = ConfigDict(strict=True)

    id: Text
    title: Text
    status: Text
    type: Literal["blocks", "parent-child"]


class BeadDetail(BeadSummary):
    description: Text | None = None
    dependencies: list[Relation] = []
    dependents: list[Relation] = []
    children: list[Relation] = []

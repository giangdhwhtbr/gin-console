"""The WBS download endpoint: REQ-MILESTONE-UI-026."""

import csv
import io
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fake_export import bead, dep, write_export
from fake_gw import FakeGw
from fastapi.testclient import TestClient
from openpyxl import load_workbook

from gin_console.app import create_app
from gin_console.config import ProjectEntry, Settings
from gin_console.milestones.source import MilestonesError

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def clock() -> datetime:
    return datetime(2026, 11, 24, 3, 0, tzinfo=UTC)


def rows() -> list[dict[str, Any]]:
    return [
        bead("gw-ab1", title="M1", issue_type="milestone"),
        bead(
            "e1",
            title="Epic one",
            issue_type="epic",
            dependencies=[dep("e1", "gw-ab1", "parent-child")],
        ),
        bead("t1", title="Task one", dependencies=[dep("t1", "e1", "parent-child")]),
        bead("other", title="Loose"),
    ]


def make(tmp_path: Path, fake: Any | None = None, name: str = "alpha", **kwargs: Any) -> TestClient:
    (tmp_path / "dist").mkdir(exist_ok=True)
    (tmp_path / "alpha").mkdir(exist_ok=True)
    if not (tmp_path / "alpha" / ".beads").exists():
        write_export(tmp_path / "alpha", rows())
    settings = Settings(projects=[ProjectEntry(name=name, path=tmp_path / "alpha")])
    app = create_app(
        settings,
        static_dir=tmp_path / "dist",
        run_gw=fake or FakeGw(),
        clock=clock,
        **kwargs,
    )
    return TestClient(app, raise_server_exceptions=False)


# REQ-MILESTONE-UI-026
def test_req_milestone_ui_026_milestone_excel_download(tmp_path: Path) -> None:
    response = make(tmp_path).get(
        "/api/milestones/alpha/wbs", params={"milestone": "gw-ab1", "format": "xlsx"}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == XLSX
    assert (
        response.headers["content-disposition"]
        == 'attachment; filename="alpha-gw-ab1-wbs-2026-11-24.xlsx"'
    )
    assert "x-wbs-warning" not in response.headers
    sheet = load_workbook(io.BytesIO(response.content)).worksheets[0]
    ids = [row[1] for row in sheet.iter_rows(values_only=True)]
    assert {"gw-ab1", "e1", "t1"} <= set(ids) and "other" not in ids


# REQ-MILESTONE-UI-026
def test_req_milestone_ui_026_project_csv_download(tmp_path: Path) -> None:
    response = make(tmp_path).get("/api/milestones/alpha/wbs", params={"format": "csv"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert (
        response.headers["content-disposition"] == 'attachment; filename="alpha-wbs-2026-11-24.csv"'
    )
    table = list(csv.reader(io.StringIO(response.text)))
    flat = {cell for line in table for cell in line}
    assert {"Epic one", "Loose"} <= flat


# REQ-MILESTONE-UI-026
def test_req_milestone_ui_026_markdown_download(tmp_path: Path) -> None:
    response = make(tmp_path).get("/api/milestones/alpha/wbs", params={"format": "md"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/markdown; charset=utf-8"
    assert (
        response.headers["content-disposition"] == 'attachment; filename="alpha-wbs-2026-11-24.md"'
    )
    assert "Task one" in response.text


# REQ-MILESTONE-UI-026
@pytest.mark.parametrize(
    ("url", "status"),
    [
        ("/api/milestones/nope/wbs?format=md", 404),
        ("/api/milestones/alpha/wbs?milestone=m99&format=md", 404),
        ("/api/milestones/alpha/wbs?milestone=e1&format=md", 404),  # a bead, not a milestone
        ("/api/milestones/alpha/wbs?format=pdf", 422),
        ("/api/milestones/alpha/wbs", 422),
        ("/api/milestones/alpha/wbs?milestone=a%20b&format=md", 422),
    ],
)
def test_req_milestone_ui_026_invalid_project_milestone_or_format(
    tmp_path: Path, url: str, status: int
) -> None:
    assert make(tmp_path).get(url).status_code == status


# REQ-MILESTONE-UI-026
def test_req_milestone_ui_026_unreadable_export_is_502(tmp_path: Path) -> None:
    (tmp_path / "alpha" / ".beads").mkdir(parents=True)
    (tmp_path / "alpha" / ".beads" / "issues.jsonl").write_text("{not json\n")
    response = make(tmp_path).get("/api/milestones/alpha/wbs", params={"format": "csv"})
    assert response.status_code == 502
    assert response.json()["error"]


# REQ-MILESTONE-UI-026
def test_req_milestone_ui_026_show_failing_degrades_to_the_snapshot(tmp_path: Path) -> None:
    fake = FakeGw(failures={"show": MilestonesError("show broke")})
    api = make(tmp_path, fake)
    response = api.get("/api/milestones/alpha/wbs", params={"milestone": "gw-ab1", "format": "md"})
    assert response.status_code == 200
    warning = response.headers["x-wbs-warning"]
    assert "show broke" in warning
    assert warning in response.text  # the warning is noted in the Markdown header
    for text in ("M1", "Epic one", "Task one"):
        assert text in response.text
    sheet = load_workbook(
        io.BytesIO(
            api.get(
                "/api/milestones/alpha/wbs", params={"milestone": "gw-ab1", "format": "xlsx"}
            ).content
        )
    )
    about = [c for row in sheet["About"].iter_rows(values_only=True) for c in row]
    assert any(isinstance(c, str) and warning in c for c in about)


# REQ-MILESTONE-UI-026
def test_req_milestone_ui_026_both_gin_commands_failing_still_serve_the_project(
    tmp_path: Path,
) -> None:
    fake = FakeGw(failure=MilestonesError("gin is gone"))
    response = make(tmp_path, fake).get("/api/milestones/alpha/wbs", params={"format": "csv"})
    assert response.status_code == 200
    assert "gin is gone" in response.headers["x-wbs-warning"]
    assert "Task one" in response.text


# REQ-MILESTONE-UI-026
def test_req_milestone_ui_026_non_ascii_warning_stays_a_valid_header(tmp_path: Path) -> None:
    fake = FakeGw(failures={"show": MilestonesError("lỗi\nrồi")})
    response = make(tmp_path, fake).get(
        "/api/milestones/alpha/wbs", params={"milestone": "gw-ab1", "format": "csv"}
    )
    assert response.status_code == 200
    warning = response.headers["x-wbs-warning"]
    assert "\n" not in warning and warning.isascii() and "l?i r?i" in warning


# REQ-MILESTONE-UI-026
@pytest.mark.parametrize(
    ("name", "fallback", "encoded"),
    [
        ("my proj", "my_proj", "my%20proj"),
        ("dự án", "d___n", "d%E1%BB%B1%20%C3%A1n"),
    ],
)
def test_req_milestone_ui_026_filename_of_an_unusual_project_name(
    tmp_path: Path, name: str, fallback: str, encoded: str
) -> None:
    response = make(tmp_path, name=name).get(f"/api/milestones/{name}/wbs", params={"format": "md"})
    assert response.status_code == 200
    assert response.headers["content-disposition"] == (
        f'attachment; filename="{fallback}-wbs-2026-11-24.md"; '
        f"filename*=UTF-8''{encoded}-wbs-2026-11-24.md"
    )

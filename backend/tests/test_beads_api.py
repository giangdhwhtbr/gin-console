from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd, bead, comment, dep, related
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.source import BeadsError
from gin_console.config import ProjectEntry, Settings


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 10, 20, 3, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


def make(tmp_path: Path, fake: Any, clock: Clock | None = None) -> TestClient:
    (tmp_path / "proj").mkdir(exist_ok=True)
    (tmp_path / "dist").mkdir(exist_ok=True)
    settings = Settings(
        projects=[
            ProjectEntry(name="proj", path=tmp_path / "proj"),
            ProjectEntry(name="gone", path=tmp_path / "gone"),
        ]
    )
    app = create_app(
        settings,
        static_dir=tmp_path / "dist",
        claude_home=tmp_path,
        run_bd=fake,
        clock=clock or Clock(),
    )
    return TestClient(app, raise_server_exceptions=False)


FOUR = [bead("a-1"), bead("a-2", status="in_progress"), bead("a-3"), bead("a-4", status="open")]
CLOSED = [bead(f"c-{n}", status="closed") for n in range(4)]


# REQ-BEADS-001
def test_beads_001_open_beads_by_default_and_all_on_request(tmp_path: Path) -> None:
    api = make(tmp_path, FakeBd(FOUR + CLOSED))
    body = api.get("/api/beads", params={"project": "proj"}).json()
    assert len(body) == 4 and all(b["status"] != "closed" for b in body)
    assert {"id", "title", "status", "priority", "issue_type", "labels", "updated_at"} <= set(
        body[0]
    )
    assert "description" not in body[0]
    assert len(api.get("/api/beads", params={"project": "proj", "closed": "1"}).json()) == 8


# REQ-BEADS-001
@pytest.mark.parametrize("params", [{"project": "nope"}, {"project": "gone"}, {}])
def test_beads_001_unknown_project_or_missing_directory_is_404(
    tmp_path: Path, params: dict[str, str]
) -> None:
    fake = FakeBd(FOUR)
    assert make(tmp_path, fake).get("/api/beads", params=params).status_code == 404
    assert fake.calls == []


# REQ-BEADS-002
def test_beads_002_detail_over_http(tmp_path: Path) -> None:
    shown = bead("a-5", description="Why", dependencies=[related("a-4", "blocks")])
    up = {"a-5": [related("a-6", "blocks"), related("a-7", "parent-child", status="closed")]}
    body = make(tmp_path, FakeBd(shown={"a-5": shown}, up=up)).get("/api/beads/proj/a-5").json()
    assert body["description"] == "Why"
    assert [d["id"] for d in body["dependencies"]] == ["a-4"]
    assert [d["id"] for d in body["dependents"]] == ["a-6"]
    assert [(c["id"], c["status"]) for c in body["children"]] == [("a-7", "closed")]
    assert body["children"][0]["type"] == "parent-child"


# REQ-BEADS-002
@pytest.mark.parametrize(
    "path", ["/api/beads/proj/x-1", "/api/beads/nope/a-5", "/api/beads/gone/a-5"]
)
def test_beads_002_unknown_bead_project_or_directory_is_404(tmp_path: Path, path: str) -> None:
    fake = FakeBd(shown={"a-5": bead("a-5")})
    assert make(tmp_path, fake).get(path).status_code == 404


# REQ-BEADS-003
@pytest.mark.parametrize("ident", ["--help", "-x", "..", "a%2Fb", "a%00b", ".a", "a%20b"])
def test_beads_003_option_like_ids_are_404_and_run_nothing(tmp_path: Path, ident: str) -> None:
    fake = FakeBd(shown={"a-5": bead("a-5")})
    assert make(tmp_path, fake).get(f"/api/beads/proj/{ident}").status_code == 404
    assert fake.calls == []


# REQ-BEADS-003
@pytest.mark.parametrize("closed", ["../x", "true", "", "0", "11", "1&closed=0"])
def test_beads_003_odd_closed_values_mean_not_closed(tmp_path: Path, closed: str) -> None:
    api = make(tmp_path, FakeBd(FOUR + CLOSED))
    response = api.get("/api/beads", params={"project": "proj", "closed": closed})
    assert response.status_code == 200 and len(response.json()) == 4


# REQ-BEADS-003
def test_beads_003_only_read_only_commands_run(tmp_path: Path) -> None:
    fake = FakeBd(FOUR, shown={"a-1": bead("a-1")})
    api = make(tmp_path, fake)
    api.get("/api/beads", params={"project": "proj"})
    api.get("/api/beads/proj/a-1")
    assert {call[0][0] for call in fake.calls} <= {"list", "show", "dep", "ready", "blocked"}
    assert all(call[1] == tmp_path / "proj" for call in fake.calls)


# REQ-BEADS-004
def test_beads_004_cached_for_five_seconds(tmp_path: Path) -> None:
    clock, fake = Clock(), FakeBd(FOUR)
    api = make(tmp_path, fake, clock)
    api.get("/api/beads", params={"project": "proj"})
    clock.now += timedelta(seconds=2)
    api.get("/api/beads", params={"project": "proj"})
    assert len(fake.calls) == 3
    clock.now += timedelta(seconds=4)
    api.get("/api/beads", params={"project": "proj"})
    assert len(fake.calls) == 6
    api.get("/api/beads", params={"project": "proj", "closed": "1"})
    assert len(fake.calls) == 9  # a different key


# REQ-BEADS-004
def test_beads_004_errors_are_not_kept(tmp_path: Path) -> None:
    fake = FakeBd(FOUR, failure=BeadsError("bd not found"))
    api = make(tmp_path, fake)
    assert api.get("/api/beads", params={"project": "proj"}).status_code == 502
    fake.failure = None
    assert api.get("/api/beads", params={"project": "proj"}).status_code == 200


# REQ-BEADS-005
@pytest.mark.parametrize(
    "message", ["bd not found", "bd timed out", "bd exited 1: boom", "bd printed invalid JSON"]
)
def test_beads_005_failures_are_502_with_an_error(tmp_path: Path, message: str) -> None:
    api = make(tmp_path, FakeBd(failure=BeadsError(message)))
    for path in ("/api/beads?project=proj", "/api/beads/proj/a-5"):
        response = api.get(path)
        assert response.status_code == 502 and response.json() == {"error": message}


# REQ-BEADS-005
def test_beads_005_one_malformed_bead_does_not_fail_the_list(tmp_path: Path) -> None:
    fake = FakeBd([bead("a-1"), bead("a-2", title=7), bead("a-3")])
    body = make(tmp_path, fake).get("/api/beads", params={"project": "proj"}).json()
    assert [b["id"] for b in body] == ["a-1", "a-3"]


# REQ-BEADS-005
def test_beads_005_a_too_deeply_nested_bd_answer_is_a_502_not_a_500(tmp_path: Path) -> None:
    api = make(tmp_path, FakeBd(failure=RecursionError()))
    response = api.get("/api/beads", params={"project": "proj"})
    assert response.status_code == 502 and "error" in response.json()


# REQ-BEADS-006
def test_beads_006_lone_surrogates_do_not_break_responses(tmp_path: Path) -> None:
    shown = bead("a-5", title="a\ud800b", description="x\ud800")
    api = make(tmp_path, FakeBd([shown], {"a-5": shown}))
    assert api.get("/api/beads", params={"project": "proj"}).status_code == 200
    detail = api.get("/api/beads/proj/a-5")
    assert detail.status_code == 200 and detail.json()["title"] == "a?b"


# REQ-BEADS-007
def test_beads_007_flags_over_http(tmp_path: Path) -> None:
    first, second = str(FOUR[0]["id"]), str(FOUR[1]["id"])
    api = make(tmp_path, FakeBd(FOUR, ready=[first], blocked=[second]))
    rows = {r["id"]: r for r in api.get("/api/beads", params={"project": "proj"}).json()}
    assert rows[first]["ready"] is True and rows[first]["blocked"] is False
    assert rows[second]["blocked"] is True and rows[second]["ready"] is False
    assert rows[first]["closed_at"] is None


# REQ-BEADS-007
# REQ-BEADS-005
def test_beads_007_a_failing_readiness_command_is_502_and_not_cached(tmp_path: Path) -> None:
    fake = FakeBd(FOUR, failing={"blocked": BeadsError("bd blocked failed")})
    api = make(tmp_path, fake)
    response = api.get("/api/beads", params={"project": "proj"})
    assert response.status_code == 502 and "bd blocked failed" in response.json()["error"]
    fake.failing = {}
    assert api.get("/api/beads", params={"project": "proj"}).status_code == 200


# REQ-BEADS-007
def test_beads_007_unexpected_readiness_shape_is_502(tmp_path: Path) -> None:
    api = make(tmp_path, FakeBd(FOUR, bad={"ready": {"x": 1}}))
    assert api.get("/api/beads", params={"project": "proj"}).status_code == 502


# REQ-BEADS-007
def test_beads_007_one_cache_entry_for_the_three_commands(tmp_path: Path) -> None:
    clock, fake = Clock(), FakeBd(FOUR)
    api = make(tmp_path, fake, clock)
    api.get("/api/beads", params={"project": "proj"})
    clock.now += timedelta(seconds=2)
    api.get("/api/beads", params={"project": "proj"})
    assert len(fake.calls) == 3


# REQ-BEADS-008
def test_beads_008_comments_over_http(tmp_path: Path) -> None:
    fake = FakeBd(shown={"a-5": bead("a-5")}, comments={"a-5": [comment("a-5", "hi")]})
    body = make(tmp_path, fake).get("/api/beads/proj/a-5/comments").json()
    assert [(c["author"], c["text"], c["truncated"]) for c in body] == [("me", "hi", False)]
    assert {"id", "author", "text", "created_at", "truncated"} == set(body[0])


# REQ-BEADS-008
@pytest.mark.parametrize(
    "path",
    [
        "/api/beads/proj/x-1/comments",
        "/api/beads/nope/a-5/comments",
        "/api/beads/gone/a-5/comments",
    ],
)
def test_beads_008_unknown_bead_or_project_is_404(tmp_path: Path, path: str) -> None:
    fake = FakeBd(shown={"a-5": bead("a-5")})
    assert make(tmp_path, fake).get(path).status_code == 404


# REQ-BEADS-008
# REQ-BEADS-003
@pytest.mark.parametrize("ident", ["--help", "-x", "..", "a%2Fb", "a%00b", ".a", "a%20b"])
def test_beads_008_unsafe_ids_are_404_and_run_nothing(tmp_path: Path, ident: str) -> None:
    fake = FakeBd(shown={"a-5": bead("a-5")})
    assert make(tmp_path, fake).get(f"/api/beads/proj/{ident}/comments").status_code == 404
    assert fake.calls == []


# REQ-BEADS-008
# REQ-BEADS-005
def test_beads_008_failure_is_502_and_not_cached(tmp_path: Path) -> None:
    fake = FakeBd(
        shown={"a-5": bead("a-5")}, failing={"comments": BeadsError("bd comments failed")}
    )
    api = make(tmp_path, fake)
    response = api.get("/api/beads/proj/a-5/comments")
    assert response.status_code == 502 and "bd comments failed" in response.json()["error"]
    fake.failing = {}
    assert api.get("/api/beads/proj/a-5/comments").status_code == 200


# REQ-BEADS-008
def test_beads_008_unexpected_shape_is_502(tmp_path: Path) -> None:
    api = make(tmp_path, FakeBd(shown={"a-5": bead("a-5")}, bad={"comments": {"x": 1}}))
    assert api.get("/api/beads/proj/a-5/comments").status_code == 502


# REQ-BEADS-008
# REQ-BEADS-004
def test_beads_008_cached_for_five_seconds(tmp_path: Path) -> None:
    clock = Clock()
    fake = FakeBd(shown={"a-5": bead("a-5")}, comments={"a-5": [comment("a-5")]})
    api = make(tmp_path, fake, clock)
    api.get("/api/beads/proj/a-5/comments")
    clock.now += timedelta(seconds=2)
    api.get("/api/beads/proj/a-5/comments")
    assert len(fake.calls) == 1
    clock.now += timedelta(seconds=4)
    api.get("/api/beads/proj/a-5/comments")
    assert len(fake.calls) == 2


# REQ-BEADS-009
def test_beads_009_fields_over_http(tmp_path: Path) -> None:
    shown = bead("a-5", created_by="gin", design="D", notes="N")
    api = make(tmp_path, FakeBd([bead("a-1", created_by="gin")], shown={"a-5": shown}))
    detail = api.get("/api/beads/proj/a-5").json()
    assert detail["created_by"] == "gin" and detail["design"] == "D" and detail["notes"] == "N"
    assert detail["acceptance_criteria"] is None and detail["close_reason"] is None
    rows = api.get("/api/beads", params={"project": "proj"}).json()
    assert rows[0]["created_by"] == "gin"


# REQ-BEADS-010
def test_beads_010_blocked_by_over_http(tmp_path: Path) -> None:
    rows = [bead("a-1"), bead("a-2", dependencies=[dep("a-2", "a-1", "blocks")])]
    body = make(tmp_path, FakeBd(rows)).get("/api/beads", params={"project": "proj"}).json()
    by_id = {r["id"]: r for r in body}
    assert by_id["a-1"]["blocked_by"] == [] and by_id["a-2"]["blocked_by"] == ["a-1"]

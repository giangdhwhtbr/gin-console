"""The trends endpoint over HTTP (REQ-QA-014 to REQ-QA-017)."""

import threading
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from fake_gin_qa import FakeGinQa, run_record, runs_args, runs_export
from fastapi.testclient import TestClient
from test_auth_api import auth_app, sign_in
from test_qa_api import Clock, make

from gin_console.qa.source import QaError

SINCE_30 = "2026-10-30"  # 30 days ending 2026-11-28 in UTC
# starts 2026-11-22 00:00+07, which is 2026-11-21 in UTC
HCM_7: dict[str, Any] = {"days": 7, "tz": "Asia/Ho_Chi_Minh"}


def make_today(tmp_path: Path, fake: Any) -> TestClient:
    """The projects of the qa tests, on 2026-11-28 at 05:00 UTC (12:00 in Ho Chi Minh)."""
    clock = Clock()
    clock.now = datetime(2026, 11, 28, 5, 0, tzinfo=UTC)
    return make(tmp_path, fake, clock)


def trends_of(client: TestClient, project: str = "alpha", **params: Any) -> Any:
    return client.get(f"/api/qa/trends/{project}", params=params)


def ui(result: str, at: str, case: str = "TC-UI-001", **fields: Any) -> dict[str, Any]:
    return run_record(case, result, at, **fields)


# TC: TC-QA-041@2e61a6c5
# REQ-QA-014: Window in the browser's zone
def test_qa_014_window_in_the_browsers_zone(tmp_path: Path) -> None:
    rows = [
        ui("passed", "2026-11-21T16:59:59Z", "TC-UI-001"),
        ui("passed", "2026-11-21T17:00:00Z", "TC-UI-002"),
    ]
    fake = FakeGinQa({runs_args("2026-11-21"): runs_export(*rows)})
    res = trends_of(make_today(tmp_path, fake), **HCM_7)
    assert res.status_code == 200
    body = res.json()
    assert fake.calls[0] == (list(runs_args("2026-11-21")), tmp_path / "alpha")
    assert body["tz"] == "Asia/Ho_Chi_Minh"
    assert body["days"] == [f"2026-11-{n}" for n in range(22, 29)]
    points = body["pass_rate"][0]["points"]
    assert [(p["date"], p["passed"]) for p in points if p["passed"]] == [("2026-11-22", 1)]


# REQ-QA-014, REQ-QA-015, REQ-QA-016, REQ-QA-017: the 200 shape with every section
def test_qa_014_response_shape(tmp_path: Path) -> None:
    rows = [
        ui("failed", "2026-11-26T09:00:00Z"),
        ui("passed", "2026-11-26T10:00:00Z"),
        ui("failed", "2026-11-26T12:00:00Z", "TC-BEADS-001", capability="beads", bug="bd-1"),
    ]
    fake = FakeGinQa({runs_args(SINCE_30): runs_export(*rows)})
    res = trends_of(make_today(tmp_path, fake))
    assert res.status_code == 200
    body = res.json()
    assert list(body) == [
        "days",
        "tz",
        "pass_rate",
        "flaky",
        "time_to_fix",
        "still_failing",
        "problems",
    ]
    assert (len(body["days"]), body["tz"], body["problems"]) == (30, "UTC", [])
    assert [row["name"] for row in body["pass_rate"]] == ["beads", "ui"]
    assert body["flaky"] == [
        {
            "case": "TC-UI-001",
            "capability": "ui",
            "flips": 1,
            "last_result": "passed",
            "last_at": "2026-11-26T10:00:00Z",
        }
    ]
    assert body["time_to_fix"]["overall"] == {"fixes": 1, "median_seconds": 3600.0}
    assert body["time_to_fix"]["by_capability"][1] == {
        "name": "ui",
        "fixes": 1,
        "median_seconds": 3600.0,
    }
    assert body["still_failing"] == [
        {
            "case": "TC-BEADS-001",
            "capability": "beads",
            "failing_since": "2026-11-26T12:00:00Z",
            "bug": "bd-1",
        }
    ]


# TC: TC-QA-046@50c227c3
# REQ-QA-015: the rate of a day, a gap and the points of every day
def test_qa_015_rate_and_gap(tmp_path: Path) -> None:
    rows = [ui("passed", f"2026-11-26T0{n}:00:00Z") for n in (1, 2, 3)]
    rows += [ui("failed", "2026-11-26T04:00:00Z"), ui("blocked", "2026-11-27T04:00:00Z")]
    rows += [ui("passed", f"2026-11-28T0{n}:00:00Z") for n in (1, 2)]
    fake = FakeGinQa({runs_args("2026-11-22"): runs_export(*rows)})
    body = trends_of(make_today(tmp_path, fake), days=7).json()
    points = {p["date"]: p["rate"] for p in body["pass_rate"][0]["points"]}
    assert (points["2026-11-26"], points["2026-11-27"], points["2026-11-28"]) == (0.75, None, 1.0)
    assert len(points) == 7


# TC: TC-QA-042@a7dbe56d
# REQ-QA-014: Bad window
def test_qa_014_bad_window(tmp_path: Path) -> None:
    fake = FakeGinQa({})
    client = make_today(tmp_path, fake)
    assert trends_of(client, days=14).status_code == 422
    assert trends_of(client, days=0).status_code == 422
    assert trends_of(client, tz="Mars/Base").status_code == 422
    assert trends_of(client, tz="../etc").status_code == 422
    assert trends_of(client, days="x").status_code == 422
    assert fake.calls == []


# REQ-QA-014: an unknown or hidden project is 404 before any check or run
def test_qa_014_unknown_project(tmp_path: Path) -> None:
    fake = FakeGinQa({})
    client = make_today(tmp_path, fake)
    assert trends_of(client, "nope").status_code == 404
    assert trends_of(client, "gone").status_code == 404
    assert trends_of(client, "nope", days=14).status_code == 404
    assert fake.calls == []


# REQ-QA-014: a project hidden by auth is 404 and gin-qa does not run
def test_qa_014_hidden_project(tmp_path: Path) -> None:
    fake = FakeGinQa({runs_args(SINCE_30): runs_export(ui("passed", "2026-11-26T10:00:00Z"))})
    app = auth_app(tmp_path, clock=lambda: datetime(2026, 11, 28, 5, tzinfo=UTC), run_gin_qa=fake)
    an = TestClient(app.app)
    sign_in(an, "an")  # may see only `a`
    assert trends_of(an, "b").status_code == 404
    assert fake.calls == []
    assert trends_of(an, "a").status_code == 200
    assert [cwd for _, cwd in fake.calls] == [tmp_path / "a"]


# REQ-QA-014: gin-qa is not installed
def test_qa_014_missing(tmp_path: Path) -> None:
    fake = FakeGinQa({runs_args(SINCE_30): QaError("gin-qa is not installed", "missing")})
    res = trends_of(make_today(tmp_path, fake))
    assert res.status_code == 502
    assert res.json() == {"error": "gin-qa is not installed", "cause": "missing"}


# TC: TC-QA-043@98fae12d
# REQ-QA-014: Old gin-qa
def test_qa_014_old_gin_qa(tmp_path: Path) -> None:
    fake = FakeGinQa(
        {runs_args(SINCE_30): QaError("this gin-qa has no `runs` command", "outdated")}
    )
    res = trends_of(make_today(tmp_path, fake))
    assert res.status_code == 502 and res.json()["cause"] == "outdated"
    old = FakeGinQa({runs_args(SINCE_30): {"cases": []}})
    res = trends_of(make_today(tmp_path, old))
    assert res.status_code == 502 and res.json()["cause"] == "outdated"


# REQ-QA-014: a timeout has a message and no cause
def test_qa_014_timeout(tmp_path: Path) -> None:
    fake = FakeGinQa({runs_args(SINCE_30): QaError("gin-qa timed out after 30s")})
    res = trends_of(make_today(tmp_path, fake))
    assert res.status_code == 502
    assert res.json() == {"error": "gin-qa timed out after 30s", "cause": None}


# TC: TC-QA-044@9018bafb
# REQ-QA-014: Problems kept
def test_qa_014_problems_kept(tmp_path: Path) -> None:
    problem = "qa/runs/2026-11/bao.jsonl:4: not JSON"
    rows = [ui("passed", "2026-11-26T10:00:00Z"), ui("failed", "2026-11-26T11:00:00Z")]
    fake = FakeGinQa({runs_args(SINCE_30): runs_export(*rows, problems=[problem])})
    body = trends_of(make_today(tmp_path, fake)).json()
    assert body["problems"] == [problem]
    point = next(p for p in body["pass_rate"][0]["points"] if p["date"] == "2026-11-26")
    assert (point["passed"], point["failed"]) == (1, 1)


# TC: TC-QA-045@e95deb11
# REQ-QA-014: Cache
def test_qa_014_cache(tmp_path: Path) -> None:
    rows = [
        ui("passed", "2026-11-26T10:00:00Z"),
        ui("passed", "2026-11-26T11:00:00Z", "TC-API-001", capability="api"),
    ]
    fake = FakeGinQa({runs_args(SINCE_30): runs_export(*rows)})
    client = make_today(tmp_path, fake)
    assert len(trends_of(client).json()["pass_rate"]) == 2
    only_ui = trends_of(client, capability="ui").json()
    assert [row["name"] for row in only_ui["pass_rate"]] == ["ui"]
    assert len(fake.calls) == 1  # the capability filter reads no new export
    assert client.post("/api/refresh").status_code == 204
    trends_of(client)
    assert len(fake.calls) == 2


# REQ-QA-014: kept 60 seconds per project and start date
def test_qa_014_cache_key_and_age(tmp_path: Path) -> None:
    clock = Clock()  # 2026-11-27T03:00Z
    fake = FakeGinQa(
        {runs_args("2026-10-29"): runs_export(), runs_args("2026-11-21"): runs_export()}
    )
    client = make(tmp_path, fake, clock)
    trends_of(client)
    clock.now += timedelta(seconds=59)
    trends_of(client)
    assert len(fake.calls) == 1
    trends_of(client, days=7)  # another start date
    trends_of(client, "beta")  # another project
    assert [(args[5], cwd.name) for args, cwd in fake.calls] == [
        ("2026-10-29", "alpha"),
        ("2026-11-21", "alpha"),
        ("2026-10-29", "beta"),
    ]
    clock.now += timedelta(seconds=2)
    trends_of(client)
    assert len(fake.calls) == 4


# REQ-QA-014: a failure is not kept
def test_qa_014_failure_not_kept(tmp_path: Path) -> None:
    fake = FakeGinQa({runs_args(SINCE_30): QaError("gin-qa timed out")})
    client = make_today(tmp_path, fake)
    assert trends_of(client).status_code == 502
    fake.outputs[runs_args(SINCE_30)] = runs_export()
    assert trends_of(client).status_code == 200
    assert len(fake.calls) == 2


# REQ-QA-014: at most one export per project and date at a time
def test_qa_014_one_run_at_a_time(tmp_path: Path) -> None:
    fake = FakeGinQa({runs_args(SINCE_30): runs_export()}, delay=0.3)
    client = make_today(tmp_path, fake)
    codes: list[int] = []

    def read() -> None:
        codes.append(trends_of(client).status_code)

    first = threading.Thread(target=read)
    first.start()
    deadline = time.monotonic() + 5
    while not fake.calls and time.monotonic() < deadline:
        time.sleep(0.01)
    second = threading.Thread(target=read)
    second.start()
    first.join()
    second.join()
    assert codes == [200, 200] and len(fake.calls) == 1


# REQ-QA-014: an empty export is a 200 with empty sections
def test_qa_014_no_runs(tmp_path: Path) -> None:
    fake = FakeGinQa({runs_args(SINCE_30): runs_export()})
    body = trends_of(make_today(tmp_path, fake)).json()
    assert body["pass_rate"] == [] and body["flaky"] == [] and body["still_failing"] == []
    assert body["time_to_fix"]["overall"] == {"fixes": 0, "median_seconds": None}


# TC: TC-QA-047@9dc35c41
def test_qa_016_flips_under_one_hash(tmp_path: Path) -> None:
    rows = [
        ui("passed", "2026-11-26T09:00:00Z", hash8="aaaa1111"),
        ui("failed", "2026-11-26T10:00:00Z", hash8="aaaa1111"),
        ui("passed", "2026-11-26T11:00:00Z", hash8="aaaa1111"),
        ui("failed", "2026-11-26T09:00:00Z", "TC-UI-002", hash8="aaaa2222"),
        ui("passed", "2026-11-26T10:00:00Z", "TC-UI-002", hash8="bbbb2222"),
    ]
    fake = FakeGinQa({runs_args(SINCE_30): runs_export(*rows)})
    flaky = trends_of(make_today(tmp_path, fake)).json()["flaky"]
    assert [(f["case"], f["flips"], f["last_result"]) for f in flaky] == [
        ("TC-UI-001", 2, "passed")
    ]


# TC: TC-QA-048@ee520335
def test_qa_017_median_and_open_streak_over_http(tmp_path: Path) -> None:
    rows = [
        ui("failed", "2026-11-26T09:00:00Z", "TC-UI-003"),
        ui("passed", "2026-11-26T09:30:00Z", "TC-UI-003"),
        ui("failed", "2026-11-26T10:00:00Z"),
        ui("failed", "2026-11-26T11:00:00Z"),
        ui(
            "failed",
            "2026-11-26T12:00:00Z",
            "TC-BEADS-001",
            capability="beads",
            bug="gin-console-3kd",
        ),
        ui("passed", "2026-11-26T13:00:00Z"),
    ]
    fake = FakeGinQa({runs_args(SINCE_30): runs_export(*rows)})
    body = trends_of(make_today(tmp_path, fake)).json()
    assert body["time_to_fix"]["overall"] == {"fixes": 2, "median_seconds": 6300}
    assert [(s["case"], s["bug"]) for s in body["still_failing"]] == [
        ("TC-BEADS-001", "gin-console-3kd")
    ]
    assert body["still_failing"][0]["failing_since"].startswith("2026-11-26T12:00:00")

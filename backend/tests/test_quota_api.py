from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.config import Settings
from gin_console.quota.source import SourceError

USAGE = (
    "Current session: 41% used · resets Oct 15, 8am (UTC)\n"
    "Current week (all models): 25% used · resets Oct 20, 12pm (UTC)\n"
)
LIVE = {
    "ordinaryUsageAllowed": True,
    "rateLimits": {
        "primary": {"usedPercent": 16, "windowDurationMins": 300, "resetsAt": 1793947812},
        "planType": "plus",
    },
    "rateLimitResetCredits": {"availableCount": 1},
}


def client(tmp_path: Path, claude: Any, codex: Any) -> TestClient:
    static = tmp_path / "dist"
    static.mkdir(exist_ok=True)
    app = create_app(
        Settings(),
        static_dir=static,
        claude_home=tmp_path,
        run_claude=claude,
        run_codex=codex,
        clock=lambda: datetime(2026, 10, 15, 3, 0, tzinfo=UTC),
    )
    return TestClient(app)


# REQ-QUOTA-001
def test_quota_001_both_sides(tmp_path: Path) -> None:
    body = client(tmp_path, lambda: USAGE, lambda: LIVE).get("/api/quota").json()
    assert [w["label"] for w in body["claude"]["windows"]] == ["session", "week (all models)"]
    assert body["codex"]["plan_type"] == "plus"
    assert body["codex"]["primary"]["used_percent"] == 16.0
    assert body["codex"]["fetched_at"].startswith("2026-10-15T03:00:00")


# REQ-QUOTA-001
def test_quota_001_one_side_fails(tmp_path: Path) -> None:
    def broken() -> Any:
        raise SourceError("codex command not found")

    body = client(tmp_path, lambda: USAGE, broken).get("/api/quota").json()
    assert body["codex"] == {"error": "codex command not found", "raw": None}
    assert "windows" in body["claude"]


# REQ-QUOTA-001
def test_quota_001_unparseable_claude_output_carries_raw(tmp_path: Path) -> None:
    body = client(tmp_path, lambda: "API key login\n", lambda: LIVE).get("/api/quota").json()
    assert body["claude"]["error"] == "claude /usage output was not understood"
    assert body["claude"]["raw"] == "API key login\n"
    assert "plan_type" in body["codex"]


# REQ-QUOTA-006
def test_quota_006_refresh_flag_forces_a_run(tmp_path: Path) -> None:
    runs: list[int] = []
    now = [datetime(2026, 10, 15, 3, 0, tzinfo=UTC)]

    def claude() -> str:
        runs.append(1)
        return USAGE

    static = tmp_path / "dist"
    static.mkdir(exist_ok=True)
    app = create_app(
        Settings(),
        static_dir=static,
        claude_home=tmp_path,
        run_claude=claude,
        run_codex=lambda: LIVE,
        clock=lambda: now[0],
    )
    api = TestClient(app)
    api.get("/api/quota")
    api.get("/api/quota")
    assert len(runs) == 1  # reused
    now[0] += timedelta(seconds=10)
    api.get("/api/quota", params={"refresh": "1"})
    assert len(runs) == 1  # forced, but under 30 seconds since the last run
    now[0] += timedelta(seconds=31)
    api.get("/api/quota", params={"refresh": "1"})
    assert len(runs) == 2  # forced and old enough


# REQ-QUOTA-007
def test_quota_007_refresh_value_is_never_passed_on(tmp_path: Path) -> None:
    seen: list[Any] = []

    def claude(*args: Any) -> str:
        seen.append(args)
        return USAGE

    response = client(tmp_path, claude, lambda: LIVE).get("/api/quota", params={"refresh": "../x"})
    assert response.status_code == 200
    assert seen == [()]


# REQ-QUOTA-007
def test_quota_007_lone_surrogate_in_raw_does_not_break_the_response(tmp_path: Path) -> None:
    response = client(tmp_path, lambda: "x\ud800y", lambda: LIVE).get("/api/quota")
    assert response.status_code == 200
    assert response.json()["claude"]["raw"] == "x?y"

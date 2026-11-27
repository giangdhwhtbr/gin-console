"""API cases of the Requirements capability (TC-REQUIREMENTS-001 to 036), sent through the HTTP API
with a fake `gin` (REQ-REQUIREMENTS-001 to 011)."""

import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd
from fake_gin import FakeGin, req, trace
from fake_git import FakeGit
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.auth.passwords import hash_password
from gin_console.auth.users import User, save_users
from gin_console.config import AuthSettings, ProjectEntry, Settings
from gin_console.requirements.source import RequirementsError

DAY = "2026-11-22"
FILES = "/api/requirements/mockups/proj/files"
POLICY = (
    "sandbox allow-scripts; default-src 'self' 'unsafe-inline' data: blob:; "
    "connect-src 'none'; form-action 'none'; frame-src 'none'"
)
LIST = {"project": "proj"}


def write(path: Path, text: str = "x") -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


@pytest.fixture
def root(tmp_path: Path) -> Path:
    project = tmp_path / "proj"
    specs = project / "docs" / "specs"
    folder = specs / "ui" / "assets" / DAY
    write(folder / "description.md", f"# ui\nConfirmed: {DAY}\n")
    write(folder / "index.html", "<script>1</script>")
    write(folder / "pic.svg", "<svg xmlns='http://www.w3.org/2000/svg'/>")
    draft = specs / "ui" / "assets" / "2026-11-01"
    write(draft / "description.md", "Confirmed: no\n")
    write(draft / "index.html")
    write(specs / "ui" / "spec.md", "# spec")
    (folder / "link.html").symlink_to(write(tmp_path / "secret.html", "secret"))
    png = specs / "ui" / "assets" / "2026-11-10"
    write(png / "description.md", "Confirmed: 2026-11-10\n")
    write(png / "a.png")
    write(png / "b.png")
    changes = project / "docs" / "changes"
    write(changes / "open" / "01-proposal.md", "# Open\n\nEpic: e-1\n")
    for day in ("2026-09-01", "2026-10-01"):
        write(changes / "archive" / f"{day}-old" / "proposal.md", "# Old\n")
    for n, name in enumerate(["proposal", "spec-delta", "design", "plan", "tests"], 1):
        write(changes / "full" / f"0{n}-{name}.md", f"# {name}\n")
    write(changes / "plain" / "proposal.md", "# Plain\n")
    write(changes / "plain" / "spec-delta.md", "# Delta\n")
    return project


def make(root: Path, fake: Any) -> TestClient:
    (root.parent / "empty").mkdir(exist_ok=True)
    (root.parent / "dist").mkdir(exist_ok=True)
    settings = Settings(
        projects=[
            ProjectEntry(name="proj", path=root),
            ProjectEntry(name="gone", path=root.parent / "gone"),
            ProjectEntry(name="empty", path=root.parent / "empty"),
        ]
    )
    app = create_app(
        settings,
        static_dir=root.parent / "dist",
        run_gin=fake,
        run_bd=FakeBd(),
        run_git=FakeGit(),
        clock=lambda: datetime(2026, 11, 25, 3, 0, tzinfo=UTC),
    )
    return TestClient(app, raise_server_exceptions=False)


def one(root: Path, **fields: Any) -> dict[str, Any]:
    client = make(root, FakeGin({"trace": trace(req(**fields))}))
    res = client.get("/api/requirements", params=LIST)
    assert res.status_code == 200
    row: dict[str, Any] = res.json()["requirements"][0]
    return row


def cases(*results: str) -> list[dict[str, str]]:
    return [{"id": f"TC-AUTH-{n:03d}", "effective_result": r} for n, r in enumerate(results, 1)]


DONE = [{"id": "a-1", "title": "A", "status": "closed"}]
OPEN = [{"id": "a-1", "title": "A", "status": "open"}]
REQS = {
    "requirements": [
        {
            "id": "REQ-AUTH-001",
            "title": "Lock out",
            "source": "spec.md",
            "section": "LIVING",
            "scenarios": [
                {"title": "One", "given": ["g"], "when": ["w"], "then": ["t"]},
                {"title": "Two", "given": [], "when": [], "then": []},
            ],
        }
    ]
}


# TC: TC-REQUIREMENTS-001@6a8c2181
def test_tc_requirements_001_living_and_removed(root: Path) -> None:
    fake = FakeGin(
        {
            "trace": trace(
                req("REQ-AUTH-001", cases=cases("passed")), req("REQ-AUTH-002", state="removed")
            )
        }
    )
    rows = make(root, fake).get("/api/requirements", params=LIST).json()["requirements"]
    assert [(r["state"], r["status"]) for r in rows] == [("living", "covered"), ("removed", None)]


# TC: TC-REQUIREMENTS-002@14fc7a2f
def test_tc_requirements_002_trace_warning(root: Path) -> None:
    fake = FakeGin({"trace": trace(req(beads=None), warnings=["beads: bd exited 1"])})
    res = make(root, fake).get("/api/requirements", params=LIST)
    body = res.json()
    assert res.status_code == 200 and body["requirements"][0]["beads"] is None
    assert body["warnings"] == ["beads: bd exited 1"]


# TC: TC-REQUIREMENTS-003@89826190
def test_tc_requirements_003_legacy_layout(root: Path) -> None:
    res = make(root, FakeGin({"trace": trace(layout="legacy")})).get(
        "/api/requirements", params=LIST
    )
    assert res.status_code == 200
    assert (res.json()["layout"], res.json()["requirements"]) == ("legacy", [])


# TC: TC-REQUIREMENTS-004@2ba64d56
def test_tc_requirements_004_covered(root: Path) -> None:
    row = one(root, beads=DONE, cases=cases("passed", "passed"))
    assert (row["status"], row["reasons"]) == ("covered", [])


# TC: TC-REQUIREMENTS-005@ba0ea3cb
def test_tc_requirements_005_outdated_case(root: Path) -> None:
    row = one(root, cases=cases("passed", "outdated"))
    assert (row["status"], row["reasons"]) == ("untested", ["outdated"])


# TC: TC-REQUIREMENTS-006@a44aaa5b
def test_tc_requirements_006_no_case(root: Path) -> None:
    row = one(root, cases=[], tests=["t.py"])
    assert (row["status"], row["reasons"]) == ("untested", ["no case"])


# TC: TC-REQUIREMENTS-007@26c1bbb3
def test_tc_requirements_007_failing_beats_building(root: Path) -> None:
    row = one(root, beads=OPEN, cases=cases("failed"))
    assert row["status"] == "failing" and "failed" in row["reasons"]


# TC: TC-REQUIREMENTS-008@432635bd
def test_tc_requirements_008_cases_unknown(root: Path) -> None:
    row = one(root, beads=DONE, cases=None)
    assert (row["status"], row["reasons"]) == ("unknown", ["cases unknown"])


# TC: TC-REQUIREMENTS-009@7f1d2844
def test_tc_requirements_009_beads_unknown(root: Path) -> None:
    assert one(root, beads=None, cases=cases("passed"))["status"] == "covered"


# TC: TC-REQUIREMENTS-010@12e37ca1
def test_tc_requirements_010_changed_after_signoff(root: Path) -> None:
    row = one(root, signoff={"actor": "ba", "at": "t", "change": "c", "current": False})
    s = row["signoff"]
    assert (s["state"], s["actor"], s["at"], s["change"]) == ("changed", "ba", "t", "c")


# TC: TC-REQUIREMENTS-011@792fb683
def test_tc_requirements_011_hash_not_recorded(root: Path) -> None:
    assert (
        one(root, signoff={"actor": "ba", "current": None})["signoff"]["state"] == "unknown version"
    )


# TC: TC-REQUIREMENTS-012@385470f2
def test_tc_requirements_012_waived(root: Path) -> None:
    s = one(root, signoff={"actor": "ba", "waived": True, "evidence": "legacy", "current": None})[
        "signoff"
    ]
    assert (s["state"], s["evidence"]) == ("waived", "legacy")


# TC: TC-REQUIREMENTS-013@eafd3717
def test_tc_requirements_013_scenarios(root: Path) -> None:
    body = (
        make(root, FakeGin({"reqs": REQS})).get("/api/requirements/reqs/proj/REQ-AUTH-001").json()
    )
    assert [s["title"] for s in body["scenarios"]] == ["One", "Two"]
    first = body["scenarios"][0]
    assert (first["given"], first["when"], first["then"]) == (["g"], ["w"], ["t"])


# TC: TC-REQUIREMENTS-014@98c71cc5
def test_tc_requirements_014_removed_requirement(root: Path) -> None:
    assert (
        make(root, FakeGin({"reqs": REQS}))
        .get("/api/requirements/reqs/proj/REQ-AUTH-099")
        .status_code
        == 404
    )


# TC: TC-REQUIREMENTS-015@284459a5
def test_tc_requirements_015_old_gin(root: Path) -> None:
    res = make(root, FakeGin({"trace": RequirementsError("old", "outdated")})).get(
        "/api/requirements", params=LIST
    )
    assert res.status_code == 502 and res.json() == {"error": "old", "cause": "outdated"}


# TC: TC-REQUIREMENTS-016@d79d58fd
def test_tc_requirements_016_timeout(root: Path) -> None:
    res = make(root, FakeGin({"trace": RequirementsError("gin timed out")})).get(
        "/api/requirements", params=LIST
    )
    assert res.status_code == 502 and "timed out" in res.json()["error"]


# TC: TC-REQUIREMENTS-017@455fec3e
def test_tc_requirements_017_scenarios_fail_alone(root: Path) -> None:
    fake = FakeGin({"trace": trace(req()), "reqs": RequirementsError("boom")})
    client = make(root, fake)
    assert client.get("/api/requirements", params=LIST).status_code == 200
    assert client.get("/api/requirements/reqs/proj/REQ-AUTH-001").status_code == 502


# TC: TC-REQUIREMENTS-018@5ebda0e5
def test_tc_requirements_018_unknown_project(root: Path) -> None:
    client = make(root, FakeGin({"trace": trace(), "reqs": REQS}))
    assert client.get("/api/requirements", params={"project": "nope"}).status_code == 404
    assert client.get("/api/requirements", params={"project": "gone"}).status_code == 404
    assert client.get("/api/requirements/reqs/nope/REQ-AUTH-001").status_code == 404


# TC: TC-REQUIREMENTS-019@9ee45e8d
def test_tc_requirements_019_two_readers(root: Path) -> None:
    started, release = threading.Event(), threading.Event()
    calls: list[list[str]] = []

    def slow(args: list[str], cwd: Path) -> Any:
        calls.append(args)
        started.set()
        release.wait(5)
        return trace(req())

    client = make(root, slow)
    results: list[int] = []

    def read() -> None:
        results.append(client.get("/api/requirements", params=LIST).status_code)

    first = threading.Thread(target=read)
    first.start()
    assert started.wait(5)
    second = threading.Thread(target=read)
    second.start()
    release.set()
    first.join()
    second.join()
    assert results == [200, 200] and len(calls) == 1


# TC: TC-REQUIREMENTS-020@0db3ca4a
def test_tc_requirements_020_refresh(root: Path) -> None:
    fake = FakeGin({"trace": trace(req())})
    client = make(root, fake)
    client.get("/api/requirements", params=LIST)
    client.post("/api/refresh")
    client.get("/api/requirements", params=LIST)
    assert len(fake.calls) == 2


# TC: TC-REQUIREMENTS-021@23d0ce21
def test_tc_requirements_021_failure(root: Path) -> None:
    fake = FakeGin({"trace": RequirementsError("boom")})
    client = make(root, fake)
    client.get("/api/requirements", params=LIST)
    client.get("/api/requirements", params=LIST)
    assert len(fake.calls) == 2


# TC: TC-REQUIREMENTS-022@20e0aa7b
def test_tc_requirements_022_open_and_archived(root: Path) -> None:
    body = (
        make(root, FakeGin({"trace": trace()})).get("/api/requirements/changes", params=LIST).json()
    )
    folders = [c["folder"] for c in body["changes"]]
    assert folders == ["full", "open", "plain", "2026-10-01-old", "2026-09-01-old"]
    row = next(c for c in body["changes"] if c["folder"] == "open")
    assert (row["title"], row["epic"]) == ("Open", "e-1")


# TC: TC-REQUIREMENTS-023@a25bb914
def test_tc_requirements_023_trace_fails(root: Path) -> None:
    client = make(root, FakeGin({"trace": RequirementsError("old gin", "outdated")}))
    res = client.get("/api/requirements/changes", params=LIST)
    body = res.json()
    assert res.status_code == 200 and body["error"] == "old gin" and len(body["changes"]) == 5
    assert all(c["signoff"] is None and c["added"] is None for c in body["changes"])


# TC: TC-REQUIREMENTS-024@9606d68e
def test_tc_requirements_024_no_changes_folder(root: Path) -> None:
    res = make(root, FakeGin({"trace": trace()})).get(
        "/api/requirements/changes", params={"project": "empty"}
    )
    assert res.status_code == 200 and res.json()["changes"] == []


# TC: TC-REQUIREMENTS-025@88e5a911
def test_tc_requirements_025_numbered(root: Path) -> None:
    body = make(root, FakeGin({"trace": trace()})).get("/api/requirements/changes/proj/full").json()
    assert sorted(body["files"]) == ["design", "plan", "proposal", "spec-delta", "tests"]


# TC: TC-REQUIREMENTS-026@8dc16f29
def test_tc_requirements_026_not_numbered(root: Path) -> None:
    body = (
        make(root, FakeGin({"trace": trace()})).get("/api/requirements/changes/proj/plain").json()
    )
    assert sorted(body["files"]) == ["proposal", "spec-delta"]


# TC: TC-REQUIREMENTS-027@3f30466e
def test_tc_requirements_027_unknown(root: Path) -> None:
    assert (
        make(root, FakeGin({"trace": trace()}))
        .get("/api/requirements/changes/proj/nope")
        .status_code
        == 404
    )


# TC: TC-REQUIREMENTS-028@44f2131d
def test_tc_requirements_028_not_confirmed(root: Path) -> None:
    body = (
        make(root, FakeGin({"trace": trace()})).get("/api/requirements/mockups", params=LIST).json()
    )
    assert "2026-11-01" not in [m["date"] for m in body["mockups"]]


# TC: TC-REQUIREMENTS-029@25e1ca5c
def test_tc_requirements_029_used_by(root: Path) -> None:
    fake = FakeGin({"trace": trace(req("REQ-UI-129", source="docs/specs/ui/spec.md:3"))})
    spec = root / "docs" / "specs" / "ui" / "spec.md"
    spec.write_text(
        "### REQ-UI-129: Reports\nSource: ../ui/assets/2026-11-22/index.html#reports\n",
        encoding="utf-8",
    )
    body = make(root, fake).get("/api/requirements/mockups", params=LIST).json()
    folder = next(m for m in body["mockups"] if m["date"] == DAY)
    assert folder["requirements"] == ["REQ-UI-129"]


# TC: TC-REQUIREMENTS-030@0843aece
def test_tc_requirements_030_no_html(root: Path) -> None:
    body = (
        make(root, FakeGin({"trace": trace()})).get("/api/requirements/mockups", params=LIST).json()
    )
    folder = next(m for m in body["mockups"] if m["date"] == "2026-11-10")
    assert folder["html"] == [] and sorted(folder["images"]) == ["a.png", "b.png"]


# TC: TC-REQUIREMENTS-031@6aa9faf1
def test_tc_requirements_031_parent_path(root: Path) -> None:
    res = make(root, FakeGin({})).get(f"{FILES}/ui/{DAY}/..%2f..%2fspec.md")
    assert res.status_code == 404


# TC: TC-REQUIREMENTS-032@01ab142d
def test_tc_requirements_032_link_outside(root: Path) -> None:
    res = make(root, FakeGin({})).get(f"{FILES}/ui/{DAY}/link.html")
    assert res.status_code == 404 and "secret" not in res.text


# TC: TC-REQUIREMENTS-033@e65bc8b9
def test_tc_requirements_033_folder_not_confirmed(root: Path) -> None:
    assert make(root, FakeGin({})).get(f"{FILES}/ui/2026-11-01/index.html").status_code == 404


# TC: TC-REQUIREMENTS-034@bb4950fc
def test_tc_requirements_034_nul_byte(root: Path) -> None:
    assert make(root, FakeGin({})).get(f"{FILES}/ui/{DAY}/index.html%00").status_code == 404


# TC: TC-REQUIREMENTS-035@43386c55
def test_tc_requirements_035_headers_of_a_mockup_file(root: Path) -> None:
    res = make(root, FakeGin({})).get(f"{FILES}/ui/{DAY}/index.html")
    assert res.status_code == 200
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["content-security-policy"] == POLICY


# TC: TC-REQUIREMENTS-036@33f2fb63
def test_tc_requirements_036_svg(root: Path) -> None:
    res = make(root, FakeGin({})).get(f"{FILES}/ui/{DAY}/pic.svg")
    assert res.status_code == 200 and res.headers["content-type"] == "image/svg+xml"
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["content-security-policy"] == POLICY


# TC: TC-REQUIREMENTS-063@528942cd
def test_tc_requirements_063_grant_per_folder(root: Path) -> None:
    second = root / "docs" / "specs" / "reports" / "assets" / "2026-11-12"
    write(second / "description.md", "Confirmed: 2026-11-12\n")
    write(second / "index.html", "<p>reports</p>")
    users_file = root.parent / "users.yaml"
    an = User(name="an", email="an@x.io", password_hash=hash_password("P"), projects=["proj"])
    save_users(users_file, [an])
    settings = Settings(
        projects=[ProjectEntry(name="proj", path=root)],
        auth=AuthSettings(enabled=True, users_file=users_file),
    )
    client = TestClient(
        create_app(settings, run_gin=FakeGin({"trace": trace()}), schedule_pulls=False)
    )
    client.post("/api/auth/login", json={"username": "an", "password": "P"})
    mockups = client.get("/api/requirements/mockups", params=LIST).json()["mockups"]
    grants = [m["grant"] for m in mockups if m["date"] in (DAY, "2026-11-12")]
    assert len(grants) == 2 and all(isinstance(g, str) and g for g in grants)
    assert grants[0] != grants[1]

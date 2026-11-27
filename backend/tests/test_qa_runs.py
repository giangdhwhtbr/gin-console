"""The latest e2e run of a case and its step screenshots, read from the run folder its `run`
names (REQ-QA-005, REQ-QA-006)."""

import json
import os
import sys
from pathlib import Path
from typing import Any

import pytest
from fake_gin_qa import case

from gin_console.beads.images import MAX_BYTES
from gin_console.config import ProjectEntry
from gin_console.qa.models import ExportCase
from gin_console.qa.runs import RESULT_LIMIT, latest_run, read_screenshot, run_folder

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 100
RUN = "qa/evidence/2026-11-23T10-34-33"
needs_symlinks = pytest.mark.skipif(sys.platform == "win32", reason="symlinks need privileges")
needs_fifos = pytest.mark.skipif(sys.platform == "win32", reason="no FIFOs")


def project(tmp_path: Path) -> ProjectEntry:
    entry = ProjectEntry(name="alpha", path=tmp_path / "alpha")
    entry.path.mkdir(exist_ok=True)
    return entry


def export_case(ident: str, **fields: Any) -> ExportCase:
    return ExportCase.model_validate(case(ident, **fields))


def step(title: str, screenshot: Any = None, **fields: Any) -> dict[str, Any]:
    return {"title": title, "status": "passed", "screenshot": screenshot, "error": None, **fields}


def write_run(
    entry: ProjectEntry, ident: str, steps: list[Any], run: str = RUN, **fields: Any
) -> Path:
    """`<run>/<ident lower>/result.json` as the evidence fixture of gin-qa writes it."""
    folder = entry.path / run / ident.lower()
    folder.mkdir(parents=True, exist_ok=True)
    result = {
        "tc": ident,
        "tc_hash8": "0a1b2c3d",
        "project": None,
        "status": "passed",
        "started": "2026-11-23T10:34:33.000Z",
        "finished": "2026-11-23T10:34:40.000Z",
        "error": None,
        "steps": steps,
        **fields,
    }
    (folder / "result.json").write_text(json.dumps(result))
    return folder


def e2e_run(entry: ProjectEntry) -> tuple[ExportCase, Path]:
    """TC-UI-115: two steps, `01.png` a PNG and `02.png` text."""
    folder = write_run(
        entry,
        "TC-UI-115",
        [step("Open the page", "01.png"), step("Click save", "02.png", status="failed", error="x")],
    )
    (folder / "01.png").write_bytes(PNG)
    (folder / "02.png").write_text("not an image")
    return export_case("TC-UI-115", run=RUN), folder


# REQ-QA-005: E2E run
def test_qa_005_e2e_run(tmp_path: Path) -> None:
    entry = project(tmp_path)
    tc, _ = e2e_run(entry)
    run, reason = latest_run(entry, tc)
    assert reason is None and run is not None
    assert (run.folder, run.status, run.error) == (RUN, "passed", None)
    assert (run.started, run.finished) == ("2026-11-23T10:34:33.000Z", "2026-11-23T10:34:40.000Z")
    assert [s.model_dump() for s in run.steps] == [
        {"n": 1, "title": "Open the page", "status": "passed", "error": None, "screenshot": True},
        {"n": 2, "title": "Click save", "status": "failed", "error": "x", "screenshot": False},
    ]


# REQ-QA-005: steps are numbered in order; a field that is not text is left empty
def test_qa_005_step_fields(tmp_path: Path) -> None:
    entry = project(tmp_path)
    steps = [{"n": 7, "title": 3, "status": None, "error": ["x"]}, "odd", step("Last")]
    write_run(entry, "TC-UI-130", steps, status=1, started=None, error="Timed out")
    run, _ = latest_run(entry, export_case("TC-UI-130", run=RUN))
    assert run is not None and (run.status, run.started, run.error) == (None, None, "Timed out")
    assert [(s.n, s.title, s.status, s.error, s.screenshot) for s in run.steps] == [
        (1, "", "", None, False),
        (2, "", "", None, False),
        (3, "Last", "passed", None, False),
    ]


# REQ-QA-005: No run here
def test_qa_005_no_run_here(tmp_path: Path) -> None:
    entry = project(tmp_path)
    (entry.path / "qa" / "evidence" / "r2").mkdir(parents=True)  # no tc-server-001 in it
    no_run = export_case("TC-UI-120", run="")
    deleted = export_case("TC-UI-121", run="qa/evidence/old")
    api = export_case("TC-SERVER-001", type="api", run="qa/evidence/r2")
    assert latest_run(entry, no_run) == (None, "no_run")
    assert latest_run(entry, deleted) == (None, "not_on_host")
    assert latest_run(entry, api) == (None, "not_on_host")


# REQ-QA-005: a run that names a file is not on this host
def test_qa_005_run_is_a_file(tmp_path: Path) -> None:
    entry = project(tmp_path)
    (entry.path / "qa").mkdir()
    (entry.path / "qa" / "notes.txt").write_text("x")
    assert latest_run(entry, export_case("TC-UI-121", run="qa/notes.txt")) == (None, "not_on_host")


# REQ-QA-005: Refused run, for each text rule, even when the files exist
@pytest.mark.parametrize(
    "run",
    [
        "../outside/r1",
        "qa/../../outside/r1",
        "qa\\evidence\\r1",
        "qa/evidence:x",
        "qa/evi\0dence",
        "qa//evidence/r1",
        "qa/evidence/r1/",
    ],
)
def test_qa_005_refused_run(tmp_path: Path, run: str) -> None:
    entry = project(tmp_path)
    write_run(entry, "TC-UI-122", [step("One")], run="qa/evidence/r1")
    outside = ProjectEntry(name="outside", path=tmp_path / "outside")
    write_run(outside, "TC-UI-122", [step("One")], run="r1")
    assert run_folder(entry, run) == "invalid"
    assert latest_run(entry, export_case("TC-UI-122", run=run)) == (None, "invalid")


# REQ-QA-005: an absolute run is refused, even one inside the project
def test_qa_005_absolute_run(tmp_path: Path) -> None:
    entry = project(tmp_path)
    folder = write_run(entry, "TC-UI-122", [step("One")], run="qa/evidence/r1").parent
    assert run_folder(entry, folder.as_posix()) == "invalid"
    assert run_folder(entry, "/abs/r1") == "invalid"
    assert latest_run(entry, export_case("TC-UI-122", run="/abs/r1")) == (None, "invalid")


# REQ-QA-005: the run folder, resolved, may not exist yet; an empty run names none
def test_qa_005_run_folder(tmp_path: Path) -> None:
    entry = project(tmp_path)
    assert run_folder(entry, "") is None
    assert run_folder(entry, "qa/evidence/r9") == entry.path.resolve() / "qa" / "evidence" / "r9"
    assert run_folder(entry, "./qa/evidence/r9") == entry.path.resolve() / "qa" / "evidence" / "r9"


# REQ-QA-005: Refused run: a screenshot that is not a plain file name of the run's folder
@pytest.mark.parametrize("name", ["../../secret.png", "a/b.png", "..", ".", "", 7])
def test_qa_005_refused_screenshot(tmp_path: Path, name: Any) -> None:
    entry = project(tmp_path)
    folder = write_run(entry, "TC-UI-123", [step("One", name)])
    (folder / "a").mkdir()
    (folder / "a" / "b.png").write_bytes(PNG)
    (entry.path / "qa" / "evidence" / "secret.png").write_bytes(PNG)  # what ../../ would reach
    tc = export_case("TC-UI-123", run=RUN)
    run, _ = latest_run(entry, tc)
    assert run is not None and run.steps[0].screenshot is False
    assert read_screenshot(entry, tc, 1) is None


# REQ-QA-005: a run folder that is a link out of the project is refused
@needs_symlinks
def test_qa_005_run_folder_linked_outside(tmp_path: Path) -> None:
    entry = project(tmp_path)
    outside = ProjectEntry(name="outside", path=tmp_path / "outside")
    write_run(outside, "TC-UI-122", [step("One")], run="r1")
    (entry.path / "qa").mkdir()
    (entry.path / "qa" / "r1").symlink_to(outside.path / "r1")
    assert run_folder(entry, "qa/r1") == "invalid"
    assert latest_run(entry, export_case("TC-UI-122", run="qa/r1")) == (None, "invalid")


# REQ-QA-005: a link inside the project is followed; a case folder or result.json that leads out
# of it is refused
@needs_symlinks
def test_qa_005_links_inside_and_out(tmp_path: Path) -> None:
    entry = project(tmp_path)
    folder = write_run(entry, "TC-UI-124", [step("One")], run="qa/evidence/real")
    (entry.path / "qa" / "evidence" / "latest").symlink_to(folder.parent)
    run, reason = latest_run(entry, export_case("TC-UI-124", run="qa/evidence/latest"))
    assert reason is None and run is not None and run.folder == "qa/evidence/latest"
    outside = write_run(ProjectEntry(name="o", path=tmp_path / "o"), "TC-UI-125", [], run="r")
    (entry.path / "qa" / "evidence" / "real" / "tc-ui-125").symlink_to(outside)
    linked = export_case("TC-UI-125", run="qa/evidence/real")
    assert latest_run(entry, linked) == (None, "invalid")
    (folder.parent / "tc-ui-126").mkdir()
    (folder.parent / "tc-ui-126" / "result.json").symlink_to(outside / "result.json")
    assert latest_run(entry, export_case("TC-UI-126", run="qa/evidence/real")) == (None, "invalid")


# REQ-QA-005: a screenshot that is a link out of the project is not marked
@needs_symlinks
def test_qa_005_screenshot_linked_outside(tmp_path: Path) -> None:
    entry = project(tmp_path)
    folder = write_run(entry, "TC-UI-123", [step("One", "01.png")])
    secret = tmp_path / "secret.png"
    secret.write_bytes(PNG)
    (folder / "01.png").symlink_to(secret)
    tc = export_case("TC-UI-123", run=RUN)
    run, _ = latest_run(entry, tc)
    assert run is not None and run.steps[0].screenshot is False
    assert read_screenshot(entry, tc, 1) is None


# REQ-QA-005: a FIFO is never waited on, as a screenshot or as result.json
@needs_fifos
def test_qa_005_fifo(tmp_path: Path) -> None:
    entry = project(tmp_path)
    folder = write_run(entry, "TC-UI-123", [step("One", "pipe.png")])
    os.mkfifo(folder / "pipe.png")
    tc = export_case("TC-UI-123", run=RUN)
    run, _ = latest_run(entry, tc)
    assert run is not None and run.steps[0].screenshot is False
    assert read_screenshot(entry, tc, 1) is None
    (entry.path / RUN / "tc-ui-127").mkdir()
    os.mkfifo(entry.path / RUN / "tc-ui-127" / "result.json")
    assert latest_run(entry, export_case("TC-UI-127", run=RUN)) == (None, "invalid")


# REQ-QA-005: a screenshot over 10 MB is not marked
def test_qa_005_screenshot_over_ten_megabytes(tmp_path: Path) -> None:
    entry = project(tmp_path)
    folder = write_run(entry, "TC-UI-123", [step("One", "big.png")])
    with (folder / "big.png").open("wb") as handle:
        handle.write(PNG)
        handle.truncate(11 * 1024 * 1024)
    assert (folder / "big.png").stat().st_size > MAX_BYTES
    tc = export_case("TC-UI-123", run=RUN)
    run, _ = latest_run(entry, tc)
    assert run is not None and run.steps[0].screenshot is False
    assert read_screenshot(entry, tc, 1) is None


def write_result(entry: ProjectEntry, ident: str, content: bytes) -> ExportCase:
    folder = entry.path / RUN / ident.lower()
    folder.mkdir(parents=True)
    (folder / "result.json").write_bytes(content)
    return export_case(ident, run=RUN)


def padded(size: int) -> bytes:
    """A result.json object with no step, `size` bytes long."""
    head = b'{"steps": [], "pad": "'
    return head + b"x" * (size - len(head) - 2) + b'"}'


# REQ-QA-005: at most 1 MB of result.json is read
def test_qa_005_result_size_limit(tmp_path: Path) -> None:
    entry = project(tmp_path)
    edge = write_result(entry, "TC-UI-140", padded(RESULT_LIMIT))
    over = write_result(entry, "TC-UI-141", padded(RESULT_LIMIT + 1))
    assert RESULT_LIMIT == 1024 * 1024
    run, reason = latest_run(entry, edge)
    assert reason is None and run is not None and run.steps == []
    assert latest_run(entry, over) == (None, "invalid")


# REQ-QA-005: result.json that is not a JSON object with a steps list
@pytest.mark.parametrize(
    "content",
    [b"[]", b"not json", b'{"status": "passed"}', b'{"steps": {}}', b"\xff\xfe\x00", b"[" * 100000],
    ids=["list", "not-json", "no-steps", "steps-not-a-list", "not-utf8", "deep"],
)
def test_qa_005_result_not_understood(tmp_path: Path, content: bytes) -> None:
    entry = project(tmp_path)
    assert latest_run(entry, write_result(entry, "TC-UI-142", content)) == (None, "invalid")


# REQ-QA-006: the screenshot of a step is found again and read now
def test_qa_006_read_screenshot(tmp_path: Path) -> None:
    entry = project(tmp_path)
    tc, folder = e2e_run(entry)
    assert read_screenshot(entry, tc, 1) == (PNG, "image/png")
    assert read_screenshot(entry, tc, 2) is None  # text named .png
    assert read_screenshot(entry, tc, 0) is None
    assert read_screenshot(entry, tc, 3) is None
    assert read_screenshot(entry, export_case("TC-UI-115", run=""), 1) is None
    assert read_screenshot(entry, export_case("TC-UI-115", run="../x"), 1) is None
    (folder / "01.png").unlink()
    assert read_screenshot(entry, tc, 1) is None

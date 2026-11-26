"""Change folders and confirmed assets of a project in tmp_path."""

import os
import time
from pathlib import Path
from typing import Any

import pytest
from fake_gin import req, trace

from gin_console.requirements.files import (
    list_changes,
    list_mockups,
    mockup_file,
    read_change,
)
from gin_console.requirements.models import Trace
from gin_console.requirements.service import build_changes

DAY = "2026-11-22"
LIMIT = 20 * 1024 * 1024
DESCRIPTION = f"# ui\n\nConfirmed: {DAY}\nConfirmed by: ba@example.com\n\n## Summary\nText\n"


def write(path: Path, text: str = "x") -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def asset(project: Path, capability: str, day: str, description: str = DESCRIPTION) -> Path:
    folder = project / "docs" / "specs" / capability / "assets" / day
    write(folder / "description.md", description)
    return folder


def change(project: Path, name: str, title: str = "Title", epic: str = "e-1") -> Path:
    folder = project / "docs" / "changes" / name
    write(folder / "01-proposal.md", f"# {title}\n\nEpic: {epic}\n")
    return folder


@pytest.fixture
def project(tmp_path: Path) -> Path:
    root = tmp_path / "proj"
    folder = asset(root, "ui", DAY)
    write(folder / "index.html", "<p>hello</p>")
    write(folder / "shots" / "a.PNG")
    write(folder / "note.md")
    write(folder / "run.sh")
    write(root / "docs" / "specs" / "ui" / "spec.md", "# ui\n")
    write(tmp_path / "outside" / "x.html", "secret")
    (folder / "link.html").symlink_to(tmp_path / "outside" / "x.html")
    (folder / "out").symlink_to(tmp_path / "outside")
    (folder / "loop.html").symlink_to(folder / "loop.html")
    (folder / "again").symlink_to(folder)
    return root


# REQ-REQUIREMENTS-007: open and archived
def test_requirements_007_open_and_archived(tmp_path: Path) -> None:
    change(tmp_path, "archive/2026-10-01-old")
    change(tmp_path, "archive/2026-11-01-new", "New", "e-2")
    change(tmp_path, "open")
    rows = list_changes(tmp_path)
    assert [r.folder for r in rows] == ["open", "2026-11-01-new", "2026-10-01-old"]
    assert [r.archived for r in rows] == [None, "2026-11-01", "2026-10-01"]
    assert (rows[1].change, rows[1].title, rows[1].epic) == ("new", "New", "e-2")


# REQ-REQUIREMENTS-007: no changes folder, or no folder at all
def test_requirements_007_no_changes_folder(tmp_path: Path) -> None:
    assert list_changes(tmp_path) == []
    write(tmp_path / "docs" / "changes", "a file")
    assert list_changes(tmp_path) == []


# REQ-REQUIREMENTS-007: an archive folder without a date is not shown as open
def test_requirements_007_archive_without_date(tmp_path: Path) -> None:
    change(tmp_path, "archive/undated")
    assert list_changes(tmp_path) == []
    assert read_change(tmp_path, "undated") is None


# REQ-REQUIREMENTS-007: folder without a proposal
def test_requirements_007_no_proposal(tmp_path: Path) -> None:
    write(tmp_path / "docs" / "changes" / "bare" / "design.md")
    (row,) = list_changes(tmp_path)
    assert (row.folder, row.title, row.epic) == ("bare", "bare", None)


def changed(name: str, op: str, archived: str | None, signoff: Any = None) -> dict[str, Any]:
    return {"change": name, "epic": "e", "op": op, "archived": archived, "signoff": signoff}


# REQ-REQUIREMENTS-007: counts and sign-off from the trace
def test_requirements_007_counts(tmp_path: Path) -> None:
    change(tmp_path, "archive/2026-11-01-new")
    change(tmp_path, "open")
    signed = {"at": "t", "actor": "ba", "waived": False}
    data = trace(
        req("REQ-A-001", changes=[changed("new", "added", "2026-11-01")]),
        req("REQ-A-002", changes=[changed("new", "modified", "2026-11-01", signed)]),
        req("REQ-A-003", changes=[changed("new", "added", "2026-11-01", signed)]),
        req("REQ-A-004", state="removed", changes=[changed("new", "removed", "2026-11-01")]),
    )
    body = build_changes(list_changes(tmp_path), Trace.model_validate(data), None, None)
    unnamed, new = body.changes
    assert (new.added, new.modified, new.removed) == (2, 1, 1)
    assert new.signoff is not None and new.signoff.actor == "ba"
    assert (unnamed.added, unnamed.modified, unnamed.removed, unnamed.signoff) == (None,) * 4


# REQ-REQUIREMENTS-007: trace fails
def test_requirements_007_trace_fails(tmp_path: Path) -> None:
    change(tmp_path, "open")
    body = build_changes(list_changes(tmp_path), None, "boom", "outdated")
    assert (body.error, body.cause) == ("boom", "outdated")
    assert body.changes[0].signoff is None and body.changes[0].added is None


# REQ-REQUIREMENTS-008: numbered
def test_requirements_008_numbered(tmp_path: Path) -> None:
    folder = change(tmp_path, "archive/2026-11-01-new", "New", "e-2")
    for name in ("02-spec-delta", "03-design", "04-plan", "05-tests"):
        write(folder / f"{name}.md", name)
    write(folder / "06-signoff.md")
    found = read_change(tmp_path, "2026-11-01-new")
    assert found is not None
    assert list(found.files) == ["proposal", "spec-delta", "design", "plan", "tests"]
    assert found.files["tests"] == "05-tests"
    assert (found.title, found.epic, found.archived) == ("New", "e-2", "2026-11-01")


# REQ-REQUIREMENTS-008: not numbered
def test_requirements_008_not_numbered(tmp_path: Path) -> None:
    folder = tmp_path / "docs" / "changes" / "open"
    write(folder / "proposal.md", "# P")
    write(folder / "spec-delta.md", "D")
    found = read_change(tmp_path, "open")
    assert found is not None and found.files == {"proposal": "# P", "spec-delta": "D"}


# REQ-REQUIREMENTS-008: unknown
@pytest.mark.parametrize(
    "name", ["nope", "archive", "..", ".", "", "a\0", "archive/2026-11-01-new"]
)
def test_requirements_008_unknown(tmp_path: Path, name: str) -> None:
    change(tmp_path, "archive/2026-11-01-new")
    assert read_change(tmp_path, name) is None


# REQ-REQUIREMENTS-008: a file that cannot be read becomes an error text
def test_requirements_008_unreadable(tmp_path: Path) -> None:
    folder = change(tmp_path, "open")
    (folder / "03-design.md").write_bytes(b"\xff\xfe")
    write(folder / "04-plan.md").chmod(0)
    found = read_change(tmp_path, "open")
    assert found is not None
    assert found.files["design"] == "This file could not be read."
    assert found.files["plan"] == "This file could not be read."


# REQ-REQUIREMENTS-009: not confirmed
@pytest.mark.parametrize(
    "text",
    [
        "Confirmed: no",
        "Confirmed:",
        "Confirmed: 2026-99-99",
        "Confirmed: yes 2026-11-22",
        "See Confirmed: 2026-11-22",
        "Confirmed: no\nConfirmed: 2026-11-22",
        "Confirmed by: ba",
    ],
)
def test_requirements_009_not_confirmed(tmp_path: Path, text: str) -> None:
    folder = asset(tmp_path, "ui", DAY, text)
    write(folder / "index.html")
    assert list_mockups(tmp_path) == []
    assert mockup_file(tmp_path, "ui", DAY, "index.html") is None


# REQ-REQUIREMENTS-009: what a mockup holds
def test_requirements_009_fields(project: Path) -> None:
    (found,) = list_mockups(project)
    assert (found.capability, found.date, found.confirmed) == ("ui", DAY, DAY)
    assert found.confirmed_by == "ba@example.com" and found.description == DESCRIPTION
    assert found.html == ["index.html"] and found.images == ["shots/a.PNG"]


# REQ-REQUIREMENTS-009: newest first within each capability
def test_requirements_009_order(tmp_path: Path) -> None:
    for capability, day in [("ui", "2026-11-08"), ("beads", "2026-10-01"), ("ui", "2026-11-22")]:
        write(asset(tmp_path, capability, day) / "a.png")
    write(asset(tmp_path, "ui", "mockup") / "a.png")
    assert [(m.capability, m.date) for m in list_mockups(tmp_path)] == [
        ("beads", "2026-10-01"),
        ("ui", "2026-11-22"),
        ("ui", "2026-11-08"),
    ]


# REQ-REQUIREMENTS-009: used by
def test_requirements_009_used_by(project: Path) -> None:
    write(
        project / "docs" / "specs" / "reports" / "spec.md",
        "# reports\nSource: `../ui/assets/2026-11-22/x.png`\n"
        "### REQ-REPORTS-001: A\nSource: `../ui/assets/2026-11-220/index.html`\n"
        "### REQ-REPORTS-003: C\nSource: `../ui/assets/2026-11-22x`\n"
        "## Notes\nSource: `../ui/assets/2026-11-22/index.html`\n"
        "### REQ-REPORTS-002: B\nSource: ../ui/assets/2026-11-22/index.html#reports, other\n",
    )
    write(
        project / "docs" / "specs" / "ui" / "spec.md",
        "### REQ-UI-129: A\nSource: `../ui/assets/2026-11-22/index.html#reports`\n"
        "### REQ-UI-130: B\nSource: `assets/2026-11-22/index.html`, `assets/2026-11-22/a.png`\n",
    )
    (found,) = list_mockups(project)
    assert found.requirements == ["REQ-REPORTS-002", "REQ-UI-129", "REQ-UI-130"]


# REQ-REQUIREMENTS-009: no HTML
def test_requirements_009_no_html(tmp_path: Path) -> None:
    write(asset(tmp_path, "ui", DAY) / "a.png")
    (found,) = list_mockups(tmp_path)
    assert found.html == [] and found.images == ["a.png"]


# REQ-REQUIREMENTS-009: neither HTML nor image
def test_requirements_009_nothing_to_show(tmp_path: Path) -> None:
    write(asset(tmp_path, "ui", DAY) / "data.json")
    assert list_mockups(tmp_path) == []


# REQ-REQUIREMENTS-009: a name that no response can encode does not break the list
def test_requirements_009_undecodable_name(project: Path) -> None:
    folder = project / "docs" / "specs" / "ui" / "assets" / DAY
    with open(os.fsencode(folder) + b"/bad\xff.html", "w") as handle:
        handle.write("x")
    (found,) = list_mockups(project)
    assert found.html == ["index.html"]


# REQ-REQUIREMENTS-010
@pytest.mark.parametrize(
    "path",
    [
        "../../spec.md",
        "../2026-11-22/index.html",
        "shots/../index.html",
        "/etc/passwd",
        "//host/share/x.html",
        "C:/x.html",
        "C:x.html",
        "..\\..\\x.html",
        "\\\\host\\share\\x.html",
        "a\0.html",
        "\udcff.html",
        "x" * 5000 + ".html",
        "link.html",
        "out/x.html",
        "loop.html",
        "note.md",
        "description.md",
        "run.sh",
        "shots",
        "",
        ".",
        "missing.html",
    ],
)
def test_requirements_010_outside(project: Path, path: str) -> None:
    assert mockup_file(project, "ui", DAY, path) is None


# REQ-REQUIREMENTS-010: a drive, stream or separator of Windows, even where such a file exists
@pytest.mark.skipif(os.name == "nt", reason="these names cannot exist on Windows")
@pytest.mark.parametrize("name", ["index.html:x.html", "a\\b.html", "C:x.html"])
def test_requirements_010_windows_characters(project: Path, name: str) -> None:
    write(project / "docs" / "specs" / "ui" / "assets" / DAY / name)
    assert mockup_file(project, "ui", DAY, name) is None
    assert list_mockups(project)[0].html == ["index.html"]


# REQ-REQUIREMENTS-010: a file above the limit is neither listed nor served
def test_requirements_010_too_large(project: Path) -> None:
    folder = project / "docs" / "specs" / "ui" / "assets" / DAY
    os.truncate(write(folder / "big.html"), LIMIT + 1)
    os.truncate(write(folder / "full.html"), LIMIT)
    refused = mockup_file(project, "ui", DAY, "big.html") is None  # not asserted in place:
    assert refused  # pytest would print the content
    full = mockup_file(project, "ui", DAY, "full.html")
    size = len(full[0]) if full is not None else 0
    assert size == LIMIT
    assert list_mockups(project)[0].html == ["full.html", "index.html"]


# REQ-REQUIREMENTS-010: a file that grows after the size check is read no further than the limit
def test_requirements_010_grows(project: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    asked: list[int] = []
    real = Path.open

    def grow(path: Path, *args: Any, **kwargs: Any) -> Any:
        if path.name != "index.html":
            return real(path, *args, **kwargs)
        os.truncate(path, LIMIT + 10)
        handle = real(path, *args, **kwargs)
        read = handle.read

        class Spy:
            def __enter__(self) -> "Spy":
                return self

            def __exit__(self, *_: object) -> None:
                handle.close()

            def read(self, size: int = -1) -> Any:
                asked.append(size)
                return read(size)

        return Spy()

    monkeypatch.setattr(Path, "open", grow)
    refused = mockup_file(project, "ui", DAY, "index.html") is None
    assert refused
    assert asked == [LIMIT + 1]


# REQ-REQUIREMENTS-008, REQ-REQUIREMENTS-010: Markdown above the limit is unreadable
def test_requirements_010_large_markdown(project: Path) -> None:
    folder = change(project, "open")
    os.truncate(write(folder / "03-design.md"), LIMIT + 1)
    found = read_change(project, "open")
    design = found.files["design"][:100] if found is not None else ""
    assert design == "This file could not be read."
    description = project / "docs" / "specs" / "ui" / "assets" / DAY / "description.md"
    os.truncate(description, LIMIT + 1)
    dates = [m.date for m in list_mockups(project)]
    assert dates == []


# REQ-REQUIREMENTS-009: a long line does not hold up the check
@pytest.mark.parametrize(
    "label", ["Confirmed:", "Confirmed: no", "Confirmed by:", "Epic:", "# ", "Source:", "### REQ-"]
)
def test_requirements_009_long_line(project: Path, label: str) -> None:
    line = f"{label}{' ' * 200_000}x"  # a value, spaces and text made the old pattern quadratic
    folder = project / "docs" / "specs" / "ui" / "assets" / DAY
    write(folder / "description.md", f"{line}\n{DESCRIPTION}")
    write(project / "docs" / "specs" / "ui" / "spec.md", f"### REQ-UI-001: A\n{line}\n")
    write(change(project, "open") / "01-proposal.md", f"{line}\n")
    started = time.monotonic()
    list_mockups(project)
    list_changes(project)
    assert time.monotonic() - started < 2


# REQ-REQUIREMENTS-009: space around the confirmation date
def test_requirements_009_confirmed_spaces(project: Path) -> None:
    folder = project / "docs" / "specs" / "ui" / "assets" / DAY
    (folder / "description.md").write_bytes(b"a\r\nConfirmed:\t 2026-11-22 \t\r\n")
    assert list_mockups(project)[0].confirmed == DAY


# REQ-REQUIREMENTS-007, REQ-REQUIREMENTS-009: a byte order mark hides neither title nor confirmation
def test_requirements_009_byte_order_mark(project: Path) -> None:
    write(change(project, "open") / "01-proposal.md", "\ufeff# Marked\n")
    folder = project / "docs" / "specs" / "ui" / "assets" / DAY
    write(folder / "description.md", f"\ufeffConfirmed: {DAY}\n")
    assert list_changes(project)[0].title == "Marked"
    assert list_mockups(project)[0].description == f"Confirmed: {DAY}\n"


# REQ-REQUIREMENTS-010: the extensions that are served
def test_requirements_010_extensions(project: Path) -> None:
    folder = project / "docs" / "specs" / "ui" / "assets" / DAY
    for ext in "html css js json png jpg jpeg gif svg webp woff2".split():
        write(folder / f"f.{ext}", ext)
        found = mockup_file(project, "ui", DAY, f"f.{ext}")
        assert found is not None and found[0] == ext.encode()
    assert mockup_file(project, "ui", DAY, "shots/a.PNG") == (b"x", "image/png")


# REQ-REQUIREMENTS-010: capability and date are plain names
@pytest.mark.parametrize(
    ("capability", "day"),
    [
        ("..", DAY),
        ("ui/../ui", DAY),
        ("ui\0", DAY),
        ("", DAY),
        (".", DAY),
        ("ui", ".."),
        ("ui", "mockup"),
        ("ui", DAY + "\n"),
        ("ui", DAY + "/shots"),
        ("ui", "２０２６-11-22"),
        ("nope", DAY),
    ],
)
def test_requirements_010_folder_names(project: Path, capability: str, day: str) -> None:
    assert mockup_file(project, capability, day, "index.html") is None


# REQ-REQUIREMENTS-010: no part of the way to an asset folder may be a link
@pytest.mark.parametrize("part", ["docs", "docs/specs", "ui", "assets", "day"])
def test_requirements_010_linked_folder(tmp_path: Path, part: str) -> None:
    write(asset(tmp_path / "real", "ui", DAY) / "index.html")
    tail = {
        "docs": "docs",
        "docs/specs": "docs/specs",
        "ui": "docs/specs/ui",
        "assets": "docs/specs/ui/assets",
        "day": f"docs/specs/ui/assets/{DAY}",
    }[part]
    link = tmp_path / "proj" / tail
    link.parent.mkdir(parents=True)
    link.symlink_to(tmp_path / "real" / tail)
    assert mockup_file(tmp_path / "proj", "ui", DAY, "index.html") is None
    assert list_mockups(tmp_path / "proj") == []


# REQ-REQUIREMENTS-010: a confirmed-looking date that links to another folder of the project
def test_requirements_010_link_between_folders(project: Path) -> None:
    other = asset(project, "ui", "2026-11-01", "Confirmed: no")
    write(other / "draft.html")
    confirmed = project / "docs" / "specs" / "ui" / "assets" / DAY
    (confirmed / "draft.html").symlink_to(other / "draft.html")
    (confirmed / "drafts").symlink_to(other)
    other.with_name("2026-11-02").symlink_to(other)
    (other / "description.md").unlink()
    (other / "description.md").symlink_to(confirmed / "description.md")
    for day, path in [
        (DAY, "draft.html"),
        (DAY, "drafts/draft.html"),
        ("2026-11-02", "draft.html"),
        ("2026-11-01", "draft.html"),
    ]:
        assert mockup_file(project, "ui", day, path) is None
    assert [(m.date, m.html) for m in list_mockups(project)] == [(DAY, ["index.html"])]


# REQ-REQUIREMENTS-010: an unreadable or special file, or folder
def test_requirements_010_unreadable(project: Path) -> None:
    folder = project / "docs" / "specs" / "ui" / "assets" / DAY
    write(folder / "shut.html").chmod(0)
    os.mkfifo(folder / "pipe.html")
    write(folder / "closed" / "x.html")
    (folder / "closed").chmod(0)
    try:
        for path in ("shut.html", "pipe.html", "closed/x.html"):
            assert mockup_file(project, "ui", DAY, path) is None
        assert list_mockups(project)[0].html == ["index.html"]
        folder.chmod(0)
        assert mockup_file(project, "ui", DAY, "index.html") is None
        assert list_mockups(project) == []
    finally:
        folder.chmod(0o755)
        (folder / "closed").chmod(0o755)


# REQ-REQUIREMENTS-010: a description that cannot be read confirms nothing
def test_requirements_010_unreadable_description(project: Path) -> None:
    folder = project / "docs" / "specs" / "ui" / "assets" / DAY
    (folder / "description.md").chmod(0)
    assert mockup_file(project, "ui", DAY, "index.html") is None
    assert list_mockups(project) == []


# REQ-REQUIREMENTS-010: a linked tree is neither walked nor listed
def test_requirements_010_linked_tree(project: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[str] = []
    real = os.scandir

    def spy(path: Any) -> Any:
        seen.append(str(path))
        return real(path)

    monkeypatch.setattr(os, "scandir", spy)
    list_mockups(project)
    assert any(s.endswith("shots") for s in seen)
    assert not [s for s in seen if s.endswith(("out", "again")) or "outside" in s]


# REQ-REQUIREMENTS-010: a spec file that is a link is not read
def test_requirements_010_linked_spec(project: Path, tmp_path: Path) -> None:
    text = "### REQ-UI-001: A\nSource: `assets/2026-11-22/index.html`\n"
    spec = project / "docs" / "specs" / "ui" / "spec.md"
    spec.unlink()
    spec.symlink_to(write(tmp_path / "other.md", text))
    assert list_mockups(project)[0].requirements == []


# REQ-REQUIREMENTS-010: change files stay in their own folder
def test_requirements_010_change_links(tmp_path: Path) -> None:
    root = tmp_path / "proj"
    secret = write(tmp_path / "secret.md", "# secret")
    folder = change(root, "open")
    (folder / "02-spec-delta.md").symlink_to(secret)
    (folder / "03-design.md").symlink_to(change(root, "other") / "01-proposal.md")
    (folder / "05-tests.md").symlink_to(folder / "05-tests.md")
    write(folder / "plan.md" / "x")
    found = read_change(root, "open")
    assert found is not None and list(found.files) == ["proposal"]


# REQ-REQUIREMENTS-010: no part of the way to a change folder may be a link
@pytest.mark.parametrize("part", ["docs", "docs/changes", "docs/changes/open"])
def test_requirements_010_linked_changes(tmp_path: Path, part: str) -> None:
    change(tmp_path / "real", "open")
    link = tmp_path / "proj" / part
    link.parent.mkdir(parents=True)
    link.symlink_to(tmp_path / "real" / part)
    assert list_changes(tmp_path / "proj") == []
    assert read_change(tmp_path / "proj", "open") is None


# REQ-REQUIREMENTS-010: a linked archive, and links between change folders
def test_requirements_010_linked_archive(tmp_path: Path) -> None:
    change(tmp_path / "real", "2026-11-01-new")
    root = tmp_path / "proj"
    folder = change(root, "open")
    (folder.parent / "archive").symlink_to(tmp_path / "real" / "docs" / "changes")
    (folder.parent / "copy").symlink_to(folder)
    (folder.parent / "self").symlink_to(folder.parent / "self")
    assert [r.folder for r in list_changes(root)] == ["open"]
    assert read_change(root, "2026-11-01-new") is None


# REQ-REQUIREMENTS-010: a project reached through a link still works
def test_requirements_010_linked_project(project: Path, tmp_path: Path) -> None:
    change(project, "open")
    link = tmp_path / "linked"
    link.symlink_to(project)
    assert len(list_mockups(link)) == 1 and len(list_changes(link)) == 1
    assert mockup_file(link, "ui", DAY, "index.html") is not None

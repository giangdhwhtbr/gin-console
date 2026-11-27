"""The images a bead names (REQ-BEADS-026) and whether each may be served (REQ-BEADS-027)."""

import gc
import math
import os
import sys
import threading
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

from gin_console.beads import images as images_module
from gin_console.beads.images import (
    MAX_BYTES,
    MAX_IMAGES,
    ImageIndex,
    ImageRef,
    bead_refs,
    check,
    find_images,
    image_refs,
    locate,
    media_type,
    read_image,
)
from gin_console.beads.snapshot import build_snapshot
from gin_console.config import ProjectEntry

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 100
JPEG = b"\xff\xd8\xff\xe0" + b"0" * 100
GIF = b"GIF89a" + b"0" * 100
WEBP = b"RIFF\x10\x00\x00\x00WEBPVP8 " + b"0" * 100
SVG = b'<svg xmlns="http://www.w3.org/2000/svg"></svg>'
needs_symlinks = pytest.mark.skipif(sys.platform == "win32", reason="symlinks need privileges")


def put(path: Path, content: bytes = PNG) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


def paths(refs: list[ImageRef]) -> list[str]:
    return [ref.path for ref in refs]


def available(written: str, entry: ProjectEntry, home: Path) -> bool:
    file = locate(written, entry.path, home)
    return file is not None and check(file, [entry.path, *entry.evidence_roots]) is not None


# REQ-BEADS-026 (gin-qa evidence)
def test_beads_026_gin_qa_evidence_caption_from_the_line_above() -> None:
    text = (
        "## Evidence\n"
        "- ![TC-UI-115 step 1: Open the list](attachment:ab12)\n"
        "  local: qa/evidence/r1/tc-ui-115/01.png\n"
    )
    assert bead_refs(text, None) == [
        ImageRef("qa/evidence/r1/tc-ui-115/01.png", "TC-UI-115 step 1: Open the list")
    ]


# REQ-BEADS-026 (File link and absolute path line)
def test_beads_026_file_link_and_absolute_path_line() -> None:
    text = (
        "[BUG-005_1.png](file:///home/gin/att/BUG-005_1.png)\n"
        "Absolute Path: `/home/gin/att/BUG-005_1.png`\n"
    )
    assert bead_refs(text, None) == [ImageRef("/home/gin/att/BUG-005_1.png", "BUG-005_1.png")]


# REQ-BEADS-026 (Forms and order)
def test_beads_026_forms_and_order() -> None:
    description = (
        "![Before](shots/a.png)\nthen see ~/brain/b.JPG and also https://example.com/c.png\n"
    )
    notes = "again shots/a.png\nand d.webp"
    assert bead_refs(description, notes) == [
        ImageRef("shots/a.png", "Before"),
        ImageRef("~/brain/b.JPG", "b.JPG"),
        ImageRef("d.webp", "d.webp"),
    ]
    raw = {"id": "t-1", "description": description, "notes": notes}
    found = find_images(raw, ProjectEntry(name="p", path=Path("/p")), Path("/home"))
    assert [(i.n, i.path) for i in found] == [
        (1, "shots/a.png"),
        (2, "~/brain/b.JPG"),
        (3, "d.webp"),
    ]


# REQ-BEADS-026 (Limit)
def test_beads_026_at_most_fifty() -> None:
    text = "\n".join(f"shots/{n}.png" for n in range(60))
    refs = bead_refs(text, None)
    assert MAX_IMAGES == 50
    assert paths(refs) == [f"shots/{n}.png" for n in range(50)]


# REQ-BEADS-026: every extension in any case, other suffixes and schemes dropped
def test_beads_026_extensions_and_schemes() -> None:
    text = (
        "a.png b.JPG c.jpeg d.Gif e.WEBP f.svg g.png.txt h.pngx "
        "http://x/i.png attachment:j.png mailto:k.png data:l.png"
    )
    assert paths(image_refs(text)) == ["a.png", "b.JPG", "c.jpeg", "d.Gif", "e.WEBP"]


# REQ-BEADS-026: file:// is dropped and the rest percent-decoded
def test_beads_026_file_url_is_percent_decoded() -> None:
    text = "![shot](file:///home/gin/my%20shots/a.png) and file:///tmp/b%2Bc.png"
    assert image_refs(text) == [
        ImageRef("/home/gin/my shots/a.png", "shot"),
        ImageRef("/tmp/b+c.png", "b+c.png"),
    ]


# REQ-BEADS-026: Markdown image and link forms, titles and angle brackets
def test_beads_026_markdown_forms() -> None:
    text = '![one](a.png "a title") [two](<my dir/b.png>) [x.png here](c.png) ![](d.png)\n'
    assert image_refs(text) == [
        ImageRef("a.png", "one"),
        ImageRef("my dir/b.png", "two"),
        ImageRef("c.png", "x.png here"),
        ImageRef("d.png", "d.png"),
    ]


# REQ-BEADS-026: a local: line whose line above holds no image takes its file name
def test_beads_026_local_line_without_image_above() -> None:
    text = "Steps\n\tlocal: qa/r1/02.png\n"
    assert image_refs(text) == [ImageRef("qa/r1/02.png", "02.png")]


# REQ-BEADS-026: a path met again is kept once, with the caption of a Markdown image that
# names it, from the description before the notes
def test_beads_026_duplicates_kept_once() -> None:
    refs = bead_refs("a.png then ![Later](a.png)", "![Notes](a.png) b.png a.png")
    assert refs == [ImageRef("a.png", "Later"), ImageRef("b.png", "b.png")]


# REQ-BEADS-026: notes alone, and a bead with neither text
def test_beads_026_notes_alone_and_nothing() -> None:
    assert bead_refs(None, "x.gif") == [ImageRef("x.gif", "x.gif")]
    assert bead_refs(None, None) == []
    assert bead_refs("", "no images here") == []


# REQ-BEADS-026: ~/ from the given home, relative from the project, absolute as is
def test_beads_026_locate_home_relative_and_absolute(tmp_path: Path) -> None:
    project, home = tmp_path / "p", tmp_path / "home"
    assert locate("~/brain/b.JPG", project, home) == home / "brain" / "b.JPG"
    assert locate("shots/a.png", project, home) == project / "shots" / "a.png"
    absolute = tmp_path / "abs" / "c.png"
    assert locate(absolute.as_posix(), project, home) == absolute


# REQ-BEADS-027: the text rules refuse before touching the disk
@pytest.mark.parametrize(
    "written",
    [
        "../alpha/a.png",
        "shots/../a.png",
        "C:\\shots\\a.png",
        "shots\\a.png",
        "\\\\host\\share\\a.png",
        "//host/share/a.png",
        "shots//a.png",
        "a\0.png",
        "shots/a:b.png",
        "/C:/shots/a.png",
        "C:a.png",
    ],
)
def test_beads_027_refused_text(tmp_path: Path, written: str) -> None:
    assert locate(written, tmp_path, tmp_path) is None


# REQ-BEADS-027: a Windows drive is allowed only where it makes an absolute path
def test_beads_027_windows_drive(tmp_path: Path) -> None:
    found = locate("C:/shots/a.png", tmp_path, tmp_path)
    if sys.platform == "win32":
        assert found == Path("C:/shots/a.png")
    else:
        assert found is None


# REQ-BEADS-027 (Inside the project)
def test_beads_027_inside_the_project(tmp_path: Path) -> None:
    alpha = ProjectEntry(name="alpha", path=tmp_path / "alpha")
    put(alpha.path / "qa/evidence/r1/01.png", PNG + b"0" * 200_000)
    assert available("qa/evidence/r1/01.png", alpha, tmp_path)


# REQ-BEADS-027 (Listed folder), REQ-CONFIG-008 (Listed folders)
def test_beads_027_listed_folder_only_for_its_project(tmp_path: Path) -> None:
    att = tmp_path / "srv" / "att"
    put(att / "BUG-5.jpg", JPEG)
    q = ProjectEntry(name="q", path=tmp_path / "q", evidence_roots=[att])
    alpha = ProjectEntry(name="alpha", path=tmp_path / "alpha")
    q.path.mkdir()
    alpha.path.mkdir()
    written = (att / "BUG-5.jpg").as_posix()
    assert available(written, q, tmp_path)
    assert not available(written, alpha, tmp_path)


# REQ-BEADS-027 (Refused paths)
@needs_symlinks
def test_beads_027_refused_paths(tmp_path: Path) -> None:
    alpha = ProjectEntry(name="alpha", path=tmp_path / "p" / "alpha")
    put(alpha.path / "qa/evidence/r1/01.png")
    outside = put(tmp_path / "x.png")
    (alpha.path / "link.png").symlink_to(outside)
    (alpha.path / "shots").symlink_to(alpha.path / "qa" / "evidence")
    written = [outside.as_posix(), "link.png", "../alpha/qa/evidence/r1/01.png", "shots/r1/01.png"]
    assert [w for w in written if available(w, alpha, tmp_path)] == ["shots/r1/01.png"]


# REQ-BEADS-027: each folder is taken with its own symlinks resolved
@needs_symlinks
def test_beads_027_folders_through_symlinks(tmp_path: Path) -> None:
    real = tmp_path / "real"
    put(real / "proj" / "a.png")
    put(tmp_path / "att-real" / "b.png")
    (tmp_path / "proj").symlink_to(real / "proj")
    (tmp_path / "att").symlink_to(tmp_path / "att-real")
    entry = ProjectEntry(name="p", path=tmp_path / "proj", evidence_roots=[tmp_path / "att"])
    assert available("a.png", entry, tmp_path)
    assert available((tmp_path / "att" / "b.png").as_posix(), entry, tmp_path)
    assert available((tmp_path / "att-real" / "b.png").as_posix(), entry, tmp_path)


# REQ-BEADS-027: a symlink in a listed folder that leads out of every folder is refused
@needs_symlinks
def test_beads_027_symlink_out_of_a_listed_folder(tmp_path: Path) -> None:
    att = tmp_path / "att"
    att.mkdir()
    (att / "out.png").symlink_to(put(tmp_path / "elsewhere" / "out.png"))
    entry = ProjectEntry(name="p", path=tmp_path / "proj", evidence_roots=[att])
    entry.path.mkdir()
    assert not available((att / "out.png").as_posix(), entry, tmp_path)


# REQ-BEADS-027 (Not an image)
def test_beads_027_not_an_image(tmp_path: Path) -> None:
    alpha = ProjectEntry(name="alpha", path=tmp_path / "alpha")
    put(alpha.path / "fake.png", b"just some text, not a picture")
    put(alpha.path / "logo.png", SVG)
    with put(alpha.path / "big.png").open("r+b") as handle:
        handle.truncate(11 * 1024 * 1024)
    for name in ("fake.png", "logo.png", "big.png", "gone.png"):
        assert not available(name, alpha, tmp_path), name


# REQ-BEADS-027: at most 10 MB, each kind of image by its first bytes
def test_beads_027_size_limit_and_kinds(tmp_path: Path) -> None:
    alpha = ProjectEntry(name="alpha", path=tmp_path / "alpha")
    with put(alpha.path / "edge.png").open("r+b") as handle:
        handle.truncate(MAX_BYTES)
    with put(alpha.path / "over.png").open("r+b") as handle:
        handle.truncate(MAX_BYTES + 1)
    put(alpha.path / "g.gif", GIF)
    put(alpha.path / "w.webp", WEBP)
    put(alpha.path / "j.jpg", JPEG)
    folders = [alpha.path]
    assert check(alpha.path / "edge.png", folders) == "image/png"
    assert check(alpha.path / "over.png", folders) is None
    assert check(alpha.path / "g.gif", folders) == "image/gif"
    assert check(alpha.path / "w.webp", folders) == "image/webp"
    assert check(alpha.path / "j.jpg", folders) == "image/jpeg"


# REQ-BEADS-027: the type comes from the bytes, never from the name; SVG never
def test_beads_027_media_type_from_first_bytes() -> None:
    assert media_type(PNG) == "image/png"
    assert media_type(JPEG) == "image/jpeg"
    assert media_type(GIF) == "image/gif"
    assert media_type(b"GIF87a") == "image/gif"
    assert media_type(WEBP) == "image/webp"
    assert media_type(b"RIFF\x10\x00\x00\x00WAVE") is None
    assert media_type(SVG) is None
    assert media_type(b"") is None


# REQ-BEADS-027: a folder, a missing folder of evidence_roots, and an unreadable path
def test_beads_027_folder_and_missing_root(tmp_path: Path) -> None:
    alpha = ProjectEntry(
        name="alpha", path=tmp_path / "alpha", evidence_roots=[tmp_path / "no-such-folder"]
    )
    (alpha.path / "dir.png").mkdir(parents=True)
    assert not available("dir.png", alpha, tmp_path)
    assert check(tmp_path / "no-such-folder" / "a.png", alpha.evidence_roots) is None


# REQ-BEADS-027: a project folder that does not exist serves nothing
def test_beads_027_missing_project_folder(tmp_path: Path) -> None:
    put(tmp_path / "a.png")
    assert check(tmp_path / "a.png", [tmp_path / "gone"]) is None


# REQ-BEADS-026, REQ-BEADS-027: the images of one bead, numbered, each marked available
def test_beads_026_027_find_images(tmp_path: Path) -> None:
    alpha = ProjectEntry(name="alpha", path=tmp_path / "alpha")
    put(alpha.path / "qa/evidence/r1/01.png")
    outside = put(tmp_path / "x.png")
    raw = {"id": "b-1", "description": f"qa/evidence/r1/01.png\n{outside.as_posix()}", "notes": 3}
    found = find_images(raw, alpha, tmp_path)
    assert [(i.n, i.path, i.caption, i.available) for i in found] == [
        (1, "qa/evidence/r1/01.png", "01.png", True),
        (2, outside.as_posix(), "x.png", False),
    ]
    assert found[0].file == alpha.path / "qa/evidence/r1/01.png"
    assert find_images({"id": "b-2", "description": "..\\x.png"}, alpha, tmp_path)[0].file is None


# REQ-BEADS-001 (worked out once per export snapshot): the same snapshot object reuses the
# result, a new one checks the files again
def test_beads_026_index_once_per_snapshot(tmp_path: Path) -> None:
    alpha = ProjectEntry(name="alpha", path=tmp_path / "alpha")
    shot = put(alpha.path / "a.png")
    rows = [{"id": "b-1", "description": "a.png"}, {"id": "b-2", "description": "none"}]
    snapshot = build_snapshot(rows)
    index = ImageIndex(tmp_path)
    first = index.of(alpha, snapshot)
    assert list(first) == ["b-1"] and first["b-1"][0].available
    shot.unlink()
    assert index.of(alpha, snapshot) is first
    again = index.of(alpha, build_snapshot(rows))
    assert again is not first and not again["b-1"][0].available


# REQ-BEADS-028: read checks the file again and returns its bytes and type
def test_beads_028_read_checks_again(tmp_path: Path) -> None:
    alpha = ProjectEntry(name="alpha", path=tmp_path / "alpha")
    shot = put(alpha.path / "a.png")
    snapshot = build_snapshot([{"id": "b-1", "description": "a.png ../b.png"}])
    index = ImageIndex(tmp_path)
    assert index.read(alpha, snapshot, "b-1", 1) == (PNG, "image/png")
    assert index.read(alpha, snapshot, "b-1", 2) is None
    assert index.read(alpha, snapshot, "b-1", 0) is None
    assert index.read(alpha, snapshot, "b-1", 3) is None
    assert index.read(alpha, snapshot, "b-9", 1) is None
    shot.write_bytes(SVG)
    assert index.read(alpha, snapshot, "b-1", 1) is None
    shot.unlink()
    assert index.read(alpha, snapshot, "b-1", 1) is None


# REQ-BEADS-026: file://localhost is this host; another host names no image of the bead; a
# Windows drive after the slash is a drive path
def test_beads_026_file_url_hosts_and_drives() -> None:
    text = (
        "file://localhost/x/y.png file://LOCALHOST/x/z.png file://server/share/a.png "
        "[b](file://other/b.png) file:///C:/shots/c.png file:///c%3A/shots/d.png file://localhost"
    )
    assert paths(image_refs(text)) == ["/x/y.png", "/x/z.png", "C:/shots/c.png", "c:/shots/d.png"]


SIZE = 16_384  # characters; the work for twice as many must not grow much more than twice
# bead text of about `n` characters, shaped to make a backtracking or pairwise parser slow
SHAPES: dict[str, Callable[[int], str]] = {
    "local": lambda n: "local:" + " " * n + "x",
    "local-inner": lambda n: "local: a" + " " * n + "b",
    "local-trailing": lambda n: "local: a" + " " * n,
    "local-image": lambda n: "local:" + " " * n + "a.png",
    "local-lines": lambda n: "\n".join(["local:" + " " * 64] * (n // 70)),
    "many-local": lambda n: "local:\n" * (n // 7),
    "many-local-images": lambda n: "![a](b)\nlocal: c.png\n" * (n // 21),
    "link": lambda n: "[a](b" + " " * n,
    "image": lambda n: "![a](b" + " " * n + "x",
    "title": lambda n: '[a](b "' + " " * n,
    "text": lambda n: "[" + "a" * n,
    "spans": lambda n: "[a](b) x.png " * (n // 13),
    "pairs": lambda n: " ".join(f"[{k}](u{k}.png) v{k}.png" for k in range(n // 20)),
}


def best_time(text: str, repeats: int) -> float:
    """The fastest of three timings of `repeats` parses: the least disturbed by other work."""
    timings: list[float] = []
    for _ in range(3):
        started = time.perf_counter()
        for _ in range(repeats):
            image_refs(text)
        timings.append(time.perf_counter() - started)
    return min(timings)


# REQ-BEADS-026: bead text is untrusted, so finding its images stays linear: twice the text takes
# less than three times as long (a quadratic parser takes four)
@pytest.mark.parametrize("shape", list(SHAPES))
def test_beads_026_parsing_is_linear(shape: str) -> None:
    small, large = SHAPES[shape](SIZE), SHAPES[shape](2 * SIZE)
    started = time.perf_counter()
    image_refs(large)
    once = time.perf_counter() - started
    assert once < 3  # the old local: pattern took about 6 s on this text, and 25 s on 64 KB
    # each timing long enough (about 20 ms) for the clock and the scheduler not to matter
    repeats = max(1, math.ceil(0.02 / max(once / 2, 1e-6)))
    ratios: list[float] = []
    gc.disable()  # no collection inside one timing but not the other
    try:
        # up to three tries: a busy host can slow one timing, a quadratic parser slows them all
        while len(ratios) < 3 and min(ratios, default=4) >= 3:
            ratios.append(best_time(large, repeats) / best_time(small, repeats))
    finally:
        gc.enable()
    assert min(ratios) < 3, ratios


# REQ-BEADS-026: a local: line keeps its path without the spaces around it
def test_beads_026_local_line_trailing_spaces() -> None:
    assert paths(image_refs("local:   my shots/a.png \t ")) == ["my shots/a.png"]


# REQ-BEADS-027: a FIFO is no image, and checking it does not wait for a writer
@pytest.mark.skipif(sys.platform == "win32", reason="no FIFOs")
def test_beads_027_fifo_is_not_available(tmp_path: Path) -> None:
    alpha = ProjectEntry(name="alpha", path=tmp_path / "alpha")
    alpha.path.mkdir()
    os.mkfifo(alpha.path / "pipe.png")
    result: list[bool] = []
    worker = threading.Thread(target=lambda: result.append(available("pipe.png", alpha, tmp_path)))
    worker.start()
    worker.join(timeout=2)
    assert not worker.is_alive() and result == [False]


def swap_on_open(monkeypatch: pytest.MonkeyPatch, target: Path, swap: Any) -> None:
    """Run `swap` right before `target` is opened: the file changes between check and read."""
    real_open = os.open

    def opening(path: Any, flags: int, *args: Any, **kwargs: Any) -> int:
        if Path(path) == target.resolve():
            swap()
        return real_open(path, flags, *args, **kwargs)

    monkeypatch.setattr(os, "open", opening)


# REQ-BEADS-028: the bytes come from the file that was checked, not one put in its place
def test_beads_028_read_uses_the_checked_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    alpha = ProjectEntry(name="alpha", path=tmp_path / "alpha")
    shot = put(alpha.path / "a.png")
    other = put(alpha.path / "other.png", PNG + b"swapped")
    snapshot = build_snapshot([{"id": "b-1", "description": "a.png"}])
    index = ImageIndex(tmp_path)
    index.of(alpha, snapshot)
    swap_on_open(monkeypatch, shot, lambda: os.replace(other, shot))
    assert index.read(alpha, snapshot, "b-1", 1) is None


# REQ-BEADS-028: a link put in place of the checked file is not followed
@needs_symlinks
def test_beads_028_read_refuses_a_link_put_in_place(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    alpha = ProjectEntry(name="alpha", path=tmp_path / "alpha")
    shot = put(alpha.path / "a.png")
    outside = put(tmp_path / "secret.png", PNG + b"secret")

    def to_link() -> None:
        shot.unlink()
        shot.symlink_to(outside)

    swap_on_open(monkeypatch, shot, to_link)
    assert check(shot, [alpha.path]) is None


# REQ-BEADS-001 (once per export snapshot): concurrent requests for a new snapshot work it out
# once, and resolve the folders once for every bead
def test_beads_026_index_computes_once_under_concurrency(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    alpha = ProjectEntry(name="alpha", path=tmp_path / "alpha", evidence_roots=[tmp_path / "att"])
    put(alpha.path / "a.png")
    rows = [{"id": f"b-{n}", "description": "a.png b.png"} for n in range(5)]
    snapshot = build_snapshot(rows)
    real = images_module._real_folders
    calls: list[int] = []

    def slow(folders: Any) -> list[Path]:
        calls.append(1)
        time.sleep(0.2)
        return real(folders)

    monkeypatch.setattr(images_module, "_real_folders", slow)
    index = ImageIndex(tmp_path)
    found: list[object] = []
    workers = [
        threading.Thread(target=lambda: found.append(index.of(alpha, snapshot))) for _ in range(4)
    ]
    for worker in workers:
        worker.start()
    for worker in workers:
        worker.join()
    assert len(calls) == 1
    assert all(result is found[0] for result in found) and len(found) == 4


def swap_on_stat(monkeypatch: pytest.MonkeyPatch, target: Path, swap: Any) -> None:
    """Run `swap` once, right before `target` is first stat-ed after it was resolved."""
    real_stat = os.stat
    swapped: list[bool] = []

    def stating(path: Any, *args: Any, **kwargs: Any) -> os.stat_result:
        if not swapped and Path(path) == target:
            swapped.append(True)
            swap()
        return real_stat(path, *args, **kwargs)

    monkeypatch.setattr(os, "stat", stating)


# REQ-BEADS-027, REQ-BEADS-028: a folder on the way swapped for a link after the file was resolved
# leads the open file out of the allowed folders; it is refused, through /proc/self/fd where the
# system has it and by resolving the path again elsewhere
@needs_symlinks
@pytest.mark.parametrize("descriptors", ["proc", "none"])
def test_beads_028_folder_swapped_for_a_link_after_resolve(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, descriptors: str
) -> None:
    if descriptors == "none":
        monkeypatch.setattr(images_module, "_FD_PATHS", tmp_path / "no-proc")
    elif not Path("/proc/self/fd").is_dir():
        pytest.skip("no /proc/self/fd")
    alpha = ProjectEntry(name="alpha", path=tmp_path / "alpha")
    shot = put(alpha.path / "shots" / "a.png")
    put(tmp_path / "evil" / "a.png", PNG + b"outside")

    def to_link() -> None:
        (alpha.path / "shots").rename(alpha.path / "shots-old")
        (alpha.path / "shots").symlink_to(tmp_path / "evil")

    swap_on_stat(monkeypatch, shot.resolve(), to_link)
    assert check(shot, [alpha.path]) is None


# REQ-BEADS-027: the fallback without /proc/self/fd still serves an untouched file
def test_beads_027_available_without_proc(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(images_module, "_FD_PATHS", tmp_path / "no-proc")
    shot = put(tmp_path / "alpha" / "a.png")
    assert check(shot, [tmp_path / "alpha"]) == "image/png"


# REQ-BEADS-026: an address with a broken escape stays as written, as the browser keeps it
def test_beads_026_broken_escape_kept_as_written() -> None:
    text = "[x](a%20b%.png) ![y](c%2.png) [z](d%20e.png)"
    assert paths(image_refs(text)) == ["a%20b%.png", "c%2.png", "d e.png"]


# REQ-BEADS-028, REQ-QA-006: read_image returns the bytes and type of a file `check` accepts
def test_beads_028_read_image(tmp_path: Path) -> None:
    alpha = ProjectEntry(name="alpha", path=tmp_path / "alpha")
    shot = put(alpha.path / "a.png")
    with put(alpha.path / "edge.png").open("r+b") as handle:
        handle.truncate(MAX_BYTES)
    with put(alpha.path / "over.png").open("r+b") as handle:
        handle.truncate(MAX_BYTES + 1)
    outside = put(tmp_path / "out.png")
    folders = [alpha.path]
    assert read_image(shot, folders) == (PNG, "image/png")
    edge = read_image(alpha.path / "edge.png", folders)
    assert edge is not None and len(edge[0]) == MAX_BYTES and edge[1] == "image/png"
    assert read_image(alpha.path / "over.png", folders) is None
    assert read_image(outside, folders) is None
    assert read_image(outside, [alpha.path, tmp_path / "gone"]) is None
    assert read_image(alpha.path / "gone.png", folders) is None
    shot.write_bytes(SVG)
    assert read_image(shot, folders) is None

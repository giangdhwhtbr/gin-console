"""The images a bead names (REQ-BEADS-026) and whether each may be served (REQ-BEADS-027)."""

import sys
from pathlib import Path

import pytest

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

"""API cases of the Evidence images change: the evidence folders of the config (REQ-CONFIG-008)
and the images a bead names, their availability and their route (REQ-BEADS-001, 002, 026, 027,
028), over real export files and real image files in `tmp_path`."""

from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd
from fake_export import bead, write_export
from fastapi.testclient import TestClient

from gin_console.__main__ import main
from gin_console.app import create_app
from gin_console.beads.source import read_export
from gin_console.config import CONFIG_ENV, ProjectEntry, Settings, load_settings

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 100
JPEG = b"\xff\xd8\xff\xe0" + b"0" * 100
SHA = "ab" * 32
NOT_FOUND = b'{"error":"not found"}'
HEADERS = {
    "x-content-type-options": "nosniff",
    "content-security-policy": "sandbox; default-src 'none'",
    "content-disposition": "inline",
    "cache-control": "private, no-cache",
}


def put(path: Path, content: bytes = PNG) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


def serve(tmp_path: Path, projects: list[ProjectEntry]) -> TestClient:
    (tmp_path / "dist").mkdir(exist_ok=True)
    app = create_app(
        Settings(projects=projects),
        static_dir=tmp_path / "dist",
        read_beads=read_export,
        run_bd=FakeBd(),
    )
    return TestClient(app, raise_server_exceptions=False)


def detail_images(tmp_path: Path, row: dict[str, Any], **entry: Any) -> list[dict[str, Any]]:
    """The `images` of bead `row` of project `p`, whose folder is `tmp_path/p`."""
    write_export(tmp_path / "p", [row])
    api = serve(tmp_path, [ProjectEntry(name="p", path=tmp_path / "p", **entry)])
    images: list[dict[str, Any]] = api.get(f"/api/beads/p/{row['id']}").json()["images"]
    return images


def config(tmp_path: Path, text: str) -> Path:
    path = tmp_path / "config.yaml"
    path.write_text(text)
    return path


# REQ-CONFIG-008 (Listed folders)
# TC: TC-CONFIG-007@bb4c8f62
def test_tc_config_007_listed_folders(tmp_path: Path) -> None:
    folder = "/home/gin/infra/bug-sync-mcp/data/attachments"
    path = config(
        tmp_path,
        "projects:\n"
        f"  - {{name: qwikfone, path: /home/gin/qwikfone, evidence_roots: [{folder}]}}\n"
        "  - {name: scotty, path: /home/gin/scotty}\n",
    )
    qwikfone, scotty = load_settings(path).projects
    assert qwikfone.evidence_roots == [Path(folder)]
    assert scotty.evidence_roots == []
    # A listed folder that does not exist serves no image and does not stop the console.
    missing = (tmp_path / "no-such-folder").as_posix()
    other = config(tmp_path, f"projects:\n  - {{name: q, path: /q, evidence_roots: [{missing}]}}\n")
    assert load_settings(other).projects[0].evidence_roots == [Path(missing)]


# REQ-CONFIG-008 (Default)
# TC: TC-CONFIG-008@d7d79832
def test_tc_config_008_default_evidence_folder(tmp_path: Path) -> None:
    put(tmp_path / "a/qa/shot.png")
    write_export(tmp_path / "a", [bead("a-1", description="qa/shot.png")])
    path = config(tmp_path, f"projects:\n  - {{name: a, path: {(tmp_path / 'a').as_posix()}}}\n")
    entry = load_settings(path).projects[0]
    assert entry.evidence_roots == []
    api = serve(tmp_path, [entry])
    assert api.get("/api/beads/a/a-1").json()["images"][0]["available"] is True


# REQ-CONFIG-008 (Relative folder), REQ-CONFIG-003
# TC: TC-CONFIG-009@44f1824a
@pytest.mark.parametrize("value", ["[shots]", "[/abs, shots]", "/abs/shots", "{a: 1}"])
def test_tc_config_009_relative_evidence_folder(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
    value: str,
) -> None:
    path = config(tmp_path, f"projects:\n  - {{name: q, path: /q, evidence_roots: {value}}}\n")
    monkeypatch.setenv(CONFIG_ENV, str(path))
    assert main() == 1
    assert "projects.0.evidence_roots" in capsys.readouterr().err


# REQ-BEADS-026 (gin-qa evidence)
# TC: TC-BEADS-085@5e75b6a0
def test_tc_beads_085_gin_qa_evidence_section(tmp_path: Path) -> None:
    description = (
        "## Evidence\n"
        f"- ![TC-UI-115 step 1: Open the list](attachment:{SHA})\n"
        "  local: qa/evidence/r1/tc-ui-115/01.png\n"
    )
    images = detail_images(tmp_path, bead("b-1", issue_type="bug", description=description))
    assert [(i["n"], i["sha256"], i["path"], i["caption"]) for i in images] == [
        (1, SHA, "qa/evidence/r1/tc-ui-115/01.png", "TC-UI-115 step 1: Open the list")
    ]


# REQ-BEADS-026 (File link and absolute path line)
# TC: TC-BEADS-086@7a0df8ac
def test_tc_beads_086_file_link_and_absolute_path_line(tmp_path: Path) -> None:
    description = (
        "[BUG-005_1.png](file:///home/gin/att/BUG-005_1.png)\n"
        "Absolute Path: `/home/gin/att/BUG-005_1.png`\n"
    )
    images = detail_images(tmp_path, bead("b-1", issue_type="bug", description=description))
    assert [(i["path"], i["caption"]) for i in images] == [
        ("/home/gin/att/BUG-005_1.png", "BUG-005_1.png")
    ]


# REQ-BEADS-026 (Forms and order)
# TC: TC-BEADS-087@9a1ae275
def test_tc_beads_087_forms_and_order_of_images(tmp_path: Path) -> None:
    row = bead(
        "t-1",
        description="![Before](shots/a.png)\nsee ~/brain/b.JPG\nhttps://example.com/c.png\n",
        notes="shots/a.png\nd.webp\n",
    )
    images = detail_images(tmp_path, row)
    assert [(i["n"], i["path"]) for i in images] == [
        (1, "shots/a.png"),
        (2, "~/brain/b.JPG"),
        (3, "d.webp"),
    ]
    assert images[0]["caption"] == "Before"


# REQ-BEADS-026 (Limit)
# TC: TC-BEADS-088@3cc18306
def test_tc_beads_088_image_limit(tmp_path: Path) -> None:
    description = "\n".join(f"shots/{n:02d}.png" for n in range(60))
    images = detail_images(tmp_path, bead("b-1", description=description))
    assert [i["n"] for i in images] == list(range(1, 51))
    assert images[-1]["path"] == "shots/49.png"


# REQ-BEADS-027 (Inside the project)
# TC: TC-BEADS-089@5c33a5dd
def test_tc_beads_089_image_inside_the_project(tmp_path: Path) -> None:
    put(tmp_path / "p/qa/evidence/r1/01.png", PNG + b"0" * 200_000)
    images = detail_images(tmp_path, bead("a-1", description="qa/evidence/r1/01.png"))
    assert [(i["path"], i["available"]) for i in images] == [("qa/evidence/r1/01.png", True)]


# REQ-BEADS-027 (Listed folder)
# TC: TC-BEADS-090@29609cf6
def test_tc_beads_090_image_in_an_evidence_folder(tmp_path: Path) -> None:
    att = tmp_path / "att"
    shot = put(att / "BUG-5.jpg", JPEG).as_posix()
    write_export(tmp_path / "q", [bead("q-1", description=shot)])
    write_export(tmp_path / "alpha", [bead("a-2", description=shot)])
    api = serve(
        tmp_path,
        [
            ProjectEntry(name="q", path=tmp_path / "q", evidence_roots=[att]),
            ProjectEntry(name="alpha", path=tmp_path / "alpha"),
        ],
    )
    assert api.get("/api/beads/q/q-1").json()["images"][0]["available"] is True
    assert api.get("/api/beads/alpha/a-2").json()["images"][0]["available"] is False


# REQ-BEADS-027 (Refused paths)
# TC: TC-BEADS-091@4dc2fc65
def test_tc_beads_091_refused_image_paths(tmp_path: Path) -> None:
    root = tmp_path / "p"
    put(root / "qa/evidence/r1/01.png")
    outside = put(tmp_path / "outside/x.png")
    (root / "link.png").symlink_to(outside)
    (root / "shots").symlink_to(root / "qa/evidence")
    description = "\n".join(
        [outside.as_posix(), "link.png", "../p/qa/evidence/r1/01.png", "shots/r1/01.png"]
    )
    images = detail_images(tmp_path, bead("a-1", description=description))
    assert {i["path"]: i["available"] for i in images} == {
        outside.as_posix(): False,
        "link.png": False,
        "../p/qa/evidence/r1/01.png": False,
        "shots/r1/01.png": True,
    }


# REQ-BEADS-027 (Not an image)
# TC: TC-BEADS-092@403ad2fb
def test_tc_beads_092_files_that_are_not_images(tmp_path: Path) -> None:
    root = tmp_path / "p"
    put(root / "fake.png", b"just some text, no image here")
    put(root / "logo.png", b"<svg xmlns='http://www.w3.org/2000/svg'/>")
    put(root / "big.png", PNG + b"0" * (11 * 1024 * 1024))
    description = "fake.png\nlogo.png\nbig.png\ngone.png"
    images = detail_images(tmp_path, bead("a-1", description=description))
    assert len(images) == 4
    assert [i["available"] for i in images] == [False] * 4


def alpha(tmp_path: Path) -> TestClient:
    """Project `alpha` whose `a-1` names an available PNG and a file outside the project."""
    put(tmp_path / "alpha/qa/evidence/r1/01.png")
    outside = put(tmp_path / "x.png")
    write_export(
        tmp_path / "alpha",
        [bead("a-1", description=f"qa/evidence/r1/01.png\n{outside.as_posix()}")],
    )
    return serve(tmp_path, [ProjectEntry(name="alpha", path=tmp_path / "alpha")])


# REQ-BEADS-028 (Served)
# TC: TC-BEADS-093@529b2a2b
def test_tc_beads_093_image_served(tmp_path: Path) -> None:
    response = alpha(tmp_path).get("/api/beads/alpha/a-1/images/1")
    assert response.status_code == 200
    assert response.content == PNG
    assert response.headers["content-type"] == "image/png"
    assert {k: response.headers[k] for k in HEADERS} == HEADERS


# REQ-BEADS-028 (Not served)
# TC: TC-BEADS-094@d39f7cc4
def test_tc_beads_094_image_not_served(tmp_path: Path) -> None:
    api = alpha(tmp_path)
    bodies = set()
    for url in (
        "/api/beads/alpha/a-1/images/2",
        "/api/beads/alpha/a-1/images/3",
        "/api/beads/alpha/a-1/images/0",
        "/api/beads/alpha/a-9/images/1",
        "/api/beads/nope/a-1/images/1",
    ):
        response = api.get(url)
        assert response.status_code == 404, url
        bodies.add(response.content)
    assert bodies == {NOT_FOUND}


# REQ-BEADS-028 (Removed after the snapshot)
# TC: TC-BEADS-095@7cca2233
def test_tc_beads_095_image_removed_after_the_snapshot(tmp_path: Path) -> None:
    api = alpha(tmp_path)
    assert api.get("/api/beads/alpha/a-1/images/1").status_code == 200
    (tmp_path / "alpha/qa/evidence/r1/01.png").unlink()
    response = api.get("/api/beads/alpha/a-1/images/1")
    assert response.status_code == 404
    assert response.content == NOT_FOUND


# REQ-BEADS-001 (Image count)
# TC: TC-BEADS-096@c2f37c03
def test_tc_beads_096_image_count_of_the_list(tmp_path: Path) -> None:
    put(tmp_path / "p/a.png")
    put(tmp_path / "p/b.png")
    write_export(
        tmp_path / "p",
        [bead("b-1", issue_type="bug", description="a.png\nb.png\nc.png"), bead("t-1")],
    )
    api = serve(tmp_path, [ProjectEntry(name="p", path=tmp_path / "p")])
    rows = {b["id"]: b for b in api.get("/api/beads", params={"project": "p"}).json()}
    assert rows["b-1"]["image_count"] == 2
    assert rows["t-1"]["image_count"] == 0


# REQ-BEADS-002 (Images)
# TC: TC-BEADS-097@3415cc1e
def test_tc_beads_097_images_of_the_detail(tmp_path: Path) -> None:
    put(tmp_path / "p/qa/evidence/r1/01.png")
    description = "qa/evidence/r1/01.png\n/tmp/x.png"
    images = detail_images(tmp_path, bead("b-1", issue_type="bug", description=description))
    assert images == [
        {
            "n": 1,
            "path": "qa/evidence/r1/01.png",
            "sha256": None,
            "caption": "01.png",
            "available": True,
            "served_as": "file",
            "reason": None,
        },
        {
            "n": 2,
            "path": "/tmp/x.png",
            "sha256": None,
            "caption": "x.png",
            "available": False,
            "served_as": None,
            "reason": None,
        },
    ]

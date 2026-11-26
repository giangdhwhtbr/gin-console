"""The images a bead names and whether this host may serve them (REQ-BEADS-026 to REQ-BEADS-028):
the only module that decides what an image of a bead is and reads one.

The browser never sends a path: it asks for image `n` of a bead, and the file is found again here.
"""

import os
import re
import stat
import threading
from bisect import bisect_left
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import unquote

from gin_console.beads.snapshot import Snapshot
from gin_console.config import ProjectEntry

MAX_IMAGES = 50  # of one bead
MAX_BYTES = 10 * 1024 * 1024  # of one file, held in memory
# what pathlib raises for a path the system refuses: OSError for an unreadable folder or a name that
# is too long, ValueError for a NUL byte or an undecodable name, RuntimeError for a link loop
_REFUSED = (OSError, ValueError, RuntimeError)
_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".webp")
# `![alt](address "title")` and `[text](<address>)`, on one line
_MARKDOWN = re.compile(
    r"(!?)\[([^\[\]\n]*)\]\([ \t]*(?:<([^<>\n]*)>|([^\s()<>]+))"
    r"(?:[ \t]+(?:\"[^\"\n]*\"|'[^'\n]*'|\([^()\n]*\)))?[ \t]*\)"
)
# no lazy group before an optional run: that is quadratic on a long run of spaces
_LOCAL = re.compile(r"^[ \t]*local:[ \t]*([^\n]*)$", re.M)
_TOKEN = re.compile(r"[^\s`]+")  # a path standing alone between spaces, backticks or line ends
_SCHEME = re.compile(r"[A-Za-z][A-Za-z0-9+.-]*:")
_DRIVE = re.compile(r"[A-Za-z]:[/\\]")  # a Windows drive, not a scheme
_ABSOLUTE_DRIVE = re.compile(r"[A-Za-z]:/")
_FILE_URL = re.compile(r"file://([^/]*)(/.*)?", re.I | re.S)
_SLASH_DRIVE = re.compile(r"/[A-Za-z]:/")
# one open of the resolved file: never wait on a FIFO, never follow a link put in its place
_OPEN_FLAGS = (
    os.O_RDONLY
    | getattr(os, "O_NONBLOCK", 0)
    | getattr(os, "O_NOFOLLOW", 0)
    | getattr(os, "O_BINARY", 0)
)
_HEAD = 12  # the bytes `media_type` needs
_FD_PATHS = Path("/proc/self/fd")  # where Linux names the file behind each open descriptor
_BROKEN_ESCAPE = re.compile(r"%(?![0-9A-Fa-f]{2})")
_MARKDOWN_TEXT, _ALT_ABOVE, _NO_CAPTION = 0, 1, 2  # where a caption comes from, best first


@dataclass(frozen=True)
class ImageRef:
    path: str  # as written, without `file://`, percent-decoded
    caption: str


@dataclass(frozen=True)
class FoundImage:
    n: int
    path: str
    caption: str
    file: Path | None  # None when the text rules refuse the path
    available: bool


@dataclass(frozen=True)
class _Mention:
    at: int
    path: str
    caption: str
    source: int


def _decode(text: str) -> str:
    """Percent-decoded as the browser's `decodeURIComponent`: a text with a broken escape, or
    with bytes that are no UTF-8, stays as written."""
    if _BROKEN_ESCAPE.search(text):
        return text
    try:
        return unquote(text, errors="strict")
    except UnicodeDecodeError:
        return text


def _file_url(address: str) -> str | None:
    """The path of a `file://` URL of this host (no host or `localhost`), `/C:/…` as `C:/…`;
    None for another host."""
    url = _FILE_URL.fullmatch(address)
    if url is None or url[2] is None or url[1].lower() not in ("", "localhost"):
        return None
    path = _decode(url[2])
    return path[1:] if _SLASH_DRIVE.match(path) else path


def _path(address: str, url: bool) -> str | None:
    """The path an address names; None for another scheme or host, or a file that is no image. A
    Markdown address is a URL, so it is percent-decoded as the browser does."""
    if address[:7].lower() == "file://":
        found = _file_url(address)
        if found is None:
            return None
        path = found
    elif _SCHEME.match(address) and not _DRIVE.match(address):
        return None
    else:
        path = _decode(address) if url else address
    return path if path.lower().endswith(_EXTENSIONS) else None


def _alt_above(text: str, line_start: int) -> str:
    """The alt text of the first Markdown image on the line right above `line_start`."""
    if line_start == 0:
        return ""
    above = text[
        text.rfind("\n", 0, line_start - 1) + 1 : line_start - 1
    ]  # no copy of the text above
    image = next((m for m in _MARKDOWN.finditer(above) if m[1]), None)
    return image[2].strip() if image is not None else ""


def _mention(at: int, path: str | None, caption: str, source: int) -> list[_Mention]:
    if path is None:
        return []
    return [_Mention(at, path, caption, source if caption else _NO_CAPTION)]


def _mentions(text: str) -> list[_Mention]:
    """Every image path in `text`, in the order it appears; a path inside a Markdown address or a
    `local:` line is not read again as a path standing alone."""
    found: list[_Mention] = []
    taken: list[tuple[int, int]] = []
    for match in _MARKDOWN.finditer(text):
        taken.append(match.span())
        address = match[3] if match[3] is not None else match[4]
        found += _mention(match.start(), _path(address, url=True), match[2].strip(), _MARKDOWN_TEXT)
    for match in _LOCAL.finditer(text):
        taken.append(match.span(1))
        path = _path(match[1].rstrip(" \t"), url=False)
        if path is not None:
            found += _mention(match.start(1), path, _alt_above(text, match.start()), _ALT_ABOVE)
    taken.sort()
    starts = [start for start, _ in taken]
    reach: list[int] = []  # the furthest end of the spans up to each one
    for _, end in taken:
        reach.append(max(end, reach[-1]) if reach else end)
    for match in _TOKEN.finditer(text):
        path = _path(match[0], url=False)
        last = bisect_left(starts, match.end()) - 1  # the last span starting before the token ends
        if path is not None and not (last >= 0 and reach[last] > match.start()):
            found += _mention(match.start(), path, "", _NO_CAPTION)
    return sorted(found, key=lambda mention: mention.at)


def _file_name(path: str) -> str:
    return re.split(r"[/\\]", path)[-1]


def image_refs(text: str) -> list[ImageRef]:
    """The images `text` names, each once, in the order of first appearance."""
    best: dict[str, _Mention] = {}
    for mention in _mentions(text.replace("\r\n", "\n").replace("\r", "\n")):
        if mention.path not in best or mention.source < best[mention.path].source:
            best[mention.path] = mention
    return [
        ImageRef(path, m.caption if m.source != _NO_CAPTION else _file_name(path))
        for path, m in best.items()
    ]


def bead_refs(description: str | None, notes: str | None) -> list[ImageRef]:
    """The images of a bead: its description, then its notes; at most `MAX_IMAGES`."""
    # an empty line between them: the first line of the notes has no line above it
    text = "\n\n".join(part for part in (description, notes) if part)
    return image_refs(text)[:MAX_IMAGES]


def media_type(head: bytes) -> str | None:
    """The type of an image from its first bytes; never from its name, and never SVG."""
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if head.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    return None


def locate(written: str, project: Path, home: Path) -> Path | None:
    """The absolute path a written path names, without touching the disk; None when refused."""
    drive = _ABSOLUTE_DRIVE.match(written)
    parts = written.split("/")
    # refused before the path touches the disk: on Windows resolving \\host\share contacts the host
    if "\\" in written or "\0" in written or ":" in written[2 if drive else 0 :]:
        return None
    if ".." in parts or "" in parts[1:]:
        return None
    if written.startswith("~/"):
        return home / written[2:]
    path = Path(written)
    if drive and not path.is_absolute():  # a drive on a host without drives
        return None
    return path if path.is_absolute() else project / path


def _real_folders(folders: Sequence[Path]) -> list[Path]:
    """The folders that exist, each with its own links resolved."""
    real: list[Path] = []
    for folder in folders:
        try:
            place = folder.resolve(strict=True)
            if place.is_dir():
                real.append(place)
        except _REFUSED:  # a missing or unreadable folder serves nothing
            continue
    return real


def _load(file: Path, folders: Sequence[Path], limit: int) -> tuple[bytes, str] | None:
    """The first `limit` bytes of `file` and its type, when it is an image this host may serve;
    `folders` are results of `_real_folders`. The file is opened once and every check after the
    containment is made on that open file."""
    try:
        found = file.resolve(strict=True)
        if not any(found.is_relative_to(folder) for folder in folders):
            return None
        checked = os.stat(found)
        handle = os.open(found, _OPEN_FLAGS)
    except _REFUSED:  # missing, unreadable, replaced by a link, or refused by the system
        return None
    try:
        opened = os.fstat(handle)
        same = (opened.st_dev, opened.st_ino) == (checked.st_dev, checked.st_ino)
        if not same or not stat.S_ISREG(opened.st_mode) or opened.st_size > MAX_BYTES:
            return None
        if not _still_inside(handle, opened, file, folders):
            return None
        content = _read_all(handle, limit)
    except _REFUSED:  # gone or refused while it was read
        return None
    finally:
        os.close(handle)
    kind = media_type(content)
    return (content, kind) if kind is not None and len(content) <= MAX_BYTES else None


def _still_inside(handle: int, opened: os.stat_result, file: Path, folders: Sequence[Path]) -> bool:
    """The open file still lies inside an allowed folder: a folder on the way may have been
    swapped for a link after `file` was resolved, and both `os.stat` and `os.open` follow it."""
    if _FD_PATHS.is_dir():
        # the kernel's name for the open file, links resolved; read once, never walked again
        place = Path(os.readlink(_FD_PATHS / str(handle)))
        return any(place.is_relative_to(folder) for folder in folders)
    again = file.resolve(strict=True)
    current = os.stat(again)
    inside = any(again.is_relative_to(folder) for folder in folders)
    return inside and (current.st_dev, current.st_ino) == (opened.st_dev, opened.st_ino)


def _read_all(handle: int, limit: int) -> bytes:
    chunks: list[bytes] = []
    left = limit
    while left > 0:
        chunk = os.read(handle, min(left, 1024 * 1024))
        if not chunk:
            break
        chunks.append(chunk)
        left -= len(chunk)
    return b"".join(chunks)


def check(file: Path, folders: Sequence[Path]) -> str | None:
    """The media type of `file` when it is available (REQ-BEADS-027), else None."""
    return _check(file, _real_folders(folders))


def _check(file: Path, real_folders: Sequence[Path]) -> str | None:
    loaded = _load(file, real_folders, _HEAD)
    return loaded[1] if loaded is not None else None


def _folders(entry: ProjectEntry) -> list[Path]:
    return [entry.path, *entry.evidence_roots]


def _text(raw: Mapping[str, Any], key: str) -> str | None:
    value = raw.get(key)
    return value if isinstance(value, str) else None


def find_images(raw: Mapping[str, Any], entry: ProjectEntry, home: Path) -> list[FoundImage]:
    """The images of one exported bead, numbered from 1, each checked on this host."""
    return _find(raw, entry, home, _real_folders(_folders(entry)))


def _find(
    raw: Mapping[str, Any], entry: ProjectEntry, home: Path, real_folders: Sequence[Path]
) -> list[FoundImage]:
    found: list[FoundImage] = []
    for n, ref in enumerate(bead_refs(_text(raw, "description"), _text(raw, "notes")), start=1):
        file = locate(ref.path, entry.path, home)
        ready = file is not None and _check(file, real_folders) is not None
        found.append(FoundImage(n, ref.path, ref.caption, file, ready))
    return found


class ImageIndex:
    """The images of each bead of a project, worked out once per export snapshot: the
    `SnapshotStore` returns the same object until the export changes."""

    def __init__(self, home: Path) -> None:
        self._home = home
        self._guard = threading.Lock()
        self._locks: dict[str, threading.Lock] = {}  # one computation per project at a time
        self._items: dict[str, tuple[Snapshot, dict[str, list[FoundImage]]]] = {}

    def of(self, entry: ProjectEntry, snapshot: Snapshot) -> Mapping[str, list[FoundImage]]:
        """Images by bead id; a bead without images is left out."""
        with self._guard:
            lock = self._locks.setdefault(entry.name, threading.Lock())
        with lock:
            with self._guard:
                hit = self._items.get(entry.name)
            if hit is not None and hit[0] is snapshot:
                return hit[1]
            real_folders = _real_folders(_folders(entry))  # once for every bead
            found: dict[str, list[FoundImage]] = {}
            for ident, raw in snapshot.rows.items():
                images = _find(raw, entry, self._home, real_folders)
                if images:
                    found[ident] = images
            with self._guard:
                self._items[entry.name] = (snapshot, found)
            return found

    def read(
        self, entry: ProjectEntry, snapshot: Snapshot, bead_id: str, n: int
    ) -> tuple[bytes, str] | None:
        """The bytes and type of image `n` of a bead, checked again now; None for anything else."""
        images = self.of(entry, snapshot).get(bead_id, [])
        image = images[n - 1] if 1 <= n <= len(images) else None
        if image is None or image.file is None:
            return None
        return _load(image.file, _real_folders(_folders(entry)), MAX_BYTES + 1)

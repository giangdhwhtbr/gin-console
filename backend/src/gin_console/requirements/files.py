"""Change folders and confirmed assets of a project: the only module that reads them (ADR 0004)."""

import os
import posixpath
import re
from collections.abc import Iterator
from datetime import date
from pathlib import Path

from gin_console.requirements.models import ChangeContent, ChangeFolder, Mockup

PARTS = ("proposal", "spec-delta", "design", "plan", "tests")
HTML = "text/html; charset=utf-8"
MEDIA = {
    ".html": HTML,
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
}
_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*")
_DAY = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")
_ARCHIVED = re.compile(r"([0-9]{4}-[0-9]{2}-[0-9]{2})-(.+)")
_EPIC = re.compile(r"^Epic:[ \t]*(\S+)", re.M)
_TITLE = re.compile(r"^# (.+)$", re.M)
_CONFIRMED = re.compile(r"^Confirmed:[ \t]*(.*?)[ \t]*$", re.M)
_BY = re.compile(r"^Confirmed by:[ \t]*(\S.*)$", re.M)
_REQUIREMENT = re.compile(r"### (REQ-[A-Z0-9-]+-[0-9]+)")
_PATH = re.compile(r"[^\s`,;()]+")
_UNREADABLE = "This file could not be read."
# what pathlib raises for a path the system refuses: OSError for an unreadable folder or a name that
# is too long, ValueError for a NUL byte or an undecodable name, RuntimeError for a link loop
_REFUSED = (OSError, ValueError, RuntimeError)


def _folder(root: Path, *names: str) -> Path | None:
    """The real directory at exactly this place of the project; None when a name is no plain name
    or when any part below the project directory is a link."""
    if not all(_NAME.fullmatch(name) for name in names):
        return None
    try:
        place = root.resolve().joinpath(*names)
        return place if place.resolve() == place and place.is_dir() else None
    except _REFUSED:
        return None


def _file(folder: Path, relative: str) -> Path | None:
    """The readable file `relative` names, links followed; None when it lies outside `folder`,
    which is a result of `_folder`."""
    # refused before the path touches the disk: on Windows resolving \\host\share contacts the host
    if any(part in ("", ".", "..") for part in relative.split("/")) or set(relative) & set("\\:\0"):
        return None
    try:
        relative.encode()  # a name no response could hold
        found = (folder / relative).resolve()
        return found if found.is_relative_to(folder) and found.is_file() else None
    except _REFUSED:
        return None


def _names(folder: Path | None) -> list[str]:
    try:
        entries = [entry.name for entry in folder.iterdir()] if folder is not None else []
    except OSError:  # a folder that cannot be read has nothing to show
        return []
    return sorted(name for name in entries if _NAME.fullmatch(name))


def _text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return _UNREADABLE


def _part(folder: Path, part: str) -> str | None:
    for name in (f"{PARTS.index(part) + 1:02d}-{part}.md", f"{part}.md"):
        path = _file(folder, name)
        if path is not None:
            return _text(path)
    return None


def _describe(name: str, folder: Path, archived: bool) -> ChangeFolder:
    proposal = _part(folder, "proposal") or ""
    dated = _ARCHIVED.fullmatch(name) if archived else None
    epic, title = _EPIC.search(proposal), _TITLE.search(proposal)
    return ChangeFolder(
        folder=name,
        change=dated[2] if dated else name,
        title=title[1].strip() if title else name,
        epic=epic[1] if epic else None,
        archived=dated[1] if dated else None,
    )


def _changes(root: Path) -> Iterator[tuple[str, Path, bool]]:
    """Open folders, then archived ones; like gin, skips an archived folder without a date."""
    for parent in (("docs", "changes"), ("docs", "changes", "archive")):
        archived = parent[-1] == "archive"
        for name in _names(_folder(root, *parent)):
            if not (_ARCHIVED.fullmatch(name) if archived else name != "archive"):
                continue
            folder = _folder(root, *parent, name)
            if folder is not None:
                yield name, folder, archived


def list_changes(root: Path) -> list[ChangeFolder]:
    rows = [_describe(*change) for change in _changes(root)]  # each group sorted by name
    still_open = [r for r in rows if r.archived is None]
    done = [r for r in rows if r.archived is not None]
    done.sort(key=lambda r: r.archived or "", reverse=True)
    return still_open + done


def read_change(root: Path, name: str) -> ChangeContent | None:
    for found, folder, archived in _changes(root):
        if found == name:
            texts = {part: _part(folder, part) for part in PARTS}
            return ChangeContent(
                **_describe(name, folder, archived).model_dump(),
                files={part: text for part, text in texts.items() if text is not None},
            )
    return None


def _confirmed_on(description: str) -> str | None:
    """The date of the first `Confirmed:` line, the one gin reads; None when it is not a date."""
    line = _CONFIRMED.search(description)
    if line is None or not _DAY.fullmatch(line[1]):
        return None
    try:
        date.fromisoformat(line[1])
    except ValueError:
        return None
    return line[1]


def _confirmed(root: Path, capability: str, day: str) -> tuple[Path, str, str] | None:
    """The asset folder, its description and confirmation date, only when a BA confirmed it."""
    if not _DAY.fullmatch(day):
        return None
    folder = _folder(root, "docs", "specs", capability, "assets", day)
    description = _file(folder, "description.md") if folder is not None else None
    if folder is None or description is None:
        return None
    text = _text(description)
    confirmed = _confirmed_on(text)
    return (folder, text, confirmed) if confirmed is not None else None


def _asset(folder: Path, relative: str) -> tuple[Path, str] | None:
    """A servable file of a confirmed folder and its media type (by what a link leads to)."""
    found = _file(folder, relative)
    media = MEDIA.get(found.suffix.lower()) if found is not None else None
    if found is None or media is None or not os.access(found, os.R_OK):
        return None
    return found, media


def _sources(root: Path) -> list[tuple[str, str]]:
    """(path relative to docs/specs, id) of each `Source:` path of the living requirements."""
    found: list[tuple[str, str]] = []
    for capability in _names(_folder(root, "docs", "specs")):
        folder = _folder(root, "docs", "specs", capability)
        spec = _file(folder, "spec.md") if folder is not None else None
        ident = ""
        for line in _text(spec).splitlines() if spec is not None else []:
            if line.startswith(("# ", "## ", "### ")):
                heading = _REQUIREMENT.match(line)
                ident = heading[1] if heading else ""
            elif ident and line.startswith("Source:"):
                for path in _PATH.findall(line.removeprefix("Source:")):
                    plain = posixpath.normpath(f"{capability}/{path.split('#')[0]}")
                    found.append((plain, ident))
    return found


def _files(folder: Path) -> list[str]:
    """Every file path under `folder`; a linked folder is not entered, an unreadable one skipped."""
    return sorted(
        (Path(parent) / name).relative_to(folder).as_posix()
        for parent, _, names in os.walk(folder)
        for name in names
    )


def list_mockups(root: Path) -> list[Mockup]:
    sources = _sources(root)
    found: list[Mockup] = []
    for capability in _names(_folder(root, "docs", "specs")):
        for day in reversed(_names(_folder(root, "docs", "specs", capability, "assets"))):
            confirmed = _confirmed(root, capability, day)
            if confirmed is None:
                continue
            folder, text, on = confirmed
            assets = [(path, _asset(folder, path)) for path in _files(folder)]
            html = [path for path, asset in assets if asset and asset[1] == HTML]
            images = [path for path, asset in assets if asset and asset[1].startswith("image/")]
            if not html and not images:
                continue
            prefix = f"{capability}/assets/{day}"
            by = _BY.search(text)
            found.append(
                Mockup(
                    capability=capability,
                    date=day,
                    confirmed=on,
                    confirmed_by=by[1].strip() if by else None,
                    description=text,
                    html=html,
                    images=images,
                    requirements=sorted(
                        {ident for path, ident in sources if f"{path}/".startswith(f"{prefix}/")}
                    ),
                )
            )
    return found


def mockup_file(root: Path, capability: str, day: str, path: str) -> tuple[bytes, str] | None:
    """The content of a file of a confirmed folder and its media type; None for anything else."""
    confirmed = _confirmed(root, capability, day)
    asset = _asset(confirmed[0], path) if confirmed is not None else None
    if asset is None:
        return None
    try:
        # simplified: the whole file is held in memory; stream it when mockups grow past a few MB
        return asset[0].read_bytes(), asset[1]
    except OSError:  # gone or refused since the check
        return None

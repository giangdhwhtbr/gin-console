"""The attachments of a bead in gin's attachment store (REQ-BEADS-031, REQ-BEADS-032, ADR 0006):
the only module that knows where the store keeps a blob and the git commands that read it.

A bead lists its attachments in `metadata.attachments`; the `git-ref` store keeps each blob at
`<aa>/<sha256>` on `refs/gin/attachments`, which the console fetches into its own
`refs/gin-console/attachments`, and the `local` store keeps it at the same place under
`.agent-workflow/attachments` of the project. The console reads both refs and never writes one
here; an entry's `path`, `mime` and `bytes` are never used, the bytes are checked against the
sha256 instead.
"""

import hashlib
import json
import logging
import re
import subprocess
import threading
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal, NamedTuple, Protocol

from gin_console.beads.images import MAX_BYTES, _load, _real_folders, media_type
from gin_console.beads.snapshot import Snapshot
from gin_console.config import ProjectEntry
from gin_console.projects.collect import _child_env

REFS = ("refs/gin/attachments", "refs/gin-console/attachments")  # read in this order
GIT_TIMEOUT_SECONDS = 30.0
SHA256 = re.compile(r"[0-9a-f]{64}")
Reason = Literal["not_listed", "pruned", "unsupported_store", "not_fetched"]
_GIT_REF, _LOCAL = "git-ref", "local"
_LOCAL_FOLDER = Path(".agent-workflow") / "attachments"
_ANY_CASE_SHA256 = re.compile(r"[0-9a-fA-F]{64}")
# what pathlib raises for a path the system refuses, as in images.py
_REFUSED = (OSError, ValueError, RuntimeError)

logger = logging.getLogger(__name__)


class GitRun(NamedTuple):
    returncode: int
    stdout: bytes
    stderr: str


class GitError(Exception):
    """git is missing, timed out or could not start."""


class GitRunner(Protocol):
    """Runs `git <args>` in `cwd`; raises GitError when git cannot run."""

    def __call__(self, args: Sequence[str], cwd: Path) -> GitRun: ...


def run_git(args: Sequence[str], cwd: Path) -> GitRun:
    """`git <args>` in `cwd`, stdout kept as bytes since a blob is binary. `git` is started
    directly: `git.exe` on Windows needs no shim. Its messages are in English, so they can be
    matched, and it never waits for input, such as a credential prompt."""
    env = {**_child_env(), "LC_ALL": "C", "LANGUAGE": "C", "GIT_TERMINAL_PROMPT": "0"}
    try:
        done = subprocess.run(
            ["git", *args],
            cwd=cwd,
            env=env,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            timeout=GIT_TIMEOUT_SECONDS,
            check=False,
        )
    except FileNotFoundError:
        raise GitError("git not found") from None
    except subprocess.TimeoutExpired:
        raise GitError("git timed out") from None
    except OSError as exc:  # e.g. PermissionError on the project directory
        raise GitError(f"git failed: {exc.strerror}") from None
    return GitRun(done.returncode, done.stdout, done.stderr.decode("utf-8", errors="replace"))


def blob_path(sha256: str) -> str:
    """Where the store keeps the blob of `sha256`, in a ref and under the local folder."""
    return f"{sha256[:2]}/{sha256}"


@dataclass(frozen=True)
class Entry:
    """An entry of `metadata.attachments`, with only the fields the console trusts."""

    sha256: str
    store: str  # "git-ref" when missing
    pruned: bool
    caption: str | None
    name: str | None


def _label(value: Any) -> str | None:
    """A caption or a name: a string that is not blank."""
    return (value.strip() or None) if isinstance(value, str) else None


def _store(value: Any) -> str:
    if value is None:
        return _GIT_REF
    return value if isinstance(value, str) else ""  # "" is a store this host cannot read


def _listed(metadata: Any) -> Any:
    """`metadata.attachments`, decoded when it is JSON text: bd exports a list that way."""
    items = metadata.get("attachments") if isinstance(metadata, Mapping) else None
    if not isinstance(items, str):
        return items
    try:
        return json.loads(items)
    except (ValueError, RecursionError):  # not JSON, or nested too deep: no entries
        return None


def entries(metadata: Any) -> list[Entry]:
    """The valid entries of `metadata.attachments`, a list or the JSON text of one, sha
    lower-cased, first of a sha kept; none when `metadata` is no object or `attachments` no
    list."""
    items = _listed(metadata)
    found: dict[str, Entry] = {}
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        sha = item.get("sha256")
        if not isinstance(sha, str) or not _ANY_CASE_SHA256.fullmatch(sha):
            continue
        sha = sha.lower()
        if sha not in found:
            found[sha] = Entry(
                sha256=sha,
                store=_store(item.get("store")),
                pruned=item.get("pruned_at") is not None,
                caption=_label(item.get("caption")),
                name=_label(item.get("name")),
            )
    return list(found.values())


def _shared(snapshot: Snapshot) -> bool:
    """A bead of the snapshot has an entry in the git-ref store."""
    return any(
        found.store == _GIT_REF
        for raw in snapshot.rows.values()
        for found in entries(raw.get("metadata"))
    )


def _local_file(entry: ProjectEntry, sha256: str) -> Path:
    return entry.path / _LOCAL_FOLDER / blob_path(sha256)


def _in_local_store(entry: ProjectEntry, sha256: str) -> bool:
    """The local file of `sha256`, links resolved, is a regular file inside the project."""
    try:
        found = _local_file(entry, sha256).resolve(strict=True)
    except _REFUSED:  # missing, a link loop, or refused by the system
        return False
    inside = any(found.is_relative_to(folder) for folder in _real_folders([entry.path]))
    return inside and found.is_file()


def served(data: bytes, sha256: str) -> str | None:
    """The media type of `data` when it may be served as attachment `sha256`: at most
    `MAX_BYTES`, its SHA-256 is `sha256`, and its first bytes are those of an image."""
    if len(data) > MAX_BYTES or hashlib.sha256(data).hexdigest() != sha256:
        return None
    return media_type(data[:12])


class AttachmentStore:
    """Reads gin's attachment store of each project through `run`; lists the blobs of the two
    refs once per export snapshot, as `ImageIndex` works out the images."""

    def __init__(self, run: GitRunner) -> None:
        self._run = run
        self._guard = threading.Lock()
        self._locks: dict[str, threading.Lock] = {}  # one listing per project at a time
        self._listings: dict[str, tuple[Snapshot, frozenset[str]]] = {}

    def listing(self, entry: ProjectEntry, snapshot: Snapshot) -> frozenset[str]:
        """The blob paths of both refs; no git process when no bead of the snapshot has a
        git-ref entry. A missing ref holds no blob; git that cannot run leaves both empty."""
        with self._guard:
            lock = self._locks.setdefault(entry.name, threading.Lock())
        with lock:
            with self._guard:
                hit = self._listings.get(entry.name)
            if hit is not None and hit[0] is snapshot:
                return hit[1]
            listed = self._list(entry) if _shared(snapshot) else frozenset()
            with self._guard:
                self._listings[entry.name] = (snapshot, listed)
            return listed

    def _list(self, entry: ProjectEntry) -> frozenset[str]:
        paths: set[str] = set()
        for ref in REFS:
            try:
                done = self._run(["ls-tree", "-r", "--name-only", ref], entry.path)
            except GitError as exc:  # a ref after it would fail alike: shown as not fetched
                logger.warning("listing the attachments of %s failed: %s", entry.name, exc)
                break
            if done.returncode == 0:  # a ref that does not exist exits 128
                paths.update(done.stdout.decode("utf-8", errors="replace").splitlines())
        return frozenset(paths)

    def state(
        self, entry: ProjectEntry, listed: frozenset[str], found: Entry | None
    ) -> Reason | None:
        """None when the attachment is available (REQ-BEADS-031), else why not; `listed` is the
        project's `listing`, `found` the bead's entry with the attachment's sha256."""
        if found is None:
            return "not_listed"
        if found.pruned:
            return "pruned"
        if found.store == _GIT_REF:
            present = blob_path(found.sha256) in listed
        elif found.store == _LOCAL:
            present = _in_local_store(entry, found.sha256)
        else:
            return "unsupported_store"
        return None if present else "not_fetched"

    def read(self, entry: ProjectEntry, found: Entry) -> tuple[bytes, str] | None:
        """The bytes and type of an attachment, read now and checked by `served`; None for
        anything else."""
        if found.store == _GIT_REF:
            data = self._read_blob(entry, found.sha256)
        elif found.store == _LOCAL:
            file = _local_file(entry, found.sha256)
            loaded = _load(file, _real_folders([entry.path]), MAX_BYTES + 1)
            data = loaded[0] if loaded is not None else None
        else:
            return None
        media = served(data, found.sha256) if data is not None else None
        return (data, media) if data is not None and media is not None else None

    def _read_blob(self, entry: ProjectEntry, sha256: str) -> bytes | None:
        """The blob from the first ref that holds it; its size is checked before it is read."""
        for ref in REFS:
            name = f"{ref}:{blob_path(sha256)}"
            try:
                size = self._run(["cat-file", "-s", name], entry.path)
                if size.returncode != 0:
                    continue  # not in this ref
                length = size.stdout.strip()
                if not length.isdigit() or int(length) > MAX_BYTES:
                    return None
                blob = self._run(["cat-file", "blob", name], entry.path)
            except GitError as exc:
                logger.warning("reading attachment %s of %s failed: %s", sha256, entry.name, exc)
                return None
            return blob.stdout if blob.returncode == 0 else None
        return None

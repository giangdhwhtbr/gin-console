import logging
import os
import stat
import sys
from pathlib import Path

import pytest
import yaml

from gin_console.auth.passwords import hash_password
from gin_console.auth.users import (
    User,
    UserDirectory,
    UsersError,
    load_users,
    save_users,
)

PROJECTS = ["a", "b"]
HASH = hash_password("P")
OTHER_HASH = hash_password("Q")


def user(name: str = "an", projects: list[str] | str = "*", password_hash: str = HASH) -> dict[
    str, object
]:
    return {
        "name": name,
        "email": f"{name}@x.io",
        "password_hash": password_hash,
        "projects": projects,
    }


def write_users(path: Path, users: list[dict[str, object]]) -> Path:
    """Write the file and move its mtime forward, so a reload sees a change even when the
    size and the clock tick are the same."""
    before = path.stat().st_mtime_ns if path.exists() else 0
    path.write_text(yaml.safe_dump({"users": users}, sort_keys=False))
    later = max(path.stat().st_mtime_ns, before + 1_000_000)
    os.utime(path, ns=(later, later))
    return path


@pytest.fixture
def users_file(tmp_path: Path) -> Path:
    return write_users(tmp_path / "users.yaml", [user("an", ["a"]), user("root")])


# REQ-AUTH-013: the users file shape
def test_auth_013_load(users_file: Path) -> None:
    users = load_users(users_file, PROJECTS)
    assert list(users) == ["an", "root"]
    an = users["an"]
    assert (an.email, an.password_hash, an.projects) == ("an@x.io", HASH, ["a"])
    assert users["root"].projects == "*"


# REQ-AUTH-007: a user sees their projects, or all of them with "*"
def test_auth_007_allows(users_file: Path) -> None:
    users = load_users(users_file, PROJECTS)
    assert users["an"].allows("a") and not users["an"].allows("b")
    assert users["root"].allows("a") and users["root"].allows("b")


# REQ-AUTH-012: a user may be left with no project
def test_auth_012_empty_project_list(tmp_path: Path) -> None:
    path = write_users(tmp_path / "users.yaml", [user("an", [])])
    assert load_users(path, PROJECTS)["an"].projects == []


# REQ-CONFIG-009: an empty file or list loads as no users; startup refuses that, not this
@pytest.mark.parametrize("text", ["", "users: []\n"])
def test_config_009_no_users_loads_empty(tmp_path: Path, text: str) -> None:
    path = tmp_path / "users.yaml"
    path.write_text(text)
    assert load_users(path, PROJECTS) == {}


# REQ-CONFIG-009 (Enabled without users)
def test_config_009_missing_file(tmp_path: Path) -> None:
    with pytest.raises(UsersError, match="not found"):
        load_users(tmp_path / "users.yaml", PROJECTS)


# REQ-CONFIG-009: the file does not parse
def test_config_009_invalid_yaml(tmp_path: Path) -> None:
    path = tmp_path / "users.yaml"
    path.write_text("users: [\n")
    with pytest.raises(UsersError, match="invalid YAML"):
        load_users(path, PROJECTS)


# REQ-CONFIG-009: each check names its reason
@pytest.mark.parametrize(
    ("users", "reason"),
    [
        ([user("An")], r"users\.0\.name"),
        ([user("-an")], r"users\.0\.name"),
        ([user("a" * 65)], r"users\.0\.name"),
        ([user("a b")], r"users\.0\.name"),
        ([{**user(), "email": "an"}], r"users\.0\.email"),
        ([{**user(), "email": "an@"}], r"users\.0\.email"),
        ([{**user(), "projects": "all"}], r"users\.0\.projects"),
        ([{**user(), "projects": [1]}], r"users\.0\.projects"),
        ([{**user(), "role": "admin"}], r"users\.0\.role"),
        ([{"name": "an", "email": "an@x.io", "projects": "*"}], r"users\.0\.password_hash"),
        ([user("an"), user("an")], "duplicate user name: an"),
        ([user("an", ["a", "ghost"])], "an.*unknown project: ghost"),
    ],
)
def test_config_009_bad_user(tmp_path: Path, users: list[dict[str, object]], reason: str) -> None:
    path = write_users(tmp_path / "users.yaml", users)
    with pytest.raises(UsersError, match=reason):
        load_users(path, PROJECTS)


# REQ-CONFIG-009: the top level must be a mapping with only `users`
@pytest.mark.parametrize("text", ["- an\n", "users: 3\n", "people: []\n"])
def test_config_009_bad_shape(tmp_path: Path, text: str) -> None:
    path = tmp_path / "users.yaml"
    path.write_text(text)
    with pytest.raises(UsersError, match="invalid users file"):
        load_users(path, PROJECTS)


def models(*rows: dict[str, object]) -> list[User]:
    return [User.model_validate(row) for row in rows]


# REQ-AUTH-013 (Mode and format)
def test_auth_013_save_format(tmp_path: Path) -> None:
    path = tmp_path / "new" / "folder" / "users.yaml"
    save_users(path, models(user("an", ["a"]), user("root")))
    assert path.read_text() == (
        "users:\n"
        "- name: an\n"
        "  email: an@x.io\n"
        f"  password_hash: {HASH}\n"
        "  projects:\n"
        "  - a\n"
        "- name: root\n"
        "  email: root@x.io\n"
        f"  password_hash: {HASH}\n"
        "  projects: '*'\n"
    )
    assert load_users(path, PROJECTS) == {
        u.name: u for u in models(user("an", ["a"]), user("root"))
    }


# REQ-AUTH-013 (Mode and format)
@pytest.mark.skipif(sys.platform == "win32", reason="os.chmod sets only the read-only flag")
def test_auth_013_save_mode_0600(tmp_path: Path) -> None:
    path = tmp_path / "users.yaml"
    path.write_text("users: []\n")
    path.chmod(0o644)
    save_users(path, models(user()))
    assert stat.S_IMODE(path.stat().st_mode) == 0o600


# REQ-AUTH-013 (Atomic write)
def test_auth_013_atomic_write(
    users_file: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    before = users_file.read_bytes()

    def fail(src: object, dst: object) -> None:
        raise OSError("disk full")

    monkeypatch.setattr(os, "replace", fail)
    with pytest.raises(OSError, match="disk full"):
        save_users(users_file, models(user("bo")))
    assert users_file.read_bytes() == before
    assert sorted(p.name for p in users_file.parent.iterdir()) == ["users.yaml"]


def directory(path: Path) -> UserDirectory:
    return UserDirectory(path, PROJECTS, load_users(path, PROJECTS))


# REQ-AUTH-009: no change, no reload
def test_auth_009_unchanged(users_file: Path) -> None:
    users, changed = directory(users_file).current()
    assert (list(users), changed) == (["an", "root"], set())


# REQ-AUTH-009 (Password reset)
def test_auth_009_new_hash_is_returned_once(users_file: Path) -> None:
    users_dir = directory(users_file)
    write_users(users_file, [user("an", ["a"], OTHER_HASH), user("root")])
    users, changed = users_dir.current()
    assert changed == {"an"}
    assert users["an"].password_hash == OTHER_HASH
    assert users_dir.current()[1] == set()


# REQ-AUTH-009: a removed user is returned
def test_auth_009_removed_user(users_file: Path) -> None:
    users_dir = directory(users_file)
    write_users(users_file, [user("root")])
    users, changed = users_dir.current()
    assert (list(users), changed) == (["root"], {"an"})


# REQ-AUTH-009 (Project unassigned): new projects apply, the session stays
def test_auth_009_new_projects(users_file: Path) -> None:
    users_dir = directory(users_file)
    write_users(users_file, [user("an", ["b"]), user("root")])
    users, changed = users_dir.current()
    assert (users["an"].projects, changed) == (["b"], set())


# REQ-AUTH-009 (Broken file): keep the last users, log one error naming the file
def test_auth_009_broken_file_keeps_last_users(
    users_file: Path, caplog: pytest.LogCaptureFixture
) -> None:
    users_dir = directory(users_file)
    users_file.write_text("users: [\n")
    os.utime(users_file, ns=(1, 1))
    with caplog.at_level(logging.ERROR, logger="gin_console.auth"):
        for _ in range(3):
            users, changed = users_dir.current()
            assert (list(users), changed) == (["an", "root"], set())
    errors = [r for r in caplog.records if r.name == "gin_console.auth"]
    assert len(errors) == 1
    assert str(users_file) in errors[0].getMessage()
    # fixed again: the reload applies
    write_users(users_file, [user("root")])
    assert users_dir.current() == ({"root": User.model_validate(user("root"))}, {"an"})


# REQ-AUTH-009: a deleted file keeps the last users too
def test_auth_009_deleted_file_keeps_last_users(
    users_file: Path, caplog: pytest.LogCaptureFixture
) -> None:
    users_dir = directory(users_file)
    users_file.unlink()
    with caplog.at_level(logging.ERROR, logger="gin_console.auth"):
        assert list(users_dir.current()[0]) == ["an", "root"]
        users_dir.current()
    assert len([r for r in caplog.records if r.name == "gin_console.auth"]) == 1


# REQ-AUTH-009: a change between the caller's load and the directory's start is not missed
def test_auth_009_change_before_start(users_file: Path) -> None:
    loaded = load_users(users_file, PROJECTS)
    write_users(users_file, [user("an", ["a"], OTHER_HASH), user("root")])
    users_dir = UserDirectory(users_file, PROJECTS, loaded)
    users, changed = users_dir.current()
    assert (users["an"].password_hash, changed) == (OTHER_HASH, {"an"})


# REQ-AUTH-009: a file replaced by a rename with the same mtime and size is reloaded
def test_auth_009_new_inode(users_file: Path) -> None:
    users_dir = directory(users_file)
    users_dir.current()
    old = users_file.stat()
    replacement = users_file.with_name("next.yaml")
    replacement.write_text(
        yaml.safe_dump({"users": [user("an", ["b"]), user("root")]}, sort_keys=False)
    )
    assert replacement.stat().st_size == old.st_size  # ["a"] and ["b"]: same size
    os.utime(replacement, ns=(old.st_atime_ns, old.st_mtime_ns))
    os.replace(replacement, users_file)
    assert users_dir.current()[0]["an"].projects == ["b"]

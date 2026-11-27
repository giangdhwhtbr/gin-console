import stat
import sys
from pathlib import Path

import pytest
import yaml

from gin_console import __main__ as entry
from gin_console.auth.cli import main
from gin_console.auth.passwords import PREFIX, verify
from gin_console.config import CONFIG_ENV


class Console:
    """A tmp_path config with projects `a` and `b` and auth on, and its users file."""

    def __init__(self, tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
        self.users_file = tmp_path / "conf" / "users.yaml"  # its folder does not exist yet
        self.config = tmp_path / "config.yaml"
        self.config.write_text(
            f"auth: {{enabled: true, users_file: '{self.users_file.as_posix()}'}}\n"
            "projects:\n  - {name: a, path: /a}\n  - {name: b, path: /b}\n"
        )
        self.env = {CONFIG_ENV: str(self.config)}
        self.capsys = capsys

    def run(self, *args: str) -> tuple[int, str, str]:
        code = main(list(args), self.env)
        out, err = self.capsys.readouterr()
        return code, out, err

    def ok(self, *args: str) -> str:
        code, out, err = self.run(*args)
        assert (code, err) == (0, ""), err
        return out

    def users(self) -> dict[str, dict[str, object]]:
        data = yaml.safe_load(self.users_file.read_text())
        return {row["name"]: row for row in data["users"]}

    def snapshot(self) -> bytes | None:
        return self.users_file.read_bytes() if self.users_file.exists() else None

    def refused(self, *args: str) -> str:
        """Run a command that must fail: exit 1, a reason on stderr, the file unchanged."""
        before = self.snapshot()
        code, out, err = self.run(*args)
        assert code == 1
        assert out == ""
        assert err.startswith("gin-console: ")
        assert self.snapshot() == before
        return err


@pytest.fixture
def console(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> Console:
    return Console(tmp_path, capsys)


def password_of(out: str) -> str:
    lines = out.splitlines()
    assert len(lines) == 1  # only the password line
    return lines[0]


# REQ-AUTH-010 (Created), REQ-AUTH-013: auth is on and the users file does not exist yet
def test_auth_010_created(console: Console) -> None:
    password = password_of(console.ok("add", "an", "--email", "an@x.io", "--project", "a"))
    an = console.users()["an"]
    assert an == {
        "name": "an",
        "email": "an@x.io",
        "password_hash": an["password_hash"],
        "projects": ["a"],
    }
    assert str(an["password_hash"]).startswith("scrypt$")
    assert verify(password, str(an["password_hash"]))  # it signs in
    assert password not in console.users_file.read_text()


# REQ-AUTH-010: several projects, repeated or listed, each kept once
def test_auth_010_several_projects(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--project", "b", "a", "--project", "b")
    assert console.users()["an"]["projects"] == ["b", "a"]


# REQ-AUTH-013 (Mode and format)
def test_auth_013_mode_and_format(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--all-projects")
    an = console.users()["an"]
    assert an["projects"] == "*"
    assert str(an["password_hash"]).startswith(PREFIX)
    if sys.platform != "win32":  # os.chmod there sets only the read-only flag
        assert stat.S_IMODE(console.users_file.stat().st_mode) == 0o600


# REQ-AUTH-010: a name with upper case is lower-cased
def test_auth_010_name_lower_cased(console: Console) -> None:
    console.ok("add", "An", "--email", "an@x.io", "--all-projects")
    assert list(console.users()) == ["an"]
    console.refused("add", "AN", "--email", "an@x.io", "--all-projects")


# REQ-AUTH-010 (Unknown project)
def test_auth_010_unknown_project(console: Console) -> None:
    err = console.refused("add", "an", "--email", "an@x.io", "--project", "a", "ghost")
    assert "ghost" in err
    assert not console.users_file.exists()


# REQ-AUTH-010 (Name taken)
def test_auth_010_name_taken(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--project", "a")
    assert "an" in console.refused("add", "an", "--email", "other@x.io", "--all-projects")


# REQ-AUTH-010: invalid name or email, or neither or both project options
@pytest.mark.parametrize(
    "args",
    [
        ["add", "-an", "--email", "an@x.io", "--all-projects"],
        ["add", "a b", "--email", "an@x.io", "--all-projects"],
        ["add", "a" * 65, "--email", "an@x.io", "--all-projects"],
        ["add", "an", "--email", "an", "--all-projects"],
        ["add", "an", "--email", "an@", "--all-projects"],
        ["add", "an", "--email", "an x@x.io", "--all-projects"],
        ["add", "an", "--email", "an@x.io"],
        ["add", "an", "--email", "an@x.io", "--project", "a", "--all-projects"],
        ["add", "an", "--project", "a"],
    ],
)
def test_auth_010_invalid_input(console: Console, args: list[str]) -> None:
    console.refused(*args)
    assert not console.users_file.exists()


# REQ-AUTH-010: there is no option to pass a password
def test_auth_010_no_password_option(console: Console) -> None:
    console.refused("add", "an", "--email", "an@x.io", "--all-projects", "--password", "P")


# REQ-AUTH-011 (Reset)
def test_auth_011_reset(console: Console) -> None:
    old = password_of(console.ok("add", "an", "--email", "an@x.io", "--project", "a"))
    new = password_of(console.ok("passwd", "AN"))
    stored = str(console.users()["an"]["password_hash"])
    assert new != old
    assert verify(new, stored)
    assert not verify(old, stored)
    assert console.users()["an"]["projects"] == ["a"]


# REQ-AUTH-011 (Unknown user)
def test_auth_011_unknown_user(console: Console) -> None:
    assert "bo" in console.refused("passwd", "bo")
    console.ok("add", "an", "--email", "an@x.io", "--all-projects")
    console.refused("passwd", "bo")


# REQ-AUTH-012 (Assign and unassign)
def test_auth_012_assign_and_unassign(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--project", "a")
    assert console.ok("assign", "an", "b") == ""
    assert console.users()["an"]["projects"] == ["a", "b"]
    console.ok("assign", "an", "b")  # already there: kept once
    console.ok("unassign", "an", "a")
    assert console.users()["an"]["projects"] == ["b"]


# REQ-AUTH-012: an unassign that leaves no project is allowed
def test_auth_012_unassign_to_none(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--project", "a")
    console.ok("unassign", "An", "a")
    assert console.users()["an"]["projects"] == []


# REQ-AUTH-012: assign --all sets "*"
def test_auth_012_assign_all(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--project", "a")
    console.ok("assign", "an", "--all")
    assert console.users()["an"]["projects"] == "*"
    console.ok("assign", "an", "a")  # a user with "*" keeps "*"
    assert console.users()["an"]["projects"] == "*"


# REQ-AUTH-012: unassign of a user with "*" is refused
def test_auth_012_unassign_all_refused(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--all-projects")
    err = console.refused("unassign", "an", "a")
    assert "user an has all projects; assign the projects to keep first" in err


# REQ-AUTH-012: a named user or project that does not exist
@pytest.mark.parametrize(
    "args",
    [
        ["assign", "bo", "a"],
        ["assign", "an", "ghost"],
        ["assign", "an"],
        ["assign", "an", "a", "--all"],
        ["unassign", "bo", "a"],
        ["unassign", "an", "ghost"],
        ["unassign", "an"],
        ["remove", "bo"],
    ],
)
def test_auth_012_unknown_user_or_project(console: Console, args: list[str]) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--project", "a")
    console.refused(*args)


# REQ-AUTH-012 (Remove)
def test_auth_012_remove(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--project", "a")
    console.ok("add", "root", "--email", "root@x.io", "--all-projects")
    assert console.ok("remove", "AN") == ""
    assert list(console.users()) == ["root"]


# REQ-AUTH-012 (List)
def test_auth_012_list(console: Console) -> None:
    assert console.ok("list") == ""  # no users file yet
    console.ok("add", "an", "--email", "an@x.io", "--project", "a", "b")
    console.ok("add", "root", "--email", "root@x.io", "--all-projects")
    out = console.ok("list")
    assert out == "an\tan@x.io\ta,b\nroot\troot@x.io\t*\n"
    assert "scrypt$" not in out


# REQ-AUTH-012: a user with no project lists an empty projects column
def test_auth_012_list_no_project(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--project", "a")
    console.ok("unassign", "an", "a")
    assert console.ok("list") == "an\tan@x.io\t\n"


# REQ-CONFIG-003: a config problem stops the CLI
def test_cli_missing_config(console: Console) -> None:
    console.config.unlink()
    assert "config file not found" in console.refused("list")


# REQ-CONFIG-009: a broken users file stops the CLI and names the file
def test_cli_broken_users_file(console: Console) -> None:
    console.users_file.parent.mkdir()
    console.users_file.write_text("users: [\n")
    err = console.refused("add", "an", "--email", "an@x.io", "--all-projects")
    assert str(console.users_file) in err and "invalid YAML" in err


# REQ-AUTH-010: the CLI works while auth is still off
def test_cli_with_auth_off(console: Console) -> None:
    console.config.write_text(
        f"auth: {{users_file: '{console.users_file.as_posix()}'}}\n"
        "projects:\n  - {name: a, path: /a}\n"
    )
    console.ok("add", "an", "--email", "an@x.io", "--project", "a")
    assert list(console.users()) == ["an"]


# REQ-AUTH-010: a command is required
@pytest.mark.parametrize("args", [[], ["rename", "an"]])
def test_cli_needs_a_command(console: Console, args: list[str]) -> None:
    console.refused(*args)


# REQ-AUTH-010: `python -m gin_console user ...` runs the CLI
def test_main_dispatches_user(console: Console, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(CONFIG_ENV, str(console.config))
    code = entry.main(["user", "add", "an", "--email", "an@x.io", "--all-projects"])
    assert code == 0
    assert list(console.users()) == ["an"]
    assert entry.main(["user", "remove", "bo"]) == 1


# REQ-SERVER-001: without arguments the server starts as before
def test_main_without_arguments_starts_server(
    console: Console, monkeypatch: pytest.MonkeyPatch
) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--all-projects")  # auth on needs a user
    monkeypatch.setenv(CONFIG_ENV, str(console.config))
    calls: list[tuple[str, int]] = []
    monkeypatch.setattr(
        "gin_console.__main__.uvicorn.run",
        lambda app, host, port: calls.append((host, port)),
    )
    assert entry.main([]) == 0
    assert calls == [("127.0.0.1", 8700)]

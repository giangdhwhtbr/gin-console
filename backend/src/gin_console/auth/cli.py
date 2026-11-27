"""`python -m gin_console user ...`: manage the users file (REQ-AUTH-010 to REQ-AUTH-013)."""

from __future__ import annotations

import argparse
import os
import sys
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Literal, NoReturn

from gin_console.auth.passwords import generate, hash_password
from gin_console.auth.users import EMAIL, NAME, User, UsersError, load_users, save_users
from gin_console.config import ConfigError, load_settings, resolve_config_path


class _Refused(Exception):
    """A command that writes nothing; the message is the reason shown to the operator."""


class _Parser(argparse.ArgumentParser):
    def error(self, message: str) -> NoReturn:  # exit 1 like every other refusal, not 2
        raise _Refused(f"{message}\n{self.format_usage().rstrip()}")


def _parser() -> _Parser:
    parser = _Parser(
        prog="python -m gin_console user",
        description="Manage the users who may sign in, kept in auth.users_file.",
    )
    commands = parser.add_subparsers(dest="command", required=True, metavar="COMMAND")
    add = commands.add_parser("add", help="create a user and print its password once")
    add.add_argument("name")
    add.add_argument("--email", required=True)
    scope = add.add_mutually_exclusive_group(required=True)
    scope.add_argument(
        "--project", dest="projects", action="extend", nargs="+", metavar="PROJECT"
    )
    scope.add_argument("--all-projects", action="store_true")
    passwd = commands.add_parser("passwd", help="give a user a new password and print it once")
    passwd.add_argument("name")
    assign = commands.add_parser("assign", help="let a user see more projects")
    assign.add_argument("name")
    assign.add_argument("projects", nargs="*", metavar="PROJECT")
    assign.add_argument("--all", action="store_true", help="every configured project")
    unassign = commands.add_parser("unassign", help="stop a user seeing projects")
    unassign.add_argument("name")
    unassign.add_argument("projects", nargs="+", metavar="PROJECT")
    remove = commands.add_parser("remove", help="delete a user")
    remove.add_argument("name")
    commands.add_parser("list", help="print each user's name, email and projects")
    return parser


def _read(path: Path, configured: Sequence[str]) -> dict[str, User]:
    if not path.exists():  # the first `add` creates the file
        return {}
    try:
        return load_users(path, configured)
    except UsersError as exc:
        raise _Refused(f"{path}: {exc}") from None


def _known(requested: Sequence[str], configured: Sequence[str]) -> list[str]:
    """`requested` once each, in order; every one must be a configured project."""
    unknown = [p for p in requested if p not in configured]
    if unknown:
        raise _Refused(f"unknown project: {', '.join(dict.fromkeys(unknown))}")
    return list(dict.fromkeys(requested))


def _existing(users: dict[str, User], name: str) -> User:
    if name not in users:
        raise _Refused(f"no user {name}")
    return users[name]


def _add(args: argparse.Namespace, name: str, users: dict[str, User], configured: list[str]) -> str:
    if NAME.fullmatch(name) is None:
        raise _Refused(
            f"invalid user name: {name}; use 1 to 64 of a-z, 0-9, '.', '_' or '-', "
            "starting with a letter or digit"
        )
    if EMAIL.fullmatch(args.email) is None:
        raise _Refused(f"invalid email: {args.email}; use an address such as an@example.com")
    if name in users:
        raise _Refused(f"user {name} already exists")
    projects: list[str] | Literal["*"] = (
        "*" if args.all_projects else _known(args.projects, configured)
    )
    password = generate()
    users[name] = User(
        name=name, email=args.email, password_hash=hash_password(password), projects=projects
    )
    return password


def _assign(args: argparse.Namespace, user: User, configured: list[str]) -> User:
    if args.all == bool(args.projects):
        raise _Refused("give the projects to assign, or --all")
    added = _known(args.projects, configured)
    if args.all or user.projects == "*":
        return user.model_copy(update={"projects": "*"})
    return user.model_copy(update={"projects": _known([*user.projects, *added], configured)})


def _unassign(args: argparse.Namespace, user: User, configured: list[str]) -> User:
    removed = _known(args.projects, configured)
    if user.projects == "*":
        raise _Refused(
            f"user {user.name} has all projects; assign the projects to keep first"
        )
    kept = [p for p in user.projects if p not in removed]
    return user.model_copy(update={"projects": kept})


def _run(args: argparse.Namespace, env: Mapping[str, str]) -> None:
    # The users file may not exist yet, so the config is read without checking it.
    settings = load_settings(resolve_config_path(env), check_users=False)
    path = settings.auth.users_file
    configured = [p.name for p in settings.projects]
    users = _read(path, configured)
    if args.command == "list":
        for user in users.values():
            projects = "*" if user.projects == "*" else ",".join(user.projects)
            print(f"{user.name}\t{user.email}\t{projects}")
        return
    name = str(args.name).lower()
    password: str | None = None
    if args.command == "add":
        password = _add(args, name, users, configured)
    elif args.command == "passwd":
        _existing(users, name)
        password = generate()
        users[name] = users[name].model_copy(update={"password_hash": hash_password(password)})
    elif args.command == "assign":
        users[name] = _assign(args, _existing(users, name), configured)
    elif args.command == "unassign":
        users[name] = _unassign(args, _existing(users, name), configured)
    elif args.command == "remove":
        _existing(users, name)
        del users[name]
    save_users(path, users.values())
    if password is not None:
        print(password)  # the only time the password is shown


def main(argv: Sequence[str], env: Mapping[str, str] = os.environ) -> int:
    try:
        _run(_parser().parse_args(list(argv)), env)
    except (_Refused, ConfigError, OSError) as exc:
        print(f"gin-console: {exc}", file=sys.stderr)
        return 1
    except SystemExit as exc:  # --help
        return exc.code if isinstance(exc.code, int) else 0
    return 0

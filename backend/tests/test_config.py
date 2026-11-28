from pathlib import Path

import pytest

from gin_console.config import (
    ALLOW_NON_LOOPBACK_ENV,
    CONFIG_ENV,
    HOST_ENV,
    ConfigError,
    ServerSettings,
    Settings,
    check_bind_host,
    effective_host,
    load_settings,
    resolve_config_path,
)


def write(tmp_path: Path, text: str) -> Path:
    path = tmp_path / "config.yaml"
    path.write_text(text)
    return path


# REQ-CONFIG-001
def test_config_001_default_location(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("HOME", str(tmp_path))
    assert resolve_config_path({}) == tmp_path / ".config/gin-console/config.yaml"


# REQ-CONFIG-001
def test_config_001_env_override(tmp_path: Path) -> None:
    other = tmp_path / "other.yaml"
    assert resolve_config_path({CONFIG_ENV: str(other)}) == other


# REQ-CONFIG-002
def test_config_002_valid_projects_in_order(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        "projects:\n"
        "  - {name: qwikfone, path: /home/gin/qwikfone}\n"
        "  - {name: scotty, path: /home/gin/scotty}\n",
    )
    settings = load_settings(path)
    assert [p.name for p in settings.projects] == ["qwikfone", "scotty"]


# REQ-CONFIG-002
def test_config_002_server_defaults(tmp_path: Path) -> None:
    settings = load_settings(write(tmp_path, "projects: []\n"))
    assert (settings.server.host, settings.server.port) == ("127.0.0.1", 8700)


# REQ-CONFIG-003
def test_config_003_missing_file(tmp_path: Path) -> None:
    missing = tmp_path / "nope.yaml"
    with pytest.raises(ConfigError, match="config.example.yaml") as exc:
        load_settings(missing)
    assert str(missing) in str(exc.value)


# REQ-CONFIG-003
def test_config_003_invalid_yaml(tmp_path: Path) -> None:
    with pytest.raises(ConfigError, match="invalid YAML"):
        load_settings(write(tmp_path, "projects: [\n"))


# REQ-CONFIG-003
def test_config_003_duplicate_name(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        "projects:\n  - {name: qwikfone, path: /a}\n  - {name: qwikfone, path: /b}\n",
    )
    with pytest.raises(ConfigError, match="duplicate project name: qwikfone"):
        load_settings(path)


# REQ-CONFIG-003
def test_config_003_relative_path(tmp_path: Path) -> None:
    path = write(tmp_path, "projects:\n  - {name: qwikfone, path: qwikfone}\n")
    with pytest.raises(ConfigError, match=r"projects\.0\.path"):
        load_settings(path)


# REQ-CONFIG-003
def test_config_003_unknown_field(tmp_path: Path) -> None:
    with pytest.raises(ConfigError, match="colour"):
        load_settings(write(tmp_path, "colour: blue\n"))


# REQ-SERVER-001
@pytest.mark.parametrize("host", ["127.0.0.1", "::1", "localhost"])
def test_server_001_loopback_allowed(host: str) -> None:
    check_bind_host(host, {})


# REQ-SERVER-001
@pytest.mark.parametrize("host", ["0.0.0.0", "100.114.99.13", "example.com"])
def test_server_001_non_loopback_refused(host: str) -> None:
    with pytest.raises(ConfigError, match="tailscale serve"):
        check_bind_host(host, {})


# REQ-SERVER-001
def test_server_001_override_allows() -> None:
    check_bind_host("0.0.0.0", {ALLOW_NON_LOOPBACK_ENV: "1"})


# REQ-DOCKER-007
def test_effective_host_env_overrides_config() -> None:
    settings = Settings(server=ServerSettings(host="127.0.0.1"))
    assert effective_host(settings, {HOST_ENV: "0.0.0.0"}) == "0.0.0.0"


# REQ-DOCKER-007
def test_effective_host_defaults_to_config() -> None:
    settings = Settings(server=ServerSettings(host="127.0.0.1"))
    assert effective_host(settings, {}) == "127.0.0.1"
    assert effective_host(settings, {HOST_ENV: ""}) == "127.0.0.1"


# REQ-CONFIG-005
def test_config_005_old_base_url_is_refused(tmp_path: Path) -> None:
    path = write(tmp_path, "server: {scotty_base_url: 'https://h'}\n")
    with pytest.raises(ConfigError, match="scotty_base_url"):
        load_settings(path)


# REQ-CONFIG-005
def test_config_005_old_project_id_is_refused(tmp_path: Path) -> None:
    path = write(tmp_path, "projects:\n  - {name: a, path: /a, scotty_id: a}\n")
    with pytest.raises(ConfigError, match="scotty_id"):
        load_settings(path)


# REQ-CONFIG-006 (Interval and opt-out)
def test_config_006_interval_and_opt_out(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        "beads: {pull_interval: 5m}\n"
        "projects:\n"
        "  - {name: a, path: /a, pull: false}\n"
        "  - {name: b, path: /b}\n",
    )
    settings = load_settings(path)
    assert settings.beads.pull_interval == 300
    assert [p.pull for p in settings.projects] == [False, True]


# REQ-CONFIG-006 (Defaults)
def test_config_006_defaults(tmp_path: Path) -> None:
    settings = load_settings(write(tmp_path, "projects:\n  - {name: a, path: /a}\n"))
    assert settings.beads.pull_interval == 0
    assert settings.projects[0].pull is True


# REQ-CONFIG-006
@pytest.mark.parametrize(
    ("text", "seconds"), [("0", 0), ("'0'", 0), ("90s", 90), ("1m", 60), ("2h", 7200)]
)
def test_config_006_interval_values(tmp_path: Path, text: str, seconds: float) -> None:
    settings = load_settings(write(tmp_path, f"beads: {{pull_interval: {text}}}\n"))
    assert settings.beads.pull_interval == seconds


# REQ-CONFIG-006 (Too short), REQ-CONFIG-003; too long for a thread wait, or for a float
@pytest.mark.parametrize(
    "text",
    ["30s", "59s", "0m", "5x", "5", "-5m", "5 m", "false", "''", "99999999999h", "9" * 400 + "s"],
)
def test_config_006_bad_interval_names_the_field(tmp_path: Path, text: str) -> None:
    path = write(tmp_path, f"beads: {{pull_interval: {text}}}\n")
    with pytest.raises(ConfigError, match=r"beads\.pull_interval"):
        load_settings(path)


# REQ-CONFIG-006, REQ-CONFIG-003
@pytest.mark.parametrize("text", ["'no'", "'true'", "1", "null"])
def test_config_006_pull_must_be_a_boolean(tmp_path: Path, text: str) -> None:
    path = write(tmp_path, f"projects:\n  - {{name: a, path: /a, pull: {text}}}\n")
    with pytest.raises(ConfigError, match=r"projects\.0\.pull"):
        load_settings(path)


# REQ-CONFIG-006, REQ-CONFIG-003
def test_config_006_unknown_beads_field(tmp_path: Path) -> None:
    with pytest.raises(ConfigError, match=r"beads\.interval"):
        load_settings(write(tmp_path, "beads: {interval: 5m}\n"))


# REQ-CONFIG-007
def test_config_007_aging_days_default_and_set(tmp_path: Path) -> None:
    assert load_settings(write(tmp_path, "projects: []\n")).overview.aging_days == 3
    text = "overview: {aging_days: 5}\n"
    assert load_settings(write(tmp_path, text)).overview.aging_days == 5


@pytest.mark.parametrize("value", ["0", "-1", "2.5", "'3'", "true", "abc"])
def test_config_007_invalid_aging_days(tmp_path: Path, value: str) -> None:
    path = write(tmp_path, f"overview: {{aging_days: {value}}}\n")
    with pytest.raises(ConfigError, match=r"overview\.aging_days"):
        load_settings(path)


# REQ-CONFIG-008 (Listed folders): the folders belong to their own project only
def test_config_008_listed_folders(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        "projects:\n"
        "  - name: qwikfone\n"
        "    path: /home/gin/qwikfone\n"
        "    evidence_roots: [/home/gin/infra/bug-sync-mcp/data/attachments]\n"
        "  - {name: scotty, path: /home/gin/scotty}\n",
    )
    qwikfone, scotty = load_settings(path).projects
    assert qwikfone.evidence_roots == [Path("/home/gin/infra/bug-sync-mcp/data/attachments")]
    assert scotty.evidence_roots == []


# REQ-CONFIG-008 (Default)
def test_config_008_default_is_empty(tmp_path: Path) -> None:
    path = write(tmp_path, "projects:\n  - {name: qwikfone, path: /home/gin/qwikfone}\n")
    assert load_settings(path).projects[0].evidence_roots == []


# REQ-CONFIG-008: a folder that does not exist does not stop the console
def test_config_008_missing_folder_is_accepted(tmp_path: Path) -> None:
    missing = (tmp_path / "no-such-folder").as_posix()
    path = write(tmp_path, f"projects:\n  - {{name: q, path: /q, evidence_roots: [{missing}]}}\n")
    assert load_settings(path).projects[0].evidence_roots == [Path(missing)]


# REQ-CONFIG-008: a Windows folder is absolute too
def test_config_008_windows_folder(tmp_path: Path) -> None:
    path = write(tmp_path, "projects:\n  - {name: q, path: /q, evidence_roots: ['C:\\shots']}\n")
    assert len(load_settings(path).projects[0].evidence_roots) == 1


# REQ-CONFIG-008 (Relative folder), REQ-CONFIG-003; and a field that is not a list
@pytest.mark.parametrize("value", ["[shots]", "[/abs, shots]", "/abs/shots", "{a: 1}"])
def test_config_008_relative_or_not_a_list_names_the_field(tmp_path: Path, value: str) -> None:
    path = write(tmp_path, f"projects:\n  - {{name: q, path: /q, evidence_roots: {value}}}\n")
    with pytest.raises(ConfigError, match=r"projects\.0\.evidence_roots"):
        load_settings(path)


def write_users_file(tmp_path: Path, projects: str = "'*'") -> Path:
    path = tmp_path / "users.yaml"
    path.write_text(
        "users:\n"
        "  - name: an\n"
        "    email: an@x.io\n"
        "    password_hash: scrypt$16384$8$1$c2FsdA$aGFzaA\n"
        f"    projects: {projects}\n"
    )
    return path


def auth_config(tmp_path: Path, users_file: Path, extra: str = "") -> Path:
    return write(
        tmp_path,
        f"auth: {{enabled: true, users_file: '{users_file.as_posix()}'{extra}}}\n"
        "projects:\n  - {name: a, path: /a}\n  - {name: b, path: /b}\n",
    )


# REQ-CONFIG-009 (Defaults)
def test_config_009_defaults(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("HOME", str(tmp_path))
    auth = load_settings(write(tmp_path, "projects: []\n")).auth
    assert auth.enabled is False
    assert auth.users_file == tmp_path / ".config/gin-console/users.yaml"
    assert auth.session_ttl == 12 * 3600
    rate = auth.rate_limit
    assert (rate.per_user, rate.per_ip, rate.window) == (5, 20, 15 * 60)


# REQ-CONFIG-009: the fields as written
def test_config_009_values(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("HOME", str(tmp_path))
    path = write(
        tmp_path,
        "auth:\n"
        "  users_file: ~/users.yaml\n"
        "  session_ttl: 5m\n"
        "  rate_limit: {per_user: 3, per_ip: 10, window: 1h}\n",
    )
    auth = load_settings(path).auth
    assert (auth.users_file, auth.session_ttl) == (tmp_path / "users.yaml", 300)
    rate = auth.rate_limit
    assert (rate.per_user, rate.per_ip, rate.window) == (3, 10, 3600)


# REQ-CONFIG-009: auth off never reads the users file
def test_config_009_off_ignores_missing_users_file(tmp_path: Path) -> None:
    path = write(tmp_path, f"auth: {{users_file: '{(tmp_path / 'none.yaml').as_posix()}'}}\n")
    assert load_settings(path).auth.enabled is False


# REQ-CONFIG-009: auth on with a valid users file starts
def test_config_009_enabled_with_users(tmp_path: Path) -> None:
    settings = load_settings(auth_config(tmp_path, write_users_file(tmp_path, "[a]")))
    assert settings.auth.enabled is True


# REQ-CONFIG-009 (Enabled without users)
def test_config_009_enabled_without_users_file(tmp_path: Path) -> None:
    users_file = tmp_path / "users.yaml"
    with pytest.raises(ConfigError, match="not found") as exc:
        load_settings(auth_config(tmp_path, users_file))
    assert str(users_file) in str(exc.value)


# REQ-CONFIG-009 (Enabled without users): a file that holds no user
@pytest.mark.parametrize("text", ["", "users: []\n"])
def test_config_009_enabled_with_no_user(tmp_path: Path, text: str) -> None:
    users_file = tmp_path / "users.yaml"
    users_file.write_text(text)
    with pytest.raises(ConfigError, match="no user") as exc:
        load_settings(auth_config(tmp_path, users_file))
    assert str(users_file) in str(exc.value)


# REQ-CONFIG-009: a users file that does not parse names the file
def test_config_009_enabled_with_invalid_users_file(tmp_path: Path) -> None:
    users_file = tmp_path / "users.yaml"
    users_file.write_text("users: [\n")
    with pytest.raises(ConfigError, match="invalid YAML") as exc:
        load_settings(auth_config(tmp_path, users_file))
    assert str(users_file) in str(exc.value)


# REQ-CONFIG-009 (Unknown project)
def test_config_009_unknown_project(tmp_path: Path) -> None:
    users_file = write_users_file(tmp_path, "[a, ghost]")
    with pytest.raises(ConfigError, match="ghost") as exc:
        load_settings(auth_config(tmp_path, users_file))
    assert str(users_file) in str(exc.value)


# REQ-CONFIG-009 (Invalid limit), REQ-CONFIG-003: a wrong type or range names the field
@pytest.mark.parametrize(
    ("text", "field"),
    [
        ("{rate_limit: {per_user: 0}}", r"auth\.rate_limit\.per_user"),
        ("{rate_limit: {per_user: '5'}}", r"auth\.rate_limit\.per_user"),
        ("{rate_limit: {per_ip: 0}}", r"auth\.rate_limit\.per_ip"),
        ("{rate_limit: {per_ip: 2.5}}", r"auth\.rate_limit\.per_ip"),
        ("{rate_limit: {window: 30s}}", r"auth\.rate_limit\.window"),
        ("{rate_limit: {window: 900}}", r"auth\.rate_limit\.window"),
        ("{rate_limit: {burst: 3}}", r"auth\.rate_limit\.burst"),
        ("{session_ttl: 1m}", r"auth\.session_ttl"),
        ("{session_ttl: 299s}", r"auth\.session_ttl"),
        ("{session_ttl: 12}", r"auth\.session_ttl"),
        ("{session_ttl: 99999999999h}", r"auth\.session_ttl"),
        ("{enabled: 'yes'}", r"auth\.enabled"),
        ("{enabled: 1}", r"auth\.enabled"),
        ("{users: []}", r"auth\.users"),
    ],
)
def test_config_009_invalid_field_names_the_field(tmp_path: Path, text: str, field: str) -> None:
    with pytest.raises(ConfigError, match=field):
        load_settings(write(tmp_path, f"auth: {text}\n"))


# REQ-CONFIG-009: the minimum is named in the message
@pytest.mark.parametrize(
    ("text", "minimum"),
    [("{session_ttl: 1m}", "5 minutes"), ("{rate_limit: {window: 30s}}", "one minute")],
)
def test_config_009_too_short_names_the_minimum(tmp_path: Path, text: str, minimum: str) -> None:
    with pytest.raises(ConfigError, match=f"must be at least {minimum}"):
        load_settings(write(tmp_path, f"auth: {text}\n"))


# REQ-CONFIG-006 (Too short): the pull_interval messages keep their wording
@pytest.mark.parametrize(
    ("text", "message"),
    [
        ("30s", "must be 0 or at least one minute"),
        ("5x", "must be 0 or a duration such as 90s, 5m or 1h"),
        ("99999999999h", "must be at most"),
    ],
)
def test_config_006_interval_messages(tmp_path: Path, text: str, message: str) -> None:
    path = write(tmp_path, f"beads: {{pull_interval: {text}}}\n")
    with pytest.raises(ConfigError, match=message) as exc:
        load_settings(path)
    assert "0 or at most" not in str(exc.value)


# REQ-CONFIG-010 (Default)
def test_config_010_default_has_no_gin_path(tmp_path: Path) -> None:
    assert load_settings(write(tmp_path, "projects: []\n")).gin.path is None


# REQ-CONFIG-010 (Set)
def test_config_010_absolute_path(tmp_path: Path) -> None:
    settings = load_settings(write(tmp_path, "gin: {path: /opt/gin/gin}\nprojects: []\n"))
    assert settings.gin.path == Path("/opt/gin/gin")


# REQ-CONFIG-010 (Relative path)
def test_config_010_relative_path_names_gin_path(tmp_path: Path) -> None:
    with pytest.raises(ConfigError, match=r"gin\.path") as exc:
        load_settings(write(tmp_path, "gin: {path: bin/gin}\nprojects: []\n"))
    assert "absolute" in str(exc.value)


# REQ-CONFIG-010 (Relative path)
def test_config_010_unknown_key_in_gin_section_refused(tmp_path: Path) -> None:
    with pytest.raises(ConfigError, match="gin"):
        load_settings(write(tmp_path, "gin: {exe: /opt/gin/gin}\nprojects: []\n"))

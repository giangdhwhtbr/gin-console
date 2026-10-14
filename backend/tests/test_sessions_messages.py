import json
from pathlib import Path
from typing import Any

import pytest
from claude_home import A, B, make_home, write_transcript
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.config import ProjectEntry, Settings

QWIK = ProjectEntry(name="qwikfone", path=Path("/home/gin/qwikfone"))
DIR = "-home-gin-qwikfone"


def client_for(tmp_path: Path, home: Path) -> TestClient:
    static = tmp_path / "dist"
    static.mkdir()
    return TestClient(create_app(Settings(projects=[QWIK]), static_dir=static, claude_home=home))


def messages(client: TestClient, session_id: str = A, **params: Any) -> Any:
    return client.get(f"/api/sessions/qwikfone/{session_id}/messages", params=params)


def user(text: str) -> dict[str, Any]:
    return {"type": "user", "message": {"content": text}}


def assistant(*blocks: dict[str, Any]) -> dict[str, Any]:
    return {"type": "assistant", "message": {"content": list(blocks)}}


# REQ-SESSIONS-006
def test_sessions_006_pages_add_up(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    records: list[dict[str, Any] | str] = []
    for n in range(250):
        records += [{"type": "mode"}, user(f"m{n}")]  # a non-message line between messages
    write_transcript(home, DIR, A, records)
    client = client_for(tmp_path, home)
    first = messages(client).json()
    assert len(first["items"]) == 100 and first["next_offset"] is not None
    second = messages(client, offset=first["next_offset"]).json()
    third = messages(client, offset=second["next_offset"]).json()
    assert len(second["items"]) == 100
    assert len(third["items"]) == 50 and third["next_offset"] is None
    texts = [i["blocks"][0]["text"] for p in (first, second, third) for i in p["items"]]
    assert texts == [f"m{n}" for n in range(250)]


# REQ-SESSIONS-006
def test_sessions_006_limit_is_bounded(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, DIR, A, [user("x")])
    client = client_for(tmp_path, home)
    assert messages(client, limit=0).status_code == 422
    assert messages(client, limit=501).status_code == 422
    assert messages(client, offset=-1).status_code == 422


# REQ-SESSIONS-006
def test_sessions_006_other_record_types_are_not_items(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(
        home,
        DIR,
        A,
        [
            {"type": "mode"},
            {"type": "attachment"},
            user("hi"),
            {"type": "ai-title", "aiTitle": "t"},
        ],
    )
    items = messages(client_for(tmp_path, home)).json()["items"]
    assert [i["role"] for i in items] == ["user"]


# REQ-SESSIONS-007
def test_sessions_007_block_kinds(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(
        home,
        DIR,
        A,
        [
            assistant(
                {"type": "thinking", "thinking": "hmm"},
                {"type": "text", "text": "hello"},
                {"type": "tool_use", "id": "t1", "name": "Bash", "input": {"command": "ls"}},
            ),
            {
                "type": "user",
                "message": {
                    "content": [
                        {"type": "tool_result", "tool_use_id": "t1", "content": "file.txt"},
                        {
                            "type": "tool_result",
                            "tool_use_id": "t1",
                            "content": [{"type": "text", "text": "a"}, {"type": "image"}],
                        },
                    ]
                },
            },
        ],
    )
    first, second = messages(client_for(tmp_path, home)).json()["items"]
    assert [b["type"] for b in first["blocks"]] == ["thinking", "text", "tool_use"]
    assert first["blocks"][0]["text"] == "hmm"
    assert first["blocks"][2]["name"] == "Bash"
    assert json.loads(first["blocks"][2]["input"]) == {"command": "ls"}
    assert [b["text"] for b in second["blocks"]] == ["file.txt", "a"]


# REQ-SESSIONS-007
def test_sessions_007_long_text_is_cut_and_marked(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(
        home,
        DIR,
        A,
        [
            {
                "type": "user",
                "message": {
                    "content": [
                        {"type": "tool_result", "tool_use_id": "t", "content": "x" * 50_000}
                    ]
                },
            }
        ],
    )
    (block,) = messages(client_for(tmp_path, home)).json()["items"][0]["blocks"]
    assert len(block["text"]) == 20_000 and block["truncated"] is True


# REQ-SESSIONS-007
def test_sessions_007_broken_line_is_skipped_but_counted(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, DIR, A, [user("one"), "{not json", user("two")])
    client = client_for(tmp_path, home)
    page = messages(client).json()
    assert [i["blocks"][0]["text"] for i in page["items"]] == ["one", "two"]
    assert messages(client, offset=1).json()["items"][0]["blocks"][0]["text"] == "two"


# REQ-SESSIONS-007
def test_sessions_007_deeply_nested_line_skipped_but_counted(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, DIR, A, [user("one"), "[" * 100_000, user("two")])
    client = client_for(tmp_path, home)
    resp = messages(client)
    assert resp.status_code == 200
    page = resp.json()
    assert [i["blocks"][0]["text"] for i in page["items"]] == ["one", "two"]
    assert messages(client, offset=1).json()["items"][0]["blocks"][0]["text"] == "two"


# REQ-SESSIONS-007
def test_sessions_007_malformed_message_and_content_shapes(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    records: list[dict[str, Any] | str] = [
        {"type": "user", "message": "string-not-dict"},
        {"type": "user", "message": {"content": None}},
        {"type": "user", "message": {"content": 5}},
        {"type": "user", "message": {"content": [5, None]}},
        user("valid"),
    ]
    write_transcript(home, DIR, A, records)
    client = client_for(tmp_path, home)
    resp = messages(client)
    assert resp.status_code == 200
    page = resp.json()
    assert len(page["items"]) == 1
    assert page["items"][0]["blocks"][0]["text"] == "valid"


# REQ-SESSIONS-007
def test_sessions_007_tool_use_with_list_input(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(
        home,
        DIR,
        A,
        [
            assistant(
                {"type": "tool_use", "id": "t1", "name": "Bash", "input": ["ls", "-la"]},
            )
        ],
    )
    client = client_for(tmp_path, home)
    resp = messages(client)
    assert resp.status_code == 200
    (item,) = resp.json()["items"]
    assert item["role"] == "assistant"
    (block,) = item["blocks"]
    assert block["type"] == "tool_use"
    assert block["name"] == "Bash"
    assert json.loads(block["input"]) == ["ls", "-la"]


# REQ-SESSIONS-007
def test_sessions_007_wrong_type_block_fields_do_not_raise(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(
        home,
        DIR,
        A,
        [
            assistant(
                {"type": "text", "text": 123},
                {"type": "thinking", "thinking": ["not", "string"]},
                {"type": "tool_use", "name": 456, "input": {"a": 1}},
            ),
            user("valid"),
        ],
    )
    client = client_for(tmp_path, home)
    resp = messages(client)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 2
    assert items[0]["blocks"][0]["type"] == "tool_use"
    assert items[1]["blocks"][0]["text"] == "valid"


# REQ-SESSIONS-008
@pytest.mark.parametrize("bad_id", ["not-a-uuid", "..", "%2e%2e%2f%2e%2e%2fetc%2fpasswd"])
def test_sessions_008_bad_ids_are_404(tmp_path: Path, bad_id: str) -> None:
    home = make_home(tmp_path)
    (tmp_path / "secret.jsonl").write_text(json.dumps(user("secret")))
    assert messages(client_for(tmp_path, home), bad_id).status_code == 404


# REQ-SESSIONS-008
def test_sessions_008_unknown_project_and_missing_transcript_are_404(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, DIR, A, [user("x")])
    client = client_for(tmp_path, home)
    assert client.get(f"/api/sessions/nope/{A}/messages").status_code == 404
    assert messages(client, B).status_code == 404


# REQ-SESSIONS-008
def test_sessions_008_other_projects_directory_is_not_searched(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, "-home-gin-other", A, [user("x")])
    assert messages(client_for(tmp_path, home)).status_code == 404


# REQ-SESSIONS-008
def test_sessions_008_reading_changes_nothing(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    path = write_transcript(home, DIR, A, [user("x")])
    before = (path.read_bytes(), path.stat().st_mtime_ns)
    messages(client_for(tmp_path, home))
    assert (path.read_bytes(), path.stat().st_mtime_ns) == before


# REQ-SESSIONS-008
def test_sessions_008_unreadable_transcript_is_404(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    path = write_transcript(home, DIR, A, [user("secret")])
    path.chmod(0)
    try:
        resp = messages(client_for(tmp_path, home))
        assert resp.status_code == 404
    finally:
        path.chmod(0o644)

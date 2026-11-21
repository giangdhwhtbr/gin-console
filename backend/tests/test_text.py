from gin_console.text import clean


def test_clean_replaces_lone_surrogates() -> None:
    assert clean("a\ud800b") == "a?b"
    assert clean("ok 😀") == "ok 😀"

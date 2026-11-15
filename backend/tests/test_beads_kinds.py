from gin_console.beads.kinds import complexity_of, declared_capabilities, kind_of, req_capabilities


# REQ-BEADS-001
def test_kind_of_epic_reads_the_kind_label() -> None:
    assert kind_of("epic", ["kind:technical"]) == "technical"
    assert kind_of("epic", ["x", "kind:parity"]) == "parity"


# REQ-BEADS-001
def test_kind_of_epic_defaults_to_capability() -> None:
    assert kind_of("epic", []) == "capability"
    assert kind_of("epic", ["kind:foo"]) == "capability"


# REQ-BEADS-001
def test_kind_of_non_epic_is_none() -> None:
    assert kind_of("task", ["kind:technical"]) is None


# REQ-BEADS-001
def test_declared_capabilities_splits_strips_and_drops_new() -> None:
    assert declared_capabilities("x\nCapabilities: beads, ui (new),  \ny") == ["beads", "ui"]


# REQ-BEADS-001
def test_declared_capabilities_empty_or_missing_line() -> None:
    assert declared_capabilities("x\nCapabilities:\ny") == []
    assert declared_capabilities("nothing here") == []


# REQ-BEADS-001
def test_req_capabilities_reads_valid_req_labels_only() -> None:
    labels = ["req:REQ-MILESTONE-UI-019", "req:REQ-UI-4", "req:bad", "prep"]
    assert req_capabilities(labels) == ["milestone-ui", "ui"]


# REQ-BEADS-001
def test_complexity_of_takes_the_first_word() -> None:
    assert complexity_of("a\nComplexity: medium: plan schema") == "medium"
    assert complexity_of("Complexity: huge") is None
    assert complexity_of("no line") is None

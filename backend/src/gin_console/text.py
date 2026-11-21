"""Text cleaning shared by every model that returns outside text."""


def clean(text: str) -> str:
    """Replace lone surrogates: valid in JSON, but a response cannot encode them as UTF-8."""
    return text.encode("utf-8", "replace").decode("utf-8")

class BeadsError(Exception):
    """The export file could not be read or held something unexpected; the message is shown to
    the operator."""


class BeadNotFound(Exception):
    """No such bead."""

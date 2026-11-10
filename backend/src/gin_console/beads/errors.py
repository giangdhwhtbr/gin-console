class BeadsError(Exception):
    """`bd` failed or said something unexpected; the message is shown to the operator."""


class BeadNotFound(Exception):
    """No such bead."""

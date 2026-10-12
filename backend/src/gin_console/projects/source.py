"""Projects come from the console config; existence is checked on every call."""

from gin_console.config import Settings
from gin_console.projects.models import Project


def list_projects(settings: Settings) -> list[Project]:
    return [
        Project(name=p.name, path=str(p.path), scotty_id=p.scotty_id, exists=p.path.is_dir())
        for p in settings.projects
    ]

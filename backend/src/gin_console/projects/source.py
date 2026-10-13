"""Projects come from the console config; existence and state are checked on every call."""

from gin_console.config import ProjectEntry, Settings
from gin_console.projects.collect import Collector
from gin_console.projects.models import Project


def build_project(entry: ProjectEntry, settings: Settings, collector: Collector) -> Project:
    exists = entry.path.is_dir()
    base = settings.server.scotty_base_url
    workflow, beads = collector.get(entry.name, entry.path) if exists else (None, None)
    return Project(
        name=entry.name,
        path=str(entry.path),
        scotty_id=entry.scotty_id,
        scotty_url=f"{base.rstrip('/')}/p/{entry.scotty_id}" if base and entry.scotty_id else None,
        exists=exists,
        workflow=workflow,
        beads=beads,
    )

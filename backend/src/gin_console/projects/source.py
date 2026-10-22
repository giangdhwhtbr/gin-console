"""Projects come from the console config; existence and state are checked on every call."""

from gin_console.config import ProjectEntry
from gin_console.projects.collect import Collector
from gin_console.projects.models import Project


def build_project(entry: ProjectEntry, collector: Collector) -> Project:
    exists = entry.path.is_dir()
    workflow, beads = collector.get(entry.name, entry.path) if exists else (None, None)
    return Project(
        name=entry.name,
        path=str(entry.path),
        exists=exists,
        workflow=workflow,
        beads=beads,
    )

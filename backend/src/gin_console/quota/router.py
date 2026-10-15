from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any

from fastapi import APIRouter

from gin_console.quota.models import ClaudeQuota, CodexQuota, Quota
from gin_console.quota.service import CachedSide
from gin_console.quota.source import get_claude, get_codex


def build_router(
    run_claude: Callable[[], str],
    run_codex: Callable[[], Any],
    clock: Callable[[], datetime],
) -> APIRouter:
    router = APIRouter()
    claude = CachedSide[ClaudeQuota](lambda now: get_claude(run_claude, now), clock)
    codex = CachedSide[CodexQuota](lambda now: get_codex(run_codex, now), clock)

    @router.get("/quota")
    def get_quota(refresh: str | None = None) -> Quota:
        force = refresh == "1"  # any other value means "no": it is never passed on
        with ThreadPoolExecutor(max_workers=2) as pool:
            claude_result = pool.submit(claude.get, force)
            codex_result = pool.submit(codex.get, force)
            return Quota(claude=claude_result.result(), codex=codex_result.result())

    return router

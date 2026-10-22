# Design: Retire Scotty

Epic: gin-console-rm-beads-native

## Architecture
- Backend: `config.py` drops `ServerSettings.scotty_base_url`, its validator and `_is_http_url` (if nothing else uses it) and `ProjectEntry.scotty_id`. Both models already use `extra="forbid"`, so a leftover key makes `load_settings` fail with pydantic's message, which names the key; `ConfigError` carries it to the exit (REQ-CONFIG-005 needs a test, no new code if the message already names the key). `projects/models.py` and `projects/source.py` drop `scotty_id` and `scotty_url`.
- Frontend: `projects/api.ts` drops the two fields from the type and the guard; `ProjectCard.tsx` renders the project name as a router `Link` to `/beads?project=${encodeURIComponent(name)}` (no `target`), and removes `MaybeLink` if nothing else uses it. Fixtures that carry `scotty_*` lose them.
- Docs: the living specs change through the spec delta; `config.example.yaml` loses `scotty_base_url` and the `scotty_id` line (the `scotty` project entry stays); `deploy/README.md` loses the Scotty sentence and the one-time `/bd` cleanup line. No one-time command is written into any repo file.

## Data Flow
No new flow. The Projects page still loads `/api/projects`; clicking a project name is a client-side navigation to the Beads page.

## Error Handling
A config with a retired key stops the console at startup with the key named (existing fail-fast path). The owner removes `scotty_id` from the real config before restarting; this is a manual step listed at the end of the work, and the repository does not touch files outside itself.

## Testing
Backend: config with `scotty_base_url` and with a project `scotty_id` exits naming the key; a valid config loads; `/api/projects` has exactly the remaining keys (no `scotty_*`). Frontend: the guard accepts a project without `scotty_*`; the project name links to `/beads?project=<name>` (including an encoded name) without `target`; the epic link is unchanged. Real-host check by the orchestrator: load a temporary copy of the owner's config without `scotty_id` (starts) and the real one as it is (fails naming `scotty_id`); `grep -ri scotty` over `backend/src`, `frontend/src`, `config.example.yaml`, `deploy/` and `docs/specs` shows only the `scotty` project entry and path.

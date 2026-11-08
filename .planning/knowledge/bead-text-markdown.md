# Bead text as Markdown

## Context
The bead page renders the description, acceptance criteria, design, notes and close reason as Markdown (REQ-UI-028, REQ-UI-038, epic gin-console-cl0). It uses `react-markdown` 10, `remark-gfm` and `remark-breaks` in `frontend/src/features/beads/MarkdownView.tsx`. Bead text comes from agents and people, so it is untrusted input.

## Decision/Solution
- No `rehype-raw`: react-markdown then escapes raw HTML, so `<script>` and `<img onerror>` render as text. This was checked with 10.1.0.
- `safeUrl` is an allow-list (`/^(https?:|mailto:)/i`), passed as `urlTransform`. react-markdown applies it to link `href` and to image `src`, so it covers `javascript:`, `data:`, `vbscript:`, mixed case, entity-encoded schemes, `//host`, relative paths and reference links. The `a` component renders a `span` when `href` is empty. `MarkdownView.test.tsx` holds a regression test for each of these cases (review finding F1 of gin-console-cl0.3).
- CommonMark treats a line that *starts* with an HTML tag as an HTML block, so the whole line is escaped text and `**bold**` on it is not parsed. Tests that mix raw HTML and Markdown put the Markdown first on the line.
- `MarkdownText.tsx` lazy-loads `MarkdownView`. The beads feature is in the main chunk (about 500 kB), and the Markdown libraries (164 kB) stay in their own chunk. Until that chunk loads, the text shows as plain pre-wrapped text.
- `remark-breaks` keeps single line breaks, as the plain text did.

## Consequences
- An https image in bead text loads from its host. The spec allows this.
- Comments (REQ-UI-039) and titles stay plain text.

## References
- `docs/changes/archive/2026-11-08-gin-console-cl0-milestones-forecast/`
- Tracks gin-console-cl0.3 (0a01a7b, 59f54a5)

## Scope
gin-console frontend: any place that renders user or agent text as Markdown.

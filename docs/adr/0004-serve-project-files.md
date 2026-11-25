# The console serves files of a project, isolated

Date: 2026-11-25
Status: proposed

## Context
Until epic gin-console-rm-requirements the console read only the Beads export of a project. The Requirements page shows change folders and confirmed interactive mockups. Mockups are HTML with scripts from a project checkout; served from the console's origin they could call its API as the viewer.

## Decision
The console reads project files only inside `docs/changes` and the asset folders of `docs/specs`, resolved with symbolic links, in one module. Markdown is returned as text and rendered without raw HTML. Mockup files are served only from folders a BA confirmed, by an extension list, with a Content-Security-Policy that sandboxes them (`allow-scripts` only, no connections, forms or frames), and are shown in an iframe with the same sandbox. A second origin or port was rejected because the console is one process behind one `tailscale serve` address. Not serving HTML was rejected because a BA would need a checkout.

## Consequences
Mockups that need module scripts, `fetch` or storage may not work. Later epics that serve project files (evidence images) reuse the path check or record a new decision. Anyone who can open the console can read the change folders and confirmed assets of its projects.

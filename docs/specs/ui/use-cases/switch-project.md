# Switch project

Actor: Team member
Trigger: The user opens the console, follows a navigation link, or chooses a project in the switcher
Requirements: REQ-UI-123, REQ-UI-124, REQ-UI-126, REQ-UI-055, REQ-UI-023, REQ-UI-088

## Goal

Work on one project across every page without choosing it again.

## Preconditions

- At least one configured project has an existing directory.

## Main flow
1. The user opens the Beads, Milestones or Reports page without a project in the URL.
2. The console takes the current project: the URL, else the project last chosen in this browser tab, else the favorite, else the first configured project.
3. The console shows the page for that project and writes it into the URL without a new history entry.
4. The user chooses another project in the switcher.
5. The console makes it the current project and shows the same page for it, keeping the view and dropping project-specific filters.
6. The user follows the Milestones link, which carries the current project.

## Alternative flows
- 4a. The user stars a project in the switcher: it becomes the favorite and is listed first. Resume at step 4.
- 4b. The user is on a bead or milestone page: the console opens the Beads or Milestones page of the chosen project. Resume at step 6.

## Exception flows
- 2a. The URL names a project that is not configured: the console shows "No project <name> is configured" with links to the configured projects and keeps the current project. Use case ends.
- 2b. The browser refuses to store the choice: the choice lasts for this visit. Resume at step 3.

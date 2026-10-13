# Ui

## Purpose

## Requirements

### REQ-UI-001: Projects page
WHEN the Projects page loads, the frontend SHALL list every project from `/api/projects` with its name and path, and SHALL mark each project whose `exists` is false with a "missing" badge.

#### Scenario: List with a missing project
- GIVEN `/api/projects` returns one existing and one missing project
- WHEN the Projects page loads
- THEN both rows show name and path, and only the missing one shows a "missing" badge

#### Scenario: No projects
- GIVEN `/api/projects` returns an empty list
- WHEN the Projects page loads
- THEN the page says no projects are configured and names the config file

### REQ-UI-002: API error with retry
IF the request to `/api/projects` fails, THEN the Projects page SHALL show an error message and a retry button that repeats the request.

#### Scenario: Failure then retry
- GIVEN the first request to `/api/projects` fails and the second succeeds
- WHEN the user clicks retry
- THEN the error disappears and the project list is shown

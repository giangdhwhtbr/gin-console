# Sign in

Actor: Console user
Trigger: The user opens the console while auth is on and has no valid session
Requirements: REQ-AUTH-002, REQ-AUTH-003, REQ-AUTH-004, REQ-AUTH-006, REQ-AUTH-014, REQ-AUTH-015

## Goal

The user reads the projects they are allowed to see.

## Preconditions

- `auth.enabled` is true and the operator has created the user (manage-users).

## Main flow
1. The console shows the sign-in screen.
2. The user enters their username and password and submits.
3. The console checks the rate limit and the password, creates a session and sets the cookie.
4. The console opens on the page the user asked for, with My work for the user's email and only their projects.

## Alternative flows
### 2a. Wrong password
1. The console answers "Wrong username or password" and counts a failure (REQ-AUTH-003).
2. Resume at step 2.

### 2b. Unknown username
1. The console answers the same message as 2a, after a dummy hash check.
2. Resume at step 2.

### 3a. Too many failures
1. The console answers "Too many attempts. Try again in <n> minutes" without checking the password (REQ-AUTH-004).
2. Use case ends.

## Exception flows
### 4e. Session ends while the console is open
1. The next API request answers 401 and the console shows the sign-in screen (REQ-AUTH-015).
2. Resume at step 2.

## Business rules

- REQ-AUTH-004: limits per username and per IP.
- REQ-AUTH-007: only assigned projects are visible.

## Postconditions

- A session exists until it expires, the user signs out, or the operator removes or resets the user.

# Manage users

Actor: Operator
Trigger: A person needs access, a new password, other projects, or no access
Requirements: REQ-AUTH-009, REQ-AUTH-010, REQ-AUTH-011, REQ-AUTH-012, REQ-AUTH-013

## Goal

The users file says who may sign in and which projects each person sees, without editing YAML by hand.

## Preconditions

- The operator has shell access on the console host and the config lists the projects.

## Main flow
1. The operator runs `python -m gin_console user add|passwd|assign|unassign|remove|list` with its arguments.
2. The CLI checks the user and project names against the users file and the config.
3. The CLI writes the users file atomically with mode 0600 and, for `add` and `passwd`, prints the generated password once.
4. The operator gives the password to the person over a private channel.
5. The running console reloads the users file on its next request and ends the sessions of removed or reset users.

## Alternative flows
### 3a. Invalid name, email or project
1. The CLI prints the reason on standard error, writes nothing and exits 1.
2. Use case ends.

### 3b. List
1. The CLI prints name, email and projects of every user, without hashes.
2. Use case ends.

## Exception flows
### 5e. The users file was broken by hand
1. The console keeps the last valid users and logs an error (REQ-AUTH-009).
2. Use case ends.

## Business rules

- REQ-AUTH-010: passwords are only generated, never typed.
- REQ-AUTH-013: format and mode of the users file.

## Postconditions

- The users file holds the change, and the running console applies it.

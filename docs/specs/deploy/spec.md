# Deploy

## Purpose

## Requirements

### REQ-DEPLOY-001: systemd user service
The repository SHALL provide a systemd user unit that runs the console, restarts it on failure, and stops retrying after repeated start failures.

#### Scenario: Survives reboot
- GIVEN the unit is enabled with `systemctl --user enable --now gin-console` and lingering is enabled
- WHEN the host reboots
- THEN `systemctl --user status gin-console` reports active

#### Scenario: Persistent config error
- GIVEN the config file is invalid
- WHEN the service starts
- THEN systemd stops restarting it after the start limit and `journalctl --user -u gin-console` shows the config error

### REQ-DEPLOY-002: Tailscale serve on a dedicated port
The deployment SHALL expose the console through `tailscale serve` on HTTPS port 8443 proxying to `http://127.0.0.1:8700`, and SHALL NOT depend on any other web application being served beside it.

#### Scenario: Reachable from the tailnet
- GIVEN the service is running and the serve rule is applied
- WHEN another tailnet device opens `https://<host>.ts.net:8443`
- THEN the Projects page loads

#### Scenario: Serve rule listed
- GIVEN the serve rule is applied
- WHEN the operator runs `tailscale serve status`
- THEN it lists `:8443` proxying to the console

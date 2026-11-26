# Spec Delta: Refuse cross-site API requests

## ADDED

### REQ-SERVER-012: Cross-site API requests
Type: non-functional
Category: security
WHEN a request to a path under `/api/` carries the header `Sec-Fetch-Site` with the value `cross-site` or `same-site`, the server SHALL answer 403 with `{"error": "cross-site request refused"}` and SHALL NOT run the endpoint, for every method, except a GET request under `/api/requirements/mockups/<project>/files/` (REQ-REQUIREMENTS-010). A request with `Sec-Fetch-Site` `same-origin` or `none`, or without the header, SHALL be handled as before.

#### Scenario: Image from another site
- GIVEN a page of another origin with `<img src="https://<console>/api/projects/beads">`
- WHEN the browser loads it
- THEN the answer is 403 and the endpoint does not run

#### Scenario: Refresh from another site
- GIVEN a page of another origin that posts to `/api/refresh` with `mode: "no-cors"`
- WHEN the request arrives with `Sec-Fetch-Site: cross-site`
- THEN the answer is 403 and no pull runs

#### Scenario: The console itself
- GIVEN the console page
- WHEN it requests `/api/projects/beads` with `Sec-Fetch-Site: same-origin`
- THEN the answer is 200

#### Scenario: Tools
- GIVEN curl or a test client that sends no `Sec-Fetch-Site`
- WHEN it requests `/api/projects/beads`
- THEN the answer is 200

#### Scenario: Mockup files
- GIVEN a confirmed mockup whose page loads its own `style.css`
- WHEN the request arrives with `Sec-Fetch-Site: cross-site`
- THEN the file is served; a POST to the same path is refused

## MODIFIED

### REQ-REQUIREMENTS-011: Mockup isolation
<!-- base: 2f736f3a163488f3251e49b5de535aaeca2bfa5408efd1c07f853759eb8950cf -->
Type: non-functional
Category: security
Every mockup file response SHALL carry `X-Content-Type-Options: nosniff` and the header `Content-Security-Policy` with `sandbox allow-scripts`, `connect-src 'none'`, `form-action 'none'` and `frame-src 'none'`. The frontend SHALL show a mockup only in an iframe whose `sandbox` attribute is exactly `allow-scripts`. A request a mockup makes to any other `/api` path, by any element or script, SHALL be refused (REQ-SERVER-012).

#### Scenario: Script calls the API
- GIVEN a mockup whose script fetches `/api/projects/beads` and posts to `/api/refresh`
- WHEN it is shown in the console or opened in its own tab
- THEN both calls are blocked and no refresh runs

#### Scenario: Interactive
- GIVEN a self-contained mockup with an inline script
- WHEN the user clicks its controls
- THEN it reacts

#### Scenario: SVG
- GIVEN an SVG file of a confirmed folder
- WHEN it is requested
- THEN its response carries the same headers

#### Scenario: Elements request the API
- GIVEN a mockup with `<img src="/api/projects/beads">` and `<script src="/api/projects/beads">`
- WHEN it is shown in the console or opened in its own tab
- THEN neither request reaches a console endpoint

## REMOVED

# syntax=docker/dockerfile:1.7
ARG UV_VERSION=0.13.0

FROM node:22-bookworm-slim AS frontend
ARG PNPM_VERSION=10.32.1
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /src/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv

# bd 1.0.5 has no release binary, and newer bd cannot read the schema of existing project databases
FROM golang:1.26-bookworm AS bd
ARG BD_VERSION=1.0.5
RUN git clone --depth 1 --branch v${BD_VERSION} https://github.com/gastownhall/beads.git /src \
 && cd /src \
 && CGO_ENABLED=1 go build -tags gms_pure_go -ldflags="-s -w -X main.Version=${BD_VERSION}" -o /out/bd ./cmd/bd

FROM node:22-bookworm-slim AS runtime
ARG CLAUDE_VERSION=2.1.296
ARG CODEX_VERSION=0.160.0
ARG GIN_WORKFLOW_REF=v1.4.2
ARG GIN_WORKFLOW_REPO=https://github.com/giangdhwhtbr/gin-workflow.git
ARG APP_UID=1002
ARG APP_GID=1002

RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl ca-certificates python3 python3-yaml \
 && rm -rf /var/lib/apt/lists/*
COPY --from=uv /uv /usr/local/bin/uv
COPY --from=bd /out/bd /usr/local/bin/bd

RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_VERSION} @openai/codex@${CODEX_VERSION}

# gin-workflow: pinned ref; a private repo authenticates through the gh_token BuildKit secret
RUN --mount=type=secret,id=gh_token \
    auth=""; \
    if [ -s /run/secrets/gh_token ]; then \
      auth="http.extraHeader=Authorization: Basic $(printf 'x-access-token:%s' "$(cat /run/secrets/gh_token)" | base64 -w0)"; \
    fi; \
    git ${auth:+-c "$auth"} clone --depth 1 --branch "${GIN_WORKFLOW_REF}" "${GIN_WORKFLOW_REPO}" /tmp/gw \
 && cp -r /tmp/gw/plugins/gin-workflow/src/scripts /opt/gin-workflow \
 && chmod +x /opt/gin-workflow/gin-workflow \
 && ln -s /opt/gin-workflow/gin-workflow /usr/local/bin/gin-workflow \
 && rm -rf /tmp/gw

WORKDIR /app/backend
ENV UV_PYTHON_INSTALL_DIR=/opt/python UV_PROJECT_ENVIRONMENT=/opt/venv UV_LINK_MODE=copy
COPY backend/pyproject.toml backend/uv.lock ./
COPY backend/src ./src
RUN uv sync --frozen --no-dev
COPY --from=frontend /src/frontend/dist /app/frontend/dist

RUN groupadd -g ${APP_GID} gin && useradd -m -u ${APP_UID} -g gin -s /bin/sh gin
USER gin
ENV HOME=/home/gin
EXPOSE 8700
CMD ["/opt/venv/bin/python", "-m", "gin_console"]

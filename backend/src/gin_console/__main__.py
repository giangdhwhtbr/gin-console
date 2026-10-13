import os
import sys

import uvicorn

from gin_console.app import create_app
from gin_console.config import (
    ConfigError,
    check_bind_host,
    effective_host,
    load_settings,
    resolve_config_path,
)


def main() -> int:
    try:
        settings = load_settings(resolve_config_path(os.environ))
        host = effective_host(settings, os.environ)
        check_bind_host(host, os.environ)
    except ConfigError as exc:
        print(f"gin-console: {exc}", file=sys.stderr)
        return 1
    uvicorn.run(create_app(settings), host=host, port=settings.server.port)
    return 0


if __name__ == "__main__":
    sys.exit(main())

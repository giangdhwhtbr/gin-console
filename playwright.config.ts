import { defineConfig, devices } from '@playwright/test';
import * as path from 'node:path';

// gin-qa e2e specs (qa/e2e). The specs stub /api/* with page.route, so the server only has to serve
// the built UI: run `pnpm -C frontend build` first. qa/e2e/gin-console.yaml sets port 8701, clear of the
// deployed service on 8700, and no projects.
const PORT = 8701;

export default defineConfig({
  testDir: 'qa/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...devices['Desktop Chrome'],
    // Gantt bars slide and the chart scrolls smoothly unless motion is reduced; specs that measure
    // positions would otherwise read them mid-animation (flaky on CI).
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'uv run --directory backend -m gin_console',
    env: { GIN_CONSOLE_CONFIG: path.resolve('qa/e2e/gin-console.yaml') },
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: true,
  },
});

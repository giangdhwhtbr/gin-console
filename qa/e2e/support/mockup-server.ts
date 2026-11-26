// A second console server for the mockup isolation specs (REQ-REQUIREMENTS-011): the real backend of this
// checkout on a free port, with a temporary config holding project `m`, whose folder
// docs/specs/ui/assets/2026-11-22 is confirmed. The mockup's responses and headers are the server's own.
import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';

export const MOCKUP = `<!doctype html><title>Mockup</title>
<button id="b">Click</button><p id="out"></p><p id="beads">pending</p><p id="refresh">pending</p>
<script>
const show = (id, text) => { document.getElementById(id).textContent = text; };
fetch('/api/projects/beads').then(() => show('beads', 'allowed'), () => show('beads', 'blocked'));
fetch('/api/refresh', { method: 'POST', mode: 'no-cors' }).then(() => show('refresh', 'allowed'), () => show('refresh', 'blocked'));
document.getElementById('b').onclick = () => show('out', 'clicked');
</script>`;

export type MockupServer = { base: string; log: () => string; stop: () => Promise<void> };

const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close(() => (address !== null && typeof address === 'object' ? resolve(address.port) : reject(new Error('no port'))));
    });
  });

/** Starts the server and waits until it answers; `stop` ends it and removes the temporary folder. */
export async function startMockupServer(): Promise<MockupServer> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gin-console-mockup-'));
  const folder = path.join(dir, 'm', 'docs', 'specs', 'ui', 'assets', '2026-11-22');
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'description.md'), '# Reports screen\nConfirmed: 2026-11-22\nConfirmed by: ba\n');
  fs.writeFileSync(path.join(folder, 'index.html'), MOCKUP);
  const port = await freePort();
  const config = path.join(dir, 'config.yaml');
  fs.writeFileSync(config, `server:\n  host: 127.0.0.1\n  port: ${port}\nprojects:\n  - name: m\n    path: ${path.join(dir, 'm')}\n    pull: false\n`);
  let output = '';
  const child: ChildProcess = spawn('uv', ['run', '--directory', path.resolve('backend'), '-m', 'gin_console'], {
    env: { ...process.env, GIN_CONSOLE_CONFIG: config },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let failed: Error | null = null;
  child.on('error', (error) => (failed = error)); // spawn failed: there is nothing to stop
  child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  const base = `http://127.0.0.1:${port}`;
  const stop = async () => {
    if (failed === null && child.pid !== undefined && child.exitCode === null) {
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.kill('SIGINT');
      await exited;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  };
  for (let attempt = 0; attempt < 100; attempt++) {
    if (failed !== null) break;
    try {
      if ((await fetch(`${base}/api/health`)).ok) return { base, log: () => output, stop };
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  await stop();
  throw new Error(`the mockup server did not start: ${failed === null ? '' : String(failed)}\n${output}`);
}

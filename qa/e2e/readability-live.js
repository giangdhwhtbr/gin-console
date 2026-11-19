#!/usr/bin/env node
// TC-1 of gin-console-3rr (REQ-UI-110): the readability check against a running console with real projects.
//   node qa/e2e/readability-live.js --base http://127.0.0.1:8700 --project example --project qwikfone --out <dir>
// Visits Projects, Beads (List, Board, Focus, Graph), an epic and a bead with points, My Tasks, Milestones, the
// milestone with velocity (Gantt at every zoom, Beads, Retro) and Reports (every tab) at 390, 1024, 1440 and
// 1920 px in light and dark, runs the in-page detector of qa/e2e/support/readability-inpage.js (the one
// qa/e2e/ui/readability.spec.ts uses), saves a screenshot of every page with findings and findings.json, and
// exits 1 when there is a finding. Read-only: it only loads pages.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const { inPage } = require('./support/readability-inpage.js');

const args = process.argv.slice(2);
const values = (name) => args.flatMap((a, i) => (a === `--${name}` && args[i + 1] ? [args[i + 1]] : []));
const base = (values('base')[0] ?? 'http://127.0.0.1:8700').replace(/\/$/, '');
const projects = values('project');
const out = values('out')[0];
if (!projects.length || !out) {
  console.error('usage: readability-live.js --base <url> --project <name> [--project <name>] --out <dir>');
  process.exit(2);
}
const WIDTHS = [[390, 844], [1024, 768], [1440, 900], [1920, 1080]];
const enc = encodeURIComponent;

async function json(url) {
  const response = await fetch(base + url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

async function pagesOf(project) {
  const pages = [];
  const add = (name, url) => pages.push({ name: `${project} ${name}`, url });
  for (const view of ['list', 'board', 'focus', 'graph']) add(`beads ${view}`, `/beads?project=${enc(project)}&milestone=all&view=${view}`);
  const beads = await json(`/api/beads?project=${enc(project)}&closed=1`);
  const epic = beads.find((b) => b.issue_type === 'epic' && b.points != null) ?? beads.find((b) => b.issue_type === 'epic');
  const task = beads.find((b) => b.issue_type !== 'epic' && b.points != null) ?? beads[0];
  const longest = [...beads].sort((a, b) => b.id.length - a.id.length)[0];
  for (const [label, b] of [['epic', epic], ['task', task], ['longest id', longest]]) {
    if (b) add(`bead ${label} ${b.id}`, `/beads/${enc(project)}/${enc(b.id)}`);
  }
  if (epic) add(`beads list panel ${epic.id}`, `/beads?project=${enc(project)}&milestone=all&view=list&select=${enc(epic.id)}`);
  add('bead graph', `/beads/${enc(project)}/graph`);
  add('milestones', `/milestones?project=${enc(project)}`);
  const list = await json(`/api/milestones?project=${enc(project)}`);
  const withVelocity = list.milestones.find((m) => m.velocity) ?? list.milestones[0];
  if (withVelocity) {
    const m = `/milestones/${enc(project)}/${enc(withVelocity.id)}`;
    for (const zoom of ['1w', '2w', 'all']) add(`gantt ${withVelocity.id} ${zoom}`, `${m}?tab=gantt&zoom=${zoom}`);
    add(`milestone ${withVelocity.id} beads`, `${m}?tab=beads`);
    add(`milestone ${withVelocity.id} retro`, `${m}?tab=retro`);
  }
  const closed = list.milestones.find((m) => m.status === 'closed');
  if (closed) add(`milestone ${closed.id} retro`, `/milestones/${enc(project)}/${enc(closed.id)}?tab=retro`);
  for (const tab of ['team', 'delivery', 'velocity', 'usage', 'quality', 'coverage']) add(`reports ${tab}`, `/reports?project=${enc(project)}&tab=${tab}`);
  return pages;
}

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForFunction(() => !/^Loading/m.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {});
}

(async () => {
  fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
  const pages = [{ name: 'projects', url: '/' }, { name: 'my tasks', url: '/my-tasks' }];
  for (const project of projects) pages.push(...(await pagesOf(project)));
  const browser = await chromium.launch();
  const results = [];
  let runs = 0;
  for (const theme of ['light', 'dark']) {
    for (const [width, height] of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await context.addInitScript((t) => {
        localStorage.setItem('gin-console.email', 'readability@example.com');
        localStorage.setItem('gin-console-theme', t);
      }, theme);
      const page = await context.newPage();
      for (const visit of pages) {
        runs += 1;
        const tag = `${visit.name.replace(/[^A-Za-z0-9.-]+/g, '_')}__${width}__${theme}`;
        try {
          await page.setViewportSize({ width, height });
          await page.goto(base + visit.url, { waitUntil: 'load', timeout: 30000 });
          await settle(page);
          const full = await page.evaluate(() => document.documentElement.scrollHeight);
          if (full > height) {
            await page.setViewportSize({ width, height: Math.min(full, 8000) });
            await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          }
          const findings = (await page.evaluate(inPage)).map(({ box, ...f }) => f);
          if (findings.length) {
            const shot = path.join('screenshots', `${tag}.png`);
            await page.screenshot({ path: path.join(out, shot), fullPage: true });
            results.push({ page: visit.name, url: visit.url, width, theme, screenshot: shot, findings });
          }
        } catch (error) {
          results.push({ page: visit.name, url: visit.url, width, theme, error: String(error.message).slice(0, 200), findings: [] });
        }
      }
      await context.close();
    }
  }
  await browser.close();
  const count = results.reduce((n, r) => n + r.findings.length, 0);
  const errors = results.filter((r) => r.error);
  fs.writeFileSync(path.join(out, 'findings.json'), JSON.stringify({ base, projects, runs, findings: count, errors: errors.length, results }, null, 2) + '\n');
  const byKind = {};
  for (const r of results) for (const f of r.findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
  console.log(`${runs} page runs (${pages.length} pages x ${WIDTHS.length} widths x 2 themes): ${count} findings ${JSON.stringify(byKind)}, ${errors.length} page errors`);
  for (const r of results.slice(0, 20)) {
    for (const f of r.error ? [{ kind: 'error', text: r.error, selector: '', detail: '' }] : r.findings.slice(0, 2)) {
      console.log(`  ${r.page} @${r.width} ${r.theme}: ${f.kind} "${f.text}"${f.other ? ` x "${f.other}"` : ''} ${f.detail}`);
    }
  }
  console.log(`findings.json and screenshots in ${out}`);
  process.exit(count > 0 || errors.length > 0 ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(2); });

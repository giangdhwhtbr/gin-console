const fs = require("fs");
const files = fs.readdirSync(__dirname + "/out");
const groups = {};
const nz = (t) => t.replace(/\d+/g, "#").replace(/\s+/g, " ").slice(0, 50);
function add(cat, key, rec, ctx) {
  const k = cat + "||" + key; const g = (groups[k] ||= { cat, key, rec, pages: new Set(), widths: new Set(), themes: new Set(), shots: [], n: 0 });
  g.pages.add(ctx.page); g.widths.add(ctx.w); g.themes.add(ctx.theme); g.n++; if (rec.shot && g.shots.length < 3) g.shots.push(rec.shot);
}
const pageInfo = [];
for (const f of files) {
  const [page, w, theme] = f.replace(".json", "").split("__"); const ctx = { page, w: +w, theme };
  const d = JSON.parse(fs.readFileSync(__dirname + "/out/" + f)); if (d.error) { console.log("ERR", f, d.error); continue; }
  if (d.page[0].hscroll) pageInfo.push(`${page} ${w} ${theme} hscroll ${d.page[0].docScrollW}>${d.page[0].innerW}`);
  for (const o of d.overlap) add("overlap", [o.a.sig, o.b.sig].sort().join(" <> "), { ...o, label: `"${o.a.text}" x "${o.b.text}"` }, ctx);
  for (const o of d.shape) add("shape", o.a.sig + " x " + o.b.sig, { ...o, label: `"${o.a.text}" x ${o.b.text}` }, ctx);
  for (const o of d.spill) add("spill", o.kind + o.sig, { ...o, label: `"${o.text}" over ${o.over}` }, ctx);
  for (const o of d.contrast) add("contrast", o.sig + "|" + o.ratio.toFixed(1), { ...o, label: `"${o.text}" ratio ${o.ratio}/${o.need}` }, ctx);
  for (const o of d.labelvalue) add("labelvalue", o.sig + o.uniform, { ...o, label: `"${o.text}" uniform=${o.uniform}` }, ctx);
  for (const o of d.emphasis) add("emphasis", o.sig + "|" + nz(o.text), { ...o, label: `"${o.text}" ${o.size}px ratio ${o.ratio}` }, ctx);
}
const cat = process.argv[2]; for (const k of Object.keys(groups)) if (/min-h-16 flex-1 flex-col/.test(k)) delete groups[k];
const out = Object.values(groups).filter(g => !cat || g.cat === cat).sort((a, b) => b.pages.size - a.pages.size);
for (const g of out) console.log(`[${g.cat}] n=${g.n} pages=${[...g.pages].slice(0, 6).join(",")}${g.pages.size > 6 ? "+" + (g.pages.size - 6) : ""} w=${[...g.widths].sort((a,b)=>a-b)} th=${[...g.themes]}\n   ${g.rec.label.slice(0, 200)}\n   cls=${g.rec.cls || g.rec.a?.cls} \n   ${g.shots[0] || ""}`);
if (!cat) console.log(pageInfo.join("\n"));

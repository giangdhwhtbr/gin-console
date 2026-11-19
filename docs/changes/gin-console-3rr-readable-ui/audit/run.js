// usage: node run.js <widths comma> <themes comma> [pageFilter regex]
const { chromium } = require("playwright"); const fs = require("fs"); const crypto = require("crypto");
const { pages, B } = require("./pages.js");
const widths = process.argv[2].split(",").map(Number), themes = process.argv[3].split(",");
const filt = process.argv[4] ? new RegExp(process.argv[4]) : null;
const code = fs.readFileSync(__dirname + "/inpage.js", "utf8");
const H = { 390: 844, 768: 1024, 1024: 768, 1280: 800, 1440: 900, 1920: 1080, 2560: 1440, 2000: 1100, 1600: 900 };
const h8 = (s) => crypto.createHash("md5").update(s).digest("hex").slice(0, 8);
(async () => {
  const b = await chromium.launch();
  for (const theme of themes) for (const w of widths) {
    const ctx = await b.newContext({ viewport: { width: w, height: H[w] || 900 } });
    await ctx.addInitScript((t) => { localStorage.setItem("gin-console.email", "giangdhwhtbr@gmail.com"); localStorage.setItem("gin-console-theme", t); }, theme);
    const p = await ctx.newPage();
    for (const pg of pages) {
      if (filt && !filt.test(pg.name)) continue;
      const tag = `${pg.name}__${w}__${theme}`; const outf = `${__dirname}/out/${tag}.json`;
      if (fs.existsSync(outf)) continue;
      try {
        await p.goto(B + pg.path, { waitUntil: process.env.FAST ? "load" : "networkidle", timeout: 30000 });
        await p.waitForTimeout(process.env.WAIT ? +process.env.WAIT : process.env.FAST ? 2500 : 900);
        const f = await p.evaluate(code);
        await p.screenshot({ path: `${__dirname}/full/${tag}.jpg`, fullPage: true, type: "jpeg", quality: 55 }).catch(() => {});
        // crops
        const sx = await p.evaluate(() => [scrollX, scrollY]);
        const take = async (cat, items, max, keyf) => {
          const seen = new Set(); let n = 0;
          for (const it of items) {
            const k = keyf(it); if (seen.has(k)) continue; seen.add(k); if (n >= max) break;
            const bx = it.box; if (!bx) continue;
            const x = Math.max(0, bx.l - 40 + sx[0]), y = Math.max(0, bx.t - 30 + sx[1]);
            const wd = Math.min(Math.max(bx.r - bx.l + 80, 120), 900), ht = Math.min(Math.max(bx.b - bx.t + 60, 60), 400);
            const file = `${__dirname}/shots/${tag}__${cat}-${h8(k)}.png`;
            try { await p.screenshot({ path: file, fullPage: true, clip: { x, y, width: Math.min(wd, w - x > 20 ? w - x : wd), height: ht } }); it.shot = file; n++; } catch (e) {}
          }
        };
        await take("overlap", f.overlap, 3, (i) => i.a.sig + i.b.sig);
        await take("shape", f.shape, 3, (i) => i.a.sig + i.b.sig);
        await take("spill", f.spill, 3, (i) => i.sig);
        await take("contrast", f.contrast, 2, (i) => i.sig);
        await take("labelvalue", f.labelvalue, 2, (i) => i.sig);
        await take("emphasis", f.emphasis, 2, (i) => i.sig);
        fs.writeFileSync(outf, JSON.stringify(f));
        console.log(tag, Object.entries(f).map(([k, v]) => k + ":" + v.length).join(" "));
      } catch (e) { console.log("ERR", tag, e.message.slice(0, 100)); fs.writeFileSync(outf, JSON.stringify({ error: e.message })); }
    }
    await ctx.close();
  }
  await b.close();
})();

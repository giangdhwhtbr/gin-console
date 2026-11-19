// In-page readability detector (REQ-UI-110), ported from
// docs/changes/gin-console-3rr-readable-ui/audit/inpage.js. Plain CommonJS so that both the typed helper
// (readability.ts, through page.evaluate) and the live script (readability-live.js) run the same code.
// `inPage` is serialised by Playwright: keep it self-contained (no imports, no outer variables).
//
// Fixes over the audit script:
// - a text rect is clipped by every clipping ancestor, the element itself included (a `truncate` span
//   reports only the part its ellipsis leaves visible);
// - two texts, or a text and a shape, only collide where document.elementsFromPoint shows both of them
//   (an opaque sticky layer over a text hides it, so it is not reported);
// - sr-only, hidden, `title`/`desc`, disabled text, texts in different fixed layers (bottom nav) and texts in
//   the same tooltip/popover are skipped.
function inPage() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const parse = (c) => {
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = "#000";
    cx.fillStyle = c;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const lum = ([r, g, b]) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const blend = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
  const cls = (el) => (el.getAttribute("class") || "").toString();
  const isSvg = (el) => el instanceof SVGElement;
  const norm = (t) => t.replace(/\s+/g, " ").trim();
  const path = (el) => {
    const out = [];
    let e = el;
    for (let i = 0; i < 4 && e && e !== document.body; i++, e = e.parentElement) {
      out.push(e.tagName.toLowerCase() + (cls(e) ? "." + cls(e).split(/\s+/).slice(0, 3).join(".") : ""));
    }
    return out.join(" < ");
  };
  const style = new Map();
  const cs = (e) => {
    let s = style.get(e);
    if (!s) { s = getComputedStyle(e); style.set(e, s); }
    return s;
  };

  function hidden(el) {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = cs(e);
      if (s.display === "none" || s.visibility === "hidden" || parseFloat(s.opacity) === 0) return true;
    }
    return false;
  }
  function srOnly(el) {
    const r = el.getBoundingClientRect();
    if (r.width <= 1 && r.height <= 1) return true;
    const s = cs(el);
    return s.clip === "rect(0px, 0px, 0px, 0px)" || s.clipPath === "inset(50%)";
  }
  function disabled(el) {
    return !!el.closest(":disabled, [aria-disabled=true]");
  }
  // the element itself counts: a truncate span is its own clip box
  function clipRects(el) {
    const out = [];
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = cs(e);
      if (s.overflowX !== "visible" || s.overflowY !== "visible") {
        const r = e.getBoundingClientRect();
        out.push({
          l: s.overflowX !== "visible" ? r.left : -1e9, r: s.overflowX !== "visible" ? r.right : 1e9,
          t: s.overflowY !== "visible" ? r.top : -1e9, b: s.overflowY !== "visible" ? r.bottom : 1e9,
        });
      }
    }
    return out;
  }

  const runs = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  const all = [];
  let n;
  while ((n = walker.nextNode())) all.push(n);
  for (const el of all) {
    const tag = el.tagName.toLowerCase();
    if (["script", "style", "noscript", "option", "title", "desc"].includes(tag)) continue;
    const nodes = [...el.childNodes].filter((c) => c.nodeType === 3 && c.textContent.trim());
    if (!nodes.length) continue;
    if (hidden(el) || srOnly(el) || disabled(el)) continue;
    const clips = clipRects(el);
    const rects = [];
    for (const tn of nodes) {
      const rg = document.createRange();
      rg.selectNodeContents(tn);
      for (const r of rg.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        let q = { l: r.left, r: r.right, t: r.top, b: r.bottom };
        for (const c of clips) q = { l: Math.max(q.l, c.l), r: Math.min(q.r, c.r), t: Math.max(q.t, c.t), b: Math.min(q.b, c.b) };
        // a Range box is the font's ascent to descent, taller than the glyphs: stacked lines with a tight
        // line-height touch by a few px without any ink overlapping, so compare the middle 70%
        const trim = (q.b - q.t) * 0.15;
        q = { ...q, t: q.t + trim, b: q.b - trim };
        if (q.r - q.l > 0.5 && q.b - q.t > 0.5) rects.push(q);
      }
    }
    if (!rects.length) continue;
    runs.push({ el, rects, text: norm(nodes.map((x) => x.textContent).join(" ")) });
  }

  // hit testing: every element answers, even with pointer-events: none (chart overlay layers)
  const pe = document.createElement("style");
  pe.textContent = "*{pointer-events:auto!important}";
  document.head.appendChild(pe);
  const startX = scrollX, startY = scrollY;

  function opaque(e) {
    const s = getComputedStyle(e);
    if (isSvg(e)) {
      if (e.tagName.toLowerCase() === "svg" || e.tagName.toLowerCase() === "g") return false;
      return !!s.fill && s.fill !== "none" && parse(s.fill)[3] >= 0.5 && !e.closest("text");
    }
    if (["IMG", "CANVAS", "VIDEO"].includes(e.tagName)) return true;
    return parse(s.backgroundColor)[3] >= 0.5 || s.backgroundImage !== "none";
  }
  /** Is `target` what the user sees at `p`: reached before any opaque element that is not part of it. */
  function seenAt(target, stack) {
    for (const e of stack) {
      if (target.contains(e) || e.contains(target)) return true;
      if (opaque(e)) return false;
    }
    return true; // nothing there: cannot tell, keep the finding
  }
  /** Run `test(stack)` with the point scrolled into view, then restore the scroll. */
  function atPoint(p, test) {
    let dx = 0, dy = 0;
    if (p.y < 1 || p.y > innerHeight - 2) dy = p.y - innerHeight / 2;
    if (p.x < 1 || p.x > innerWidth - 2) dx = p.x - innerWidth / 2;
    const sx = scrollX, sy = scrollY;
    if (dx || dy) scrollTo({ left: sx + dx, top: sy + dy, behavior: "instant" });
    const ax = scrollX - sx, ay = scrollY - sy;
    const x = p.x - ax, y = p.y - ay;
    const stack = x >= 0 && y >= 0 && x < innerWidth && y < innerHeight ? document.elementsFromPoint(x, y) : [];
    const r = test(stack);
    if (dx || dy) scrollTo({ left: sx, top: sy, behavior: "instant" });
    return r;
  }
  const samples = (b) => {
    const w = b.r - b.l, h = b.b - b.t;
    return [[0.5, 0.5], [0.2, 0.5], [0.8, 0.5], [0.5, 0.2], [0.5, 0.8]].map(([fx, fy]) => ({ x: b.l + w * fx, y: b.t + h * fy }));
  };
  const visibleTogether = (box, targets) =>
    samples(box).some((p) => atPoint(p, (stack) => stack.length === 0 || targets.every((t) => seenAt(t, stack))));

  const fixedAnc = (e) => {
    for (let x = e; x && x !== document.body; x = x.parentElement) if (cs(x).position === "fixed") return x;
    return null;
  };
  const POPUP = "[role=tooltip],[role=dialog],[data-radix-popper-content-wrapper],[data-slot=tooltip-content],[data-slot=popover-content]";
  const sameLayer = (a, b) => {
    if (fixedAnc(a) !== fixedAnc(b)) return true;
    const pa = a.closest(POPUP), pb = b.closest(POPUP);
    return pa && pa === pb;
  };
  const inter = (a, b) => {
    const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    return w > 0 && h > 0 ? { area: w * h, l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) } : null;
  };

  const findings = [];
  const short = (s) => s.slice(0, 80);
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const A = runs[i], B = runs[j];
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
      let best = null;
      for (const ra of A.rects) for (const rb of B.rects) {
        const x = inter(ra, rb);
        if (x && x.area > 4 && x.r - x.l > 1.5 && x.b - x.t > 1.5 && (!best || x.area > best.area)) best = x;
      }
      if (!best || sameLayer(A.el, B.el)) continue;
      if (!visibleTogether(best, [A.el, B.el])) continue;
      findings.push({
        kind: "overlap", text: short(A.text), other: short(B.text), selector: path(A.el) + "  x  " + path(B.el),
        detail: `${Math.round(best.r - best.l)}x${Math.round(best.b - best.t)}px at (${Math.round(best.l)}, ${Math.round(best.t)})`,
        box: best,
      });
    }
  }

  // shapes: svg fills, gantt lines and bars
  const shapes = [];
  for (const el of document.querySelectorAll("svg rect, svg path, svg circle, svg ellipse, svg polygon")) {
    const f = cs(el).fill;
    if (!f || f === "none" || parse(f)[3] < 0.3) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || hidden(el) || el.closest("marker, defs, clipPath, mask")) continue;
    shapes.push({ el, r, kind: "svg" });
  }
  for (const el of document.querySelectorAll("[data-line], figure[aria-label=Schedule] ol *")) {
    if (hidden(el)) continue;
    const r = el.getBoundingClientRect();
    if (el.hasAttribute("data-line")) {
      shapes.push({ el, r: { left: r.left, right: r.right + 1, top: r.top, bottom: r.bottom }, kind: "line" });
      continue;
    }
    if ([...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
    if (parse(cs(el).backgroundColor)[3] >= 0.5 && r.width >= 6 && r.height >= 6 && r.height < 40 && r.width < 1500 && el.children.length === 0) {
      shapes.push({ el, r, kind: "bar" });
    }
  }
  for (const run of runs) {
    for (const sh of shapes) {
      if (sh.el.contains(run.el) || run.el.contains(sh.el)) continue;
      if (sh.el.parentElement && sh.el.parentElement.contains(run.el) && sh.kind !== "svg") continue;
      const shClips = clipRects(sh.el.parentElement || sh.el);
      let best = null;
      for (const rr of run.rects) {
        let box = { l: sh.r.left, r: sh.r.right, t: sh.r.top, b: sh.r.bottom };
        for (const c of shClips) box = { l: Math.max(box.l, c.l), r: Math.min(box.r, c.r), t: Math.max(box.t, c.t), b: Math.min(box.b, c.b) };
        const x = inter(rr, box);
        if (x && x.area > 4 && x.r - x.l > 1.5 && x.b - x.t > 1.5 && (!best || x.area > best.area)) best = x;
      }
      if (!best || !visibleTogether(best, [run.el, sh.el])) continue;
      findings.push({
        kind: "shape", text: short(run.text), other: `[${sh.kind}] ${sh.el.tagName.toLowerCase()}`,
        selector: path(run.el) + "  x  " + path(sh.el),
        detail: `${Math.round(best.r - best.l)}x${Math.round(best.b - best.t)}px at (${Math.round(best.l)}, ${Math.round(best.t)})`,
        box: best,
      });
    }
  }

  // spill and contrast
  for (const run of runs) {
    const el = run.el, s = cs(el), er = el.getBoundingClientRect();
    const maxR = Math.max(...run.rects.map((r) => r.r)), minL = Math.min(...run.rects.map((r) => r.l));
    if (s.display !== "inline" && s.overflowX === "visible" && !isSvg(el)) {
      if (maxR > er.right + 1.5 || minL < er.left - 1.5) {
        const part = maxR > er.right + 1.5
          ? { l: er.right, r: maxR, t: run.rects[0].t, b: run.rects[0].b }
          : { l: minL, r: er.left, t: run.rects[0].t, b: run.rects[0].b };
        if (atPoint({ x: (part.l + part.r) / 2, y: (part.t + part.b) / 2 }, (st) => st.length === 0 || seenAt(el, st))) {
          findings.push({ kind: "spill", text: short(run.text), selector: path(el), detail: `text runs ${Math.round(Math.max(maxR - er.right, er.left - minL))}px past its box`, box: part });
        }
      }
    } else if (s.overflowX !== "visible" && el.scrollWidth > el.clientWidth + 1 && s.textOverflow !== "ellipsis" && !["auto", "scroll"].includes(s.overflowX) && !isSvg(el)) {
      findings.push({ kind: "spill", text: short(run.text), selector: path(el), detail: `clipped without an ellipsis, ${el.scrollWidth - el.clientWidth}px hidden`, box: run.rects[0] });
    }
    {
      let found = null;
      for (let a = el; a && a !== document.body; a = a.parentElement) {
        const as = cs(a);
        if (as.overflowX !== "visible") break;
        if (!/^(block|flex|grid|list-item|inline-block|inline-flex|table-cell)$/.test(as.display)) continue;
        const ar = a.getBoundingClientRect();
        if (ar.width < 20) continue;
        if (maxR > ar.right + 1.5 && ar.left <= minL + 1) { found = { a, ar }; break; }
      }
      const own = s.display !== "inline" && s.overflowX === "visible" && !isSvg(el) && maxR > er.right + 1.5;
      if (found && !own) {
        findings.push({ kind: "spill", text: short(run.text), selector: path(el), detail: `text runs ${Math.round(maxR - found.ar.right)}px past ${path(found.a).split(" < ")[0]}`, box: run.rects[0] });
      }
    }

    // contrast: effective background = the stack of translucent layers over the first opaque ancestor
    let fg = parse(s.color);
    if (isSvg(el)) { const f = s.fill; if (f && f !== "none") fg = parse(f); }
    let op = 1;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) op *= parseFloat(cs(e).opacity);
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const b = parse(cs(e).backgroundColor);
      if (b[3] > 0) { layers.push(b); if (b[3] >= 0.999) break; }
    }
    let base = document.documentElement.classList.contains("dark") ? [0, 0, 0] : [255, 255, 255];
    if (!layers.length || layers[layers.length - 1][3] < 0.999) {
      const b = parse(getComputedStyle(document.body).backgroundColor);
      if (b[3] >= 0.999) base = b.slice(0, 3);
    } else base = layers.pop().slice(0, 3);
    let bg = base;
    for (const L of layers.reverse()) bg = blend(L, bg);
    const fgc = blend([fg[0], fg[1], fg[2], fg[3] * op], bg);
    const cr = ratio(fgc, bg);
    const size = parseFloat(s.fontSize), wt = parseInt(s.fontWeight);
    const need = size >= 24 || (size >= 18.66 && wt >= 700) ? 3 : 4.5;
    if (cr < need) {
      findings.push({
        kind: "contrast", text: short(run.text), selector: path(el),
        detail: `${cr.toFixed(2)}:1, needs ${need}:1 (${size}px, weight ${wt}, text rgb(${fgc.map(Math.round)}) on rgb(${bg.map(Math.round)}))`,
        box: run.rects[0],
      });
    }
  }

  pe.remove();
  scrollTo({ left: startX, top: startY, behavior: "instant" });
  return findings;
}

module.exports = { inPage };

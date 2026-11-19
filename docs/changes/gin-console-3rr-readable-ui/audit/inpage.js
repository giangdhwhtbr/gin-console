(() => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const parse = (c) => { cx.clearRect(0,0,1,1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0,0,1,1); const d = cx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; };
  const lum = ([r,g,b]) => { const f = (v) => { v/=255; return v<=0.03928? v/12.92 : ((v+0.055)/1.055)**2.4; }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const ratio = (a,b) => { const l1=lum(a), l2=lum(b); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };
  const blend = (fg, bg) => [0,1,2].map(i => fg[i]*fg[3] + bg[i]*(1-fg[3]));
  const cls = (el) => (el.getAttribute("class") || "").toString();
  const isSvg = (el) => el instanceof SVGElement;
  const norm = (t) => t.replace(/\s+/g, " ").trim();
  const sig = (el) => { const p = el.parentElement; return `${el.tagName.toLowerCase()}|${cls(el)}`; };
  const path = (el) => { const out=[]; let e=el; for (let i=0;i<4&&e&&e!==document.body;i++,e=e.parentElement) out.push(e.tagName.toLowerCase()+(cls(e)?"."+cls(e).split(/\s+/).slice(0,3).join("."):"")); return out.join(" < "); };
  const mutedRGB = (() => { const p = document.createElement("span"); p.className="text-muted-foreground"; document.body.appendChild(p); const c = parse(getComputedStyle(p).color); p.remove(); return c; })();

  function hidden(el) {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.display === "none" || s.visibility === "hidden" || parseFloat(s.opacity) === 0) return true;
      if (e.getAttribute && e.getAttribute("aria-hidden") === "true" && false) return true;
    }
    return false;
  }
  function clipRects(el) {
    const out = [];
    for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.overflowX !== "visible" || s.overflowY !== "visible") {
        const r = e.getBoundingClientRect();
        out.push({ l: s.overflowX !== "visible" ? r.left : -1e9, r: s.overflowX !== "visible" ? r.right : 1e9, t: s.overflowY !== "visible" ? r.top : -1e9, b: s.overflowY !== "visible" ? r.bottom : 1e9 });
      }
    }
    return out;
  }
  function srOnly(el) { const r = el.getBoundingClientRect(); return (r.width <= 1 && r.height <= 1); }

  // text runs
  const runs = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  const all = []; let n; while ((n = walker.nextNode())) all.push(n);
  for (const el of all) {
    const tag = el.tagName.toLowerCase();
    if (["script","style","noscript","option"].includes(tag)) continue;
    const nodes = [...el.childNodes].filter(c => c.nodeType === 3 && c.textContent.trim());
    if (!nodes.length) continue;
    if (hidden(el) || srOnly(el)) continue;
    const clips = clipRects(el);
    const rects = [];
    for (const tn of nodes) {
      const rg = document.createRange(); rg.selectNodeContents(tn);
      for (const r of rg.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        let q = { l: r.left, r: r.right, t: r.top, b: r.bottom };
        for (const c of clips) { q = { l: Math.max(q.l,c.l), r: Math.min(q.r,c.r), t: Math.max(q.t,c.t), b: Math.min(q.b,c.b) }; }
        if (q.r - q.l > 0.5 && q.b - q.t > 0.5) rects.push(q);
      }
    }
    if (!rects.length) continue;
    runs.push({ el, rects, text: norm(nodes.map(x => x.textContent).join(" ")) });
  }
  const fixedAnc = (e) => { for (let x=e;x&&x!==document.body;x=x.parentElement){ if (getComputedStyle(x).position==='fixed') return x; } return null; };
  const sameLayer = (a, b) => {
    if (fixedAnc(a) !== fixedAnc(b)) return true;
    const pa = a.closest('[role=tooltip],[role=dialog],[data-radix-popper-content-wrapper],[data-slot=tooltip-content],[data-slot=popover-content]');
    const pb = b.closest('[role=tooltip],[role=dialog],[data-radix-popper-content-wrapper],[data-slot=tooltip-content],[data-slot=popover-content]');
    return pa && pa === pb;
  };
  const findings = { overlap: [], shape: [], spill: [], contrast: [], labelvalue: [], emphasis: [], page: [] };
  const inter = (a, b) => { const w = Math.min(a.r,b.r)-Math.max(a.l,b.l), h = Math.min(a.b,b.b)-Math.max(a.t,b.t); return w>0&&h>0 ? {area: w*h, l: Math.max(a.l,b.l), t: Math.max(a.t,b.t), r: Math.min(a.r,b.r), b: Math.min(a.b,b.b)} : null; };
  for (let i = 0; i < runs.length; i++) for (let j = i+1; j < runs.length; j++) {
    const A = runs[i], Bq = runs[j];
    if (A.el.contains(Bq.el) || Bq.el.contains(A.el) || sameLayer(A.el, Bq.el)) continue;
    let best = null;
    for (const ra of A.rects) for (const rb of Bq.rects) { const x = inter(ra, rb); if (x && x.area > 4 && (!best || x.area > best.area)) best = x; }
    if (best) findings.overlap.push({ a: { text: A.text.slice(0,80), cls: cls(A.el), sig: sig(A.el), path: path(A.el) }, b: { text: Bq.text.slice(0,80), cls: cls(Bq.el), sig: sig(Bq.el), path: path(Bq.el) }, area: Math.round(best.area), box: best });
  }
  // shapes
  const shapes = [];
  for (const el of document.querySelectorAll("svg rect, svg path, svg circle, svg ellipse, svg polygon")) {
    const s = getComputedStyle(el); const f = s.fill;
    if (!f || f === "none") continue; const c = parse(f); if (c[3] < 0.3) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || hidden(el)) continue;
    if (el.closest("marker, defs")) continue;
    shapes.push({ el, r, kind: "svg", group: el.parentElement });
  }
  for (const el of document.querySelectorAll('[data-line], figure[aria-label=Schedule] ol *')) {
    if (hidden(el)) continue;
    const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (el.hasAttribute("data-line")) { shapes.push({ el, r: { left: r.left, right: r.right + 1, top: r.top, bottom: r.bottom, width: 2, height: r.height }, kind: "line", group: el }); continue; }
    if ([...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) continue;
    const bg = parse(s.backgroundColor);
    if (bg[3] >= 0.5 && r.width >= 6 && r.height >= 6 && r.height < 40 && r.width < 1500 && el.children.length === 0) shapes.push({ el, r, kind: "bar", group: el });
  }
  for (const run of runs) {
    for (const sh of shapes) {
      if (sh.group.contains(run.el) || sh.el.contains(run.el)) continue;
      if (sh.kind === "svg" && sh.el.ownerSVGElement && sh.el.ownerSVGElement.contains(run.el) && false) continue;
      let best = null;
      for (const rr of run.rects) { const x = inter(rr, { l: sh.r.left, r: sh.r.right, t: sh.r.top, b: sh.r.bottom }); if (x && x.area > 4 && (!best || x.area > best.area)) best = x; }
      if (best) {
        // skip when text is inside the same element tree layered above shape? keep, but note
        findings.shape.push({ a: { text: run.text.slice(0,80), cls: cls(run.el), sig: sig(run.el), path: path(run.el) }, b: { text: `[${sh.kind}] ${sh.el.tagName.toLowerCase()}`, cls: cls(sh.el), sig: sh.kind + "|" + sig(sh.el), path: path(sh.el) }, area: Math.round(best.area), box: best });
      }
    }
  }
  // spill / contrast / label-value / emphasis
  const seenSpill = new Set();
  for (const run of runs) {
    const el = run.el; const s = getComputedStyle(el);
    const er = el.getBoundingClientRect();
    // spill: text rect beyond block box, overflow visible
    if (s.display !== "inline" && s.overflowX === "visible" && !isSvg(el)) {
      const maxR = Math.max(...run.rects.map(r => r.r)), minL = Math.min(...run.rects.map(r => r.l));
      if (maxR > er.right + 1.5 || minL < er.left - 1.5) findings.spill.push({ kind: "spill-visible", text: run.text.slice(0,100), cls: cls(el), sig: sig(el), path: path(el), over: Math.round(Math.max(maxR - er.right, er.left - minL)), box: { l: er.left, t: er.top, r: Math.max(er.right, maxR), b: er.bottom } });
    } else if (s.overflowX !== "visible" && el.scrollWidth > el.clientWidth + 1 && s.textOverflow !== "ellipsis" && !["auto","scroll"].includes(s.overflowX) && !isSvg(el)) {
      findings.spill.push({ kind: "clipped-no-ellipsis", text: run.text.slice(0,100), cls: cls(el), sig: sig(el), path: path(el), over: el.scrollWidth - el.clientWidth, box: { l: er.left, t: er.top, r: er.right, b: er.bottom } });
    }

    {
      const maxR2 = Math.max(...run.rects.map(r => r.r)), minL2 = Math.min(...run.rects.map(r => r.l));
      let found = null;
      for (let a = el; a && a !== document.body; a = a.parentElement) {
        const as = getComputedStyle(a);
        if (as.overflowX !== "visible") break;
        if (!/^(block|flex|grid|list-item|inline-block|inline-flex|table-cell)$/.test(as.display)) continue;
        const ar = a.getBoundingClientRect(); if (ar.width < 20) continue;
        if (maxR2 > ar.right + 1.5 && ar.left <= minL2 + 1) { found = { a, ar }; break; }
      }
      if (found && !(s.display !== "inline" && s.overflowX === "visible" && !isSvg(el) && (maxR2 > er.right + 1.5))) findings.spill.push({ kind: "spill-parent", text: run.text.slice(0,100), cls: cls(el), sig: sig(el), path: path(el), parentCls: cls(found.a), over: Math.round(maxR2 - found.ar.right), box: { l: found.ar.left, t: er.top, r: maxR2, b: er.bottom } });
    }
    // contrast
    let fg = parse(s.color); if (isSvg(el)) { const f = s.fill; if (f && f !== "none") fg = parse(f); }
    let op = 1; for (let e = el; e && e !== document.documentElement; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
    let bg = null; const layers = [];
    for (let e = el; e; e = e.parentElement) { const b = parse(getComputedStyle(e).backgroundColor); if (b[3] > 0) { layers.push(b); if (b[3] >= 0.999) break; } }
    let base = [255,255,255]; if (document.documentElement.classList.contains("dark")) base = [0,0,0];
    if (!layers.length || layers[layers.length-1][3] < 0.999) { const b = parse(getComputedStyle(document.body).backgroundColor); base = b[3] >= 0.999 ? b.slice(0,3) : base; }
    else { base = layers.pop().slice(0,3); }
    let b = base; for (const L of layers.reverse()) b = blend(L, b);
    fg = [fg[0], fg[1], fg[2], fg[3] * op]; const fgc = blend(fg, b);
    const cr = ratio(fgc, b);
    const size = parseFloat(s.fontSize), wt = parseInt(s.fontWeight);
    const large = size >= 24 || (size >= 18.66 && wt >= 700);
    const need = large ? 3 : 4.5;
    if (cr < need) findings.contrast.push({ text: run.text.slice(0,100), cls: cls(el), sig: sig(el), path: path(el), ratio: +cr.toFixed(2), need, size, weight: wt, fg: fgc.map(Math.round), bg: b.map(Math.round), box: { l: run.rects[0].l, t: run.rects[0].t, r: run.rects[0].r, b: run.rects[0].b } });
    // emphasis
    const full = norm(el.innerText || run.text);
    const isMuted = Math.abs(fgc[0]-mutedRGB[0])<12 && Math.abs(fgc[1]-mutedRGB[1])<12 && Math.abs(fgc[2]-mutedRGB[2])<12 || cr < 5;
    const key = /\b\d+(\.\d+)?\s?(pt|pts|points?)\b|\bPoints?\b|\bEstimate|\bestimat|\b\d+\s?d (left|late|over)|\bdue\b|\boverdue\b|\bfinish|\bwarning|\bblocked\b|\bNo confirmed spec|\bdays? (left|late)|\bP[0-4]\b|\bin.progress\b|\bclosed\b|\bopen\b|\bover (budget|capacity)|\bspill|\blate\b/i;
    if (key.test(run.text) && (isMuted || size <= 12) && run.text.length < 160) findings.emphasis.push({ text: run.text.slice(0,120), cls: cls(el), sig: sig(el), path: path(el), size, weight: wt, ratio: +cr.toFixed(2), muted: isMuted, box: { l: run.rects[0].l, t: run.rects[0].t, r: run.rects[0].r, b: run.rects[0].b } });
  }
  // label/value runs
  for (const el of all) {
    if (hidden(el) || isSvg(el)) continue;
    const txt = norm(el.textContent || "");
    if (txt.length < 20 || txt.length > 400) continue;
    const dots = (txt.match(/ · /g) || []).length;
    const labels = (txt.match(/\b(Owner|Assignee|Created by|Created|Updated|Points?|Estimate|Status|Priority|Closed|Due|Start|End|Finish|Opened|Branch|Milestone|Parent|Type|Labels?)\b/g) || []).length;
    if (!(dots >= 2 || (dots >= 1 && labels >= 2))) continue;
    // deepest element satisfying: skip if a child also satisfies
    if ([...el.children].some(c => { const t = norm(c.textContent||""); return ((t.match(/ · /g)||[]).length >= 2) ; })) continue;
    const styles = new Set(); const walk = (e) => { if ([...e.childNodes].some(c => c.nodeType===3 && c.textContent.trim())) { const st = getComputedStyle(e); styles.add(st.color + "|" + st.fontWeight + "|" + st.fontSize); } for (const c of e.children) walk(c); };
    walk(el);
    const r = el.getBoundingClientRect();
    findings.labelvalue.push({ text: txt.slice(0,160), cls: cls(el), sig: sig(el), path: path(el), distinctStyles: styles.size, uniform: styles.size === 1, box: { l: r.left, t: r.top, r: r.right, b: r.bottom } });
  }
  findings.page.push({ docScrollW: document.documentElement.scrollWidth, innerW: innerWidth, hscroll: document.documentElement.scrollWidth > innerWidth + 1, bodyText: norm(document.body.innerText).slice(0,120), runs: runs.length });
  return findings;
})()

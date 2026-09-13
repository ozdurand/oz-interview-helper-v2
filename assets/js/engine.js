/* ===========================================================
   engine.js — renders a diagram definition
   edge = [from, to, label, cls, opts]
     cls  : '' | 'dash' | 't2' | 't3'
     opts : { dir:'one'|'two'|'none', route:'auto'|'straight'|'flip' }
   endpoints may be node ids or band ids
   =========================================================== */

const Engine = (() => {

  const esc = s => String(s == null ? '' : s);
  const stripTags = s => esc(s).replace(/<[^>]*>/g, '');

  function wrap(text, maxPx, charPx) {
    const words = stripTags(text).split(/\s+/);
    const max = Math.max(4, Math.floor(maxPx / charPx));
    const lines = []; let cur = '';
    for (const w of words) {
      if (!cur) { cur = w; continue; }
      if ((cur + ' ' + w).length <= max) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /* ---------- routing ---------- */
  function sides(a, b) {
    if (b.x > a.x + a.w + 6) return 'R';
    if (a.x > b.x + b.w + 6) return 'L';
    if (b.y > a.y + a.h) return 'D';
    return 'U';
  }
  function route(a, b, opts) {
    const gap = 3, side = sides(a, b), o = opts || {};
    const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };

    if (o.route === 'straight') {
      let p1, p2;
      if (side === 'R') { p1 = { x: a.x + a.w, y: ac.y }; p2 = { x: b.x - gap, y: bc.y }; }
      else if (side === 'L') { p1 = { x: a.x, y: ac.y }; p2 = { x: b.x + b.w + gap, y: bc.y }; }
      else if (side === 'D') { p1 = { x: ac.x, y: a.y + a.h }; p2 = { x: bc.x, y: b.y - gap }; }
      else { p1 = { x: ac.x, y: a.y }; p2 = { x: bc.x, y: b.y + b.h + gap }; }
      return { d: `M${p1.x} ${p1.y} L${p2.x} ${p2.y}`, mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2 - 6 };
    }

    const flip = o.route === 'flip';
    if (side === 'R' || side === 'L') {
      const x1 = side === 'R' ? a.x + a.w : a.x, x2 = side === 'R' ? b.x - gap : b.x + b.w + gap;
      const y1 = ac.y, y2 = bc.y;
      if (Math.abs(y1 - y2) < 4) return { d: `M${x1} ${y1} L${x2} ${y1}`, mx: (x1 + x2) / 2, my: y1 - 8 };
      if (flip) {
        const ya = y2 > y1 ? a.y + a.h : a.y;
        return { d: `M${ac.x} ${ya} V${y2} H${x2}`, mx: (ac.x + x2) / 2, my: y2 - 6 };
      }
      const mx = (x1 + x2) / 2;
      return { d: `M${x1} ${y1} H${mx} V${y2} H${x2}`, mx, my: (y1 + y2) / 2 };
    }
    const y1 = side === 'D' ? a.y + a.h : a.y, y2 = side === 'D' ? b.y - gap : b.y + b.h + gap;
    const x1 = ac.x, x2 = bc.x;
    if (Math.abs(x1 - x2) < 4) return { d: `M${x1} ${y1} L${x1} ${y2}`, mx: x1 + 10, my: (y1 + y2) / 2 };
    if (flip) {
      const xa = x2 > x1 ? a.x + a.w : a.x;
      return { d: `M${xa} ${ac.y} H${x2} V${y2}`, mx: (xa + x2) / 2, my: ac.y - 6 };
    }
    const my = (y1 + y2) / 2;
    return { d: `M${x1} ${y1} V${my} H${x2} V${y2}`, mx: (x1 + x2) / 2, my: my - 6 };
  }

  function resolve(node, variant) {
    const v = (node.variants && variant && node.variants[variant]) || {};
    return { ...node, name: v.name || node.name, sub: v.sub !== undefined ? v.sub : node.sub, detail: v.detail || node.detail };
  }

  /* box tones: [fill, stroke, dashed?] */
  const TONES = {
    plain:  ['#152238', '#24385A'],
    slate:  ['#1A2635', '#64748b'],
    blue:   ['rgba(59,130,246,.16)', '#3b82f6'],
    purple: ['rgba(139,92,246,.17)', '#8b5cf6'],
    pink:   ['rgba(236,72,153,.16)', '#ec4899'],
    green:  ['rgba(34,197,94,.15)', '#22c55e'],
    rose:   ['rgba(244,63,94,.15)', '#f43f5e'],
    teal:   ['rgba(20,184,166,.17)', '#14b8a6'],
    amber:  ['rgba(245,158,11,.16)', '#f59e0b'],
    orange: ['rgba(234,88,12,.17)', '#ea580c'],
    white:  ['rgba(255,255,255,.07)', '#ea580c'],
    note:   ['rgba(255,255,255,.03)', '#64748b', true],
    citi:   ['rgba(163,196,110,.22)', '#A3C46E']
  };
  const ACC_TONE = { 1: ['#152238', '#F2A93B'], 2: ['#152238', '#3ED6C0'], 3: ['#152238', '#A98BF5'] };
  function toneOf(n) {
    if (n.tone && TONES[n.tone]) return TONES[n.tone];
    if (n.acc && ACC_TONE[n.acc]) return ACC_TONE[n.acc];
    return TONES.plain;
  }
  /* edge styles: [color, dasharray] */
  const EDGES = {
    '':           ['#3B5077', ''],
    sync:         ['#94a3b8', ''],
    dash:         ['#3B5077', '5 4'],
    async:        ['#94a3b8', '7 5'],
    t2:           ['#3ED6C0', '5 4'],
    t3:           ['#A98BF5', '2 4'],
    pub:          ['#ec4899', ''],
    hyb:          ['#14b8a6', ''],
    term:         ['#ea580c', ''],
    'term-dash':  ['#ea580c', '8 6'],
    'green-dash': ['#22c55e', '8 6'],
    'blue-dash':  ['#3b82f6', '7 5'],
    violet:       ['#A98BF5', ''],
    amber:        ['#F2A93B', ''],
    ink:          ['#CBD5E1', ''],
    'ink-dash':   ['#CBD5E1', '7 5']
  };
  const EDGE_LABELS = [['', 'Solid'], ['dash', 'Dashed'], ['sync', 'Sync call'], ['async', 'Async / data (dashed)'], ['pub', 'Pub / sub (pink)'],
    ['hyb', 'Hybrid retrieval (teal)'], ['term', 'Term lookup (orange)'], ['term-dash', 'Orange dashed'], ['green-dash', 'Green dashed'],
    ['blue-dash', 'Blue dashed'], ['ink', 'Light solid'], ['ink-dash', 'Light dashed'], ['t2', 'Teal dashed (gate)'], ['t3', 'Violet dotted (governance)'], ['violet', 'Violet'], ['amber', 'Amber']];
  const TONE_LABELS = [['', 'Plain'], ['slate', 'Slate'], ['blue', 'Blue'], ['purple', 'Purple'], ['pink', 'Pink'], ['green', 'Green'], ['teal', 'Teal'],
    ['rose', 'Rose'], ['amber', 'Amber'], ['orange', 'Orange'], ['white', 'Outline (orange)'], ['note', 'Note (dashed)'], ['citi', 'Green (Citi)']];
  const mid = (c) => 'm' + c.replace(/[^a-z0-9]/gi, '');

  /* waypoint anchoring: where a path leaves a box, given the next point */
  function anchor(box, pt) {
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const clampX = Math.min(box.x + box.w - 10, Math.max(box.x + 10, pt.x));
    const clampY = Math.min(box.y + box.h - 10, Math.max(box.y + 10, pt.y));
    if (pt.y >= box.y + box.h) return { x: clampX, y: box.y + box.h };
    if (pt.y <= box.y) return { x: clampX, y: box.y };
    if (pt.x >= box.x + box.w) return { x: box.x + box.w, y: clampY };
    if (pt.x <= box.x) return { x: box.x, y: clampY };
    return { x: cx, y: cy };
  }
  function routePts(a, b, o) {
    const pts = (o.pts || []).map(p => ({ x: p[0], y: p[1] }));
    const p0 = o.from ? { x: o.from[0], y: o.from[1] } : anchor(a, pts[0] || { x: b.x + b.w / 2, y: b.y + b.h / 2 });
    const pn = o.to ? { x: o.to[0], y: o.to[1] } : anchor(b, pts[pts.length - 1] || p0);
    const all = [p0, ...pts, pn];
    let d = `M${all[0].x} ${all[0].y}`; for (let i = 1; i < all.length; i++) d += ` L${all[i].x} ${all[i].y}`;
    /* label on the longest segment */
    let best = 0, bi = 0;
    for (let i = 1; i < all.length; i++) { const l = Math.hypot(all[i].x - all[i - 1].x, all[i].y - all[i - 1].y); if (l > best) { best = l; bi = i; } }
    const mx = (all[bi].x + all[bi - 1].x) / 2, my = (all[bi].y + all[bi - 1].y) / 2;
    const horiz = Math.abs(all[bi].y - all[bi - 1].y) < 4;
    return { d, mx: horiz ? mx : mx + 8, my: horiz ? my - 7 : my, anchor: horiz ? 'middle' : 'start' };
  }

  function render(dgm, state) {
    const variant = state.variant, depth = state.depth || 3;
    const editing = !!state.editing, sel = state.sel || null;
    const geo = {};
    (dgm.bands || []).forEach(b => { geo[b.id] = { ...b, isBand: true }; });
    const nodes = dgm.nodes.map(n => { const r = resolve(n, variant); geo[n.id] = r; return r; });

    const fs = dgm.font || 1;
    const colors = new Set(Object.values(EDGES).map(e => e[0]).concat(['#8CF5A6', '#FFFFFF']));
    let out = `<svg viewBox="0 0 ${dgm.w} ${dgm.h}" width="${dgm.w}" height="${dgm.h}" xmlns="http://www.w3.org/2000/svg" class="${editing ? 'editing' : ''}" style="--fs:${fs}">
<defs>`;
    colors.forEach(c => { out += `<marker id="${mid(c)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9 Z" fill="${c}"/></marker>`; });
    out += `<marker id="ar-p" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9 Z" fill="#8CF5A6"/></marker>
  <marker id="ar-s" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9 Z" fill="#FFFFFF"/></marker>
</defs>`;

    /* sheet chrome: title, subtitle, legend, footnote */
    if (dgm.sheet) {
      const sh = dgm.sheet;
      if (sh.title) out += `<text class="sh-title" x="40" y="${52 * fs}">${sh.title}</text>`;
      if (sh.sub) out += `<text class="sh-sub" x="40" y="${52 * fs + 26 * fs}">${sh.sub}</text>`;
      if (sh.foot) out += `<text class="sh-sub" x="40" y="${dgm.h - 30}">${sh.foot}</text>`;
      if (sh.legend && sh.legend.length) {
        let x = dgm.w - 40;
        const items = sh.legend.slice().reverse();
        items.forEach(([label, cls]) => {
          const st = EDGES[cls] || EDGES[''];
          const tw = label.length * 6.4 * fs;
          x -= tw;
          out += `<text class="sh-leg" x="${x}" y="${48 * fs}">${label}</text>`;
          x -= 52;
          out += `<path d="M${x} ${43 * fs} L${x + 44} ${43 * fs}" stroke="${st[0]}" stroke-width="2" ${st[1] ? `stroke-dasharray="${st[1]}"` : ''} marker-end="url(#${mid(st[0])})"/>`;
          x -= 26;
        });
        if (sh.note) out += `<text class="sh-leg" x="${dgm.w - 40}" y="${48 * fs + 20 * fs}" text-anchor="end">${sh.note}</text>`;
      }
    }

    (dgm.sheet && dgm.sheet.texts || []).forEach(([x, y, txt, an]) => {
      out += `<text class="sh-sub" x="${x}" y="${y}" text-anchor="${an || 'middle'}">${txt}</text>`;
    });

    (dgm.bands || []).forEach(b => {
      const s = sel && sel.type === 'band' && sel.id === b.id ? ' sel' : '';
      if (b.style === 'rule') {
        out += `<g class="band rule${s}${b.detail ? ' hasdetail' : ''}" data-bandid="${b.id}"><rect class="band-bg" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="0" style="--bf:transparent;--bs:transparent"/>`;
        out += `<text class="band-lb rule" x="${b.x}" y="${b.y + 14 * fs}">${b.name}</text>`;
        out += `<line class="band-rule" x1="${b.x}" y1="${b.y + 24 * fs}" x2="${b.x + b.w}" y2="${b.y + 24 * fs}"/>`;
        if (editing && s) out += `<rect class="handle" data-handle="band" data-hid="${b.id}" x="${b.x + b.w - 8}" y="${b.y + b.h - 8}" width="16" height="16" rx="3"/>`;
        out += `</g>`; return;
      }
      const t = b.tone && TONES[b.tone] ? TONES[b.tone] : null;
      const style = t ? ` style="--bs:${t[1]};--bf:${t[0]};stroke-dasharray:9 7"` : '';
      out += `<g class="band${s}${b.detail ? ' hasdetail' : ''}" data-bandid="${b.id}"><rect class="band-bg" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.inside ? 6 : 12}"${style}/>`;
      if (b.inside) out += `<text class="band-lb inside" x="${b.x + 14}" y="${b.y + 22 * fs}"${t ? ` style="fill:${t[1]}"` : ''}>${b.name}</text>`;
      else out += `<text class="band-lb" x="${b.x + 4}" y="${b.y - 10}">${b.name}</text>`;
      if (editing && s) out += `<rect class="handle" data-handle="band" data-hid="${b.id}" x="${b.x + b.w - 8}" y="${b.y + b.h - 8}" width="16" height="16" rx="3"/>`;
      out += `</g>`;
    });

    (dgm.edges || []).forEach((e, i) => {
      const [aId, bId, label, cls, opts] = e;
      const a = geo[aId], b = geo[bId];
      if (!a || !b) return;
      const o = opts || {};
      const dim = ((a.depth || 1) > depth || (b.depth || 1) > depth) ? ' dimmed' : '';
      const s = sel && sel.type === 'edge' && sel.i === i ? ' sel' : '';
      const r = (o.pts && o.pts.length) || o.from || o.to ? routePts(a, b, o) : route(a, b, o);
      if (o.lbl) { r.mx = o.lbl[0]; r.my = o.lbl[1]; r.anchor = o.la || 'middle'; }
      const st = EDGES[cls || ''] || EDGES[''];
      const mk = s ? 'ar-s' : mid(st[0]);
      const dir = o.dir || 'one';
      const mEnd = dir === 'none' ? '' : `marker-end="url(#${mk})"`;
      const mStart = dir === 'two' ? `marker-start="url(#${mk})"` : '';
      const estyle = ` style="--es:${st[0]}${st[1] ? `;stroke-dasharray:${st[1]}` : ''}"`;
      out += `<g data-edge="${i}" class="edgewrap${dim}${s}">`;
      out += `<path class="edge-hit" d="${r.d}"/>`;
      out += `<path class="edge" d="${r.d}"${estyle} ${mEnd} ${mStart}/>`;
      if (label) out += `<text class="edge-lb" x="${r.mx}" y="${r.my}" text-anchor="${r.anchor || 'middle'}" style="fill:${st[0]}">${label}</text>`;
      out += `</g>`;
    });

    nodes.forEach(n => {
      const dim = (n.depth || 1) > depth ? ' dimmed' : '';
      const s = sel && sel.type === 'node' && sel.id === n.id ? ' sel' : '';
      const t = toneOf(n);
      const cx = n.x + n.w / 2;
      const TL = 17 * fs, SL = 14 * fs;
      const tw = n.shape === 'diamond' ? n.w * 0.62 : n.w - 24;
      const titleLines = String(n.name).split('\n').flatMap(l => wrap(l, tw, 7.9 * fs));
      const subLines = n.sub ? String(n.sub).split('\n').flatMap(l => wrap(l, tw + 2, 6.4 * fs)) : [];
      const blockH = titleLines.length * TL + (subLines.length ? subLines.length * SL + 4 : 0);
      let ty = n.y + n.h / 2 - blockH / 2 + 13 * fs;
      out += `<g class="n-hit${dim}${s}" data-node="${n.id}" tabindex="0" role="button" aria-label="${stripTags(n.name)}">`;
      const ns = `style="--nf:${t[0]};--ns:${t[1]}${t[2] ? ';stroke-dasharray:8 6' : ''}"`;
      if (n.shape === 'cyl') {
        const ry = Math.min(14, n.h * 0.12);
        out += `<path class="n-box" ${ns} d="M${n.x} ${n.y + ry} A${n.w / 2} ${ry} 0 0 1 ${n.x + n.w} ${n.y + ry} V${n.y + n.h - ry} A${n.w / 2} ${ry} 0 0 1 ${n.x} ${n.y + n.h - ry} Z"/>`;
        out += `<path class="n-box" ${ns} d="M${n.x} ${n.y + ry} A${n.w / 2} ${ry} 0 0 0 ${n.x + n.w} ${n.y + ry}"/>`;
      } else if (n.shape === 'diamond') {
        out += `<polygon class="n-box" ${ns} points="${cx},${n.y} ${n.x + n.w},${n.y + n.h / 2} ${cx},${n.y + n.h} ${n.x},${n.y + n.h / 2}"/>`;
      } else {
        out += `<rect class="n-box" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${fs > 1.2 ? 6 : 10}" ${ns}/>`;
      }
      titleLines.forEach(l => { out += `<text class="n-title" x="${cx}" y="${ty}" text-anchor="middle">${l}</text>`; ty += TL; });
      if (subLines.length) { ty += 3; subLines.forEach(l => { out += `<text class="n-sub" x="${cx}" y="${ty}" text-anchor="middle">${l}</text>`; ty += SL; }); }
      if (editing && s) out += `<rect class="handle" data-handle="node" data-hid="${n.id}" x="${n.x + n.w - 8}" y="${n.y + n.h - 8}" width="16" height="16" rx="3"/>`;
      out += `</g>`;
    });

    out += `</svg>`;
    return { svg: out, nodes, byId: geo };
  }

  return { render, resolve, stripTags, EDGE_LABELS, TONE_LABELS };
})();

/* ===========================================================
   editor.js — everything that changes content.
   Sits on top of app.js via OZ.ui; nothing here runs unless
   edit mode is on.
   =========================================================== */
window.Editor = (() => {
'use strict';

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const ui = () => OZ.ui;
const D = () => OZ.ui.D;
const snap = v => Math.round(v / 10) * 10;
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------------- edit mode toggle ---------------- */
function injectToggles() {
  $$('.vbar-actions').forEach(a => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ghost edittoggle'; b.textContent = 'Edit';
    a.prepend(b);
  });
  const homeBtn = document.createElement('button');
  homeBtn.type = 'button'; homeBtn.className = 'ghost edittoggle home-edit'; homeBtn.textContent = 'Edit';
  $('.home-wrap').prepend(homeBtn);
  const mx = document.createElement('button');
  mx.type = 'button'; mx.className = 'ghost edittoggle'; mx.textContent = 'Edit';
  $('.matrix-head').insertBefore(mx, $('#closeMatrix'));
  $$('.edittoggle').forEach(b => b.addEventListener('click', toggle));

  /* diagram edit toolbar */
  const bar = document.createElement('div');
  bar.id = 'editbar'; bar.hidden = true;
  bar.innerHTML = `
    <button type="button" class="tool" data-e="addbox">+ Box</button>
    <button type="button" class="tool" data-e="addcol">+ Column layer</button>
    <button type="button" class="tool" data-e="addstrip">+ Strip layer</button>
    <button type="button" class="tool" data-e="connect">Connect →</button>
    <button type="button" class="tool" data-e="editsel" disabled>Edit…</button>
    <button type="button" class="tool" data-e="sheet">Titles &amp; trace…</button>
    <button type="button" class="tool danger" data-e="delsel" disabled>Delete</button>
    <span class="editstatus" id="editStatus">Tap to select · drag to move · corner to resize · double-tap to edit text · tap the map title or legend to edit it</span>
    <span class="tool-group" style="margin-left:auto">
      <button type="button" class="tool" data-e="undo" title="Ctrl+Z">Undo</button>
      <button type="button" class="tool" data-e="redo" title="Ctrl+Shift+Z">Redo</button>
      <button type="button" class="tool danger" data-e="reset">Reset all</button>
    </span>`;
  $('#dTools').after(bar);
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-e]'); if (!b) return;
    ACTIONS[b.dataset.e]();
  });

  /* undo/redo/reset on narrative + matrix screens */
  const mini = () => {
    const d = document.createElement('div'); d.className = 'editmini'; d.hidden = true;
    d.innerHTML = `<button type="button" class="ghost sm" data-e="undo">Undo</button><button type="button" class="ghost sm" data-e="redo">Redo</button><button type="button" class="ghost sm danger" data-e="reset">Reset all</button><span class="editstatus">Click any text to edit · + and × on rows</span>`;
    d.addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (b) ACTIONS[b.dataset.e](); });
    return d;
  };
  $('#view .vbar').after(mini());
  $('#card .vbar').after(mini());
  $('.matrix-head').after(mini());
  refreshEditedFlag();
}

function toggle() {
  OZ.editing = !OZ.editing;
  document.body.classList.toggle('editing', OZ.editing);
  $$('.edittoggle').forEach(b => { b.textContent = OZ.editing ? 'Done editing' : 'Edit'; b.classList.toggle('on', OZ.editing); });
  $('#editbar').hidden = !OZ.editing;
  $$('.editmini').forEach(m => m.hidden = !OZ.editing);
  D().sel = null; mode = null; connectFrom = null;
  ui().closeDeck();
  ui().rerender();
  setStatus();
}
function refreshEditedFlag() { document.body.classList.toggle('has-edits', OZ.hasEdits()); }
function commit() { OZ.save(); refreshEditedFlag(); }

/* ---------------- in-place text ---------------- */
function sanitize(html) {
  return html
    .replace(/<div><br><\/div>/g, '').replace(/<div>/g, ' ').replace(/<\/div>/g, '')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<(?!\/?(b|i|em|strong)\b)[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
function setText(el, clean) {
  const p = el.dataset.p;
  if (el.dataset.line !== undefined) {
    const lines = String(OZ.get(p) == null ? '' : OZ.get(p)).split('\n');
    lines[Number(el.dataset.line)] = clean;
    OZ.set(p, lines.join('\n'));
  } else if (el.dataset.part !== undefined) {
    const parts = String(OZ.get(p) == null ? '' : OZ.get(p)).split('—').map(x => x.trim());
    const head = Number(el.dataset.part) === 0 ? clean : parts[0];
    const tail = Number(el.dataset.part) === 1 ? clean : parts.slice(1).join(' — ');
    OZ.set(p, tail ? `${head} — ${tail}` : head);
  } else OZ.set(p, clean);
}
let focusSnapshotTaken = false, textTimer = null;
document.addEventListener('focusin', e => {
  if (!OZ.editing || !e.target.classList || !e.target.classList.contains('ed')) return;
  OZ.snapshot(); focusSnapshotTaken = true;
});
document.addEventListener('input', e => {
  if (!OZ.editing || !e.target.classList || !e.target.classList.contains('ed')) return;
  const el = e.target;
  clearTimeout(textTimer);
  textTimer = setTimeout(() => { setText(el, sanitize(el.innerHTML)); commit(); }, 250);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('ed')) { e.preventDefault(); e.target.blur(); }
});
document.addEventListener('focusout', e => {
  if (!OZ.editing || !e.target.classList || !e.target.classList.contains('ed')) return;
  const el = e.target;
  clearTimeout(textTimer);
  const clean = sanitize(el.innerHTML);
  setText(el, clean); commit();
  if (el.innerHTML !== clean) el.innerHTML = clean;
  if (el.dataset.p.startsWith('diagrams.') && ui().current().screen === 'diagram') {
    if (/\.chips\./.test(el.dataset.p)) return;           /* chips: nothing else depends on them */
    ui().buildRail();
  }
});

/* editable text inside a link or button (matrix cells, quick links, the matrix button):
   while editing, a click places the caret instead of navigating */
document.addEventListener('click', e => {
  if (!OZ.editing) return;
  const ed = e.target.closest && e.target.closest('.ed');
  if (ed && ed.closest('a, button')) { e.preventDefault(); e.stopPropagation(); }
}, true);

/* ---------------- row tools (arrays in narrative + chips) ---------------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || !OZ.editing) return;
  e.preventDefault();
  const arr = OZ.get(b.dataset.arr); if (!Array.isArray(arr)) return;
  OZ.snapshot();
  const i = Number(b.dataset.i);
  if (b.dataset.act === 'del') arr.splice(i, 1);
  else { const tpl = JSON.parse(b.dataset.tpl); i < 0 ? arr.push(tpl) : arr.splice(i + 1, 0, tpl); }
  commit(); ui().rerender();
});

/* ---------------- diagram editing ---------------- */
let mode = null;            /* null | 'connect' */
let connectFrom = null;
let drag = null;            /* {kind:'move'|'resize', type, id, sx, sy, orig, moved} */
let lastTap = { id: null, t: 0 };
let raf = 0;

function dgm() { return OZ.ui.layout(); }
function nodeOf(id) { return dgm().nodes.find(n => n.id === id); }
function bandOf(id) { return (dgm().bands || []).find(b => b.id === id); }
function setStatus(t) {
  const el = $('#editStatus'); if (!el) return;
  el.textContent = t || (mode === 'connect'
    ? (connectFrom ? 'Now tap the target box or layer' : 'Tap the source box or layer · Esc to cancel')
    : 'Tap to select · drag to move · corner to resize · double-tap to edit text · tap the map title or legend to edit it');
}
function refreshSelButtons() {
  const has = !!D().sel;
  $('[data-e="editsel"]').disabled = !has;
  $('[data-e="delsel"]').disabled = !has;
}
function select(sel) { D().sel = sel; ui().paint(); refreshSelButtons(); }

function growCanvas() {
  const g = dgm(); let mx = 900, my = 600;
  (g.bands || []).forEach(b => { mx = Math.max(mx, b.x + b.w + 40); my = Math.max(my, b.y + b.h + 40); });
  g.nodes.forEach(n => { mx = Math.max(mx, n.x + n.w + 40); my = Math.max(my, n.y + n.h + 40); });
  g.w = mx; g.h = my;
}
function bandContaining(n) {
  const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
  const b = (dgm().bands || []).find(b => cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h);
  return b ? b.id : null;
}
function viewportCenter() {
  const r = ui().stage.getBoundingClientRect();
  return ui().toDiagram(r.left + r.width / 2, r.top + r.height / 2);
}

/* pointer hooks — return true when the editor consumed the event */
function onDown(e) {
  const t = e.target;
  const handle = t.closest && t.closest('.handle');
  const nodeG = t.closest && t.closest('.n-hit');
  const bandG = t.closest && t.closest('.band');
  const edgeG = t.closest && t.closest('.edgewrap');

  if (mode === 'connect') {
    const id = nodeG ? nodeG.dataset.node : bandG ? bandG.dataset.bandid : null;
    if (!id) return true;
    if (!connectFrom) { connectFrom = id; setStatus(); ui().canvas.querySelectorAll('.lit').forEach(x => x.classList.remove('lit')); (nodeG || bandG).classList.add('lit'); return true; }
    if (id !== connectFrom) {
      OZ.snapshot();
      dgm().edges.push([connectFrom, id, '', '', { dir: 'one', route: 'auto' }]);
      commit();
      const i = dgm().edges.length - 1;
      mode = null; connectFrom = null; $('[data-e="connect"]').classList.remove('on');
      select({ type: 'edge', i }); setStatus(); openForm({ type: 'edge', i }, { noSnap: true });
    }
    return true;
  }

  if (t.closest && t.closest('.sh-title, .sh-sub, .sh-leg')) { openForm({ type: 'sheet' }); return true; }

  const p = ui().toDiagram(e.clientX, e.clientY);
  if (handle) {
    const type = handle.dataset.handle, id = handle.dataset.hid;
    const o = type === 'node' ? nodeOf(id) : bandOf(id);
    drag = { kind: 'resize', type, id, sx: p.x, sy: p.y, orig: { w: o.w, h: o.h }, moved: false };
    OZ.snapshot(); ui().stage.setPointerCapture(e.pointerId); return true;
  }
  if (nodeG) {
    const id = nodeG.dataset.node, n = nodeOf(id);
    select({ type: 'node', id });
    const now = Date.now();
    if (lastTap.id === id && now - lastTap.t < 380) { lastTap = { id: null, t: 0 }; openForm({ type: 'node', id }); return true; }
    lastTap = { id, t: now };
    drag = { kind: 'move', type: 'node', id, sx: p.x, sy: p.y, orig: { x: n.x, y: n.y }, moved: false };
    OZ.snapshot(); ui().stage.setPointerCapture(e.pointerId); return true;
  }
  if (bandG) {
    const id = bandG.dataset.bandid, b = bandOf(id);
    select({ type: 'band', id });
    const now = Date.now();
    if (lastTap.id === id && now - lastTap.t < 380) { lastTap = { id: null, t: 0 }; openForm({ type: 'band', id }); return true; }
    lastTap = { id, t: now };
    drag = { kind: 'move', type: 'band', id, sx: p.x, sy: p.y, orig: { x: b.x, y: b.y }, moved: false, nodes: dgm().nodes.filter(n => n.band === id).map(n => ({ n, x: n.x, y: n.y })) };
    OZ.snapshot(); ui().stage.setPointerCapture(e.pointerId); return true;
  }
  if (edgeG) {
    const i = Number(edgeG.dataset.edge);
    select({ type: 'edge', i });
    const now = Date.now();
    if (lastTap.id === 'e' + i && now - lastTap.t < 380) { lastTap = { id: null, t: 0 }; openForm({ type: 'edge', i }); }
    else lastTap = { id: 'e' + i, t: now };
    return true;
  }
  if (D().sel) select(null);
  return false;
}
function onMove(e) {
  if (!drag) return false;
  const p = ui().toDiagram(e.clientX, e.clientY);
  const dx = p.x - drag.sx, dy = p.y - drag.sy;
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true;
  const o = drag.type === 'node' ? nodeOf(drag.id) : bandOf(drag.id);
  if (drag.kind === 'move') {
    const nx = snap(drag.orig.x + dx), ny = snap(drag.orig.y + dy);
    if (drag.type === 'band') { const ddx = nx - o.x, ddy = ny - o.y; (drag.nodes || []).forEach(r => { r.n.x = snap(r.x + (nx - drag.orig.x)); r.n.y = snap(r.y + (ny - drag.orig.y)); }); void ddx; void ddy; }
    o.x = nx; o.y = ny;
  } else {
    o.w = Math.max(60, snap(drag.orig.w + dx)); o.h = Math.max(40, snap(drag.orig.h + dy));
  }
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; ui().paint(); });
  return true;
}
function onUp(e) {
  if (!drag) return false;
  const d = drag; drag = null;
  try { ui().stage.releasePointerCapture(e.pointerId); } catch (x) {}
  if (!d.moved) { OZ.undoStack.pop(); ui().paint(); return true; }
  if (d.type === 'node') { const n = nodeOf(d.id); n.band = bandContaining(n) || n.band; }
  growCanvas(); commit(); ui().paint(); ui().buildRail();
  return true;
}
function onEscape() {
  if (mode === 'connect') { mode = null; connectFrom = null; $('[data-e="connect"]').classList.remove('on'); ui().paint(); setStatus(); return true; }
  if (D().sel) { select(null); return true; }
  return false;
}

/* ---------------- actions ---------------- */
const ACTIONS = {
  addbox() {
    OZ.snapshot();
    const c = viewportCenter();
    const n = { id: OZ.uid('n'), band: null, x: snap(c.x - 100), y: snap(c.y - 40), w: 200, h: 80, name: 'New box', sub: '', detail: {} };
    n.band = bandContaining(n);
    dgm().nodes.push(n); growCanvas(); commit();
    select({ type: 'node', id: n.id }); openForm({ type: 'node', id: n.id }, { noSnap: true });
  },
  addcol() { addBand(250, 480); },
  addstrip() { addBand(900, 130); },
  connect() {
    if (mode === 'connect') { onEscape(); return; }
    mode = 'connect'; connectFrom = null; select(null);
    $('[data-e="connect"]').classList.add('on'); setStatus();
  },
  editsel() { if (D().sel) openForm(D().sel); },
  sheet() { openForm({ type: 'sheet' }); },
  delsel() {
    const s = D().sel; if (!s) return;
    OZ.snapshot();
    const g = dgm();
    if (s.type === 'node') {
      g.nodes = g.nodes.filter(n => n.id !== s.id);
      g.edges = g.edges.filter(e => e[0] !== s.id && e[1] !== s.id);
      (g.trace || []).forEach(t => { t.nodes = t.nodes.filter(x => x !== s.id); });
    } else if (s.type === 'band') {
      g.bands = g.bands.filter(b => b.id !== s.id);
      g.edges = g.edges.filter(e => e[0] !== s.id && e[1] !== s.id);
      g.nodes.forEach(n => { if (n.band === s.id) n.band = null; });
    } else if (s.type === 'edge') {
      g.edges.splice(s.i, 1);
    }
    ui().closeDeck();
    commit(); select(null); ui().buildRail();
  },
  undo() { if (OZ.undo()) { D().sel = null; ui().closeDeck(); ui().rerender(); refreshEditedFlag(); refreshSelButtons(); } },
  redo() { if (OZ.redo()) { D().sel = null; ui().closeDeck(); ui().rerender(); refreshEditedFlag(); refreshSelButtons(); } },
  reset() {
    if (!confirm('Throw away every edit in this browser and go back to the shipped content?')) return;
    OZ.reset(); D().sel = null; ui().closeDeck(); ui().rerender(); refreshEditedFlag(); refreshSelButtons();
  }
};
function addBand(w, h) {
  OZ.snapshot();
  const c = viewportCenter();
  const b = { id: OZ.uid('b'), name: 'New layer', x: snap(c.x - w / 2), y: snap(c.y - h / 2), w, h };
  (dgm().bands = dgm().bands || []).push(b); growCanvas(); commit();
  select({ type: 'band', id: b.id }); ui().buildRail(); openForm({ type: 'band', id: b.id }, { noSnap: true });
}

/* ---------------- forms in the deck ---------------- */
const F = (label, name, val, kind, opts) => {
  const id = 'f_' + name;
  let ctl;
  if (kind === 'textarea') ctl = `<textarea id="${id}" name="${name}" rows="${opts && opts.rows || 3}">${esc(val)}</textarea>`;
  else if (kind === 'select') ctl = `<select id="${id}" name="${name}">${opts.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(val) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
  else if (kind === 'check') ctl = `<label class="chk"><input type="checkbox" id="${id}" name="${name}"${val ? ' checked' : ''}> ${opts}</label>`;
  else ctl = `<input id="${id}" name="${name}" type="text" value="${esc(val)}">`;
  return `<div class="ff"><label for="${id}">${label}</label>${ctl}</div>`;
};
/* map text is stored as HTML-safe text; show it plain in the form, store it escaped */
const plain = s => String(s == null ? '' : s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const safe = s => String(s == null ? '' : s).trim().replace(/&(?![a-z#0-9]+;)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let formTarget = null, formTimer = null;

function openForm(sel, opts) {
  const deck = ui().deck, scrim = ui().scrim;
  if (!(opts && opts.noSnap)) OZ.snapshot();
  formTarget = sel;
  deck.classList.add('form'); deck.hidden = false; scrim.hidden = false; scrim.classList.add('light');
  $('#deckFoot').hidden = true;
  const g = dgm();
  let eyebrow = '', title = '', body = '';

  if (sel.type === 'node') {
    const n = nodeOf(sel.id);
    const vKey = D().dgm.layouts ? null : D().variant, vg = D().dgm.variantGroup;
    const hasOverride = !!(vKey && n.variants && n.variants[vKey]);
    const src = hasOverride ? { ...n, ...n.variants[vKey], detail: n.variants[vKey].detail || n.detail } : n;
    const d = src.detail || {};
    eyebrow = 'Editing box'; title = n.name;
    body = `
      ${vg && vKey ? F('', 'vonly', hasOverride, 'check', `Only for “${(vg.options.find(o => o.id === vKey) || {}).label}” (leave off to edit the shared text)`) : ''}
      ${F('Name', 'name', src.name)}
      ${F('Sub-label', 'sub', src.sub || '')}
      <div class="ff2">
        ${F('Colour', 'tone', n.tone || (n.acc === 1 ? 'amber' : n.acc === 2 ? 'teal' : n.acc === 3 ? 'purple' : ''), 'select', Engine.TONE_LABELS)}
        ${F('Layer', 'band', n.band || '', 'select', [['', '— none —']].concat((g.bands || []).map(b => [b.id, Engine.stripTags(b.name).split('—')[0].trim()])))}
        ${D().dgm.depthGroup ? F(D().dgm.depthGroup.label, 'depth', n.depth || 1, 'select', D().dgm.depthGroup.options.map(o => [o.id, o.label])) : ''}
        ${F('Shape', 'shape', n.shape || 'box', 'select', [['box', 'Box'], ['cyl', 'Cylinder (store)'], ['diamond', 'Diamond (gate)']])}
      </div>
      <h5 class="fh">Card — The role</h5>
      ${F('Opening line (bold)', 'head', d.head || '', 'textarea', { rows: 2 })}
      ${F('Body', 'role', d.role || '', 'textarea', { rows: 3 })}
      <h5 class="fh">Card — How it works</h5>
      ${F('One point per line', 'how', (d.how || []).join('\n'), 'textarea', { rows: 4 })}
      <h5 class="fh">Card — The decision</h5>
      ${F('What it beat (bold)', 'dh', d.dh || '', 'textarea', { rows: 2 })}
      ${F('Why', 'dec', d.dec || '', 'textarea', { rows: 3 })}
      ${F('Learned the hard way', 'hard', d.hard || '', 'textarea', { rows: 3 })}
      <h5 class="fh">Card — Stack &amp; in the room</h5>
      ${F('Stack — one per line as  Key | Value', 'stack', (d.stack || []).map(s => s.join(' | ')).join('\n'), 'textarea', { rows: 3 })}
      ${F('Say it like this', 'say', d.say || '', 'textarea', { rows: 2 })}`;
  } else if (sel.type === 'band') {
    const b = bandOf(sel.id);
    eyebrow = 'Editing layer'; title = b.name;
    const bd = b.detail || {};
    body = F('Layer name (use “—” to add a tagline)', 'name', b.name) +
      `<div class="ff2">${F('Width', 'w', b.w)}${F('Height', 'h', b.h)}</div>
       <div class="ff2">${F('Colour', 'btone', b.tone || '', 'select', [['', 'Default'], ['slate', 'Slate'], ['teal', 'Teal'], ['orange', 'Orange'], ['blue', 'Blue'], ['purple', 'Purple'], ['green', 'Green']])}
       ${F('Label position', 'inside', b.style === 'rule' ? 'rule' : b.inside ? '1' : '0', 'select', [['0', 'Above the layer'], ['1', 'Inside, top-left'], ['rule', 'Heading + rule, no box']])}</div>
       <h5 class="fh">Card (optional)</h5>
       ${F('What it\u2019s for (bold)', 'bhead', bd.head || '', 'textarea', { rows: 2 })}
       ${F('Body', 'brole', bd.role || '', 'textarea', { rows: 2 })}
       ${F('What\u2019s inside — one per line', 'bhow', (bd.how || []).join('\n'), 'textarea', { rows: 3 })}
       ${F('The boundary (bold)', 'bdh', bd.dh || '', 'textarea', { rows: 2 })}
       ${F('The boundary — why', 'bdec', bd.dec || '', 'textarea', { rows: 2 })}
       ${F('Stack — Key | Value per line', 'bstack', (bd.stack || []).map(s => s.join(' | ')).join('\n'), 'textarea', { rows: 2 })}
       ${F('Say it like this', 'bsay', bd.say || '', 'textarea', { rows: 2 })}`;
  } else if (sel.type === 'sheet') {
    const sh = g.sheet, dg = D().dgm, tr = g.trace || [];
    eyebrow = 'Editing map text'; title = Engine.stripTags(plain((sh && sh.title) || dg.sec || 'Map'));
    body = (sh ? `<h5 class="fh">Sheet</h5>
        ${F('Title', 'sh_title', plain(sh.title))}
        ${F('Subtitle', 'sh_sub', plain(sh.sub))}
        ${F('Top-right note', 'sh_note', plain(sh.note))}
        ${F('Footnote', 'sh_foot', plain(sh.foot), 'textarea', { rows: 2 })}
        ${(sh.legend || []).map((l, i) => F(`Legend ${i + 1}`, 'sh_leg_' + i, plain(l[0]))).join('')}
        ${(sh.texts || []).map((x, i) => F(`Free label ${i + 1}`, 'sh_txt_' + i, plain(x[2]))).join('')}`
      : `<p class="fhint">This map has no title block. Its header (company, section, subtitle) and chips are edited in place above the map.</p>`) +
      (tr.length ? `<h5 class="fh">Trace narration</h5>` + tr.map((x, i) => F(`Step ${i + 1}`, 'tr_' + i, plain(x.text), 'textarea', { rows: 3 })).join('') : '') +
      (dg.variantGroup ? `<h5 class="fh">Toggle labels</h5>${F('Toggle name', 'vg_label', plain(dg.variantGroup.label))}` +
        dg.variantGroup.options.map((o, i) => F(`Option ${i + 1}`, 'vg_o_' + i, plain(o.label))).join('') : '') +
      (dg.depthGroup ? `${dg.variantGroup ? '' : '<h5 class="fh">Toggle labels</h5>'}${F('Depth toggle name', 'dg_label', plain(dg.depthGroup.label))}` +
        dg.depthGroup.options.map((o, i) => F(`Depth ${i + 1}`, 'dg_o_' + i, plain(o.label))).join('') : '');
  } else if (sel.type === 'edge') {
    const e = g.edges[sel.i]; const o = e[4] || {};
    const nm = id => { const x = nodeOf(id) || bandOf(id); return x ? Engine.stripTags(x.name).split('—')[0].trim() : id; };
    eyebrow = 'Editing arrow'; title = `${nm(e[0])} → ${nm(e[1])}`;
    body = `
      ${F('Label', 'label', e[2] || '')}
      ${F('Style', 'cls', e[3] || '', 'select', Engine.EDGE_LABELS)}
      <div class="ff2">
        ${F('Direction', 'dir', o.dir || 'one', 'select', [['one', 'One way →'], ['two', 'Both ways ↔'], ['none', 'No arrowhead']])}
        ${F('Route', 'route', o.route || 'auto', 'select', [['auto', o.pts ? 'Keep drawn path' : 'Auto elbow'], ['flip', 'Flip the elbow'], ['straight', 'Straight line']])}
      </div>
      <button type="button" class="ghost sm" id="swapEdge">Swap start and end</button>`;
  }
  $('#deckEyebrow').textContent = eyebrow;
  $('#deckTitle').innerHTML = title;
  $('#deckBody').innerHTML = `<form class="eform" id="eform" autocomplete="off">${body}<div class="fdone"><button type="button" class="cta sm" id="formDone">Done</button><span class="fhint">Changes apply as you type</span></div></form>`;
  $('#deckBody').scrollTop = 0;
  const form = $('#eform');
  form.addEventListener('input', () => { clearTimeout(formTimer); formTimer = setTimeout(applyForm, 180); });
  form.addEventListener('change', applyForm);
  $('#formDone').addEventListener('click', () => ui().closeDeck());
  const sw = $('#swapEdge');
  if (sw) sw.addEventListener('click', () => { const e = g.edges[sel.i]; [e[0], e[1]] = [e[1], e[0]]; commit(); ui().paint(); $('#deckTitle').textContent = `${Engine.stripTags((nodeOf(e[0]) || bandOf(e[0]) || {}).name || e[0])} → ${Engine.stripTags((nodeOf(e[1]) || bandOf(e[1]) || {}).name || e[1])}`; });
  const first = form.querySelector('input[type=text],textarea'); if (first) first.focus();
}

function applyForm() {
  if (!formTarget) return;
  const f = $('#eform'); if (!f) return;
  const v = name => { const el = f.elements[name]; return el ? (el.type === 'checkbox' ? el.checked : el.value) : undefined; };
  const g = dgm(), sel = formTarget;
  if (sel.type === 'node') {
    const n = nodeOf(sel.id); if (!n) return;
    const vKey = D().dgm.layouts ? null : D().variant;
    const detail = {
      head: v('head').trim(), role: v('role').trim(), how: v('how').split('\n').map(s => s.trim()).filter(Boolean),
      dh: v('dh').trim(), dec: v('dec').trim(), hard: v('hard').trim(),
      stack: v('stack').split('\n').map(s => s.trim()).filter(Boolean).map(l => { const p = l.split('|'); return [p[0].trim(), (p[1] || '').trim()]; }),
      say: v('say').trim()
    };
    Object.keys(detail).forEach(k => { if (!detail[k] || (Array.isArray(detail[k]) && !detail[k].length)) delete detail[k]; });
    const useVariant = vKey && v('vonly');
    if (useVariant) {
      n.variants = n.variants || {};
      n.variants[vKey] = { name: v('name').trim() || n.name, sub: v('sub').trim(), detail };
    } else {
      if (vKey && n.variants && n.variants[vKey] && v('vonly') === false) delete n.variants[vKey];
      n.name = v('name').trim() || 'Untitled'; n.sub = v('sub').trim(); n.detail = detail;
    }
    n.tone = v('tone') || ''; if (!n.tone) delete n.tone; delete n.acc;
    n.shape = v('shape'); if (n.shape === 'box') delete n.shape;
    n.band = v('band') || null;
    if (D().dgm.depthGroup) n.depth = Number(v('depth')) || 1;
    $('#deckTitle').textContent = Engine.stripTags(useVariant ? n.variants[vKey].name : n.name);
  } else if (sel.type === 'band') {
    const b = bandOf(sel.id); if (!b) return;
    b.name = v('name').trim() || 'Layer';
    b.w = Math.max(80, Number(v('w')) || b.w); b.h = Math.max(60, Number(v('h')) || b.h);
    b.tone = v('btone') || ''; if (!b.tone) delete b.tone;
    const pos = v('inside'); b.inside = pos === '1'; if (!b.inside) delete b.inside;
    if (pos === 'rule') b.style = 'rule'; else delete b.style;
    const bd = { head: v('bhead').trim(), role: v('brole').trim(), how: v('bhow').split('\n').map(x => x.trim()).filter(Boolean),
      dh: v('bdh').trim(), dec: v('bdec').trim(),
      stack: v('bstack').split('\n').map(x => x.trim()).filter(Boolean).map(l => { const p = l.split('|'); return [p[0].trim(), (p[1] || '').trim()]; }),
      say: v('bsay').trim() };
    Object.keys(bd).forEach(k => { if (!bd[k] || (Array.isArray(bd[k]) && !bd[k].length)) delete bd[k]; });
    if (Object.keys(bd).length) b.detail = bd; else delete b.detail;
    growCanvas(); ui().buildRail();
  } else if (sel.type === 'sheet') {
    const sh = g.sheet, dg = D().dgm;
    const put = (obj, key, field) => { const val = safe(v(field)); if (val) obj[key] = val; else delete obj[key]; };
    if (sh) {
      put(sh, 'title', 'sh_title'); put(sh, 'sub', 'sh_sub'); put(sh, 'note', 'sh_note'); put(sh, 'foot', 'sh_foot');
      (sh.legend || []).forEach((l, i) => { l[0] = safe(v('sh_leg_' + i)); });
      (sh.texts || []).forEach((x, i) => { x[2] = safe(v('sh_txt_' + i)); });
    }
    (g.trace || []).forEach((x, i) => { x.text = safe(v('tr_' + i)); });
    if (dg.variantGroup) { dg.variantGroup.label = safe(v('vg_label')); dg.variantGroup.options.forEach((o, i) => { o.label = safe(v('vg_o_' + i)); }); }
    if (dg.depthGroup) { dg.depthGroup.label = safe(v('dg_label')); dg.depthGroup.options.forEach((o, i) => { o.label = safe(v('dg_o_' + i)); }); }
    ui().buildTools();
  } else if (sel.type === 'edge') {
    const e = g.edges[sel.i]; if (!e) return;
    e[2] = v('label').trim(); e[3] = v('cls'); e[4] = { ...(e[4] || {}), dir: v('dir'), route: v('route') };
    if (e[4].route !== 'auto') { delete e[4].pts; delete e[4].from; delete e[4].to; }
  }
  commit(); ui().paint();
}
function closeForm() { clearTimeout(formTimer); applyForm(); formTarget = null; $('#deckFoot').hidden = false; }

/* ---------------- keys ---------------- */
document.addEventListener('keydown', e => {
  if (!OZ.editing) return;
  const typing = e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { if (typing) return; e.preventDefault(); e.shiftKey ? ACTIONS.redo() : ACTIONS.undo(); return; }
  if (typing) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && D().sel && ui().current().screen === 'diagram') { e.preventDefault(); ACTIONS.delsel(); }
});

injectToggles();
return { onDown, onMove, onUp, onEscape, openForm, closeForm, toggle };
})();

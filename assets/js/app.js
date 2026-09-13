/* ===========================================================
   app.js — routing, matrix, views, diagram interaction
   Reads everything from OZ.data so the editor can change it.
   =========================================================== */
(() => {
'use strict';

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const CO = () => OZ.data.companies;
const DG = () => OZ.data.diagrams;

/* ---------------- pitch ---------------- */
const pitchEl = $('#pitchText'), wcEl = $('#wordCount'), flagEl = $('#saveFlag');
const mem = {};
const pstore = {
  get(k) { try { const v = localStorage.getItem(k); return v === null ? (k in mem ? mem[k] : null) : v; } catch (e) { return k in mem ? mem[k] : null; } },
  set(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) {} }
};
function countWords(t) { const s = t.trim(); return s ? s.split(/\s+/).length : 0; }
function updateCount() { const n = countWords(pitchEl.innerText); wcEl.textContent = n + (n === 1 ? ' word' : ' words'); }
function sizePitch() {
  const el = pitchEl, wrap = document.querySelector('.home-wrap'), home = document.getElementById('home');
  if (!el || !wrap || !home) return;
  el.style.maxHeight = 'none';
  const cs = getComputedStyle(wrap);
  let other = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  Array.from(wrap.children).forEach(ch => {
    const s = getComputedStyle(ch);
    if (s.position === 'absolute' || s.display === 'none') return;
    other += ch.offsetHeight + parseFloat(s.marginTop) + parseFloat(s.marginBottom);
  });
  other -= el.offsetHeight;                       /* the body's own share */
  const avail = home.clientHeight - other - 6;
  el.style.maxHeight = Math.max(140, avail) + 'px';
}
function initPitch() {
  const saved = pstore.get('oz.pitch');
  pitchEl.innerHTML = saved !== null ? saved : PITCH_DEFAULT;
  updateCount();
  let t;
  pitchEl.addEventListener('input', () => {
    updateCount(); clearTimeout(t);
    t = setTimeout(() => { pstore.set('oz.pitch', pitchEl.innerHTML); flagEl.classList.add('flash'); setTimeout(() => flagEl.classList.remove('flash'), 900); }, 500);
  });
  $('#resetPitch').addEventListener('click', () => { pitchEl.innerHTML = PITCH_DEFAULT; pstore.set('oz.pitch', PITCH_DEFAULT); updateCount(); sizePitch(); });
  requestAnimationFrame(sizePitch);
}

/* ---------------- matrix ---------------- */
const SECTIONS = [
  { id: 'architecture', g: '\u25A4', t: 'Architecture', d: 'Interactive map', map: true },
  { id: 'poc', g: '\u25D4', t: 'POC', d: 'Prove it works' },
  { id: 'mvp', g: '\u25D1', t: 'MVP', d: 'Make it real' },
  { id: 'prod', g: '\u25CF', t: 'Production', d: 'Run it at scale' },
  { id: 'pain', g: '\u26A0', t: 'Pain points', d: 'By layer' }
];
function buildMatrix() {
  let html = '';
  ['jj', 'hd', 'citi'].forEach(id => {
    const c = CO()[id];
    html += `<section class="mrow"><div class="mrow-head"><h3>${OZ.ed(c.name, `companies.${id}.name`)}</h3><p>${OZ.ed(c.kicker, `companies.${id}.kicker`)} · ${OZ.ed(c.tag, `companies.${id}.tag`)}</p></div><div class="mrow-cells">`;
    SECTIONS.forEach(s => {
      html += `<a class="mcell${s.map ? ' map' : ''}" href="#/${id}/${s.id}"><span class="g">${s.g}</span><span class="t">${s.t}</span><span class="d">${s.d}</span></a>`;
    });
    html += `</div></section>`;
  });
  html += `<section class="mrow sys"><div class="mrow-head"><h3>Cross-cutting pipelines</h3><p>The two systems that show up in every one of these roles</p></div><div class="mrow-cells">
    <a class="mcell map" href="#/sys/rag"><span class="g">\u25A4</span><span class="t">RAG pipeline</span><span class="d">Index time, query time, quality</span></a>
    <a class="mcell map" href="#/sys/cicd"><span class="g">\u25A4</span><span class="t">CI/CD pipeline</span><span class="d">Agent microservice on AKS</span></a>
    </div></section>`;
  $('#mgrid').innerHTML = html;
}

/* ---------------- narrative views ---------------- */
function renderPhase(coId, secId) {
  const c = CO()[coId], p = c.phases[secId];
  const P = `companies.${coId}.phases.${secId}`;
  $('#vCo').innerHTML = OZ.ed(c.name, `companies.${coId}.name`);
  $('#vSec').innerHTML = OZ.ed(p.label, `${P}.label`);
  $('#vSub').innerHTML = OZ.ed(p.sub, `${P}.sub`);

  let h = '<div class="vinner"><div class="phasetabs">';
  ['poc', 'mvp', 'prod'].forEach(k => { h += `<a class="phasetab${k === secId ? ' on' : ''}" href="#/${coId}/${k}">${c.phases[k].label}</a>`; });
  h += '</div>';

  if (p.stats) {
    h += `<div class="blk"><h4>The state</h4><h3>${OZ.ed(p.goal, `${P}.goal`)}</h3><p>${OZ.ed(p.goalBody, `${P}.goalBody`)}</p><div class="stats">`;
    p.stats.forEach((s, i) => {
      h += `<div class="stat"><b>${OZ.ed(s[0], `${P}.stats.${i}.0`)}</b><span>${OZ.ed(s[1], `${P}.stats.${i}.1`)}</span><em>${OZ.ed(s[2], `${P}.stats.${i}.2`)}</em>${OZ.rowTools(`${P}.stats`, i, ['0%', 'metric', 'what it measures'])}</div>`;
    });
    h += '</div>' + OZ.addTool(`${P}.stats`, ['0%', 'metric', 'what it measures'], 'Add a metric') + '</div>';
  } else {
    h += `<div class="blk"><h4>The goal</h4><h3>${OZ.ed(p.goal, `${P}.goal`)}</h3><p>${OZ.ed(p.goalBody, `${P}.goalBody`)}</p></div>`;
  }

  h += `<div class="blk"><h4>${OZ.ed(p.listTitle, `${P}.listTitle`)}</h4><ul>` +
    p.list.map((x, i) => `<li>${OZ.ed(x, `${P}.list.${i}`)}${OZ.rowTools(`${P}.list`, i, 'New item')}</li>`).join('') +
    '</ul>' + OZ.addTool(`${P}.list`, 'New item', 'Add an item') + '</div>';

  if (p.gate) {
    h += `<div class="blk"><h4>Validation &amp; gate</h4><div class="gate"><strong>${OZ.ed(p.gate.head, `${P}.gate.head`)}</strong><p>${OZ.ed(p.gate.body, `${P}.gate.body`)}</p></div></div>`;
  }

  h += '<div class="blk"><h4>Stack</h4><div class="stackgrid">' +
    p.stack.map((s, i) => `<div class="stackitem"><b>${OZ.ed(s[0], `${P}.stack.${i}.0`)}</b><span>${OZ.ed(s[1], `${P}.stack.${i}.1`)}</span>${OZ.rowTools(`${P}.stack`, i, ['Key', 'Value'])}</div>`).join('') +
    '</div>' + OZ.addTool(`${P}.stack`, ['Key', 'Value'], 'Add a stack item') + '</div>';
  h += '</div>';
  $('#vBody').innerHTML = h;
  $('#vBody').scrollTop = 0;
}

function renderPain(coId) {
  const c = CO()[coId];
  const P = `companies.${coId}.pains`;
  $('#vCo').innerHTML = OZ.ed(c.name, `companies.${coId}.name`);
  $('#vSec').textContent = 'Pain points';
  $('#vSub').textContent = 'By layer';
  let h = '<div class="vinner"><div class="painlist">';
  c.pains.forEach((p, i) => {
    h += `<article class="pain"><div class="pain-h"><div class="lay">${String(i + 1).padStart(2, '0')} · ${OZ.ed(p[0], `${P}.${i}.0`)}${OZ.rowTools(P, i, ['Layer', 'Title', 'What hurt.', 'What fixed it.'])}</div><h3>${OZ.ed(p[1], `${P}.${i}.1`)}</h3></div>
      <div class="pain-b">
        <div class="pb p"><i>Pain</i><p>${OZ.ed(p[2], `${P}.${i}.2`)}</p></div>
        <div class="pb f"><i>Fix</i><p>${OZ.ed(p[3], `${P}.${i}.3`)}</p></div>
      </div></article>`;
  });
  h += '</div>' + OZ.addTool(P, ['Layer', 'Title', 'What hurt.', 'What fixed it.'], 'Add a pain point') + '</div>';
  $('#vBody').innerHTML = h;
  $('#vBody').scrollTop = 0;
}

/* ---------------- diagram view ---------------- */
const D = {
  dgm: null, lay: null, id: null, variant: null, depth: 3, names: false,
  scale: 1, tx: 0, ty: 0, byId: {}, order: [], idx: 0, tracing: false, timer: null, sel: null
};
const stage = $('#stage'), canvas = $('#canvas');

function applyTransform() { canvas.style.transform = `translate(${D.tx}px, ${D.ty}px) scale(${D.scale})`; }
/* effective layout: a diagram with `layouts` keeps one drawing per variant */
function layout() {
  const g = D.dgm;
  if (g.layouts && D.variant && g.layouts[D.variant]) return g.layouts[D.variant];
  return g;
}
function fit() {
  if (!D.lay) return;
  const r = stage.getBoundingClientRect();
  const s = Math.min(r.width / D.lay.w, r.height / D.lay.h) * 0.94;
  D.scale = s; D.tx = (r.width - D.lay.w * s) / 2; D.ty = (r.height - D.lay.h * s) / 2;
  applyTransform();
}
function zoomAt(factor, cx, cy) {
  const next = Math.min(4, Math.max(0.12, D.scale * factor)); const k = next / D.scale;
  D.tx = cx - (cx - D.tx) * k; D.ty = cy - (cy - D.ty) * k; D.scale = next; applyTransform();
}
function paint() {
  D.lay = layout();
  const out = Engine.render(D.lay, { variant: D.dgm.layouts ? null : D.variant, depth: D.depth, editing: OZ.editing, sel: D.sel });
  canvas.innerHTML = out.svg;
  D.byId = out.byId;
  D.order = out.nodes.filter(n => (n.depth || 1) <= D.depth).map(n => n.id)
    .concat((D.lay.bands || []).filter(b => b.detail).map(b => b.id));
  canvas.querySelector('svg').classList.toggle('namesonly', D.names);
}

function buildTools() {
  const vs = $('#variantSlot'), ds = $('#depthSlot');
  vs.innerHTML = ''; ds.innerHTML = '';
  if (D.dgm.variantGroup) {
    const g = D.dgm.variantGroup;
    vs.innerHTML = `<span class="tool-label">${g.label}</span>` + g.options.map(o => `<button type="button" class="tool vopt${o.id === D.variant ? ' on' : ''}" data-v="${o.id}">${o.label}</button>`).join('');
    vs.querySelectorAll('.vopt').forEach(b => b.addEventListener('click', () => {
      D.variant = b.dataset.v; vs.querySelectorAll('.vopt').forEach(x => x.classList.toggle('on', x === b)); stopTrace(); D.sel = null; paint();
      if (D.dgm.layouts) { buildRail(); fit(); }
    }));
  }
  if (D.dgm.depthGroup) {
    const g = D.dgm.depthGroup;
    ds.innerHTML = `<span class="tool-label">${g.label}</span>` + g.options.map(o => `<button type="button" class="tool dopt${o.id === D.depth ? ' on' : ''}" data-d="${o.id}">${o.label}</button>`).join('');
    ds.querySelectorAll('.dopt').forEach(b => b.addEventListener('click', () => {
      D.depth = Number(b.dataset.d); ds.querySelectorAll('.dopt').forEach(x => x.classList.toggle('on', x === b)); stopTrace(); paint();
    }));
  }
}

function buildRail() {
  const rail = $('#rail');
  rail.innerHTML = (D.lay.bands || []).map((b, i) => {
    const parts = Engine.stripTags(b.name).split('—');
    return `<button type="button" class="railitem" data-band="${i}"><b>${parts[0].trim()}</b>${parts.length > 1 ? parts.slice(1).join('—').trim() : 'zoom to this band'}</button>`;
  }).join('');
  rail.querySelectorAll('.railitem').forEach(btn => btn.addEventListener('click', () => {
    const b = D.lay.bands[Number(btn.dataset.band)];
    const r = stage.getBoundingClientRect();
    D.scale = Math.min(2.2, Math.min(r.width / (b.w + 80), r.height / (b.h + 90)));
    D.tx = (r.width - b.w * D.scale) / 2 - b.x * D.scale;
    D.ty = (r.height - b.h * D.scale) / 2 - b.y * D.scale;
    applyTransform();
    rail.querySelectorAll('.railitem').forEach(x => x.classList.toggle('on', x === btn));
  }));
}

function buildChips() {
  const P = `diagrams.${D.id}.chips`;
  $('#dChips').innerHTML = D.dgm.chips.map((c, i) =>
    `<span class="chip${i === 0 ? ' hot' : ''}">${OZ.ed(c, `${P}.${i}`)}${OZ.rowTools(P, i, 'New chip')}</span>`).join('') +
    OZ.addTool(P, 'New chip', 'chip');
}

function buildHeader() {
  const P = `diagrams.${D.id}`;
  $('#dCo').innerHTML = OZ.ed(D.dgm.co, `${P}.co`);
  $('#dSec').innerHTML = OZ.ed(D.dgm.sec, `${P}.sec`);
  $('#dSub').innerHTML = OZ.ed(D.dgm.sub, `${P}.sub`);
}

function openDiagram(id, keepView) {
  stopTrace();
  D.dgm = DG()[id]; D.id = id; D.sel = null;
  if (!keepView) {
    D.variant = D.dgm.variantGroup ? D.dgm.variantGroup.options[0].id : null;
    D.depth = D.dgm.depthGroup ? D.dgm.depthGroup.options[D.dgm.depthGroup.options.length - 1].id : 3;
    D.names = false;
    $('#btnNames').setAttribute('aria-pressed', 'false');
  }
  D.lay = layout();
  buildHeader(); buildChips(); buildTools(); paint(); buildRail();
  if (!keepView) requestAnimationFrame(fit);
}

/* ---------- deck ---------- */
const deck = $('#deck'), scrim = $('#scrim');
let lastFocus = null;

function detailHTML(n) {
  const d = n.detail || {};
  let h = '';
  if (d.role) h += `<div class="deck-sec"><h5>The role</h5><p>${d.role}</p></div>`;
  if (d.does && d.does.length) h += `<div class="deck-sec"><h5>What it does</h5><ul>${d.does.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
  if (d.fork) h += `<div class="deck-sec"><h5>The alternative it beat</h5><div class="deck-fork"><p>${d.fork}</p></div></div>`;
  if (d.hard) h += `<div class="deck-sec"><h5>Learned the hard way</h5><p>${d.hard}</p></div>`;
  if (d.stack && d.stack.length) h += `<div class="deck-sec"><h5>Stack</h5><div class="kv">${d.stack.map(s => `<div><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div></div>`;
  if (d.say) h += `<div class="deck-sec"><h5>Say it like this</h5><div class="deck-say"><p>${d.say}</p></div></div>`;
  if (!h) h = `<div class="deck-sec"><p>No walkthrough written for this node yet.</p></div>`;
  return h;
}

function openDeck(nodeId) {
  if (OZ.editing && window.Editor) { Editor.openForm({ type: D.byId[nodeId] && D.byId[nodeId].isBand ? 'band' : 'node', id: nodeId }); return; }
  if (D.order.indexOf(nodeId) < 0) return;
  location.hash = cardHash(D.id, nodeId);
}
function cardHash(id, nodeId) {
  const base = CO()[id] ? `/${id}/architecture` : `/sys/${id}`;
  const g = DG()[id];
  return base + (g.layouts ? `/${D.variant}/${nodeId}` : `/${nodeId}`);
}

/* ---------- card page ---------- */
const PANELS_NODE = ['The role', 'How it works', 'The decision', 'Stack'];
const PANELS_BAND = ['What it\u2019s for', 'What\u2019s inside', 'The boundary', 'Stack'];

function openCard(id, rest) {
  const g = DG()[id];
  let variant = null, nodeId;
  if (g.layouts) { variant = rest[0]; nodeId = rest[1]; if (!g.layouts[variant]) { location.hash = cardHashFor(id); return; } }
  else nodeId = rest[0];
  /* make sure the map state matches so Back returns to the right place */
  if (D.id !== id) { D.dgm = g; D.id = id; D.variant = variant || (g.variantGroup ? g.variantGroup.options[0].id : null); D.depth = g.depthGroup ? g.depthGroup.options[g.depthGroup.options.length - 1].id : 3; D.lay = layout(); }
  else if (variant && D.variant !== variant) { D.variant = variant; D.lay = layout(); }
  if (!D.lay) D.lay = layout();
  const out = Engine.render(D.lay, { variant: g.layouts ? null : D.variant, depth: D.depth });
  D.byId = out.byId;
  D.order = out.nodes.filter(n => (n.depth || 1) <= D.depth).map(n => n.id).concat((D.lay.bands || []).filter(b => b.detail).map(b => b.id));
  const item = D.byId[nodeId];
  if (!item) { location.hash = id === 'rag' || id === 'cicd' ? `/sys/${id}` : `/${id}/architecture`; return; }
  current.cardId = id; current.cardRest = rest;
  show('card');
  renderCard(id, item, variant);
}
function cardHashFor(id) { return (id === 'rag' || id === 'cicd') ? `/sys/${id}` : `/${id}/architecture`; }

function detailPath(id, item, variant) {
  const g = DG()[id];
  const base = `diagrams.${id}` + (g.layouts ? `.layouts.${variant}` : '');
  const arr = item.isBand ? D.lay.bands : D.lay.nodes;
  const i = arr.findIndex(x => x.id === item.id);
  return `${base}.${item.isBand ? 'bands' : 'nodes'}.${i}.detail`;
}

function renderCard(id, item, variant) {
  const g = DG()[id];
  const d = item.detail || {};
  const P = detailPath(id, item, variant);
  const isBand = !!item.isBand;
  const H = isBand ? PANELS_BAND : PANELS_NODE;
  const name = Engine.stripTags(item.name).split('—')[0].trim();

  $('#cCo').innerHTML = g.co;
  $('#cName').textContent = name;
  $('#cSub').textContent = isBand ? (Engine.stripTags(item.name).split('—')[1] || '').trim() : Engine.stripTags(String(item.sub || '')).replace(/\n/g, ' · ');

  /* stepper: one step per layer; active = the layer this item belongs to */
  const bands = D.lay.bands || [];
  const activeBand = isBand ? item.id : item.band;
  $('#cStepper').innerHTML = bands.map((b, i) => {
    const first = b.detail ? b.id : (D.lay.nodes.find(n => n.band === b.id) || {}).id;
    return `${i ? '<span class="stepline"></span>' : ''}<button type="button" class="step${b.id === activeBand ? ' on' : ''}" data-go="${first || ''}"><span class="dot"></span>${Engine.stripTags(b.name).split('—')[0].trim()}</button>`;
  }).join('');
  $('#cStepper').querySelectorAll('.step').forEach(b => b.addEventListener('click', () => { if (b.dataset.go) location.hash = cardHash(id, b.dataset.go); }));

  const ed = OZ.editing;
  const E = (v, p, cls) => OZ.ed(v || '', p, cls);
  const empty = ed ? '' : '<p class="empty">—</p>';

  const p1 = `<div class="panel"><h4>${H[0]}</h4><div class="pbody">` +
    ((d.head || ed) ? `<div class="lead">${E(d.head, P + '.head')}</div>` : '') +
    ((d.role || ed) ? `<p>${E(d.role, P + '.role')}</p>` : '') +
    (!d.head && !d.role ? empty : '') + `</div></div>`;

  const how = d.how || [];
  const p2 = `<div class="panel"><h4>${H[1]}</h4><div class="pbody">` +
    (how.length ? `<ul>${how.map((x, i) => `<li>${E(x, `${P}.how.${i}`)}${OZ.rowTools(P + '.how', i, 'New point')}</li>`).join('')}</ul>` : empty) +
    (ed ? OZ.addTool(P + '.how', 'New point', 'Add a point') : '') + `</div></div>`;

  const p3 = `<div class="panel"><h4>${H[2]}</h4><div class="pbody">` +
    ((d.dh || ed) ? `<div class="lead">${E(d.dh, P + '.dh')}</div>` : '') +
    ((d.dec || ed) ? `<p>${E(d.dec, P + '.dec')}</p>` : '') +
    ((d.hard || ed) ? `<p class="hard"><b>Learned the hard way</b>${E(d.hard, P + '.hard')}</p>` : '') +
    (!d.dh && !d.dec && !d.hard ? empty : '') + `</div></div>`;

  const st = d.stack || [];
  const p4 = `<div class="panel"><h4>${H[3]}</h4><div class="pbody">` +
    (st.length ? st.map((s, i) => `<div class="kv1"><b>${E(s[0], `${P}.stack.${i}.0`)}</b><span>${E(s[1], `${P}.stack.${i}.1`)}${OZ.rowTools(P + '.stack', i, ['Key', 'Value'])}</span></div>`).join('') : empty) +
    (ed ? OZ.addTool(P + '.stack', ['Key', 'Value'], 'Add a row') : '') + `</div></div>`;

  $('#cPanels').innerHTML = p1 + p2 + p3 + p4;
  $('#cRoom').innerHTML = `<h4>In the room</h4><p>${(d.say || ed) ? E(d.say, P + '.say') : '<span class="empty">—</span>'}</p>`;
  $('.cbody').scrollTop = 0;

  const i = D.order.indexOf(item.id);
  $('#cPrev').onclick = () => { location.hash = cardHash(id, D.order[(i - 1 + D.order.length) % D.order.length]); };
  $('#cNext').onclick = () => { location.hash = cardHash(id, D.order[(i + 1) % D.order.length]); };
  $('#cBack').onclick = () => { location.hash = cardHashFor(id); };
}
function paintDeck() {
  const n = D.byId[D.order[D.idx]];
  const band = (D.lay.bands || []).find(b => b.id === n.band);
  $('#deckEyebrow').innerHTML = n.isBand ? 'Layer' : band ? Engine.stripTags(band.name.split('—')[0].trim()) : D.dgm.sec;
  $('#deckTitle').innerHTML = n.name;
  $('#deckBody').innerHTML = detailHTML(n);
  $('#deckBody').scrollTop = 0;
  $('#deckPos').textContent = `${D.idx + 1} / ${D.order.length}`;
  $('#deckFoot').hidden = false;
  canvas.querySelectorAll('.n-hit').forEach(g => g.classList.toggle('lit', g.dataset.node === n.id));
  canvas.querySelectorAll('.band').forEach(g => g.classList.toggle('lit', g.dataset.bandid === n.id));
}
function closeDeck() {
  if (deck.classList.contains('form') && window.Editor) Editor.closeForm();
  deck.hidden = true; scrim.hidden = true; deck.classList.remove('form'); scrim.classList.remove('light');
  canvas.querySelectorAll('.lit').forEach(g => g.classList.remove('lit'));
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
function stepDeck(delta) { D.idx = (D.idx + delta + D.order.length) % D.order.length; paintDeck(); }

$('#deckClose').addEventListener('click', closeDeck);
$('#deckPrev').addEventListener('click', () => stepDeck(-1));
$('#deckNext').addEventListener('click', () => stepDeck(1));
scrim.addEventListener('click', closeDeck);

/* ---------- trace ---------- */
function lightStep(step) {
  canvas.querySelectorAll('.lit').forEach(el => el.classList.remove('lit'));
  const set = new Set(step.nodes);
  canvas.querySelectorAll('.n-hit').forEach(g => { if (set.has(g.dataset.node)) g.classList.add('lit'); });
  (D.lay.edges || []).forEach((e, i) => {
    if (set.has(e[0]) && set.has(e[1])) { const g = canvas.querySelector(`[data-edge="${i}"] .edge`); if (g) g.classList.add('lit'); }
  });
  $('#traceText').textContent = step.text;
}
function startTrace() {
  const T = D.lay.trace; if (!T || !T.length) return;
  stopTrace(); D.tracing = true;
  $('#traceBar').hidden = false; $('#btnTrace').classList.add('running'); $('#btnTrace').textContent = 'Tracing…';
  let i = 0;
  const run = () => { if (!D.tracing) return; lightStep(T[i]); i = (i + 1) % T.length; D.timer = setTimeout(run, 4200); };
  run();
}
function stopTrace() {
  D.tracing = false; clearTimeout(D.timer);
  canvas.querySelectorAll('.lit').forEach(el => el.classList.remove('lit'));
  $('#traceBar').hidden = true; $('#btnTrace').classList.remove('running'); $('#btnTrace').textContent = 'Trace the flow';
}
$('#btnTrace').addEventListener('click', () => D.tracing ? stopTrace() : startTrace());
$('#traceStop').addEventListener('click', stopTrace);
$('#btnNames').addEventListener('click', () => {
  D.names = !D.names; $('#btnNames').setAttribute('aria-pressed', String(D.names));
  canvas.querySelector('svg').classList.toggle('namesonly', D.names);
});
$('#btnFit').addEventListener('click', fit);
$('#btnIn').addEventListener('click', () => { const r = stage.getBoundingClientRect(); zoomAt(1.25, r.width / 2, r.height / 2); });
$('#btnOut').addEventListener('click', () => { const r = stage.getBoundingClientRect(); zoomAt(0.8, r.width / 2, r.height / 2); });

canvas.addEventListener('keydown', e => {
  const g = e.target.closest('.n-hit');
  if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDeck(g.dataset.node); }
});

/* ---------- pan + zoom (editor gets first refusal in edit mode) ---------- */
let dragging = false, dragMoved = false, sx = 0, sy = 0, ox = 0, oy = 0, downNode = null;
const pointers = new Map();
let pinchDist = 0;

function toDiagram(clientX, clientY) {
  const r = stage.getBoundingClientRect();
  return { x: (clientX - r.left - D.tx) / D.scale, y: (clientY - r.top - D.ty) / D.scale };
}

stage.addEventListener('pointerdown', e => {
  if (OZ.editing && window.Editor && Editor.onDown(e)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const hit = e.target.closest && e.target.closest('.n-hit');
  const bhit = !hit && e.target.closest && e.target.closest('.band.hasdetail');
  downNode = hit && !hit.classList.contains('dimmed') ? hit.dataset.node : bhit ? bhit.dataset.bandid : null;
  if (pointers.size === 1) {
    dragging = true; dragMoved = false; sx = e.clientX; sy = e.clientY; ox = D.tx; oy = D.ty;
    stage.classList.add('grabbing'); stage.setPointerCapture(e.pointerId);
  } else if (pointers.size === 2) {
    const p = Array.from(pointers.values()); pinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); dragging = false;
  }
});
stage.addEventListener('pointermove', e => {
  if (OZ.editing && window.Editor && Editor.onMove(e)) return;
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const p = Array.from(pointers.values()); const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    if (pinchDist > 0) { const r = stage.getBoundingClientRect(); zoomAt(d / pinchDist, (p[0].x + p[1].x) / 2 - r.left, (p[0].y + p[1].y) / 2 - r.top); }
    pinchDist = d; return;
  }
  if (!dragging) return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true;
  D.tx = ox + dx; D.ty = oy + dy; applyTransform();
});
function endPointer(e) {
  if (OZ.editing && window.Editor && Editor.onUp(e)) return;
  const wasDown = downNode;
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchDist = 0;
  if (pointers.size === 0) {
    dragging = false; stage.classList.remove('grabbing');
    if (e.type === 'pointerup' && wasDown && !dragMoved) openDeck(wasDown);
    dragMoved = false; downNode = null;
  }
}
stage.addEventListener('pointerup', endPointer);
stage.addEventListener('pointercancel', endPointer);
stage.addEventListener('pointerleave', endPointer);
stage.addEventListener('wheel', e => {
  e.preventDefault(); const r = stage.getBoundingClientRect();
  zoomAt(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - r.left, e.clientY - r.top);
}, { passive: false });

/* ---------------- routing ---------------- */
const SCREENS = { home: $('#home'), matrix: $('#matrix'), view: $('#view'), diagram: $('#diagram'), card: $('#card') };
let current = { screen: 'home' };

function show(name) {
  Object.entries(SCREENS).forEach(([k, el]) => { const on = k === name; el.hidden = !on; el.classList.toggle('on', on); });
}
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  current = { screen: 'home', parts, prev: current.screen };
  if (!parts.length) { show('home'); buildMatrix(); requestAnimationFrame(sizePitch); return; }
  if (parts[0] === 'matrix') { current.screen = 'matrix'; buildMatrix(); show('matrix'); return; }
  if (parts[0] === 'sys' && DG()[parts[1]]) {
    if (parts[2]) { current.screen = 'card'; openCard(parts[1], parts.slice(2)); return; }
    const keep = D.id === parts[1] && !SCREENS.diagram.hidden ? true : D.id === parts[1] && current.prev === 'card';
    current.screen = 'diagram'; show('diagram'); openDiagram(parts[1], keep); return;
  }
  const co = parts[0], sec = parts[1];
  if (CO()[co]) {
    if (sec === 'architecture' && DG()[co]) {
      if (parts[2]) { current.screen = 'card'; openCard(co, parts.slice(2)); return; }
      const keep = D.id === co && (!SCREENS.diagram.hidden || current.prev === 'card');
      current.screen = 'diagram'; show('diagram'); openDiagram(co, keep); return;
    }
    if (sec === 'pain') { current.screen = 'view'; show('view'); renderPain(co); return; }
    if (['poc', 'mvp', 'prod'].includes(sec)) { current.screen = 'view'; show('view'); renderPhase(co, sec); return; }
  }
  location.hash = '';
}
/* re-render the current screen from data without moving the viewport */
function rerender() {
  const p = current.parts || [];
  if (current.screen === 'diagram') { openDiagram(D.id, true); return; }
  if (current.screen === 'card') { openCard(current.cardId, current.cardRest); return; }
  if (current.screen === 'view') { p[1] === 'pain' ? renderPain(p[0]) : renderPhase(p[0], p[1]); return; }
  buildMatrix();
}

window.addEventListener('hashchange', route);
window.addEventListener('resize', () => {
  if (!SCREENS.diagram.hidden) fit();
  if (!SCREENS.home.hidden) sizePitch();
});
$('#openMatrix').addEventListener('click', () => { location.hash = '/matrix'; });
$('#closeMatrix').addEventListener('click', () => { location.hash = ''; });
$$('[data-nav]').forEach(b => b.addEventListener('click', () => { location.hash = b.dataset.nav === 'matrix' ? '/matrix' : ''; }));

document.addEventListener('keydown', e => {
  const typing = e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  if (!deck.hidden) {
    if (e.key === 'Escape') { closeDeck(); return; }
    if (typing) return;
    if (e.key === 'ArrowRight') { stepDeck(1); return; }
    if (e.key === 'ArrowLeft') { stepDeck(-1); return; }
    return;
  }
  if (typing) return;
  if (!SCREENS.card.hidden) {
    if (e.key === 'Escape') { location.hash = cardHashFor(current.cardId); return; }
    if (e.key === 'ArrowRight') { $('#cNext').click(); return; }
    if (e.key === 'ArrowLeft') { $('#cPrev').click(); return; }
    return;
  }
  if (e.key === 'Escape') {
    if (OZ.editing && window.Editor && Editor.onEscape()) return;
    if (!SCREENS.matrix.hidden) location.hash = '';
    else if (!SCREENS.diagram.hidden || !SCREENS.view.hidden) location.hash = '/matrix';
    return;
  }
  if (!SCREENS.diagram.hidden && e.target === document.body) {
    if (e.key === 'f') fit();
    if (e.key === 't') D.tracing ? stopTrace() : startTrace();
    if (e.key === 'n') $('#btnNames').click();
  }
});

/* ---------------- expose for the editor ---------------- */
OZ.ui = { D, layout, stage, canvas, paint, fit, applyTransform, toDiagram, openDiagram, buildRail, buildTools, buildChips, buildHeader,
          rerender, route, openDeck, closeDeck, deck, scrim, stopTrace, current: () => current };

/* ---------------- boot ---------------- */
initPitch();
buildMatrix();
route();

})();

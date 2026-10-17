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

/* ---------------- home: pitch + problem statement carousel ----------------
   Slide 1 is the elevator pitch (its own browser save, as before); the rest are
   the J&J problem statement, one step per slide, saved with the other content.
   Every slide is click-and-type; labels are editable in Edit mode. The text
   shrinks to fit so the page never scrolls. */
const pitchEl = $('#pitchText'), wcEl = $('#wordCount'), flagEl = $('#saveFlag');
const track = $('#carTrack');
const mem = {};
const pstore = {
  get(k) { try { const v = localStorage.getItem(k); return v === null ? (k in mem ? mem[k] : null) : v; } catch (e) { return k in mem ? mem[k] : null; } },
  set(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) {} }
};
/* v2 keeps its own pitch; the first time, it starts from the pitch saved by the original site */
const PITCH_KEY = 'oz.v2.pitch';
const PROBLEM_CO = 'jj';
const PRP = `companies.${PROBLEM_CO}.problem`;
const PR = () => (CO()[PROBLEM_CO] || {}).problem || null;
const PSLIDES = () => { const p = PR(); return p && Array.isArray(p.slides) ? p.slides : []; };
const car = { idx: 0, pending: null };

function countWords(t) { const s = t.trim(); return s ? s.split(/\s+/).length : 0; }
function flashSaved() { flagEl.classList.add('flash'); setTimeout(() => flagEl.classList.remove('flash'), 900); }
const slides = () => $$('#carTrack .slide');
const plain = h => String(h == null ? '' : h).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/"/g, '');
/* what the browser leaves in a contenteditable: keep bold, italic and line breaks */
function cleanText(html) {
  return html.replace(/<div><br><\/div>/g, '<br>').replace(/<div>/g, '<br>').replace(/<\/div>/g, '')
    .replace(/<(?!\/?(b|i|em|strong|br)\b)[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
    .replace(/^(\s|<br\s*\/?>)+|(\s|<br\s*\/?>)+$/g, '');
}
/* the shipped version of a problem slide, matched by its id (added slides have none) */
function shippedSlide(i) {
  const cur = PSLIDES()[i]; if (!cur || !cur.id) return null;
  return (OZ.shippedAt(`${PRP}.slides`) || []).find(s => s.id === cur.id) || null;
}

/* largest type that fits the slide, between 12px and a size set by the slide width */
function fitSlide(s) {
  if (!s) return;
  const inner = s.querySelector('.sl-inner');
  const cs = getComputedStyle(s);
  const H = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const W = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  if (!inner || H <= 0 || W <= 0) return;
  const isPitch = s.dataset.k === 'pitch';
  /* cap: big on a laptop, and never so big that a line drops below ~45 characters */
  const max = Math.min(isPitch ? 32 : 28, Math.max(16, W / (isPitch ? 22 : 24)));
  const fits = fs => { inner.style.fontSize = fs + 'px'; return inner.offsetHeight <= H; };
  s.classList.remove('overflow');
  if (fits(max)) return;
  let lo = 12, hi = max;
  if (!fits(lo)) { s.classList.add('overflow'); return; }
  for (let k = 0; k < 8; k++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
  fits(Math.floor(lo * 4) / 4);
}
function fitAll() { if (SCREENS.home.hidden) return; slides().forEach(fitSlide); }

function updateFoot() {
  const s = slides()[car.idx]; if (!s) return;
  const t = s.querySelector('.sl-text');
  const n = countWords(t ? t.innerText : '');
  wcEl.textContent = n + (n === 1 ? ' word' : ' words');
  $('#resetSlide').hidden = car.idx > 0 && !shippedSlide(car.idx - 1);
  let tools = '';
  if (OZ.editing) {
    const tpl = JSON.stringify({ id: '', label: 'New step', text: 'New slide' }).replace(/'/g, '&#39;');
    const i = car.idx - 1;
    if (i >= 0) tools = `<button type="button" class="rt wide" data-act="add" data-arr="${PRP}.slides" data-i="${i}" data-tpl='${tpl}'>+ Add a slide after</button>` +
      `<button type="button" class="rt wide del" data-act="del" data-arr="${PRP}.slides" data-i="${i}">× Delete this slide</button>`;
    else if (!PSLIDES().length && PR()) tools = `<button type="button" class="rt wide" data-act="add" data-arr="${PRP}.slides" data-i="-1" data-tpl='${tpl}'>+ Add a slide</button>`;
  }
  $('#carTools').innerHTML = tools;
}
function markDots() {
  $$('#carDots .cd').forEach((d, k) => { const on = k === car.idx; d.classList.toggle('on', on); d.setAttribute('aria-current', on ? 'step' : 'false'); });
  const n = slides().length;
  $$('#carDots .cdn.prev, #carPrev').forEach(b => { b.disabled = car.idx === 0; });
  $$('#carDots .cdn.next, #carNext').forEach(b => { b.disabled = car.idx >= n - 1; });
}
function buildDots() {
  const labels = [OZ.tv('home.pitchTitle')].concat(PSLIDES().map(s => s.label));
  $('#carDots').innerHTML = `<button type="button" class="cdn prev" aria-label="Previous slide">&#8249;</button>` +
    labels.map((l, k) => `<button type="button" class="cd" data-k="${k}" aria-label="${plain(l)}"><i></i><span>${l == null ? '' : l}</span></button>`).join('') +
    `<button type="button" class="cdn next" aria-label="Next slide">&#8250;</button>`;
  markDots();
}
function go(i, instant) {
  const all = slides(), n = all.length;
  i = Math.max(0, Math.min(i, n - 1));
  car.idx = i;
  if (instant) track.classList.add('instant');
  track.style.transform = `translateX(${-i * 100}%)`;
  if (instant) { void track.offsetWidth; track.classList.remove('instant'); }
  all.forEach((s, k) => {
    const on = k === i;
    s.classList.toggle('on', on); s.inert = !on;
    s.setAttribute('aria-hidden', on ? 'false' : 'true');
    s.setAttribute('aria-label', `${k + 1} of ${n}`);
  });
  if (i === 0) { $('#carTitle').innerHTML = OZ.t('home.pitchTitle'); $('#carSub').innerHTML = ''; }
  else { $('#carTitle').innerHTML = OZ.t('home.problemTitle'); $('#carSub').innerHTML = OZ.ed(PR().title, `${PRP}.title`); }
  $('#carCount').textContent = `${i + 1} / ${n}`;
  markDots();
  updateFoot();
}
function buildSlides() {
  slides().slice(1).forEach(s => s.remove());
  track.insertAdjacentHTML('beforeend', PSLIDES().map((s, i) => `
    <div class="slide" data-k="${i}" role="group" aria-roledescription="slide">
      <div class="sl-inner">
        <div class="sl-step"><span class="sl-num">${String(i + 1).padStart(2, '0')}</span><span class="sl-label">${OZ.ed(s.label, `${PRP}.slides.${i}.label`)}</span></div>
        <div class="sl-text" data-i="${i}" contenteditable="true" spellcheck="false" role="textbox" aria-multiline="true" aria-label="${plain(s.label)}">${s.text == null ? '' : s.text}</div>
      </div>
    </div>`).join(''));
  if (car.pending !== null) { car.idx = car.pending; car.pending = null; }
  buildDots();
  go(car.idx, true);
  fitAll();
}

function initPitch() {
  const saved = pstore.get(PITCH_KEY) ?? pstore.get('oz.pitch');
  pitchEl.innerHTML = saved !== null ? saved : PITCH_DEFAULT;
  let t;
  pitchEl.addEventListener('input', () => {
    updateFoot(); fitSlide(pitchEl.closest('.slide')); clearTimeout(t);
    t = setTimeout(() => { pstore.set(PITCH_KEY, pitchEl.innerHTML); flashSaved(); }, 500);
  });

  /* problem statement slides: type straight into them */
  let timer = null, snapped = false;
  const saveSlide = el => {
    OZ.set(`${PRP}.slides.${el.dataset.i}.text`, cleanText(el.innerHTML)); OZ.save();
    document.body.classList.toggle('has-edits', OZ.hasEdits()); flashSaved();
  };
  track.addEventListener('focusin', e => { if (e.target.matches('.sl-text[data-i]') && !snapped) { OZ.snapshot(); snapped = true; } });
  track.addEventListener('input', e => {
    const el = e.target.closest('.sl-text[data-i]'); if (!el) return;
    updateFoot(); fitSlide(el.closest('.slide'));
    clearTimeout(timer); timer = setTimeout(() => saveSlide(el), 400);
  });
  track.addEventListener('focusout', e => {
    if (!e.target.matches('.sl-text[data-i]')) return;
    clearTimeout(timer); saveSlide(e.target); snapped = false;
  });

  $('#resetSlide').addEventListener('click', () => {
    const s = slides()[car.idx]; if (!s) return;
    if (car.idx === 0) { pitchEl.innerHTML = PITCH_DEFAULT; pstore.set(PITCH_KEY, PITCH_DEFAULT); }
    else {
      const sh = shippedSlide(car.idx - 1); if (!sh) return;
      OZ.snapshot(); OZ.set(`${PRP}.slides.${car.idx - 1}.text`, sh.text); OZ.save();
      s.querySelector('.sl-text').innerHTML = sh.text;
      document.body.classList.toggle('has-edits', OZ.hasEdits());
    }
    updateFoot(); fitSlide(s); flashSaved();
  });

  /* navigation: arrows, dots, swipe (keys are handled with the other shortcuts) */
  $('#carPrev').addEventListener('click', () => go(car.idx - 1));
  $('#carNext').addEventListener('click', () => go(car.idx + 1));
  $('#carDots').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('cd')) go(Number(b.dataset.k));
    else go(car.idx + (b.classList.contains('next') ? 1 : -1));
  });
  let sw = null;
  const view = $('#carView');
  view.addEventListener('touchstart', e => { sw = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
  view.addEventListener('touchend', e => {
    if (!sw) return; const t = e.changedTouches[0]; const dx = t.clientX - sw.x, dy = t.clientY - sw.y; sw = null;
    const sel = window.getSelection && window.getSelection();
    if (sel && !sel.isCollapsed) return;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(car.idx + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* Edit mode: land on the right slide after adding or deleting one (runs before the editor rebuilds) */
  document.addEventListener('click', e => {
    const b = OZ.editing && e.target.closest && e.target.closest('#carTools [data-act]'); if (!b) return;
    const i = Number(b.dataset.i);
    car.pending = b.dataset.act === 'add' ? (i < 0 ? slides().length : i + 2) : Math.min(car.idx, slides().length - 2);
  });
  /* a renamed step shows up in the dots once its edit is saved */
  document.addEventListener('focusout', e => {
    if (e.target.classList && e.target.classList.contains('ed') && e.target.closest('#home')) setTimeout(buildDots, 0);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
}

/* ---------------- home labels ---------------- */
const QUICK = [['jj', '#/jj/architecture'], ['hd', '#/hd/architecture'], ['citi', '#/citi/architecture']];
function buildHome() {
  $('#statusTxt').innerHTML = OZ.t('home.status');
  $('#pitchHint').innerHTML = OZ.t('home.hint');
  $('#resetSlide').innerHTML = OZ.t('home.reset');
  $('#openMatrix').innerHTML = OZ.t('home.cta');
  $('#quicknav').innerHTML = QUICK.map(([id, href]) => {
    const c = CO()[id];
    return `<a class="qn" href="${href}"><b>${OZ.ed(c.kicker, `companies.${id}.kicker`)}</b><span>${OZ.ed(c.name, `companies.${id}.name`)}</span></a>`;
  }).join('') + `<a class="qn wide" href="#/sys/rag"><b>${OZ.t('home.cross.0')}</b><span>${OZ.t('home.cross.1')}</span></a>`;
  buildSlides();
}

/* ---------------- matrix ---------------- */
/* POC / MVP / Production are off the matrix for now (the POC → Production journey
   page will bring them back); their content stays in the data. The problem
   statement lives on the home page. */
const SECTIONS = [
  { id: 'architecture', g: '▤', map: true },
  { id: 'pain', g: '⚠' }
];
function buildMatrix() {
  $('#mTitle').innerHTML = OZ.t('matrix.title');
  $('#mSub').innerHTML = OZ.t('matrix.sub');
  let html = '';
  ['jj', 'hd', 'citi'].forEach(id => {
    const c = CO()[id];
    html += `<section class="mrow"><div class="mrow-head"><h3>${OZ.ed(c.name, `companies.${id}.name`)}</h3><p>${OZ.ed(c.kicker, `companies.${id}.kicker`)} · ${OZ.ed(c.tag, `companies.${id}.tag`)}</p></div><div class="mrow-cells">`;
    SECTIONS.forEach(s => {
      html += `<a class="mcell${s.map ? ' map' : ''}" href="#/${id}/${s.id}"><span class="g">${s.g}</span><span class="t">${OZ.t(`matrix.sections.${s.id}.0`)}</span><span class="d">${OZ.t(`matrix.sections.${s.id}.1`)}</span></a>`;
    });
    html += `</div></section>`;
  });
  html += `<section class="mrow sys"><div class="mrow-head"><h3>${OZ.t('matrix.sysTitle')}</h3><p>${OZ.t('matrix.sysSub')}</p></div><div class="mrow-cells">
    <a class="mcell map" href="#/sys/rag"><span class="g">▤</span><span class="t">${OZ.t('matrix.rag.0')}</span><span class="d">${OZ.t('matrix.rag.1')}</span></a>
    <a class="mcell map" href="#/sys/cicd"><span class="g">▤</span><span class="t">${OZ.t('matrix.cicd.0')}</span><span class="d">${OZ.t('matrix.cicd.1')}</span></a>
    </div></section>`;
  $('#mgrid').innerHTML = html;
}

/* ---------------- narrative views ---------------- */
/* phase pages (POC / MVP / Production): not linked for now, kept for the journey page */
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
    h += `<div class="blk"><h4>${OZ.t('phase.state')}</h4><h3>${OZ.ed(p.goal, `${P}.goal`)}</h3><p>${OZ.ed(p.goalBody, `${P}.goalBody`)}</p><div class="stats">`;
    p.stats.forEach((s, i) => {
      h += `<div class="stat"><b>${OZ.ed(s[0], `${P}.stats.${i}.0`)}</b><span>${OZ.ed(s[1], `${P}.stats.${i}.1`)}</span><em>${OZ.ed(s[2], `${P}.stats.${i}.2`)}</em>${OZ.rowTools(`${P}.stats`, i, ['0%', 'metric', 'what it measures'])}</div>`;
    });
    h += '</div>' + OZ.addTool(`${P}.stats`, ['0%', 'metric', 'what it measures'], 'Add a metric') + '</div>';
  } else {
    h += `<div class="blk"><h4>${OZ.t('phase.goal')}</h4><h3>${OZ.ed(p.goal, `${P}.goal`)}</h3><p>${OZ.ed(p.goalBody, `${P}.goalBody`)}</p></div>`;
  }

  h += `<div class="blk"><h4>${OZ.ed(p.listTitle, `${P}.listTitle`)}</h4><ul>` +
    p.list.map((x, i) => `<li>${OZ.ed(x, `${P}.list.${i}`)}${OZ.rowTools(`${P}.list`, i, 'New item')}</li>`).join('') +
    '</ul>' + OZ.addTool(`${P}.list`, 'New item', 'Add an item') + '</div>';

  if (p.gate) {
    h += `<div class="blk"><h4>${OZ.t('phase.gate')}</h4><div class="gate"><strong>${OZ.ed(p.gate.head, `${P}.gate.head`)}</strong><p>${OZ.ed(p.gate.body, `${P}.gate.body`)}</p></div></div>`;
  }

  h += `<div class="blk"><h4>${OZ.t('phase.stack')}</h4><div class="stackgrid">` +
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
  $('#vSec').innerHTML = OZ.t('pain.title');
  $('#vSub').innerHTML = OZ.t('pain.sub');
  let h = '<div class="vinner"><div class="painlist">';
  c.pains.forEach((p, i) => {
    h += `<article class="pain"><div class="pain-h"><div class="lay">${String(i + 1).padStart(2, '0')} · ${OZ.ed(p[0], `${P}.${i}.0`)}${OZ.rowTools(P, i, ['Layer', 'Title', 'What hurt.', 'What fixed it.'])}</div><h3>${OZ.ed(p[1], `${P}.${i}.1`)}</h3></div>
      <div class="pain-b">
        <div class="pb p"><i>${OZ.t('pain.pain')}</i><p>${OZ.ed(p[2], `${P}.${i}.2`)}</p></div>
        <div class="pb f"><i>${OZ.t('pain.fix')}</i><p>${OZ.ed(p[3], `${P}.${i}.3`)}</p></div>
      </div></article>`;
  });
  h += '</div>' + OZ.addTool(P, ['Layer', 'Title', 'What hurt.', 'What fixed it.'], 'Add a pain point') + '</div>';
  $('#vBody').innerHTML = h;
  $('#vBody').scrollTop = 0;
}

/* ---------------- diagram view ---------------- */
const D = {
  dgm: null, lay: null, id: null, variant: null, depth: 3, names: false, boardOnly: false,
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
  const boardButton = $('#btnBoard');
  boardButton.setAttribute('aria-pressed', String(D.boardOnly));
  boardButton.textContent = D.boardOnly ? 'Normal view' : 'Board only';
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
    D.boardOnly = false;
    $('#btnNames').setAttribute('aria-pressed', 'false');
  }
  $('#diagram').classList.toggle('board-only', D.boardOnly);
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
/* panel headings live in OZ.data.ui.card so they can be edited like any other text */

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

/* where a card's own name and sub-label live, so they can be edited on the card page */
function itemPath(id, item, variant) {
  const g = DG()[id];
  const base = `diagrams.${id}` + (g.layouts ? `.layouts.${variant}` : '');
  const arr = item.isBand ? D.lay.bands : D.lay.nodes;
  const i = arr.findIndex(x => x.id === item.id);
  const p = `${base}.${item.isBand ? 'bands' : 'nodes'}.${i}`;
  if (item.isBand) return { name: p + '.name', sub: p + '.name' };
  /* a node with a per-variant override (CI/CD agent toggle) edits the override that is showing */
  const raw = arr[i], v = g.layouts ? null : D.variant, o = raw && raw.variants && v ? raw.variants[v] : null;
  return {
    name: o && o.name ? `${p}.variants.${v}.name` : p + '.name',
    sub: o && o.sub !== undefined ? `${p}.variants.${v}.sub` : p + '.sub'
  };
}

function renderCard(id, item, variant) {
  const g = DG()[id];
  const d = item.detail || {};
  const P = detailPath(id, item, variant);
  const isBand = !!item.isBand;
  const H = k => OZ.t(`card.${isBand ? 'band' : 'node'}.${k}`);
  const IP = itemPath(id, item, variant);

  $('#cCo').innerHTML = OZ.ed(g.co, `diagrams.${id}.co`);
  if (!OZ.editing) {
    $('#cName').textContent = Engine.stripTags(item.name).split('—')[0].trim();
    $('#cSub').textContent = isBand ? (Engine.stripTags(item.name).split('—')[1] || '').trim() : Engine.stripTags(String(item.sub || '')).replace(/\n/g, ' · ');
  } else if (isBand) {
    const parts = String(item.name).split('—').map(x => x.trim());
    $('#cName').innerHTML = OZ.edAt(parts[0], IP.name, 'part', 0);
    $('#cSub').innerHTML = OZ.edAt(parts.slice(1).join(' — '), IP.sub, 'part', 1);
  } else {
    $('#cName').innerHTML = String(item.name).split('\n').map((l, k) => OZ.edAt(l, IP.name, 'line', k)).join(' ');
    $('#cSub').innerHTML = String(item.sub || '').split('\n').map((l, k) => OZ.edAt(l, IP.sub, 'line', k)).join(' · ');
  }

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

  const p1 = `<div class="panel"><h4>${H(0)}</h4><div class="pbody">` +
    ((d.head || ed) ? `<div class="lead">${E(d.head, P + '.head')}</div>` : '') +
    ((d.role || ed) ? `<p>${E(d.role, P + '.role')}</p>` : '') +
    (!d.head && !d.role ? empty : '') + `</div></div>`;

  const how = d.how || [];
  const p2 = `<div class="panel"><h4>${H(1)}</h4><div class="pbody">` +
    (how.length ? `<ul>${how.map((x, i) => `<li>${E(x, `${P}.how.${i}`)}${OZ.rowTools(P + '.how', i, 'New point')}</li>`).join('')}</ul>` : empty) +
    (ed ? OZ.addTool(P + '.how', 'New point', 'Add a point') : '') + `</div></div>`;

  const p3 = `<div class="panel"><h4>${H(2)}</h4><div class="pbody">` +
    ((d.dh || ed) ? `<div class="lead">${E(d.dh, P + '.dh')}</div>` : '') +
    ((d.dec || ed) ? `<p>${E(d.dec, P + '.dec')}</p>` : '') +
    ((d.hard || ed) ? `<p class="hard"><b>${OZ.t('card.hard')}</b>${E(d.hard, P + '.hard')}</p>` : '') +
    (!d.dh && !d.dec && !d.hard ? empty : '') + `</div></div>`;

  const st = d.stack || [];
  const p4 = `<div class="panel"><h4>${H(3)}</h4><div class="pbody">` +
    (st.length ? st.map((s, i) => `<div class="kv1"><b>${E(s[0], `${P}.stack.${i}.0`)}</b><span>${E(s[1], `${P}.stack.${i}.1`)}${OZ.rowTools(P + '.stack', i, ['Key', 'Value'])}</span></div>`).join('') : empty) +
    (ed ? OZ.addTool(P + '.stack', ['Key', 'Value'], 'Add a row') : '') + `</div></div>`;

  $('#cPanels').innerHTML = p1 + p2 + p3 + p4;
  $('#cRoom').innerHTML = `<h4>${OZ.t('card.room')}</h4><p>${(d.say || ed) ? E(d.say, P + '.say') : '<span class="empty">—</span>'}</p>`;
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
  $('#traceText').innerHTML = step.text;
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
$('#btnBoard').addEventListener('click', () => {
  D.boardOnly = !D.boardOnly;
  $('#diagram').classList.toggle('board-only', D.boardOnly);
  buildTools();
  requestAnimationFrame(fit);
});
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
  let parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  /* retired pages: the problem statement moved to the home carousel; the phase pages are off for now */
  if (parts.length > 1 && CO()[parts[0]]) {
    if (parts[1] === 'problem') { car.pending = 1; history.replaceState(null, '', location.pathname + location.search + '#/'); parts = []; }
    else if (['poc', 'mvp', 'prod'].includes(parts[1])) { location.replace('#/matrix'); return; }
  }
  current = { screen: 'home', parts, prev: current.screen };
  if (!parts.length) { show('home'); buildHome(); buildMatrix(); requestAnimationFrame(fitAll); return; }
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
  }
  location.hash = '';
}
/* re-render the current screen from data without moving the viewport */
function rerender() {
  const p = current.parts || [];
  if (current.screen === 'diagram') { openDiagram(D.id, true); return; }
  if (current.screen === 'card') { openCard(current.cardId, current.cardRest); return; }
  if (current.screen === 'view') {
    if (p[1] === 'pain') renderPain(p[0]);
    return;
  }
  if (current.screen === 'home') buildHome();
  buildMatrix();
}

window.addEventListener('hashchange', route);
window.addEventListener('resize', () => {
  if (!SCREENS.diagram.hidden) fit();
  if (!SCREENS.home.hidden) fitAll();
});
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
  if (!SCREENS.home.hidden) {
    const k = { ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 }[e.key];
    if (k) { e.preventDefault(); go(car.idx + k); return; }
    if (e.key === 'Home') { go(0); return; }
    if (e.key === 'End') { go(slides().length - 1); return; }
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
buildHome();
buildMatrix();
route();

})();

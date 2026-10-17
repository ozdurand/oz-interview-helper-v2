/* Applications (copilot phase 1): paste a job description, see how the dossier covers it.
   Talks to the copilot backend (address + token kept in this browser, the same ones
   "Send to copilot" uses). Route: #/apps and #/apps/<id>. */
(function () {
  const KEY = 'oz.v2.copilot';
  const TAB_KEY = 'oz.v2.appstab';
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = { list: null, rec: null, tab: 'coverage', busy: false, err: '' };
  /* labels live in the site's text store (ui.apps.*), editable in Edit mode like every other label */
  const L = k => OZ.t('apps.' + k);
  const P = (k, vars) => {  /* plain text of a label, for attributes, dialogs and messages */
    const d = document.createElement('div');
    d.innerHTML = OZ.get('ui.apps.' + k) == null ? '' : OZ.get('ui.apps.' + k);
    return Object.entries(vars || {}).reduce((t, [n, v]) => t.split('{' + n + '}').join(v), d.textContent);
  };
  try { st.tab = localStorage.getItem(TAB_KEY) || 'coverage'; } catch (e) {}

  /* ---------------- backend ---------------- */
  function cfg() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function askCfg() {
    const cur = cfg();
    const url = prompt(P('msg.askUrl'), cur.url || '');
    if (!url) return null;
    const token = prompt(P('msg.askToken'), cur.token || '');
    if (!token) return null;
    const c = { url: url.trim().replace(/\/+$/, ''), token: token.trim() };
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
    return c;
  }
  async function api(path, opts = {}) {
    const c = cfg();
    if (!c.url || !c.token) throw Object.assign(new Error(P('msg.nocfg')), { code: 'nocfg' });
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 60000);  /* scale-from-zero can take a few seconds */
    let r;
    try {
      r = await fetch(c.url.replace(/\/+$/, '') + path, {
        method: opts.method || 'GET', signal: ctl.signal,
        headers: Object.assign({ Authorization: 'Bearer ' + c.token }, opts.body ? { 'Content-Type': 'application/json' } : {}),
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    } catch (e) {
      throw Object.assign(new Error(P('msg.net', { url: c.url })), { code: 'net' });
    } finally { clearTimeout(timer); }
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 403) throw Object.assign(new Error(P('msg.auth')), { code: 'auth' });
    if (r.status === 404 && /\/applications/.test(path) && !/\/applications\/app-/.test(path)) {
      throw Object.assign(new Error(P('msg.old')), { code: 'old' });
    }
    if (!r.ok) {
      const d = Array.isArray(j.detail) ? j.detail.map(x => x.msg).join('; ') : j.detail;
      throw Object.assign(new Error(d || P('msg.error', { status: r.status })), { code: r.status });
    }
    return j;
  }

  /* ---------------- links back into the dossier ---------------- */
  function hrefFor(e) {
    const g = e.group || '';
    if (/^(qa|card|push)$/.test(e.kind)) {
      if (e.map === 'rag' || e.map === 'cicd') return `#/sys/${g}`;
      return `#/${e.map}/architecture/${g.split('/').slice(1).join('/')}`;
    }
    if (e.kind === 'pain') return `#/${e.company}/pain`;
    if (e.kind === 'eval') return `#/${e.company}/eval`;
    if (e.kind === 'phase') return '#/matrix';
    return '#/';
  }
  const flag = e => e.check ? `<span class="ap-flag" title="${esc(P('flagTip'))}">${L('flag')}</span>` : '';
  const evLink = e => `<a class="ap-ev" href="${hrefFor(e)}">${esc(e.title)}</a>${flag(e)}`;

  /* ---------------- render ---------------- */
  const known = path => OZ.get('ui.apps.' + path) != null;
  const kindLabel = k => known('kind.' + k) ? L('kind.' + k) : esc(k);
  const statusLabel = s => { const k = s === 'n/a' ? 'na' : s; return known('status.' + k) ? L('status.' + k) : esc(s); };

  function header() {  /* the page's own labels; editable like the rest of the site */
    const co = $('#apps .vbar-co'), sub = $('#apps .vbar-sub');
    if (co) co.innerHTML = OZ.t('apps.title');
    if (sub) sub.innerHTML = OZ.t('apps.sub');
  }
  function render() {
    const root = $('#appsBody');
    if (!root) return;
    header();
    const c = cfg();
    const list = st.list || [];
    const side = `
      <aside class="ap-side">
        <button type="button" class="cta ap-new" data-ap="new">${L('newBtn')}</button>
        <div class="ap-list">${list.length ? list.map(a => `
          <a class="ap-item${st.rec && st.rec.id === a.id ? ' on' : ''}" href="#/apps/${a.id}">
            <b>${esc(a.title)}</b><span>${esc(a.company || '—')} · ${esc((a.createdAt || '').slice(0, 10))}</span>
            <i class="ap-meter"><s style="width:${Math.round((a.must_score || 0) * 100)}%"></s></i>
          </a>`).join('') : `<p class="ap-empty">${st.list ? L('empty') : (c.url ? L('loading') : '')}</p>`}
        </div>
        <button type="button" class="linkish" data-ap="cfg">${c.url ? `${L('copilotIs')} ${esc(c.url.replace(/^https?:\/\//, '').split('.')[0])} · ${L('change')}` : L('connect.title')}</button>
      </aside>`;
    let main;
    if (!c.url || !c.token) main = connectPanel();
    else if (st.rec === 'new' || !st.rec) main = newPanel();
    else main = recPanel(st.rec);
    root.innerHTML = `<div class="ap-grid">${side}<section class="ap-main">${st.err ? `<div class="ap-err">${esc(st.err)}</div>` : ''}${main}</section></div>`;
  }

  function connectPanel() {
    return `<div class="ap-card ap-hero">
      <h3>${L('connect.title')}</h3>
      <p>${L('connect.body')}</p>
      <button type="button" class="cta" data-ap="cfg">${L('connect.button')}</button></div>`;
  }

  function newPanel() {
    return `<form class="ap-card ap-form" id="apForm">
      <h3>${L('form.title')}</h3>
      <p class="ap-hint">${L('form.hint')}</p>
      <div class="ap-row">
        <label>${L('form.role')} <input name="title" maxlength="200" placeholder="${esc(P('form.rolePh'))}"></label>
        <label>${L('form.company')} <input name="company" maxlength="200" placeholder="${esc(P('form.companyPh'))}"></label>
      </div>
      <label>${L('form.jd')} <textarea name="text" rows="14" required minlength="40" placeholder="${esc(P('form.jdPh'))}"></textarea></label>
      <div class="ap-actions"><button type="submit" class="cta" ${st.busy ? 'disabled' : ''}>${st.busy ? L('form.busy') : L('form.submit')}</button></div>
    </form>`;
  }

  function recPanel(rec) {
    const r = rec.result, s = r.coverage.summary;
    const pct = s.must_score == null ? '—' : Math.round(s.must_score * 100) + '%';
    const tabs = ['coverage', 'guide', 'resume', 'posting'].map(k => [k, L('tabs.' + k)]);
    const body = { coverage: coverageTab, guide: guideTab, resume: resumeTab, posting: postingTab }[st.tab] || coverageTab;
    return `<div class="ap-head">
        <div class="ap-title"><h3>${esc(rec.title)}</h3><span>${esc(rec.company || '')}${rec.company ? ' · ' : ''}${L('rec.saved')} ${esc((rec.updatedAt || '').slice(0, 10))}</span></div>
        <div class="ap-score" title="${esc(P('rec.scoreTip'))}"><b>${pct}</b><span>${L('rec.scoreOf')}</span></div>
        <div class="ap-counts"><span class="s-strong">${s.strong} ${L('rec.covered')}</span><span class="s-partial">${s.partial} ${L('rec.partly')}</span><span class="s-gap">${s.gap} ${L('rec.gaps')}</span></div>
        <div class="ap-tools">
          <button type="button" class="ghost sm" data-ap="refresh" title="${esc(P('rec.refreshTip'))}">${st.busy ? L('rec.working') : L('rec.refresh')}</button>
          <button type="button" class="ghost sm" data-ap="delete">${L('rec.del')}</button>
        </div>
      </div>
      <nav class="ap-tabs">${tabs.map(([k, l]) => `<button type="button" class="phasetab${st.tab === k ? ' on' : ''}" data-tab="${k}">${l}</button>`).join('')}</nav>
      <div class="ap-pane">${body(rec)}</div>`;
  }

  function coverageTab(rec) {
    const s = rec.result.coverage.summary;
    const skills = `<div class="ap-skills">
      ${s.skills_matched.length ? `<div><h4>${L('coverage.shows')}</h4>${s.skills_matched.map(x => `<span class="chip ok">${esc(x)}</span>`).join('')}</div>` : ''}
      ${s.skills_missing.length ? `<div><h4>${L('coverage.notShows')}</h4>${s.skills_missing.map(x => `<span class="chip no">${esc(x)}</span>`).join('')}</div>` : ''}
    </div>`;
    const rows = rec.result.coverage.rows.map(r => {
      const ev = r.evidence || [];
      const more = ev.map(e => `<div class="ap-evrow">${evLink(e)}<p>${esc(e.answer)}</p></div>`).join('')
        + (r.closest ? `<div class="ap-evrow"><span class="ap-k">${L('coverage.closest')}</span> ${evLink(r.closest)}<p>${esc(r.closest.answer)}</p></div>` : '')
        + (r.missing_skills && r.missing_skills.length ? `<p class="ap-miss">${L('coverage.notIn')} ${r.missing_skills.map(esc).join(', ')}</p>` : '')
        + (r.note ? `<p class="ap-note">${esc(r.note)}</p>` : '');
      return `<details class="ap-req st-${r.status.replace('/', '')}">
        <summary><span class="kind k-${r.kind}">${kindLabel(r.kind)}</span><span class="txt">${esc(r.text)}</span>
          <span class="status">${statusLabel(r.status)}</span>
          <span class="first">${ev[0] ? esc(ev[0].title) : ''}</span></summary>
        <div class="ap-more">${more || `<p class="ap-note">${L('coverage.nothing')}</p>`}</div></details>`;
    }).join('');
    return skills + `<div class="ap-reqs">${rows}</div>`;
  }

  function guideTab(rec) {
    const g = rec.result.guide;
    const sec = (title, inner, cls = '') => inner ? `<section class="ap-gsec ${cls}"><h4>${title}</h4>${inner}</section>` : '';
    return sec(L('guide.stories'), g.stories.map(e => `<div class="ap-story">${evLink(e)}<p>${esc(e.answer)}</p></div>`).join(''))
      + sec(L('guide.questions'), g.questions.map(q => `<details class="ap-q"><summary>${esc(q.question)}${flag(q)}</summary><p>${esc(q.answer)}</p><a class="ap-src" href="${hrefFor(q)}">${L('guide.openCard')}</a></details>`).join(''))
      + sec(L('guide.gaps'), g.gaps.map(x => `<div class="ap-gap"><b>${esc(x.text)}</b><p>${esc(x.tip)}</p></div>`).join(''), 'warn')
      + sec(L('guide.verify'), g.verify.map(e => `<div class="ap-verify">${evLink(e)}</div>`).join(''))
      + sec(L('guide.ask'), `<ol class="ap-ask">${g.ask.map(q => `<li>${esc(q)}</li>`).join('')}</ol>`)
      + sec(L('guide.yourself'), g.logistics.length ? `<ul class="ap-ask">${g.logistics.map(q => `<li>${esc(q)}</li>`).join('')}</ul>` : '');
  }

  function md2html(md) {
    return md.split('\n').map(l => {
      const t = esc(l).replace(/\*([^*]+)\*/g, '<em>$1</em>');
      if (/^### /.test(l)) return `<h5>${t.slice(4)}</h5>`;
      if (/^## /.test(l)) return `<h4>${t.slice(3)}</h4>`;
      if (/^# /.test(l)) return `<h3>${t.slice(2)}</h3>`;
      if (/^- /.test(l)) return `<li>${t.slice(2)}</li>`;
      return l.trim() ? `<p>${t}</p>` : '';
    }).join('').replace(/(<li>.*?<\/li>)+/g, m => `<ul>${m}</ul>`);
  }
  function resumeTab(rec) {
    const r = rec.result.resume;
    return `<div class="ap-resume-tools">
        <button type="button" class="ghost sm" data-ap="copymd">${L('resume.copy')}</button>
        <button type="button" class="ghost sm" data-ap="dlmd">${L('resume.download')}</button>
        <span class="ap-hint">${L('resume.hint')}</span>
      </div>
      <article class="ap-resume">${md2html(r.markdown)}</article>
      ${r.left_out.length ? `<p class="ap-miss">${L('resume.leftOut')} ${r.left_out.map(esc).join(', ')}</p>` : ''}`;
  }
  function postingTab(rec) { return `<pre class="ap-posting">${esc(rec.text)}</pre>`; }

  /* ---------------- actions ---------------- */
  function fail(e) {
    st.busy = false;
    st.err = e.message;
    render();
    if (e.code === 'auth' || e.code === 'nocfg') { if (askCfg()) { st.err = ''; load(); } }
  }
  async function load(id) {
    st.err = '';
    if (!cfg().url) { st.list = []; render(); return; }
    try {
      st.list = (await api('/applications')).applications;
      if (id) st.rec = await api('/applications/' + encodeURIComponent(id));
      else st.rec = st.list.length ? null : 'new';
      render();
    } catch (e) { st.list = st.list || []; fail(e); }
  }
  async function loadList() {
    try { st.list = (await api('/applications')).applications; render(); } catch (e) { /* the main view already shows errors */ }
  }
  async function submit(form) {
    const f = new FormData(form);
    const body = { text: f.get('text'), title: f.get('title') || null, company: f.get('company') || null };
    st.busy = true; st.err = ''; render();
    const keep = $('#apForm');
    if (keep) { keep.text.value = body.text; keep.title.value = body.title || ''; keep.company.value = body.company || ''; }
    try {
      const rec = await api('/applications', { method: 'POST', body });
      st.busy = false; st.rec = rec; st.tab = 'coverage';
      location.hash = '#/apps/' + rec.id;
    } catch (e) {
      fail(e);
      const again = $('#apForm');
      if (again) { again.text.value = body.text; again.title.value = body.title || ''; again.company.value = body.company || ''; }
    }
  }
  async function refresh() {
    if (!st.rec || st.rec === 'new') return;
    st.busy = true; render();
    try { st.rec = await api(`/applications/${st.rec.id}/refresh`, { method: 'POST', body: {} }); st.busy = false; await load(st.rec.id); }
    catch (e) { fail(e); }
  }
  async function del() {
    if (!st.rec || !confirm(P('rec.delConfirm', { title: st.rec.title }))) return;
    try { await api(`/applications/${st.rec.id}`, { method: 'DELETE' }); st.rec = null; location.hash = '#/apps'; load(); }
    catch (e) { fail(e); }
  }
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-ap],[data-tab]');
    if (!t || !t.closest('#apps')) return;
    if (t.dataset.tab) { st.tab = t.dataset.tab; try { localStorage.setItem(TAB_KEY, st.tab); } catch (x) {} render(); return; }
    const a = t.dataset.ap;
    if (a === 'new') { st.rec = 'new'; st.err = ''; if (location.hash !== '#/apps') location.hash = '#/apps'; render(); }
    else if (a === 'cfg') { if (askCfg()) load(); }
    else if (a === 'refresh') refresh();
    else if (a === 'delete') del();
    else if (a === 'copymd') {
      const md = st.rec.result.resume.markdown;
      (navigator.clipboard ? navigator.clipboard.writeText(md) : Promise.reject()).then(() => { t.textContent = P('resume.copied'); setTimeout(() => { t.innerHTML = L('resume.copy'); }, 1500); })
        .catch(() => download('resume-draft.md', md));
    } else if (a === 'dlmd') {
      const slug = (st.rec.title + ' ' + (st.rec.company || '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      download(`resume-${slug || 'draft'}.md`, st.rec.result.resume.markdown);
    }
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'apForm') return;
    e.preventDefault(); if (!st.busy) submit(e.target);
  });

  window.OZ = window.OZ || {};
  /* Edit on/off redraws the labels; keep a half-pasted posting, open rows and the scroll position */
  function rerender() {
    const f = $('#apForm');
    const keep = f ? { text: f.text.value, title: f.title.value, company: f.company.value } : null;
    const open = Array.from(document.querySelectorAll('#apps details')).map(d => d.open);
    const scr = $('#apps'), y = scr ? scr.scrollTop : 0, wy = window.scrollY;
    render();
    const g = $('#apForm');
    if (g && keep) { g.text.value = keep.text; g.title.value = keep.title; g.company.value = keep.company; }
    document.querySelectorAll('#apps details').forEach((d, i) => { if (open[i]) d.open = true; });
    if (scr) scr.scrollTop = y;
    window.scrollTo(0, wy);
  }

  window.OZ.apps = {
    rerender,
    open(id) {
      if (id && st.rec && st.rec.id === id) { render(); loadList(); return; }  /* just saved: keep it, refresh the list */
      if (!id && st.rec && st.rec !== 'new') st.rec = null;
      render();
      load(id);
    }
  };
})();

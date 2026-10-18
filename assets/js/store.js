/* ===========================================================
   store.js — working copy of the content + persistence + undo
   =========================================================== */
window.OZ = (() => {
  /* This site shares browser storage with the first dossier (both live on
     ozdurand.github.io), so v2 keeps its own key and never deletes the
     first site's saves. */
  const KEY = 'oz.v2.data.v5';
  const MIGRATED = 'oz.v2.migrated';
  const OLD_KEYS = ['oz.data.v4', 'oz.data.v3', 'oz.data.v2', 'oz.data.v1'];
  /* diagrams whose shipped layout changed between builds — these are taken
     fresh from the shipped files when migrating an older save */
  const RELAYOUT = ['jj', 'hd', 'citi', 'rag', 'cicd'];
  /* shipped narrative text that changed in this build; replaced in an older
     save only where it was never edited */
  const TEXT_UPDATES = [
    ['Azure Service Bus with a dedicated request/response channel per agent', 'Azure Service Bus: a topic per agent with stable and canary subscriptions; only the orchestrator reads results'],
    ['Service Bus · per-agent channels', 'Service Bus · topic per agent'],
    ['Per-agent request/response channels on Service Bus with the orchestrator as sole subscriber on results.', 'A topic per agent on Service Bus, with the orchestrator as the only reader of results.']
  ];
  const clone = o => JSON.parse(JSON.stringify(o));
  const isObj = o => o && typeof o === 'object' && !Array.isArray(o);
  const mem = {};
  const ls = {
    get(k) { try { const v = localStorage.getItem(k); return v === null ? (mem[k] ?? null) : v; } catch (e) { return mem[k] ?? null; } },
    set(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* normalize a walkthrough card to the four-panel schema and overlay CARDS */
  function normDetail(d, card) {
    d = d || {};
    const n = {
      head: d.head || '', role: d.role || '', how: d.how || d.does || [],
      dh: d.dh || '', dec: d.dec || d.fork || '', hard: d.hard || '',
      stack: d.stack || [], say: d.say || ''
    };
    if (card) Object.keys(card).forEach(k => { n[k] = card[k]; });
    /* the opening line often restates the old one-line role; keep the body only when it adds something */
    if (n.head && n.role) {
      const w = t => new Set(String(t).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(x => x.length > 3));
      const A = w(n.head), B = w(n.role); let inter = 0; A.forEach(x => { if (B.has(x)) inter++; });
      if (inter / Math.max(1, Math.min(A.size, B.size)) > 0.6) delete n.role;
    }
    Object.keys(n).forEach(k => { if (n[k] === '' || (Array.isArray(n[k]) && !n[k].length)) delete n[k]; });
    return n;
  }
  const IV = typeof INTERVIEW === 'object' ? INTERVIEW : {};
  function applyCards(diagrams) {
    const walk = (lay, prefix) => {
      (lay.bands || []).forEach(b => {
        const c = CARDS[prefix + b.id], iv = IV[prefix + b.id];
        if (b.detail || c || iv) b.detail = normDetail(b.detail, c);
        if (iv) b.detail.iv = clone(iv);
      });
      (lay.nodes || []).forEach(nd => {
        const c = CARDS[prefix + nd.id];
        nd.detail = normDetail(nd.detail, c);
        if (IV[prefix + nd.id]) nd.detail.iv = clone(IV[prefix + nd.id]);
        if (nd.variants) Object.keys(nd.variants).forEach(v => { if (nd.variants[v].detail) nd.variants[v].detail = normDetail(nd.variants[v].detail); });
      });
    };
    Object.keys(diagrams).forEach(id => {
      const g = diagrams[id];
      if (g.layouts) Object.keys(g.layouts).forEach(v => walk(g.layouts[v], id + '/' + v + '/'));
      else walk(g, id + '/');
    });
    return diagrams;
  }
  const shipped = { companies: clone(COMPANIES), diagrams: applyCards(clone(DIAGRAMS)), ui: clone(UI_TEXT) };

  /* add anything a save is missing (new labels, the Problem statement) without touching what it has */
  function fillMissing(t, s) {
    Object.keys(s).forEach(k => {
      if (!(k in t)) t[k] = clone(s[k]);
      else if (isObj(t[k]) && isObj(s[k])) fillMissing(t[k], s[k]);
    });
  }
  /* the problem statement used to be a list of paragraphs on its own page; it is now
     one slide per step on the home page. Saved paragraphs keep their text. */
  function problemToSlides(d) {
    Object.keys(d.companies || {}).forEach(id => {
      const pr = d.companies[id] && d.companies[id].problem;
      if (!isObj(pr) || !Array.isArray(pr.paragraphs)) return;
      if (!Array.isArray(pr.slides)) {
        const base = ((shipped.companies[id] || {}).problem || {}).slides || [];
        pr.slides = pr.paragraphs.map((text, i) => base[i]
          ? { id: base[i].id, label: base[i].label, text }
          : { id: '', label: 'Step ' + (i + 1), text });
      }
      delete pr.paragraphs;
    });
  }
  /* shipped labels that changed in this build: replaced only where the save still has the old wording */
  const LABEL_UPDATES = [
    ['matrix.sub', 'Company × maturity, plus the two pipelines that cut across all of them.'],
    ['matrix.sub', 'Each company’s architecture and pain points, plus the two pipelines that cut across all of them.']
  ];
  function updateLabels(d) {
    LABEL_UPDATES.forEach(([path, old]) => {
      const ks = path.split('.'); const last = ks.pop();
      const o = ks.reduce((o, k) => (o && isObj(o[k]) ? o[k] : null), d.ui);
      const n = ks.reduce((o, k) => (o ? o[k] : null), shipped.ui);
      if (o && n && o[last] === old) o[last] = n[last];
    });
  }
  /* interview answers arrive with this build; a saved map gets them for any box or layer
     that doesn't have them yet, matched by id, without touching anything else it holds */
  function fillInterview(d) {
    const each = (lay, fn) => { (lay.bands || []).forEach(b => fn(b, 'bands')); (lay.nodes || []).forEach(n => fn(n, 'nodes')); };
    const pair = (sl, tl) => {
      if (!sl || !tl) return;
      const byId = {}; each(sl, (x, k) => { byId[k + ':' + x.id] = x; });
      each(tl, (x, k) => {
        const src = byId[k + ':' + x.id];
        if (!src || !src.detail || !src.detail.iv) return;
        if (!isObj(x.detail)) x.detail = {};
        if (!x.detail.iv) x.detail.iv = clone(src.detail.iv);
      });
    };
    Object.keys(shipped.diagrams).forEach(id => {
      const s = shipped.diagrams[id], t = d.diagrams[id];
      if (!t || t === s) return;
      if (s.layouts) Object.keys(s.layouts).forEach(v => pair(s.layouts[v], t.layouts && t.layouts[v]));
      else pair(s, t);
    });
  }
  /* content updates to lists a save already holds, each applied once (ids kept in d.applied):
     a row someone later deletes stays deleted, and edited rows are never overwritten */
  const OLD_JJ_COORD = ['Orchestrator + agents', 'Coordination drift', 'Six moving parts meant versioning and hand-off drift across agents.', 'A topic per agent on Service Bus, with the orchestrator as the only reader of results.'];
  function jjOrchestratorPains(d) {
    const t = d.companies && d.companies.jj, s = shipped.companies.jj;
    if (!isObj(t) || !Array.isArray(t.pains)) return;
    const titles = ['Vague hand-offs', 'Lost context, compounding errors', 'Done, right — and debuggable'];
    const has = title => t.pains.some(p => Array.isArray(p) && p[1] === title);
    const rows = titles.map(x => s.pains.find(p => p[1] === x)).filter(p => p && !has(p[1])).map(clone);
    const old = t.pains.findIndex(p => JSON.stringify(p) === JSON.stringify(OLD_JJ_COORD));
    if (old >= 0) t.pains.splice(old, 1, ...rows);  /* untouched original row: becomes the three orchestrator rows */
    else {                                          /* edited or removed: keep theirs, add the new rows beside it */
      const j = t.pains.findIndex(p => Array.isArray(p) && /orchestrat/i.test(p[0] + ' ' + p[1]));
      const g = t.pains.findIndex(p => Array.isArray(p) && /generation/i.test(p[0]));
      t.pains.splice(j >= 0 ? j + 1 : (g >= 0 ? g : t.pains.length), 0, ...rows);
    }
    const cost = s.pains.find(p => p[1] === 'Token cost multiplied per hop');
    if (cost && !has(cost[1])) {
      const k = t.pains.findIndex(p => Array.isArray(p) && /\beval\b|\bops\b/i.test(p[0]));  /* whole words: not “Retrieval” */
      t.pains.splice(k >= 0 ? k + 1 : t.pains.length, 0, clone(cost));
    }
  }
  const MIGRATIONS = [['jj-pains-orchestrator-cost', jjOrchestratorPains]];
  shipped.applied = MIGRATIONS.map(m => m[0]);
  function migrate(d) {
    const done = new Set(Array.isArray(d.applied) ? d.applied : []);
    MIGRATIONS.forEach(([id, fn]) => { if (!done.has(id)) { fn(d); done.add(id); } });
    d.applied = Array.from(done);
  }

  function complete(d) {
    if (!isObj(d.ui)) d.ui = {};
    problemToSlides(d);
    fillInterview(d);
    migrate(d);
    updateLabels(d);
    fillMissing(d.ui, shipped.ui);
    fillMissing(d.companies, shipped.companies);
    Object.keys(shipped.diagrams).forEach(id => { if (!d.diagrams[id]) d.diagrams[id] = clone(shipped.diagrams[id]); });
    return d;
  }
  const valid = d => d && d.companies && d.diagrams;

  function load() {
    const raw = ls.get(KEY);
    if (raw) {
      try { const d = JSON.parse(raw); if (valid(d)) return complete(d); } catch (e) {}
      return clone(shipped);
    }
    /* first visit to this build: carry over edits from the older shared save once */
    if (ls.get(MIGRATED) === null) {
      ls.set(MIGRATED, '1');
      for (const k of OLD_KEYS) {
        const old = ls.get(k);
        if (!old) continue;
        try {
          let txt = old;
          TEXT_UPDATES.forEach(([a, b]) => { txt = txt.split(JSON.stringify(a).slice(1, -1)).join(JSON.stringify(b).slice(1, -1)); });
          const d = JSON.parse(txt);
          if (valid(d)) {
            RELAYOUT.forEach(id => { d.diagrams[id] = clone(shipped.diagrams[id]); });
            complete(d);
            ls.set(KEY, JSON.stringify(d));
            return d;
          }
        } catch (e) {}
      }
    }
    return clone(shipped);
  }

  const OZ = {
    shipped,
    data: load(),
    editing: false,
    undoStack: [], redoStack: [],
    dirty: false,

    save() { ls.set(KEY, JSON.stringify(OZ.data)); OZ.dirty = false; },

    /* one file with everything: shipped content plus every edit (the pitch is added by the app) */
    exportData() {
      return { format: 'oz-dossier-export', version: 1, exportedAt: new Date().toISOString(), hasEdits: OZ.hasEdits(), data: clone(OZ.data) };
    },
    /* accept an export file (or bare data) and make it the working copy; returns false if it isn't one */
    importData(obj) {
      const d = obj && obj.format === 'oz-dossier-export' ? obj.data : obj;
      if (!valid(d)) return false;
      OZ.data = complete(clone(d));
      OZ.save();
      return true;
    },
    reset() { OZ.data = clone(shipped); ls.del(KEY); ls.set(MIGRATED, '1'); OZ.undoStack = []; OZ.redoStack = []; },
    hasEdits() { return ls.get(KEY) !== null; },

    /* snapshot-based undo: call before a change is committed */
    snapshot() {
      const cur = JSON.stringify(OZ.data);
      if (OZ.undoStack.length && OZ.undoStack[OZ.undoStack.length - 1] === cur) return;
      OZ.undoStack.push(cur);
      if (OZ.undoStack.length > 120) OZ.undoStack.shift();
      OZ.redoStack = [];
    },
    undo() {
      if (!OZ.undoStack.length) return false;
      OZ.redoStack.push(JSON.stringify(OZ.data));
      OZ.data = JSON.parse(OZ.undoStack.pop()); OZ.save(); return true;
    },
    redo() {
      if (!OZ.redoStack.length) return false;
      OZ.undoStack.push(JSON.stringify(OZ.data));
      OZ.data = JSON.parse(OZ.redoStack.pop()); OZ.save(); return true;
    },

    /* dotted-path helpers: 'companies.jj.phases.poc.list.2' */
    get(path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), OZ.data); },
    shippedAt(path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), shipped); },
    set(path, val) {
      const ks = path.split('.'); const last = ks.pop();
      const o = ks.reduce((o, k) => (o[k] == null ? (o[k] = {}) : o[k]), OZ.data);
      o[last] = val;
    },

    /* editable text span when in edit mode, plain text otherwise */
    ed(text, path, cls) {
      if (!OZ.editing) return text == null ? '' : text;
      return `<span class="ed${cls ? ' ' + cls : ''}" contenteditable="true" spellcheck="false" data-p="${path}">${text == null ? '' : text}</span>`;
    },
    /* one line of a multi-line value (data-line) or one side of "name — tagline" (data-part) */
    edAt(text, path, attr, idx) {
      if (!OZ.editing) return text == null ? '' : text;
      return `<span class="ed" contenteditable="true" spellcheck="false" data-p="${path}" data-${attr}="${idx}">${text == null ? '' : text}</span>`;
    },
    /* interface label from OZ.data.ui by dotted key, editable in edit mode */
    t(key) { return OZ.ed(OZ.get('ui.' + key), 'ui.' + key); },
    tv(key) { const v = OZ.get('ui.' + key); return v == null ? '' : v; },
    /* row tools for arrays: delete this row, add a row after it */
    rowTools(arrPath, i, tpl) {
      if (!OZ.editing) return '';
      return `<span class="rowtools">
        <button type="button" class="rt" data-act="add" data-arr="${arrPath}" data-i="${i}" data-tpl='${JSON.stringify(tpl).replace(/'/g, '&#39;')}' title="Add after">+</button>
        <button type="button" class="rt del" data-act="del" data-arr="${arrPath}" data-i="${i}" title="Delete">×</button></span>`;
    },
    addTool(arrPath, tpl, label) {
      if (!OZ.editing) return '';
      return `<button type="button" class="rt wide" data-act="add" data-arr="${arrPath}" data-i="-1" data-tpl='${JSON.stringify(tpl).replace(/'/g, '&#39;')}'>+ ${label || 'Add'}</button>`;
    },
    uid(prefix) { return (prefix || 'n') + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1e3).toString(36); }
  };
  return OZ;
})();

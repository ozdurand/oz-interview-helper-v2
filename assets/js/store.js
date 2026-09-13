/* ===========================================================
   store.js — working copy of the content + persistence + undo
   =========================================================== */
window.OZ = (() => {
  const KEY = 'oz.data.v4';
  const OLD_KEYS = ['oz.data.v3', 'oz.data.v2', 'oz.data.v1'];
  /* diagrams whose shipped layout changed between builds — these are taken
     fresh from the shipped files when migrating an older save */
  const RELAYOUT = ['jj', 'hd', 'citi', 'rag', 'cicd'];
  const clone = o => JSON.parse(JSON.stringify(o));
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
  function applyCards(diagrams) {
    const walk = (lay, prefix) => {
      (lay.bands || []).forEach(b => { const c = CARDS[prefix + b.id]; if (b.detail || c) b.detail = normDetail(b.detail, c); });
      (lay.nodes || []).forEach(nd => {
        const c = CARDS[prefix + nd.id];
        nd.detail = normDetail(nd.detail, c);
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
  const shipped = { companies: clone(COMPANIES), diagrams: applyCards(clone(DIAGRAMS)) };

  function load() {
    const raw = ls.get(KEY);
    if (raw) {
      try { const d = JSON.parse(raw); if (d && d.companies && d.diagrams) return d; } catch (e) {}
      return clone(shipped);
    }
    /* migrate an older save: keep every edit except the relaid-out maps */
    for (const k of OLD_KEYS) {
      const old = ls.get(k);
      if (!old) continue;
      try {
        const d = JSON.parse(old);
        if (d && d.companies && d.diagrams) {
          RELAYOUT.forEach(id => { d.diagrams[id] = clone(shipped.diagrams[id]); });
          ls.set(KEY, JSON.stringify(d)); ls.del(k);
          return d;
        }
      } catch (e) {}
      ls.del(k);
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
    reset() { OZ.data = clone(shipped); ls.del(KEY); OLD_KEYS.forEach(k => ls.del(k)); OZ.undoStack = []; OZ.redoStack = []; },
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

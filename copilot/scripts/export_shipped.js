#!/usr/bin/env node
/* Export the shipped dossier content in exactly the shape the site's Export
   button produces, by running the site's own scripts (no edits included).
   usage: node copilot/scripts/export_shipped.js [out.json]                    */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const site = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
/* load the same data scripts, in the same order, as index.html — stop before the UI */
const scripts = [...html.matchAll(/<script src="(assets\/js\/[^"]+)"><\/script>/g)].map(m => m[1]);
const upto = scripts.indexOf('assets/js/store.js');
if (upto < 0) throw new Error('store.js not found in index.html');

const ctx = vm.createContext({ window: {}, console });
for (const s of scripts.slice(0, upto + 1)) vm.runInContext(fs.readFileSync(path.join(site, s), 'utf8'), ctx, { filename: s });
const out = vm.runInContext(`({
  format: 'oz-dossier-export', version: 1, exportedAt: null,
  hasEdits: false, shipped: true, pitch: PITCH_DEFAULT, data: window.OZ.shipped
})`, ctx);

const file = process.argv[2] || path.join(__dirname, '..', 'data', 'shipped-export.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`wrote ${path.relative(process.cwd(), file)} — ${Object.keys(out.data.diagrams).length} maps, ${Object.keys(out.data.companies).length} companies`);

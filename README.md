# Systems Dossier — oz-interview-helper

Static site. No build step, no dependencies. Drop the contents of this folder at the
root of the `oz-interview-helper` repo and GitHub Pages serves it as-is.

    index.html
    .nojekyll
    assets/css/dossier.css
    assets/js/content.js      narrative copy: pitch, Problem statement slides, POC/MVP/Production
                              (kept for the journey page), pain points, and every interface label (UI_TEXT)
    assets/js/diagrams.js     J&J, Home Depot, Citibank interactive maps
    assets/js/diagrams2.js    RAG pipeline, CI/CD pipeline
    assets/js/interview.js    every box and layer as interview answers (all five maps)
    assets/js/evaluation.js   the J&J Evaluation page — RAGAS and the seven layers (J&J + generic)
    assets/js/store.js        working copy of all content, browser persistence, undo/redo
    assets/js/engine.js       SVG renderer (nodes, edges, bands, wrapping)
    assets/js/app.js          routing, matrix, views, pan/zoom, deck, trace
    assets/js/editor.js       edit mode: in-place text, add/delete/move/connect

## Layout

- **Home** never scrolls. The links bar (Open the matrix, the three companies,
  the cross-cutting pipelines) sits on top; below it is a carousel: slide 1
  is the elevator pitch, slides 2–6 are the J&J Problem statement, one step
  per slide (The problem · The solution · An example · My role · The result).
  Move with the arrows, the labelled dots, the ← → keys, or a swipe on a
  phone. Text shrinks to fit the slide, so nothing ever scrolls.
- **The matrix** shows Architecture and Pain points for each company, plus the
  RAG and CI/CD pipelines. J&J also has **Evaluation**: RAGAS and the seven
  evaluation layers. The seven layers sit on the left with arcs for how they
  interact (feeds · checks · explains); click a layer, or press 1–7, to see it
  and its connections. The panel on the right has tabs for RAGAS, the golden
  set, thresholds, RAGAS vs DeepEval and reading a regression. A **J&J /
  Generic** switch swaps between the J&J platform and a version for any RAG
  system; the choice is remembered. Statements built on general reasoning
  rather than your notes carry a **to confirm** tag. POC / MVP / Production are off the matrix for now;
  their content stays in `content.js` for the POC → Production journey page.
  Old links to a phase page open the matrix; the old Problem statement link
  opens the carousel on slide 2.

- **Card pages** (tap a box or layer on a map) open as interview answers when
  the box has them: **Say it in 20 seconds** (a layer: **Walk me through this
  layer**), **They’ll ask** — likely questions, click one or press its number
  to open the answer — **Numbers to drop**, **Stack** and **If they push**. An
  answer tagged **to confirm** is built on general reasoning rather than your
  own notes; check it matches what you did before you use it. **Reference**
  (top right) switches to the original technical panels and stays switched
  until you switch back. Every box and layer on all five maps has interview
  answers.

## Editing in the browser

Press **Edit** (top right on every screen). Everything below saves to this
browser automatically; **Done editing** returns to the presentation view.

- Home carousel: type straight into any slide, no Edit mode needed; it saves
  as you type and **Reset to original** restores that slide. In Edit mode the
  slide labels and titles are editable too, and **+ Add a slide after** /
  **× Delete this slide** change the Problem statement steps.
- Interview cards: in Edit mode every question and answer is open and
  editable; `+` / `×` add or remove questions and numbers, and ⚑ marks or
  clears **to confirm** on an answer.
- Every text on every screen: click it to edit in place. That includes the
  home labels and quick links, the matrix title and cell labels, page titles
  and subtitles, section headings, card titles and
  sub-labels, and the card panel headings. Enter or clicking away commits.
  `+` adds a row after, `×` deletes it. Inside links and buttons, a click
  places the caret instead of navigating while edit mode is on.
- Map title, subtitle, legend, footnote, trace narration and toggle labels:
  tap the title or legend on the map, or press **Titles & trace…**.
- Diagram maps: tap a box, layer or arrow to select it. Drag to move, drag the
  amber corner to resize. Double-tap (or **Edit…**) opens the form for its
  text — name, sub-label, border colour, layer, and the full walkthrough card.
  **Delete** or the Delete key removes the selection and any arrows on it.
- **+ Box**, **+ Column layer**, **+ Strip layer** drop a new item at the
  centre of the view. The canvas grows if you place something past the edge.
- **Connect →**: tap the source, tap the target. Either can be a box or a
  layer. The arrow form sets label, style (solid / dashed / teal gate /
  violet governance), direction (one way, both ways, none) and route
  (auto elbow, flipped elbow, straight).
- On Citibank and CI/CD, the form has an "Only for this variant" switch so a
  text edit can apply to just the active workload or agent.
- **Undo / Redo** (Ctrl-Z / Ctrl-Shift-Z) across the session. **Reset all**
  discards every browser edit and returns to the shipped content in the
  `content.js` / `diagrams*.js` files.

Edits live in this browser only. Nothing is written back to the repo — to
make an edit permanent for every device, change the shipped files.

This site and the original dossier share browser storage on
ozdurand.github.io, so v2 saves under its own keys (`oz.v2.data.v5`, and
`oz.v2.pitch` for the pitch). On the first visit it copies any edits saved by
the original site, then never touches that site's data again. **Reset all**
clears only v2's edits.

## Editing content (in the files)

Everything you'd want to change lives in `content.js` and the two `diagrams*.js`
files. Nothing in `engine.js` or `app.js` needs to be touched to add a node, a
pain point, or a whole new diagram.

Tapping a box or layer opens its card page: four panels (The role · How it
works · The decision · Stack, or for layers What it's for · What's inside ·
The boundary · Stack) and an "In the room" one-liner. Card text lives in
`detail` on each node/band with keys `head, role, how[], dh, dec, hard,
stack[[k,v]], say`; `cards.js` holds the shipped card copy and is merged over
the diagrams at load.

**Add a node to a map:** append to that diagram's `nodes` array.

    { id:'my_node', band:'retr', x:1075, y:615, w:220, h:80,
      name:'New component', sub:'one-line role', acc:2,
      detail:{
        role:'One or two sentences.',
        does:['bullet','bullet'],
        fork:'The alternative it beat, and why it lost.',
        hard:'Learned the hard way.',
        stack:[['Key','Value']],
        say:'The one-liner you would actually say out loud.'
      }
    }

Box colours use `tone`: slate, blue, purple, pink, green, teal, rose, amber,
orange, white (orange outline), note (dashed). Arrow styles (4th element of an
edge): `sync`, `pub`, `hyb`, `term`, `async`, `term-dash`, `green-dash`,
`blue-dash`, plus `dash`, `t2`, `t3`. A layer with `tone` and `inside:true`
draws as a dashed coloured container with its label inside (the J&J map).
An edge's 5th element can carry `pts:[[x,y],...]` waypoints, `from`/`to`
anchor overrides, and `lbl:[x,y]` to pin the label.

`x`/`y`/`w`/`h` are diagram coordinates (the canvas is `w` x `h` on the diagram
object). `band` must match a band id. `acc` tints the border: 1 amber, 2 teal,
3 violet. Every `detail` field is optional.

**Add an edge:** `['from_id','to_id','optional label','dash']`. Routing is
automatic — right-to-left, left-to-right and vertical elbows are all handled.

**Interview answers:** add an entry to `INTERVIEW` in `interview.js`, keyed
like `cards.js` (`'jj/sb'`, or `'citi/fraud/g1'` for a per-workload layout):
`{ short, qa: [{ q, a, check }], nums: [[value, label]], push: { q, a, check } }`.

**Add a whole diagram:** add a key to `DIAGRAMS` and a matrix cell in
`buildMatrix()` in `app.js`.

**Variant toggle** (Citibank workloads, CI/CD agent): add `variantGroup` to the
diagram and `variants:{ optionId:{ name, sub, detail } }` to any node that
should change.

**Depth toggle** (CI/CD governance): add `depthGroup` and give nodes a
`depth: 1 | 2 | 3`. Deeper layers dim rather than disappear.

## Per-workload layouts

A diagram can carry `layouts: { optionId: { w, h, font, sheet, bands, nodes,
edges, trace } }` alongside its `variantGroup`. The toggle then swaps the whole
drawing (Citibank: fraud / credit / AML). Edits in edit mode apply to the
layout that is showing. Node `shape` can be `cyl` or `diamond`; a band with
`style:'rule'` draws as a heading and a horizontal rule instead of a box.

## Keyboard

`f` fit · `t` trace · `n` names only · `Esc` back / close ·
`1`–`9` open that question on a card page · arrow keys page the detail deck, the card pages and the home carousel (`Home` / `End` jump
to the first / last slide).

## Notes

- The elevator pitch saves to `localStorage`, wrapped in try/catch with an
  in-memory fallback so it degrades quietly in sandboxed previews.
- Fonts load from Google Fonts; the page falls back to system serif/mono if
  they're blocked.

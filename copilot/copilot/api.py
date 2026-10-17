"""Copilot API — phase 0: knowledge base in, search out.

  GET  /health            no sign-in; what is loaded
  POST /ingest            the dossier export (the site's "Send to copilot"); rebuilds the index
  GET  /search?q=…        hybrid search; filters: company, map, kind, variant
  GET  /entries/{id}      one entry, with where it came from in the dossier

Settings (environment):
  DATA_DIR          where the latest export and embedding cache live (default ./runtime)
  ALLOWED_ORIGINS   comma list for CORS (default the GitHub Pages site + localhost)
  MAX_INGEST_MB     largest export accepted (default 15)
  AUTH_MODE, COPILOT_TOKEN, ENTRA_*   see auth.py
  EMBEDDINGS, OPENAI_*, AZURE_OPENAI_* see embeddings.py
"""
from __future__ import annotations

import json
import os
import threading
import time
from pathlib import Path

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from . import embeddings
from .auth import Caller, require_caller
from .kb import ExportError, build_entries, summary
from .search import Index

PKG = Path(__file__).resolve().parent.parent
SHIPPED = PKG / "data" / "shipped-export.json"


class State:
    def __init__(self):
        self.lock = threading.Lock()
        self.index: Index | None = None
        self.meta: dict = {}

    @property
    def data_dir(self) -> Path:
        d = Path(os.environ.get("DATA_DIR", PKG / "runtime"))
        d.mkdir(parents=True, exist_ok=True)
        return d

    def build(self, export: dict, source: str) -> dict:
        entries = build_entries(export)
        idx = Index(entries, embeddings.from_env(self.data_dir))
        meta = {"source": source, "exportedAt": export.get("exportedAt"), "hasEdits": export.get("hasEdits"),
                "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "retrievers": idx.retrievers, **summary(entries)}
        with self.lock:
            self.index, self.meta = idx, meta
        return meta

    def load(self) -> None:
        saved = self.data_dir / "export.json"
        if saved.exists():
            try:
                self.build(json.loads(saved.read_text()), "export")
                return
            except Exception:
                pass
        self.build(json.loads(SHIPPED.read_text()), "shipped")


STATE = State()


@asynccontextmanager
async def lifespan(_app):
    STATE.load()
    yield


app = FastAPI(title="Oz copilot", version="0.1.0", description="Phase 0: dossier knowledge base and hybrid search.", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "https://ozdurand.github.io,http://localhost:8790").split(",") if o.strip()],
    allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"], max_age=600,
)


def _index() -> Index:
    if STATE.index is None:
        STATE.load()
    return STATE.index  # type: ignore[return-value]


@app.get("/health")
def health() -> dict:
    _index()
    return {"ok": True, **{k: STATE.meta.get(k) for k in ("source", "entries", "retrievers", "exportedAt", "builtAt", "to_confirm")}}


@app.post("/ingest")
async def ingest(request: Request, caller: Caller = Depends(require_caller)) -> dict:
    limit = float(os.environ.get("MAX_INGEST_MB", "15")) * 1024 * 1024
    body = await request.body()
    if len(body) > limit:
        raise HTTPException(413, "export too large")
    try:
        export = json.loads(body)
        meta = STATE.build(export, "export")
    except (ValueError, ExportError) as e:
        raise HTTPException(422, f"not a dossier export: {e}")
    tmp = STATE.data_dir / "export.json.tmp"
    tmp.write_text(json.dumps(export))
    tmp.replace(STATE.data_dir / "export.json")
    return meta


@app.get("/search")
def search(q: str = Query(..., min_length=2, max_length=500), k: int = Query(8, ge=1, le=30),
           company: str | None = None, map: str | None = None, kind: str | None = None, variant: str | None = None,
           per_group: bool = True, caller: Caller = Depends(require_caller)) -> dict:
    t = time.perf_counter()
    hits = _index().search(q, k=k, per_group=per_group, company=company, map=map, kinds=kind, variant=variant)
    return {"q": q, "ms": round((time.perf_counter() - t) * 1000, 1), "hits": [h.to_dict() for h in hits]}


@app.get("/entries/{entry_id:path}")
def entry(entry_id: str, caller: Caller = Depends(require_caller)) -> dict:
    for e in _index().entries:
        if e.id == entry_id:
            return e.to_dict()
    raise HTTPException(404, "no such entry")

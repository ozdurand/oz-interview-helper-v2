"""Copilot API — phase 0: knowledge base in, search out.

  GET  /health            no sign-in; what is loaded
  POST /ingest            the dossier export (the site's "Send to copilot"); rebuilds the index
  GET  /search?q=…        hybrid search; filters: company, map, kind, variant
  GET  /entries/{id}      one entry, with where it came from in the dossier

  Phase 1 — a job description against the dossier (see jd.py):
  POST   /jd/analyze                 analyze a posting without saving it
  POST   /applications               analyze and save (DATA_DIR/applications/<id>.json)
  GET    /applications               saved applications, newest first
  GET    /applications/{id}          one, in full
  POST   /applications/{id}/refresh  re-run against the current knowledge base
  DELETE /applications/{id}

Settings (environment):
  DATA_DIR          where the latest export and embedding cache live (default ./runtime)
  ALLOWED_ORIGINS   comma list for CORS (default the GitHub Pages site + localhost)
  MAX_INGEST_MB     largest export accepted (default 15)
  AUTH_MODE, COPILOT_TOKEN, ENTRA_*   see auth.py
  EMBEDDINGS, OPENAI_*, AZURE_OPENAI_* see embeddings.py
"""
from __future__ import annotations

import json
import logging
import os
import re
import secrets
import threading
import time
from pathlib import Path

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import embeddings, jd
from .auth import Caller, require_caller
from .kb import ExportError, build_entries, summary
from .search import Index

PKG = Path(__file__).resolve().parent.parent
SHIPPED = PKG / "data" / "shipped-export.json"
log = logging.getLogger("copilot.api")


class State:
    def __init__(self):
        self.lock = threading.Lock()
        self.index: Index | None = None
        self.meta: dict = {}
        self.export: dict = {}

    @property
    def data_dir(self) -> Path:
        d = Path(os.environ.get("DATA_DIR", PKG / "runtime"))
        d.mkdir(parents=True, exist_ok=True)
        return d

    def build(self, export: dict, source: str) -> dict:
        entries = build_entries(export)
        try:
            emb = embeddings.from_env(self.data_dir)
        except KeyError as ex:  # EMBEDDINGS is set but a required setting is missing
            log.warning("embeddings misconfigured (missing %s), keyword retrievers only", ex)
            emb = None
        idx = Index(entries, emb)
        dense = "failed" if emb is None and os.environ.get("EMBEDDINGS") else idx.dense
        meta = {"source": source, "exportedAt": export.get("exportedAt"), "hasEdits": export.get("hasEdits"),
                "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "retrievers": idx.retrievers,
                "dense": dense, **summary(entries)}
        with self.lock:
            self.index, self.meta, self.export = idx, meta, export
        return meta

    def load(self) -> None:
        saved = self.data_dir / "export.json"
        if saved.exists():
            try:
                self.build(json.loads(saved.read_text()), "export")
                return
            except Exception as ex:  # noqa: BLE001
                log.warning("saved export unreadable, starting from the shipped content: %s", ex)
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
    allow_methods=["GET", "POST", "DELETE"], allow_headers=["Authorization", "Content-Type"], max_age=600,
)


def _index() -> Index:
    if STATE.index is None:
        STATE.load()
    return STATE.index  # type: ignore[return-value]


@app.get("/health")
def health() -> dict:
    _index()
    return {"ok": True, **{k: STATE.meta.get(k) for k in ("source", "entries", "retrievers", "dense", "exportedAt", "builtAt", "to_confirm")}}


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


# ------------------------------------------------------------- phase 1 ---
class Posting(BaseModel):
    text: str = Field(..., min_length=40, max_length=60000, description="the job description, as pasted")
    title: str | None = Field(None, max_length=200)
    company: str | None = Field(None, max_length=200)


class Refresh(BaseModel):
    title: str | None = Field(None, max_length=200)
    company: str | None = Field(None, max_length=200)


_APP_ID = re.compile(r"^app-\d{8}-[0-9a-f]{6}$")


def _apps_dir() -> Path:
    d = STATE.data_dir / "applications"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _app_path(app_id: str) -> Path:
    if not _APP_ID.match(app_id):
        raise HTTPException(404, "no such application")
    return _apps_dir() / f"{app_id}.json"


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _analyze(text: str, title: str | None, company: str | None) -> dict:
    idx = _index()
    return jd.analyze(text, idx, STATE.export, title=title, company=company)


def _save(rec: dict) -> dict:
    path = _app_path(rec["id"])
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(rec))
    tmp.replace(path)
    return rec


def _summary(rec: dict) -> dict:
    s = rec["result"]["coverage"]["summary"]
    return {k: rec.get(k) for k in ("id", "title", "company", "createdAt", "updatedAt", "kbBuiltAt")} | {
        "must_score": s["must_score"], "strong": s["strong"], "partial": s["partial"], "gap": s["gap"], "requirements": s["requirements"]}


@app.post("/jd/analyze")
def analyze_posting(p: Posting, caller: Caller = Depends(require_caller)) -> dict:
    return _analyze(p.text, p.title, p.company)


@app.post("/applications")
def create_application(p: Posting, caller: Caller = Depends(require_caller)) -> dict:
    result = _analyze(p.text, p.title, p.company)
    title = (p.title or result["parsed"]["title"] or "Untitled role").strip()
    rec = {"id": f"app-{time.strftime('%Y%m%d', time.gmtime())}-{secrets.token_hex(3)}", "title": title,
           "company": (p.company or "").strip(), "createdAt": _now(), "updatedAt": _now(),
           "kbBuiltAt": STATE.meta.get("builtAt"), "text": p.text, "result": result}
    return _save(rec)


@app.get("/applications")
def list_applications(caller: Caller = Depends(require_caller)) -> dict:
    out = []
    for f in _apps_dir().glob("app-*.json"):
        try:
            out.append(_summary(json.loads(f.read_text())))
        except Exception as ex:  # noqa: BLE001 — one unreadable file must not hide the rest
            log.warning("skipping unreadable application %s: %s", f.name, ex)
    out.sort(key=lambda r: r.get("createdAt") or "", reverse=True)
    return {"applications": out}


@app.get("/applications/{app_id}")
def get_application(app_id: str, caller: Caller = Depends(require_caller)) -> dict:
    path = _app_path(app_id)
    if not path.exists():
        raise HTTPException(404, "no such application")
    return json.loads(path.read_text())


@app.post("/applications/{app_id}/refresh")
def refresh_application(app_id: str, body: Refresh | None = None, caller: Caller = Depends(require_caller)) -> dict:
    rec = get_application(app_id, caller)
    if body and body.title is not None:
        rec["title"] = body.title.strip() or rec["title"]
    if body and body.company is not None:
        rec["company"] = body.company.strip()
    rec["result"] = _analyze(rec["text"], rec["title"], rec["company"])
    rec["updatedAt"], rec["kbBuiltAt"] = _now(), STATE.meta.get("builtAt")
    return _save(rec)


@app.delete("/applications/{app_id}")
def delete_application(app_id: str, caller: Caller = Depends(require_caller)) -> dict:
    path = _app_path(app_id)
    if not path.exists():
        raise HTTPException(404, "no such application")
    path.unlink()
    return {"deleted": app_id}

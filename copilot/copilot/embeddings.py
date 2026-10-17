"""Optional dense retrieval. Off unless a provider is configured:

  EMBEDDINGS=azure   AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY,
                     AZURE_OPENAI_EMBED_DEPLOYMENT, AZURE_OPENAI_API_VERSION (default 2024-10-21)
  EMBEDDINGS=openai  OPENAI_API_KEY, OPENAI_EMBED_MODEL (default text-embedding-3-large)

Vectors are cached on disk by a hash of model + text, so re-ingesting an
export only embeds entries whose text changed.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path
from typing import Sequence

import httpx

from .kb import Entry


class Embedder:
    model = "none"

    def __init__(self, cache_dir: Path):
        self.cache_file = Path(cache_dir) / f"emb-{self.model.replace('/', '_')}.json"
        try:
            self.cache: dict[str, list[float]] = json.loads(self.cache_file.read_text())
        except Exception:
            self.cache = {}

    def _key(self, text: str) -> str:
        return hashlib.sha1(f"{self.model}|{text}".encode()).hexdigest()

    def _call(self, texts: Sequence[str]) -> list[list[float]]:  # pragma: no cover - network
        raise NotImplementedError

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        missing = [t for t in dict.fromkeys(texts) if self._key(t) not in self.cache]
        for i in range(0, len(missing), 64):
            batch = missing[i:i + 64]
            for t, v in zip(batch, self._call(batch)):
                n = math.sqrt(sum(x * x for x in v)) or 1.0
                self.cache[self._key(t)] = [x / n for x in v]
        if missing:
            self.cache_file.parent.mkdir(parents=True, exist_ok=True)
            self.cache_file.write_text(json.dumps(self.cache))
        return [self.cache[self._key(t)] for t in texts]

    def embed_entries(self, entries: list[Entry]) -> list[list[float]]:
        return self.embed([f"{e.title}\n{e.text}"[:8000] for e in entries])

    def scores(self, query: str, vectors: list[list[float]], allowed: set[int] | None) -> dict[int, float]:
        q = self.embed([query])[0]
        idx = range(len(vectors)) if allowed is None else allowed
        return {i: sum(a * b for a, b in zip(q, vectors[i])) for i in idx}


class OpenAIEmbedder(Embedder):
    def __init__(self, cache_dir: Path):
        self.model = os.environ.get("OPENAI_EMBED_MODEL", "text-embedding-3-large")
        self.key = os.environ["OPENAI_API_KEY"]
        super().__init__(cache_dir)

    def _call(self, texts):  # pragma: no cover - network
        r = httpx.post("https://api.openai.com/v1/embeddings", timeout=60,
                       headers={"Authorization": f"Bearer {self.key}"}, json={"model": self.model, "input": list(texts)})
        r.raise_for_status()
        return [d["embedding"] for d in sorted(r.json()["data"], key=lambda d: d["index"])]


class AzureEmbedder(Embedder):
    def __init__(self, cache_dir: Path):
        self.endpoint = os.environ["AZURE_OPENAI_ENDPOINT"].rstrip("/")
        self.key = os.environ["AZURE_OPENAI_API_KEY"]
        self.deployment = os.environ["AZURE_OPENAI_EMBED_DEPLOYMENT"]
        self.version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21")
        self.model = f"azure-{self.deployment}"
        super().__init__(cache_dir)

    def _call(self, texts):  # pragma: no cover - network
        url = f"{self.endpoint}/openai/deployments/{self.deployment}/embeddings?api-version={self.version}"
        r = httpx.post(url, timeout=60, headers={"api-key": self.key}, json={"input": list(texts)})
        r.raise_for_status()
        return [d["embedding"] for d in sorted(r.json()["data"], key=lambda d: d["index"])]


def from_env(cache_dir: Path) -> Embedder | None:
    which = os.environ.get("EMBEDDINGS", "").lower()
    if which == "azure":
        return AzureEmbedder(cache_dir)
    if which == "openai":
        return OpenAIEmbedder(cache_dir)
    return None

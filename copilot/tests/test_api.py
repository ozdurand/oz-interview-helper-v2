import copy
import json
import time

import pytest
from fastapi.testclient import TestClient

TOKEN = "t" * 32


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.setenv("AUTH_MODE", "token")
    monkeypatch.setenv("COPILOT_TOKEN", TOKEN)
    monkeypatch.delenv("EMBEDDINGS", raising=False)
    from copilot import api
    api.STATE.index = None
    with TestClient(api.app) as c:
        yield c


H = {"Authorization": f"Bearer {TOKEN}"}


def test_health_is_open_and_reports_shipped(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["source"] == "shipped" and r.json()["entries"] > 700


def test_search_needs_sign_in(client):
    assert client.get("/search", params={"q": "service bus"}).status_code == 401
    assert client.get("/search", params={"q": "service bus"}, headers={"Authorization": "Bearer wrong"}).status_code == 401
    r = client.get("/search", params={"q": "Why a topic per agent?", "k": 3}, headers=H)
    assert r.status_code == 200 and r.json()["hits"][0]["group"].startswith("jj/")


def test_ingest_replaces_the_knowledge_base_and_persists(client, shipped, tmp_path):
    ex = copy.deepcopy(shipped)
    ex["exportedAt"] = "2026-10-17T20:00:00Z"
    ex["data"]["companies"]["jj"]["pains"].append(["Layer", "Zebra-unique pain", "What hurt.", "What fixed it."])
    r = client.post("/ingest", content=json.dumps(ex), headers=H)
    assert r.status_code == 200 and r.json()["source"] == "export"
    assert (tmp_path / "export.json").exists()
    hits = client.get("/search", params={"q": "zebra unique pain", "k": 1}, headers=H).json()["hits"]
    assert "Zebra-unique pain" in hits[0]["title"]
    # survives a restart
    from copilot import api
    api.STATE.index = None
    assert client.get("/health").json()["exportedAt"] == "2026-10-17T20:00:00Z"


def test_ingest_rejects_garbage_and_needs_sign_in(client):
    assert client.post("/ingest", content="{}").status_code == 401
    assert client.post("/ingest", content='{"nope": 1}', headers=H).status_code == 422
    assert client.post("/ingest", content="not json", headers=H).status_code == 422


def test_entry_lookup(client):
    r = client.get("/entries/qa:jj/sb@3", headers=H)
    assert r.status_code == 200 and r.json()["check"] is True
    assert client.get("/entries/nope", headers=H).status_code == 404


def test_cors_allows_the_site(client):
    r = client.options("/search", headers={"Origin": "https://ozdurand.github.io", "Access-Control-Request-Method": "GET",
                                           "Access-Control-Request-Headers": "authorization"})
    assert r.headers.get("access-control-allow-origin") == "https://ozdurand.github.io"


def test_refuses_everything_when_token_unset(client, monkeypatch):
    monkeypatch.setenv("COPILOT_TOKEN", "")
    assert client.get("/search", params={"q": "bus"}, headers=H).status_code == 503


def test_entra_mode(client, monkeypatch):
    jwt = pytest.importorskip("jwt")
    from cryptography.hazmat.primitives.asymmetric import rsa
    from copilot import auth
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    tenant, aud, oid = "tenant-123", "api://oz-copilot", "user-oid-1"
    monkeypatch.setenv("AUTH_MODE", "entra")
    monkeypatch.setenv("ENTRA_TENANT_ID", tenant)
    monkeypatch.setenv("ENTRA_AUDIENCE", aud)
    monkeypatch.setenv("ENTRA_ALLOWED_OIDS", oid)

    class FakeJWKS:
        def get_signing_key_from_jwt(self, token):
            return type("K", (), {"key": key.public_key()})()
    monkeypatch.setattr(auth, "_jwks", lambda: FakeJWKS())

    def tok(**over):
        claims = {"iss": f"https://login.microsoftonline.com/{tenant}/v2.0", "aud": aud, "oid": oid,
                  "exp": int(time.time()) + 600, **over}
        return {"Authorization": "Bearer " + jwt.encode(claims, key, algorithm="RS256")}

    assert client.get("/search", params={"q": "bus"}, headers=tok()).status_code == 200
    assert client.get("/search", params={"q": "bus"}, headers=tok(oid="someone-else")).status_code == 403
    assert client.get("/search", params={"q": "bus"}, headers=tok(aud="api://other")).status_code == 401
    assert client.get("/search", params={"q": "bus"}, headers=tok(exp=int(time.time()) - 5)).status_code == 401


def test_misconfigured_embeddings_do_not_take_the_service_down(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.setenv("AUTH_MODE", "token")
    monkeypatch.setenv("COPILOT_TOKEN", TOKEN)
    monkeypatch.setenv("EMBEDDINGS", "azure")          # endpoint, key and deployment missing
    for k in ("AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_EMBED_DEPLOYMENT"):
        monkeypatch.delenv(k, raising=False)
    from copilot import api
    api.STATE.index = None
    with TestClient(api.app) as c:
        h = c.get("/health").json()
        assert h["ok"] and h["dense"] == "failed" and h["retrievers"] == ["bm25", "chars"]
        assert c.get("/search", params={"q": "Why a topic per agent?"}, headers=H).status_code == 200

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


@pytest.fixture(scope="session")
def shipped():
    return json.loads((ROOT / "data" / "shipped-export.json").read_text())

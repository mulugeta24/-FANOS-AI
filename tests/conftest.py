"""Test path setup for the backend package."""

import os
import sys
import types
from pathlib import Path

os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# Enable importing suricata_lab from suricata-lab directory
suricata_lab_dir = REPO_ROOT / "suricata-lab"
if suricata_lab_dir.exists() and "suricata_lab" not in sys.modules:
    m = types.ModuleType("suricata_lab")
    m.__path__ = [str(suricata_lab_dir)]
    sys.modules["suricata_lab"] = m

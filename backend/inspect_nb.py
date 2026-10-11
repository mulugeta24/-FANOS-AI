import json
from pathlib import Path

nb_path = Path(r"d:\fanos ai\-FANOS-AI\backend\models\Fanos_AI.ipynb")
with open(nb_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

print(f"Total cells: {len(nb['cells'])}")
for i, cell in enumerate(nb["cells"]):
    src = "".join(cell.get("source", []))
    lines = [l.strip() for l in src.splitlines() if l.strip() and not l.strip().startswith("# ==")]
    first_lines = lines[:2] if lines else ["<empty>"]
    summary = " ; ".join(first_lines)[:90]
    print(f"Cell {i:2d} ({cell.get('cell_type'):4s}): {summary}")

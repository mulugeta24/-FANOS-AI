import json
from pathlib import Path

nb_path = Path(r"d:\fanos ai\-FANOS-AI\backend\models\Fanos_AI.ipynb")
with open(nb_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

target_cells = [108, 109, 112, 171, 173, 174, 188, 189, 190, 191, 192, 193]

with open(r"d:\fanos ai\-FANOS-AI\backend\nb_audit_extracted.txt", "w", encoding="utf-8") as out_f:
    for idx in target_cells:
        if idx < len(nb["cells"]):
            cell = nb["cells"][idx]
            src = "".join(cell.get("source", []))
            out_f.write(f"\n{'='*70}\nCELL {idx} SOURCE:\n{'='*70}\n{src}\n")
            outputs = cell.get("outputs", [])
            for out in outputs:
                text = out.get("text", [])
                if text:
                    out_f.write(f"--- OUTPUT (first 30 lines) ---\n")
                    out_f.write("".join(text[:30]))
                    out_f.write("\n")

print("Extracted to backend/nb_audit_extracted.txt")

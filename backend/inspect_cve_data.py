import os
import sys
import glob
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")

DATA_DIR = "ml/MachineLearningCVE"
files = sorted(glob.glob(os.path.join(DATA_DIR, "*.csv")))

print(f"Found {len(files)} CSV files in {DATA_DIR}:")
total_rows = 0
all_labels = {}

for f in files:
    fname = os.path.basename(f)
    # Read first 1000 rows to get columns and inspect
    df_sample = pd.read_csv(f, nrows=1000)
    cols = [c.strip() for c in df_sample.columns]
    label_col = [c for c in cols if "label" in c.lower()][0]
    
    # Read full file for label counts
    df_labels = pd.read_csv(f, usecols=[df_sample.columns[cols.index(label_col)]])
    label_counts = df_labels.iloc[:, 0].str.strip().value_counts().to_dict()
    rows = len(df_labels)
    total_rows += rows
    
    for l, cnt in label_counts.items():
        all_labels[l] = all_labels.get(l, 0) + cnt
        
    print(f"\n📁 {fname} ({rows:,} rows):")
    for l, cnt in label_counts.items():
        print(f"   - {l}: {cnt:,}")

print("\n" + "=" * 60)
print(f"TOTAL SAMPLES ACROSS ALL 8 FILES: {total_rows:,}")
print("ALL UNIQUE LABELS:")
for l, cnt in sorted(all_labels.items(), key=lambda x: x[1], reverse=True):
    print(f"   {l:32s}: {cnt:,}")
print(f"Total Unique Classes: {len(all_labels)}")
print("=" * 60)

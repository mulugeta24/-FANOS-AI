path = r'c:\Fanos Aii\backend\app\core\config.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
old = 'AI_MODEL_PATH: str = "./models/fanos_v3_xgboost.joblib"'
new = 'AI_MODEL_PATH: str = "app/models/fanos_v3_xgboost_rare_improved (1).json"'
print('Found old:', old in content)
content2 = content.replace(old, new)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content2)
print('Done. New content has joblib:', 'joblib' in content2)

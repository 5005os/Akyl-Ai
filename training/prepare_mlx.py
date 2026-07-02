#!/usr/bin/env python3
"""
Готовит данные AkylAi для обучения на Mac через MLX (mlx-lm).
Создаёт training/mlx_data/train.jsonl и valid.jsonl в формате чата.

Запуск:  python3 training/prepare_mlx.py
"""
import json, os, random, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRAIN_DIR = os.path.join(ROOT, "training")
ASSEMBLED = os.path.join(TRAIN_DIR, "akylai_dataset.jsonl")
OUT_DIR = os.path.join(TRAIN_DIR, "mlx_data")

SYSTEM = ("Ты — AkylAi, кыргызский ИИ-ассистент. Отвечай точно про Кыргызстан (КР): "
          "кыргызский язык, законы КР, ПДД, Конституцию, историю, культуру и туризм. "
          "Никогда не отвечай про законы других стран.")

# 1) Собрать общий датасет (запускаем prepare_dataset.py)
subprocess.run([sys.executable, os.path.join(TRAIN_DIR, "prepare_dataset.py")], check=True)

# 2) Прочитать и превратить в формат чата для MLX
rows = []
with open(ASSEMBLED, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        r = json.loads(line)
        instr = (r.get("instruction") or "").strip()
        inp = (r.get("input") or "").strip()
        out = (r.get("output") or "").strip()
        if not instr or not out:
            continue
        user = instr + ("\n" + inp if inp else "")
        rows.append({"messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user},
            {"role": "assistant", "content": out},
        ]})

random.seed(42)
random.shuffle(rows)

# 3) Разбить на train (90%) и valid (10%)
n_valid = max(1, len(rows) // 10)
valid = rows[:n_valid]
train = rows[n_valid:]

os.makedirs(OUT_DIR, exist_ok=True)

def write(name, data):
    with open(os.path.join(OUT_DIR, name), "w", encoding="utf-8") as f:
        for r in data:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

write("train.jsonl", train)
write("valid.jsonl", valid)

print(f"Готово! train: {len(train)}, valid: {len(valid)}")
print(f"Папка: {OUT_DIR}")

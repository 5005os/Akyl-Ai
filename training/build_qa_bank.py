#!/usr/bin/env python3
"""
Собирает ВСЕ данные проекта (1150+ вопросов-ответов) в файл data/qa_bank.js,
чтобы сайт мог умно искать ответы по всей базе прямо в браузере.

Запуск:  python3 training/build_qa_bank.py
(запускать после каждого пополнения dataset/, затем закоммитить qa_bank.js)
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRAIN = os.path.join(ROOT, "training")
ASSEMBLED = os.path.join(TRAIN, "akylai_dataset.jsonl")
OUT = os.path.join(ROOT, "data", "qa_bank.js")

# 1) Собрать общий датасет
subprocess.run([sys.executable, os.path.join(TRAIN, "prepare_dataset.py")], check=True)

# 2) Прочитать пары вопрос-ответ
pairs = []
with open(ASSEMBLED, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        r = json.loads(line)
        q = (r.get("instruction") or "").strip()
        a = (r.get("output") or "").strip()
        if q and a:
            pairs.append([q, a])

# 3) Записать компактный JS
with open(OUT, "w", encoding="utf-8") as f:
    f.write("/* AkylAi — банк знаний (генерируется training/build_qa_bank.py) */\n")
    f.write("window.QA_BANK = ")
    json.dump(pairs, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")

size_kb = os.path.getsize(OUT) // 1024
print(f"Готово! Вопросов-ответов: {len(pairs)}, файл: data/qa_bank.js ({size_kb} КБ)")

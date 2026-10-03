#!/usr/bin/env python3
"""Збирає strudel.json зі звуків у папках.

Структура: <роль>/<назва_звуку>/<файли>.wav
Результат: s("назва_звуку"), s("назва_звуку:2") у Strudel.

Запуск з кореня репозиторію:  python3 make_strudel_json.py
"""
import json
from pathlib import Path

ROLES = ["low", "mid", "high", "tone", "voice", "texture", "egg"]
EXTS = {".wav", ".mp3", ".ogg", ".flac"}

root = Path(__file__).resolve().parent
bank = {"_base": "https://raw.githubusercontent.com/undo-despot/haspyd-samples/main/"}

for role in ROLES:
    role_dir = root / role
    if not role_dir.is_dir():
        continue
    for sound_dir in sorted(p for p in role_dir.iterdir() if p.is_dir()):
        files = sorted(f for f in sound_dir.iterdir() if f.suffix.lower() in EXTS)
        if not files:
            continue
        name = sound_dir.name
        if name in bank:
            print(f"⚠ дубль назви «{name}» у {role}/ — пропускаю")
            continue
        bank[name] = [f.relative_to(root).as_posix() for f in files]
        print(f"✓ {name}: {len(files)} варіацій")

(root / "strudel.json").write_text(json.dumps(bank, indent=2, ensure_ascii=False) + "\n")
print(f"\nstrudel.json оновлено: {len(bank) - 1} звуків (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧")

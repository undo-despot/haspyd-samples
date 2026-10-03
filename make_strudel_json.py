#!/usr/bin/env python3
"""Збирає strudel.json зі звуків у папках.

Назва звуку в Strudel = назва папки, в якій лежать файли:
  low/kastrulia/0.wav              -> s("kastrulia"), s("kastrulia:2")
  found/autechre/ae_steel/x.wav    -> s("ae_steel:12")
Папки, що починаються з "_" або ".", ігноруються.

Запуск з кореня репозиторію:  python3 make_strudel_json.py
"""
import json
import os
from pathlib import Path

EXTS = {".wav", ".mp3", ".ogg", ".flac", ".aiff", ".aif", ".m4a"}

root = Path(__file__).resolve().parent
bank = {"_base": "https://raw.githubusercontent.com/undo-despot/haspyd-samples/main/"}

for cur, dirs, files in os.walk(root):
    dirs[:] = sorted(d for d in dirs if not d.startswith((".", "_")))
    cur = Path(cur)
    snd = sorted(f for f in files if Path(f).suffix.lower() in EXTS)
    if cur == root or not snd:
        continue
    name = cur.name.lower().replace(" ", "_")
    if name in bank:
        print(f"⚠ дубль назви «{name}» у {cur.relative_to(root)} — пропускаю")
        continue
    bank[name] = [(cur / f).relative_to(root).as_posix() for f in snd]
    print(f"✓ {name}: {len(snd)}")

(root / "strudel.json").write_text(json.dumps(bank, indent=2, ensure_ascii=False) + "\n")
print(f"\nstrudel.json оновлено: {len(bank) - 1} звуків (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧")

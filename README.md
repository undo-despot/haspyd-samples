# haspyd-samples ✧

Авторська бібліотека звуків Аліси Хаспид для [Strudel](https://strudel.cc).
Голос, латунь, згарди, метал, вода — замість стандартних барабанів.

```
haspyd-samples/
  ├─ low/      ← основа ритму (замість kick)
  ├─ mid/      ← акценти (замість snare)
  ├─ high/     ← дрібний пульс (замість hats)
  ├─ tone/     ← тональні звуки для мелодій
  ├─ voice/    ← голос
  ├─ texture/  ← простір і атмосфера
  └─ egg/      ← easter eggs (｡•̀ᴗ-)✧
```

## Як підключити в Strudel

```js
samples('github:undo-despot/haspyd-samples')

stack(
  s("low_name*4"),
  s("~ mid_name ~ mid_name:2"),
  s("high_name*8").gain(.5)
)
```

(Заміни `low_name` і т.д. на справжні імена звуків.)

## Як додати новий звук

1. Створи папку зі своєю назвою всередині потрібної ролі, напр. `high/zgarda/`
2. Поклади туди 3–5 варіацій: `0.wav`, `1.wav`, `2.wav`…
3. Запусти `python3 make_strudel_json.py` — він оновить `strudel.json`
4. Закоміть і запуш. У Strudel звук буде доступний як `s("zgarda")`, `s("zgarda:2")`

Назва папки = назва звуку в Strudel. Латиниця, малі літери, без пробілів.

## Правила запису

- **Тиша на початку — обрізати повністю** (інакше звук запізнюється в ритмі)
- WAV, моно, 44.1 або 48 kHz, нормалізована гучність
- Перкусія — до 1 с; голос і текстури можуть бути довшими
- 3–5 варіацій на кожен звук — так ритм звучить живіше

---

*Sound library by Alice Haspyd for Strudel live coding — voice, brass, zgarda beads, metal and water.*

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
  ├─ egg/      ← easter eggs (｡•̀ᴗ-)✧
  └─ found/    ← знайдені звуки інших авторів (не мої)
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

## Свій Strudel

[undo-despot.github.io/haspyd-samples](https://undo-despot.github.io/haspyd-samples/) — редактор Strudel у моєму вигляді
(`index.html`). Кольори й шрифт міняються на початку файлу, у блоці `html:root`.
Рядок знаків унизу пише сама музика: кожен звук ставить свій знак.

Редактор — це [Strudel](https://strudel.cc) (`@strudel/repl` 1.3.0, ліцензія AGPL-3.0-or-later),
його копія лежить у `vendor/strudel/`.

## Знайдені звуки

У [`found/`](found/) лежить відкрита колекція звуків, які я знайшла: вони не мої,
і я не заявляю на них авторство. Джерела й ліцензії — у [`found/SOURCES.md`](found/SOURCES.md).
Якщо там є твій звук — напиши в [Issues](https://github.com/undo-despot/haspyd-samples/issues):
додам твоє ім'я або видалю файл.

*`found/` holds found sounds by other authors. If one is yours, open an Issue to be credited or have it removed.*

## Правила запису

- **Тиша на початку — обрізати повністю** (інакше звук запізнюється в ритмі)
- WAV, моно, 44.1 або 48 kHz, нормалізована гучність
- Перкусія — до 1 с; голос і текстури можуть бути довшими
- 3–5 варіацій на кожен звук — так ритм звучить живіше

---

*Sound library by Alice Haspyd for Strudel live coding — voice, brass, zgarda beads, metal and water.*

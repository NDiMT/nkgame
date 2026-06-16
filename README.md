# 🃏 Καρτορόγκα — Card Dungeon Crawler

A **single-player roguelike card-combat dungeon crawler** for mobile, inspired by
Card Quest / Slay the Spire. Fully static PWA — no backend, no connection, plays
anywhere. Pixel art generated with **Gemini**, procedural soundtrack via Web Audio.

## Play
- **Live (GitHub Pages):** https://ndimt.github.io/nkgame/
- **Local:** `npm install && npm start` → http://localhost:8080

## How it plays (Card Quest-inspired)
- Descend a dungeon of rooms: **battles, elites, treasure, rest, and a boss**.
- **Attack phase:** spend **stamina** to play attacks; **chain** cards for combo
  bonuses. Enemies have **Dodge** charges that eat your hits (some cards ignore it).
- **Defense phase:** the enemy's strike is **telegraphed**; play **Block / Dodge /
  Parry** cards to answer it, then stamina recharges for the next round.
- **Equipment grants cards:** loot weapons/shields/trinkets to grow your deck.
- **Roguelike:** HP carries between fights; die and the run ends. Beat the Lich
  Lord to win.

## Structure
```
public/
  index.html            screens: title / map / combat / reward / event / end
  css/style.css         pixel-art dungeon UI (image-rendering: pixelated)
  js/data.js            cards + enemies (declarative effects)
  js/engine.js          turn-based combat engine
  js/app.js             run state, map, screen flow, rendering, input
  js/audio.js           procedural dungeon soundtrack
  assets/img/           Gemini pixel art (cards, enemies, cover)
tools/serve.js          local static server
tools/generate-art.js   Gemini pixel-art generator
.github/workflows/pages.yml   deploys public/ to GitHub Pages
```

## Regenerate art
```bash
GEMINI_API_KEY=... npm run gen-art   # writes pixel art into public/assets/img/
```

Add cards/enemies in `js/data.js` (and a prompt in `tools/generate-art.js`), then
re-run the generator.

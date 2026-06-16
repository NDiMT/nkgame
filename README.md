# 🃏 Καρτορόγκα — Card Dungeon Crawler

A **single-player roguelike card-combat dungeon crawler** for mobile, inspired by
Card Quest / Slay the Spire. Fully static PWA — no backend, no connection, plays
anywhere. Pixel art generated with **Gemini**, procedural soundtrack via Web Audio.

## Play
- **Live (GitHub Pages):** https://ndimt.github.io/nkgame/
- **Local:** `npm install && npm start` → http://localhost:8080

## How it plays
- Descend a dungeon of rooms: **fights, elites, treasure, rest, and a boss**.
- **Card combat:** each turn you have 3 energy; play attacks/skills/powers from
  your hand, manage **block**, exploit **Vulnerable/Weak**, then end your turn and
  the enemies act (their next move is telegraphed).
- **Deckbuilding:** win fights to add cards; build toward a strategy.
- **Roguelike:** HP carries between fights; die and the run ends. Beat the Λιτς
  Άρχοντα to win.

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

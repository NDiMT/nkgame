# 🏰 Castle Survivors

A single-player **bullet-heaven roguelite** (survivor.io / Vampire Survivors style)
where you **defend a castle** from endless hordes. Move to fight; your weapons
auto-attack; kill enemies for XP; level up to pick upgrades for your hero, your
weapons, and castle defenses. The run ends when the castle (or you) falls.

Fully static PWA (HTML5 Canvas), mobile landscape, deploys on GitHub Pages.

## Play
- **Live:** https://ndimt.github.io/nkgame/  (rotate to landscape)
- **Local:** `npm install && npm start` → http://localhost:8080

## Controls
- **Drag anywhere** to move (virtual joystick) · or **WASD/arrows** on desktop.
- Weapons fire automatically. Collect XP gems; choose an upgrade each level.

## Structure
```
public/
  index.html        canvas + HUD + title/levelup/gameover overlays
  css/style.css     dark pixel UI, landscape gate, CRT
  js/game.js        engine: loop, hordes, weapons, XP/leveling, render
  js/main.js        assets, input (joystick/keys), screens, loop
  js/audio.js       procedural soundtrack
  assets/           sprites (transparent PNG) + ground/cover
tools/code-sprites.js  free code-drawn pixel sprites (current art)
tools/gen-sprites.js   Gemini sprite generator (chroma-keyed PNG) — overrides art
```

## Art
Sprites are currently **code-drawn** (free, offline). To upgrade to richer
**Gemini** art (same filenames, auto-override), restrict your key then:
`GEMINI_API_KEY=... node tools/gen-sprites.js`

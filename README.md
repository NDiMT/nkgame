# ⚔️ Ashen Vale

A small **3rd-person action-RPG** (Zelda / Elden Ring vibe) built in **Three.js**.
You wander a misty low-poly vale, roll and swing a sword against waves of foes,
and rest at the golden **grace tree** to heal. One playable area to start.

Fully static PWA (WebGL via vendored Three.js), mobile-first, deploys on GitHub Pages.

## Play
- **Live:** https://ndimt.github.io/nkgame/
- **Local:** `npm start` → http://localhost:8080

## Controls
- **Left stick** — move · **swipe right side** — look around the character.
- **⚔ button** — sword attack · **⟳ button** — dodge roll (i-frames).
- Desktop: **WASD/arrows** move, **mouse drag** looks, **J/Space** attack, **Shift** roll.
- Attacks and rolls cost **stamina** (green bar); it regenerates when idle.

## Structure
```
public/
  index.html        canvas + HUD + touch controls + title/death overlays
  css/style.css      atmospheric UI, virtual stick, action buttons
  js/game.js         engine: 3rd-person camera, player, combat, enemy AI, waves
  js/world.js        procedural low-poly terrain, props, lighting, grace tree
  js/mob.js          low-poly humanoid builder (player + enemies)
  js/input.js        touch stick + look + buttons, keyboard/mouse fallback
  js/main.js         boot, render loop, HUD, screens
  js/audio.js        procedural soundtrack
  vendor/three.module.js   pinned Three.js r160 (same-origin, offline-cacheable)
```

## Notes
- Three.js is **vendored locally** (not a CDN) so the PWA works offline and
  isn't subject to third-party availability.
- Art is **procedural geometry** — no external 3D assets needed. Gemini can
  still generate textures/skyboxes/UI later if we want extra polish.

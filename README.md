# 🕵️ Νυχτερινός Φάκελος — Coop Detective Mystery

A cooperative detective mystery for **2 players on mobile**. Each detective sees
only half the clues; they talk over an in-game chat, share evidence objects, and
jointly accuse a suspect. Connection is **peer-to-peer over WebRTC**, paired with
a **6-digit code**.

Built as a **fully static PWA** (no app store, no backend) — signaling runs over
the **PeerJS public broker**, so it can be hosted as-is on **GitHub Pages**. The
mystery content (story, clues, art) is produced by AI: **Claude** writes the
case, **Gemini** draws it.

## Architecture

```
public/                Fully static PWA (mobile-first, installable)
  index.html           screens: home / lobby / game / result
  css/style.css        atmospheric noir UI
  js/rtc.js            PeerJS connection (6-digit code = room)
  js/config.js         WebRTC ICE config (STUN; add TURN here)
  js/audio.js          procedural noir soundtrack (Web Audio)
  js/game.js           coop detective game logic
  cases/*.json         pre-generated mysteries + manifest
  assets/              cover, background + paper textures
server/signaling.js    static file server for local dev (optional)
tools/generate-case.js Claude (case JSON) + image provider (art) generator
.github/workflows/pages.yml   deploys public/ to GitHub Pages
```

**How a game connects**
1. Player A taps *Δημιουργία* → PeerJS registers a peer id from a 6-digit code.
2. Player B enters the code → PeerJS connects to that peer via the public broker.
3. A P2P `DataConnection` opens; gameplay flows directly between the two phones.

STUN (Google's public servers) is used by default. For reliable connections on
mobile carrier networks (symmetric NAT), add a **TURN** server in `js/config.js`.

## Run locally

```bash
npm start                   # http://localhost:8080
```

Or any static server (`npx serve public`). Open on two devices/tabs; on a phone,
"Add to Home Screen" to install the PWA.

## Deploy to GitHub Pages

The included workflow (`.github/workflows/pages.yml`) publishes `public/` on every
push. In **Settings → Pages**, set the source to **GitHub Actions** (the workflow
also attempts to auto-enable it). The site serves under
`https://<owner>.github.io/<repo>/` — all paths are relative so the subpath works.
Because it's fully static + PeerJS, no server is required.

## Generate a new AI mystery

```bash
# Full pipeline (Claude + Gemini art):
ANTHROPIC_API_KEY=... GEMINI_API_KEY=... IMAGE_PROVIDER=gemini \
  npm run generate-case -- "παγωμένο σαλέ στις Άλπεις"

# No image API — runs the whole flow with placeholder art:
ANTHROPIC_API_KEY=... IMAGE_PROVIDER=placeholder npm run generate-case
```

Output: `public/cases/case-<id>.json` + images under `public/cases/img/<id>/`.
Point `loadCase()` in `public/js/game.js` at the new file to play it.

**Pre-generated vs runtime**: this generator is meant to be run **offline** to
bake a handful of cases into the app (zero gameplay cost/latency, GDPR-clean).
Runtime per-session generation (infinite mysteries) can be added later by calling
the generator from the server on demand.

## Status (skeleton)

Working: P2P connection via 6-digit code, asymmetric clue split, shared
suspects/weapons/motives, in-game chat, joint accusation + win/lose, sample case,
AI generator with swappable image provider.

Next: TURN setup for production, a case picker UI, optional per-suspect/weapon
art, reconnection handling, and (optional) runtime mystery generation.

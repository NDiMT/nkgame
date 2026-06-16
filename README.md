# 🕵️ Νυχτερινός Φάκελος — Coop Detective Mystery

A cooperative detective mystery for **2 players on mobile**. Each detective sees
only half the clues; they talk over an in-game chat and jointly accuse a suspect.
Connection is **peer-to-peer over WebRTC**, paired with a **6-digit code**.

Built as a **PWA** (no app store) + a tiny **Node signaling server**. The mystery
content (story, clues, art) is produced by AI: **Claude** writes the case,
**Gemini** draws it.

## Architecture

```
public/                PWA (mobile-first, installable)
  index.html           screens: home / lobby / game / result
  css/style.css        noir mobile UI
  js/rtc.js            WebRTC peer + signaling client
  js/game.js           coop detective game logic
  cases/case-01.json   sample pre-generated mystery
server/signaling.js    static file server + WebSocket signaling (6-digit rooms)
tools/generate-case.js Claude (case JSON) + image provider (art) generator
tools/providers/       image-provider.js (interface + placeholder), image-gemini.js
```

**How a game connects**
1. Player A taps *Δημιουργία* → server returns a 6-digit code (the room id).
2. Player B enters the code → server pairs them and relays WebRTC SDP/ICE.
3. An `RTCDataChannel` opens; gameplay flows **P2P**, server steps out.

STUN (Google's public servers) is used by default. For reliable connections on
mobile carrier networks (symmetric NAT), configure a **TURN** server in `.env`.

## Run locally

```bash
npm install
cp .env.example .env        # optional: TURN + API keys
npm start                   # http://localhost:8080
```

Open the URL on two devices/tabs. On a phone, "Add to Home Screen" to install
the PWA. (For real cross-device testing over the internet you need HTTPS — host
the server on Render/Fly.io/a VPS behind TLS.)

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

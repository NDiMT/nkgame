// Signaling + static file server for the coop detective game.
//
// Responsibilities:
//   1. Serve the PWA static files from /public.
//   2. Run a tiny WebSocket signaling layer that pairs two players via a
//      6-digit room code and relays WebRTC SDP/ICE between them. Once the
//      peer connection is up, gameplay flows P2P over an RTCDataChannel and
//      this server is no longer in the loop.
//
// The 6-digit code IS the room id. The first player ("host") creates a room
// and gets a code; the second player ("guest") joins with that code.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 8080;

// --- WebRTC client config (STUN always, TURN if configured) -----------------
const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
if (process.env.TURN_URL) {
  iceServers.push({
    urls: process.env.TURN_URL,
    username: process.env.TURN_USERNAME,
    credential: process.env.TURN_CREDENTIAL,
  });
}
// Served as a JS module so the client knows which ICE servers to use.
const CONFIG_JS = `export const RTC_CONFIG = ${JSON.stringify({ iceServers })};\n`;

// --- Static file serving ----------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

async function serveStatic(req, res) {
  if (req.url === '/config.js') {
    res.writeHead(200, { 'Content-Type': MIME['.js'] });
    return res.end(CONFIG_JS);
  }

  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  // Resolve safely inside PUBLIC_DIR (no path traversal).
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error');
  }
}

const server = http.createServer(serveStatic);

// --- Signaling --------------------------------------------------------------
// rooms: code -> { host: ws, guest: ws|null }
const rooms = new Map();

function makeCode() {
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
  } while (rooms.has(code));
  return code;
}

function send(ws, type, payload = {}) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, ...payload }));
}

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.roomCode = null;
  ws.role = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'create': {
        const code = makeCode();
        rooms.set(code, { host: ws, guest: null });
        ws.roomCode = code;
        ws.role = 'host';
        send(ws, 'created', { code });
        break;
      }

      case 'join': {
        const room = rooms.get(msg.code);
        if (!room) return send(ws, 'error', { reason: 'no_such_room' });
        if (room.guest) return send(ws, 'error', { reason: 'room_full' });
        room.guest = ws;
        ws.roomCode = msg.code;
        ws.role = 'guest';
        send(ws, 'joined', { code: msg.code });
        // Tell the host a guest arrived → host begins the WebRTC offer.
        send(room.host, 'peer-joined');
        break;
      }

      // Relay SDP/ICE to the other peer in the room.
      case 'signal': {
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        const peer = ws.role === 'host' ? room.guest : room.host;
        send(peer, 'signal', { data: msg.data });
        break;
      }
    }
  });

  ws.on('close', () => {
    const room = rooms.get(ws.roomCode);
    if (!room) return;
    const peer = ws.role === 'host' ? room.guest : room.host;
    send(peer, 'peer-left');
    rooms.delete(ws.roomCode);
  });
});

server.listen(PORT, () => {
  console.log(`nkgame signaling + static server on http://localhost:${PORT}`);
  console.log(`TURN configured: ${process.env.TURN_URL ? 'yes' : 'no (STUN only)'}`);
});

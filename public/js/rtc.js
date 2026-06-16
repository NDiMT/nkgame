// Peer connection via PeerJS (public broker) — fully static, no signaling
// server of our own. Works on GitHub Pages.
//
// The 6-digit code becomes the host's peer id (namespaced to avoid collisions
// on the shared public broker). The guest connects to that id; data then flows
// P2P over a PeerJS DataConnection.
//
// This class keeps the same surface the game expects:
//   callbacks: onCode, onConnecting, onOpen, onMessage, onClose, onError
//   methods:   host(), join(code), send(obj)
// PeerJS is loaded globally from a CDN (window.Peer); we expose our own `Peer`.

import { RTC_CONFIG } from './config.js';

const PREFIX = 'nkgame-'; // namespace on the shared public broker

export class Peer {
  constructor(callbacks = {}) {
    this.cb = callbacks;
    this.pjs = null; // PeerJS instance
    this.conn = null; // DataConnection
    this.role = null;
  }

  _newPeer(id) {
    // id === undefined → broker assigns a random id (guest).
    return new window.Peer(id, { config: RTC_CONFIG });
  }

  _bindConn(conn) {
    this.conn = conn;
    conn.on('open', () => {
      this._clearTimeout();
      this.cb.onOpen?.();
    });
    conn.on('data', (data) => this.cb.onMessage?.(data));
    conn.on('close', () => this.cb.onClose?.('peer_left'));
    conn.on('error', () => this.cb.onClose?.('conn_error'));

    // Surface a stuck NAT-traversal as a clear failure instead of hanging.
    const pc = conn.peerConnection;
    if (pc) {
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          this._clearTimeout();
          this.cb.onClose?.('ice_failed');
        }
      };
    }
  }

  // If the data channel never opens, the connection silently hangs — give up
  // after a while with a clear reason so the UI can tell the user.
  _armTimeout() {
    this._clearTimeout();
    this._timer = setTimeout(() => {
      if (!this.conn || !this.conn.open) this.cb.onClose?.('timeout');
    }, 30000);
  }

  _clearTimeout() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  // --- Public API -----------------------------------------------------------

  host() {
    this.role = 'host';
    this._tryHost(0);
  }

  _tryHost(attempt) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const pjs = this._newPeer(PREFIX + code);
    this.pjs = pjs;

    pjs.on('open', () => this.cb.onCode?.(code));
    pjs.on('connection', (conn) => {
      this.cb.onConnecting?.();
      this._armTimeout();
      this._bindConn(conn);
    });
    pjs.on('error', (err) => {
      // Code already in use on the broker → pick another and retry.
      if (err.type === 'unavailable-id' && attempt < 5) {
        pjs.destroy();
        this._tryHost(attempt + 1);
      } else if (err.type !== 'peer-unavailable') {
        this.cb.onError?.(err.type);
      }
    });
  }

  join(code) {
    this.role = 'guest';
    const pjs = this._newPeer(undefined);
    this.pjs = pjs;

    pjs.on('open', () => {
      this.cb.onConnecting?.();
      this._armTimeout();
      const conn = pjs.connect(PREFIX + code, { reliable: true });
      this._bindConn(conn);
    });
    pjs.on('error', (err) => {
      // Wrong/empty code → the host peer doesn't exist on the broker.
      const reason = err.type === 'peer-unavailable' ? 'no_such_room' : err.type;
      this.cb.onError?.(reason);
    });
  }

  send(obj) {
    if (this.conn && this.conn.open) this.conn.send(obj);
  }
}

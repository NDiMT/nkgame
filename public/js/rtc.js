// WebRTC peer connection + signaling client.
//
// Flow:
//   Host:  connect() -> send {create} -> receive {created, code}
//          -> on {peer-joined} create datachannel + offer
//   Guest: connect() -> send {join, code} -> receive {joined}
//          -> on host's offer, answer
//
// Once the RTCDataChannel opens, callbacks.onOpen() fires and game messages
// flow P2P via send(). The signaling socket stays open only for ICE trickle.

import { RTC_CONFIG } from '/config.js';

export class Peer {
  constructor(callbacks = {}) {
    this.cb = callbacks; // { onCode, onConnecting, onOpen, onMessage, onClose, onError }
    this.ws = null;
    this.pc = null;
    this.channel = null;
    this.role = null;
  }

  _wsUrl() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}`;
  }

  _connectSignaling() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this._wsUrl());
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error('signaling_failed'));
      this.ws.onmessage = (e) => this._onSignal(JSON.parse(e.data));
      this.ws.onclose = () => this.cb.onClose?.('signaling_closed');
    });
  }

  _setupPeerConnection() {
    this.pc = new RTCPeerConnection(RTC_CONFIG);

    this.pc.onicecandidate = (e) => {
      if (e.candidate) this._send({ type: 'signal', data: { candidate: e.candidate } });
    };

    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState;
      if (s === 'failed' || s === 'disconnected') this.cb.onClose?.(s);
    };

    // Guest receives the channel the host created.
    this.pc.ondatachannel = (e) => this._bindChannel(e.channel);
  }

  _bindChannel(channel) {
    this.channel = channel;
    channel.onopen = () => this.cb.onOpen?.();
    channel.onclose = () => this.cb.onClose?.('channel_closed');
    channel.onmessage = (e) => {
      try {
        this.cb.onMessage?.(JSON.parse(e.data));
      } catch {
        /* ignore malformed */
      }
    };
  }

  _send(obj) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  async _onSignal(msg) {
    switch (msg.type) {
      case 'created':
        this.cb.onCode?.(msg.code);
        break;

      case 'joined':
        this.cb.onConnecting?.();
        break;

      // Host side: guest arrived → create channel + offer.
      case 'peer-joined': {
        this.cb.onConnecting?.();
        const channel = this.pc.createDataChannel('game', { ordered: true });
        this._bindChannel(channel);
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        this._send({ type: 'signal', data: { sdp: this.pc.localDescription } });
        break;
      }

      case 'signal':
        await this._onRtcSignal(msg.data);
        break;

      case 'peer-left':
        this.cb.onClose?.('peer_left');
        break;

      case 'error':
        this.cb.onError?.(msg.reason);
        break;
    }
  }

  async _onRtcSignal(data) {
    if (data.sdp) {
      await this.pc.setRemoteDescription(data.sdp);
      if (data.sdp.type === 'offer') {
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this._send({ type: 'signal', data: { sdp: this.pc.localDescription } });
      }
    } else if (data.candidate) {
      try {
        await this.pc.addIceCandidate(data.candidate);
      } catch {
        /* candidate may arrive before remote desc; browsers usually queue */
      }
    }
  }

  // --- Public API -----------------------------------------------------------

  async host() {
    this.role = 'host';
    await this._connectSignaling();
    this._setupPeerConnection();
    this._send({ type: 'create' });
  }

  async join(code) {
    this.role = 'guest';
    await this._connectSignaling();
    this._setupPeerConnection();
    this._send({ type: 'join', code });
  }

  // Send a game message to the peer over the data channel.
  send(obj) {
    if (this.channel?.readyState === 'open') this.channel.send(JSON.stringify(obj));
  }
}

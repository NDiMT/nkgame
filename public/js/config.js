// Static WebRTC ICE config (works on GitHub Pages — no server needed).
//
// STUN alone only works when at least one peer has a permissive NAT. When the
// two players are on different networks (e.g. one on Wi-Fi, one on mobile/4G),
// NAT traversal usually FAILS without a TURN relay. The free public TURN
// servers below (Open Relay / metered.ca) make cross-network connections work.
//
// ⚠️ These are shared free relays with no SLA — fine for testing and casual
// play, but for production get your own (metered.ca free tier with an API key,
// or self-host coturn) and replace the entries below.
export const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

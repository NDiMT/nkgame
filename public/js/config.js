// Static WebRTC ICE config (works on GitHub Pages — no server needed).
//
// STUN handles most NAT traversal. For reliable connections on mobile carrier
// networks (symmetric NAT), add a TURN server below, e.g.:
//   { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' }
export const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

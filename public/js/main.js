import { Game } from './game.js';
import { Input } from './input.js';
import { Soundtrack } from './audio.js';

const $ = (s) => document.querySelector(s);
const music = new Soundtrack();
let game, input, last = 0, raf = 0;

function showError(msg) {
  let el = document.getElementById('err');
  if (!el) { el = document.createElement('div'); el.id = 'err'; el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#5a0d0d;color:#fff;font:12px/1.4 monospace;padding:10px;white-space:pre-wrap;border-top:3px solid #f55;'; document.body.appendChild(el); }
  el.textContent = 'ERROR: ' + msg;
}
addEventListener('error', (e) => showError(`${e.message}  (${(e.filename || '').split('/').pop()}:${e.lineno})`));
addEventListener('unhandledrejection', (e) => showError('promise: ' + ((e.reason && e.reason.message) || e.reason)));

function loop(ts) {
  try {
    raf = requestAnimationFrame(loop);
    const dt = (ts - last) / 1000 || 0; last = ts;
    game.update(dt); game.render();
  } catch (err) { cancelAnimationFrame(raf); raf = 0; showError(err.message + '\n' + (err.stack || '').split('\n').slice(1, 3).join('\n')); }
}

function hud(h) {
  $('#hp-fill').style.width = `${Math.max(0, (h.hp / h.hpMax) * 100)}%`;
  $('#st-fill').style.width = `${Math.max(0, (h.st / h.stMax) * 100)}%`;
  $('#foes').textContent = h.foes;
}

let toastT = 0;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1600);
}

function death(st) {
  cancelAnimationFrame(raf); raf = 0;
  const m = Math.floor(st.time / 60), s = Math.floor(st.time % 60);
  $('#death-stats').innerHTML = `Endured <b>${m}:${String(s).padStart(2, '0')}</b> · reached <b>Wave ${st.wave}</b> · <b>${st.kills}</b> slain`;
  $('#death').classList.remove('hidden');
  $('#touch').classList.add('hidden');
}

function startGame() {
  try {
    $('#screen-title').classList.add('hidden');
    $('#death').classList.add('hidden');
    $('#hud').classList.remove('hidden');
    $('#touch').classList.remove('hidden');
    game.resize(); game.reset();
    last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  } catch (err) { showError('startGame: ' + err.message + '\n' + (err.stack || '').split('\n')[1]); }
}

function boot() {
  try {
    game = new Game($('#game'), { onHud: hud, onDeath: death, onToast: toast });
    input = new Input(); input.attach(); game.setInput(input);
    game.resize();
    addEventListener('resize', () => game.resize());
    $('#btn-start').onclick = () => { try { music.start(); } catch {} startGame(); };
    $('#btn-respawn').onclick = () => startGame();
    $('#mute').onclick = () => { $('#mute').textContent = music.toggle() ? '🔊' : '🔇'; };
  } catch (err) { showError('boot: ' + err.message); }
}
boot();

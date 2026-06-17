import { Game } from './game.js';
import { Soundtrack } from './audio.js';

const $ = (s) => document.querySelector(s);
const music = new Soundtrack();
const ASSETS = ['hero', 'castle', 'enemy_goblin', 'enemy_zombie', 'enemy_bat', 'enemy_brute', 'boss', 'gem', 'bolt', 'turret'];
const JPGS = ['ground', 'cover'];

function loadAssets() {
  const A = {}; const tasks = [];
  for (const k of ASSETS) tasks.push(load(A, k, `assets/${k}.png`));
  for (const k of JPGS) tasks.push(load(A, k, `assets/${k}.jpg`));
  return Promise.all(tasks).then(() => A);
}
function load(A, key, src) { return new Promise((res) => { const im = new Image(); im.onload = () => { A[key] = im; res(); }; im.onerror = () => res(); im.src = src; }); }

let game, assets, last = 0, raf = 0;

function loop(ts) {
  raf = requestAnimationFrame(loop);
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  game.update(dt); game.render();
}

function hud(h) {
  $('#xp-fill').style.width = `${Math.min(100, (h.xp / h.xpNext) * 100)}%`;
  $('#wall-fill').style.width = `${(h.wall / h.wallMax) * 100}%`;
  const m = Math.floor(h.time / 60), s = Math.floor(h.time % 60);
  $('#timer').textContent = `${m}:${String(s).padStart(2, '0')}`;
  $('#lvl').textContent = `Lv ${h.level}`;
  $('#gold').textContent = `🪙 ${h.gold}`;
  $('#kills').textContent = `☠ ${h.kills}`;
}

function levelUp(choices) {
  const el = $('#levelup'); el.classList.remove('hidden');
  $('#lu-cards').innerHTML = choices.map((c) => `<button class="lu-card" data-id="${c.id}">
    <img src="assets/${c.icon}.png" onerror="this.style.display='none'"><b>${c.name}</b><small>${c.desc}</small></button>`).join('');
  $('#lu-cards').querySelectorAll('.lu-card').forEach((b) => (b.onclick = () => { el.classList.add('hidden'); game.applyUpgrade(b.dataset.id); }));
}

function gameOver(st) {
  cancelAnimationFrame(raf); raf = 0;
  const m = Math.floor(st.time / 60), s = Math.floor(st.time % 60);
  $('#go-stats').innerHTML = `Survived <b>${m}:${String(s).padStart(2, '0')}</b> · Level <b>${st.level}</b> · <b>${st.kills}</b> kills`;
  $('#gameover').classList.remove('hidden');
}

function startGame() {
  $('#screen-title').classList.add('hidden');
  $('#gameover').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  game.resize(); game.reset();
  last = performance.now();
  if (!raf) raf = requestAnimationFrame(loop);
}

// ---- input: touch/drag to AIM the gate cannon ----
function initInput() {
  const cv = $('#game'); let down = false;
  cv.addEventListener('pointerdown', (e) => { down = true; game.setAim(e.clientX, e.clientY); });
  cv.addEventListener('pointermove', (e) => { if (down) game.setAim(e.clientX, e.clientY); });
  const end = () => { down = false; game.setAim(null); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('pointerleave', end);
}

async function boot() {
  assets = await loadAssets();
  game = new Game($('#game'), assets, { onHud: hud, onLevelUp: levelUp, onGameOver: gameOver });
  game.resize();
  addEventListener('resize', () => game.resize());
  initInput();
  $('#cover-img').src = 'assets/cover.jpg';
  $('#btn-start').onclick = () => { music.start(); startGame(); };
  $('#btn-again').onclick = () => startGame();
  $('#mute').onclick = () => { $('#mute').textContent = music.toggle() ? '🔊' : '🔇'; };
}
boot();

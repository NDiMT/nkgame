import { Game } from './game.js';
import { Input } from './input.js';
import { Soundtrack } from './audio.js';
import { TITLE, SUBTITLE, INTRO } from './story.js';

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

// ---- HUD ----
function hud(h) {
  $('#obj-text').textContent = h.objective;
  $('#obj-count').textContent = h.showCount ? `(${h.found}/${h.total})` : '';
}
function prompt(label) {
  const b = $('#btn-interact');
  if (label) { $('#prompt-label').textContent = label; b.classList.remove('hidden'); }
  else b.classList.add('hidden');
}
let toastT = 0;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }

// ---- dialogue (bottom panel, tap to advance) ----
let dlg = null;
function startDialogue(lines, done) {
  dlg = { lines, i: 0, done }; prompt(null);
  $('#dialogue').classList.remove('hidden'); showDlg();
}
function showDlg() {
  const raw = dlg.lines[dlg.i]; const bar = raw.indexOf('|');
  const name = bar >= 0 ? raw.slice(0, bar) : ''; const text = bar >= 0 ? raw.slice(bar + 1) : raw;
  const nm = $('#dlg-name'); nm.textContent = name; nm.style.display = name ? 'block' : 'none';
  $('#dlg-text').textContent = text;
}
function advanceDlg() {
  if (!dlg) return;
  if (++dlg.i >= dlg.lines.length) { $('#dialogue').classList.add('hidden'); const d = dlg.done; dlg = null; if (d) d(); }
  else showDlg();
}

// ---- narration (fullscreen, tap to advance) ----
let narr = null;
function startNarration(lines, done) { narr = { lines, i: 0, done }; $('#narration').classList.remove('hidden'); $('#narr-text').textContent = lines[0]; }
function advanceNarr() {
  if (!narr) return;
  if (++narr.i >= narr.lines.length) { $('#narration').classList.add('hidden'); const d = narr.done; narr = null; if (d) d(); }
  else $('#narr-text').textContent = narr.lines[narr.i];
}

function chapterEnd(o) {
  $('#ch-title').textContent = o.title; $('#ch-text').textContent = o.text;
  $('#chapter').classList.remove('hidden'); $('#touch').classList.add('hidden'); prompt(null);
}

function startGame() {
  try {
    $('#screen-title').classList.add('hidden'); $('#chapter').classList.add('hidden');
    $('#hud').classList.remove('hidden'); $('#touch').classList.remove('hidden');
    game.resize(); game.reset();
    game.paused = true;                       // hold control during the intro
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    startNarration(INTRO, () => { game.paused = false; });
  } catch (err) { showError('startGame: ' + err.message + '\n' + (err.stack || '').split('\n')[1]); }
}

function boot() {
  try {
    $('#title').textContent = TITLE; $('#subtitle').textContent = SUBTITLE;
    game = new Game($('#game'), { onHud: hud, onPrompt: prompt, onToast: toast, onDialogue: startDialogue, onChapterEnd: chapterEnd });
    input = new Input(); input.attach(); game.setInput(input);
    game.resize();
    addEventListener('resize', () => game.resize());
    $('#dialogue').addEventListener('click', advanceDlg);
    $('#narration').addEventListener('click', advanceNarr);
    $('#btn-interact').onclick = () => game.interact();
    $('#btn-start').onclick = () => { try { music.start(); } catch {} startGame(); };
    $('#btn-replay').onclick = () => startGame();
    $('#mute').onclick = () => { $('#mute').textContent = music.toggle() ? '🔊' : '🔇'; };
  } catch (err) { showError('boot: ' + err.message); }
}
boot();

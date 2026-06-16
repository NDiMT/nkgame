// Coop detective game logic + UI wiring.
//
// Design: asymmetric information. The two players share the same suspects /
// weapons / motives, but each sees only HALF the clues. They must talk (via the
// in-game chat) to combine what they know, then jointly accuse. They win only
// if BOTH submit the same accusation AND it matches the case solution.
//
// Player roles: host = detective 1, guest = detective 2.
// The host holds the full case file (including the solution) and is the
// authority that checks the final accusation.

import { Peer } from '/js/rtc.js';
import { Soundtrack } from '/js/audio.js';

const $ = (sel) => document.querySelector(sel);
const screens = {};
let peer = null;
let role = null; // 'host' | 'guest'
let myPlayer = null; // 1 | 2
let caseData = null; // full case (host) or shared+own-clues (guest)
let myGuess = { suspect: null, weapon: null, motive: null };
const submits = {}; // host-side: { 1: guess, 2: guess }
const sharedItems = []; // evidence the partner has shared with me
const music = new Soundtrack();

// --- Screen helpers ---------------------------------------------------------
function show(name) {
  Object.values(screens).forEach((el) => el.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

function chatLine(who, text) {
  const log = $('#chat-log');
  const div = document.createElement('div');
  div.className = 'chat-line';
  div.innerHTML = `<b>${who}:</b> ${escapeHtml(text)}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// --- Case loading -----------------------------------------------------------
// The host picks a case on the home screen; default is the last in the manifest.
let selectedCaseFile = '/cases/case-03.json';

async function populateCasePicker() {
  try {
    const manifest = await (await fetch('/cases/manifest.json')).json();
    const sel = $('#case-select');
    sel.innerHTML = manifest.map((c) => `<option value="${c.file}">${escapeHtml(c.title)}</option>`).join('');
    sel.value = selectedCaseFile = manifest[manifest.length - 1].file;
    sel.onchange = () => (selectedCaseFile = sel.value);
  } catch {
    /* no manifest → fall back to default */
  }
}

async function loadCase() {
  const res = await fetch(selectedCaseFile);
  return res.json();
}

// Strip the solution + the other player's clues before sending to the guest.
function shareableCaseForGuest(full) {
  return {
    id: full.id,
    title: full.title,
    intro: full.intro,
    suspects: full.suspects,
    weapons: full.weapons,
    motives: full.motives,
    clues: full.clues.filter((c) => c.forPlayer === 2),
  };
}

// --- Rendering the game board -----------------------------------------------
function renderGame() {
  $('#case-title').textContent = caseData.title;
  $('#case-intro').textContent = caseData.intro;

  // Suspect dossiers — shared background for both players (part of the plot).
  $('#dossiers').innerHTML = caseData.suspects
    .map(
      (s) => `
      <div class="dossier">
        ${s.image ? `<img src="${s.image}" alt="" loading="lazy">` : ''}
        <div><b>${escapeHtml(s.name)}</b><p>${escapeHtml(s.dossier || '')}</p></div>
      </div>`
    )
    .join('');

  const myClues = caseData.clues.filter((c) => c.forPlayer === myPlayer);
  $('#clues').innerHTML = myClues
    .map(
      (c) => `
      <button class="clue" data-id="${c.id}">
        <span class="tap">πάτα για εξέταση ›</span>
        ${c.image ? `<img src="${c.image}" alt="" loading="lazy">` : ''}
        <p>${escapeHtml(c.text)}</p>
      </button>`
    )
    .join('');
  $('#clues')
    .querySelectorAll('.clue')
    .forEach((btn) => (btn.onclick = () => openInspect(myClues.find((c) => c.id === btn.dataset.id))));

  renderShared();
  renderChoices('suspects', caseData.suspects, 'suspect');
  renderChoices('weapons', caseData.weapons, 'weapon');
  renderChoices('motives', caseData.motives, 'motive');
}

function renderChoices(containerId, items, field) {
  const el = $(`#${containerId}`);
  el.innerHTML = items
    .map(
      (it) => `<button class="choice ${it.image ? 'has-img' : ''}" data-field="${field}" data-id="${it.id}">
        ${it.image ? `<img src="${it.image}" alt="" loading="lazy">` : ''}
        <span>${escapeHtml(it.name)}</span>
      </button>`
    )
    .join('');
  el.querySelectorAll('.choice').forEach((btn) => {
    btn.onclick = () => {
      myGuess[field] = btn.dataset.id;
      el.querySelectorAll('.choice').forEach((b) => b.classList.toggle('selected', b === btn));
      // Share selection so the partner sees what you're leaning towards.
      peer.send({ t: 'guess', guess: myGuess, player: myPlayer });
      updateAccuseButton();
    };
  });
}

function updateAccuseButton() {
  $('#accuse').disabled = !(myGuess.suspect && myGuess.weapon && myGuess.motive);
}

function nameOf(list, id) {
  return list.find((x) => x.id === id)?.name ?? '—';
}

function showPartnerGuess(guess) {
  if (!caseData) return;
  $('#partner-guess').textContent =
    `Ο συνεργάτης σου σκέφτεται: ${nameOf(caseData.suspects, guess.suspect)} · ` +
    `${nameOf(caseData.weapons, guess.weapon)} · ${nameOf(caseData.motives, guess.motive)}`;
}

// --- Evidence objects: inspect + share -------------------------------------
function openInspect(clue) {
  if (!clue) return;
  closeInspect();
  const el = document.createElement('div');
  el.className = 'modal';
  el.id = 'inspect';
  el.innerHTML = `
    <div class="modal-card">
      ${clue.image ? `<img src="${clue.image}" alt="">` : ''}
      <div class="body">
        <p>${escapeHtml(clue.text)}</p>
        <div class="row">
          <button class="btn-ghost" id="ins-close">Κλείσιμο</button>
          <button class="primary" id="ins-share">Μοίρασέ το στον συνεργάτη</button>
        </div>
      </div>
    </div>`;
  el.onclick = (e) => {
    if (e.target === el) closeInspect();
  };
  document.body.appendChild(el);
  $('#ins-close').onclick = closeInspect;
  $('#ins-share').onclick = () => {
    shareClue(clue);
    closeInspect();
  };
}

function closeInspect() {
  document.getElementById('inspect')?.remove();
}

function shareClue(clue) {
  peer.send({ t: 'share', clue: { id: clue.id, text: clue.text, image: clue.image } });
  chatLine('Εσύ', '📎 Μοιράστηκα ένα στοιχείο με τον συνεργάτη.');
}

function addShared(clue) {
  if (sharedItems.find((c) => c.id === clue.id)) return;
  sharedItems.push(clue);
  renderShared();
  chatLine('Συνεργάτης', '📎 μοιράστηκε ένα στοιχείο μαζί σου.');
}

function renderShared() {
  const el = $('#shared');
  if (!el) return;
  el.innerHTML = sharedItems
    .map(
      (c) => `<div class="shared-item">${c.image ? `<img src="${c.image}" alt="">` : ''}<p>${escapeHtml(c.text)}</p></div>`
    )
    .join('');
}

// --- Accusation / result ----------------------------------------------------
function sameGuess(a, b) {
  return a && b && a.suspect === b.suspect && a.weapon === b.weapon && a.motive === b.motive;
}

function evaluate() {
  // Host-only: both detectives must agree AND match the solution.
  const g1 = submits[1];
  const g2 = submits[2];
  if (!g1 || !g2) return;
  const agree = sameGuess(g1, g2);
  const correct = agree && sameGuess(g1, caseData.solution);
  const result = {
    t: 'result',
    agree,
    correct,
    solution: caseData.solution,
    epilogue: correct ? caseData.epilogue || '' : '', // only revealed on a win
  };
  peer.send(result);
  renderResult(result);
}

// Return to the board for another attempt (no reload — keeps the P2P session).
function resetRound() {
  delete submits[1];
  delete submits[2];
  const btn = $('#accuse');
  btn.textContent = 'Κατηγορώ';
  updateAccuseButton();
  show('game');
}

function renderResult({ agree, correct, solution, epilogue }) {
  let msg;
  if (!agree) msg = '🤔 Δεν συμφωνήσατε στην κατηγορία. Συνεννοηθείτε και ξαναδοκιμάστε!';
  else if (correct) msg = '🎉 Λύσατε το μυστήριο!';
  else msg = '❌ Συμφωνήσατε, αλλά η κατηγορία ήταν λάθος. Η υπόθεση παραμένει ανοιχτή...';
  $('#result-msg').textContent = msg;
  $('#result-detail').textContent = correct
    ? `Ένοχος: ${nameOf(caseData.suspects, solution.suspect)} με ${nameOf(caseData.weapons, solution.weapon)} (${nameOf(caseData.motives, solution.motive)}).`
    : '';
  $('#result-epilogue').textContent = correct ? epilogue || '' : '';
  // Win → offer a fresh game; otherwise let them go back and keep investigating.
  $('#btn-again').classList.toggle('hidden', !correct);
  $('#result-retry').classList.toggle('hidden', correct);
  show('result');
}

// --- Peer message handling --------------------------------------------------
function onMessage(msg) {
  switch (msg.t) {
    case 'case': // guest receives the shared case
      caseData = msg.payload;
      startGame();
      break;
    case 'chat':
      chatLine('Συνεργάτης', msg.text);
      break;
    case 'share':
      addShared(msg.clue);
      break;
    case 'guess':
      showPartnerGuess(msg.guess);
      break;
    case 'submit':
      // Host collects guest's final accusation.
      if (role === 'host') {
        submits[msg.player] = msg.guess;
        evaluate();
      }
      break;
    case 'result':
      renderResult(msg);
      break;
  }
}

function startGame() {
  renderGame();
  updateAccuseButton();
  show('game');
}

// --- Wiring -----------------------------------------------------------------
function wireUI() {
  screens.home = $('#screen-home');
  screens.lobby = $('#screen-lobby');
  screens.game = $('#screen-game');
  screens.result = $('#screen-result');

  $('#btn-create').onclick = () => {
    music.start(); // first user gesture — satisfies autoplay policy
    startHost();
  };
  $('#btn-join').onclick = () => {
    const code = $('#join-code').value.replace(/\D/g, '').slice(0, 6);
    if (code.length === 6) {
      music.start();
      startGuest(code);
    }
  };

  $('#mute').onclick = () => {
    const on = music.toggle();
    $('#mute').textContent = on ? '🔊' : '🔇';
  };

  $('#chat-send').onclick = sendChat;
  $('#chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChat();
  });

  $('#accuse').onclick = () => {
    if (role === 'host') {
      submits[1] = { ...myGuess };
      $('#accuse').disabled = true;
      $('#accuse').textContent = 'Περιμένω τον συνεργάτη...';
      evaluate();
    } else {
      peer.send({ t: 'submit', guess: { ...myGuess }, player: 2 });
      $('#accuse').disabled = true;
      $('#accuse').textContent = 'Περιμένω αποτέλεσμα...';
    }
  };

  $('#btn-again').onclick = () => location.reload();
  $('#result-retry').onclick = resetRound;

  populateCasePicker();
}

function sendChat() {
  const input = $('#chat-input');
  const text = input.value.trim();
  if (!text) return;
  peer.send({ t: 'chat', text });
  chatLine('Εσύ', text);
  input.value = '';
}

function makePeer() {
  return new Peer({
    onCode: (code) => {
      $('#lobby-code').textContent = code;
      $('#lobby-status').textContent = 'Δώσε τον κωδικό στον συνεργάτη σου και περίμενε...';
      show('lobby');
    },
    onConnecting: () => {
      $('#lobby-status').textContent = 'Σύνδεση...';
      show('lobby');
    },
    onOpen: async () => {
      if (role === 'host') {
        myPlayer = 1;
        caseData = await loadCase();
        peer.send({ t: 'case', payload: shareableCaseForGuest(caseData) });
        startGame();
      } else {
        myPlayer = 2; // guest waits for the 'case' message
      }
    },
    onMessage,
    onClose: (reason) => {
      if (!screens.result.classList.contains('hidden')) return;
      $('#lobby-status').textContent = `Η σύνδεση χάθηκε (${reason}). Κάνε ανανέωση.`;
      show('lobby');
    },
    onError: (reason) => {
      const map = { no_such_room: 'Δεν υπάρχει παιχνίδι με αυτόν τον κωδικό.', room_full: 'Το παιχνίδι είναι γεμάτο.' };
      $('#join-error').textContent = map[reason] || reason;
    },
  });
}

function startHost() {
  role = 'host';
  peer = makePeer();
  peer.host();
}

function startGuest(code) {
  role = 'guest';
  peer = makePeer();
  peer.join(code);
}

wireUI();
show('home');

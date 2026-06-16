// Καρτορόγκα — single-player roguelike card dungeon crawler.
// Run state + map + screen flow + rendering + input.

import { CARDS, ENEMIES, STARTER_DECK, REWARD_POOL, COMMON_ENEMIES } from './data.js';
import { createCombat, playCard, endTurn, enemyIntent } from './engine.js';
import { Soundtrack } from './audio.js';

const $ = (s) => document.querySelector(s);
const screens = {};
const music = new Soundtrack();

let run = null; // { hp, maxHp, deck, map, position }
let combat = null;
let pendingCard = null; // hand index awaiting a target

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sample = (arr, n) => {
  const pool = [...arr];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
};

const ROOM_ICON = { combat: '⚔️', elite: '💀', rest: '🔥', treasure: '🎁', boss: '🐲' };
const ROOM_NAME = { combat: 'Μάχη', elite: 'Ελίτ', rest: 'Ανάπαυση', treasure: 'Θησαυρός', boss: 'Αφεντικό' };

// --- Screen management ------------------------------------------------------
function show(name) {
  Object.values(screens).forEach((el) => el.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

function imgTag(key, cls) {
  return `<img class="${cls}" src="assets/img/${key}.jpg" alt="" loading="lazy" onerror="this.style.display='none'">`;
}

// --- Run + map --------------------------------------------------------------
function newRun() {
  run = { hp: 70, maxHp: 70, deck: [...STARTER_DECK], map: genMap(), position: -1 };
  renderMap();
  show('map');
}

function genMap() {
  // A fixed-shape but randomly-populated linear descent.
  const layout = ['combat', 'combat', 'treasure', 'combat', 'rest', 'elite', 'treasure', 'combat', 'rest', 'boss'];
  return layout.map((type) => {
    if (type === 'combat') return { type, enemies: sample(COMMON_ENEMIES, Math.random() < 0.45 ? 2 : 1) };
    if (type === 'elite') return { type, enemies: ['orc'] };
    if (type === 'boss') return { type, enemies: ['lich'] };
    return { type };
  });
}

function renderMap() {
  $('#map-hp').textContent = `❤️ ${run.hp}/${run.maxHp}`;
  $('#map-deck').textContent = `🃏 ${run.deck.length}`;
  const nextIndex = run.position + 1;
  $('#map-rooms').innerHTML = run.map
    .map((room, i) => {
      const state = i < nextIndex ? 'done' : i === nextIndex ? 'next' : 'locked';
      const sub = room.enemies ? room.enemies.map((e) => ENEMIES[e].name).join(' + ') : ROOM_NAME[room.type];
      return `<button class="room ${state}" data-i="${i}" ${state === 'next' ? '' : 'disabled'}>
        <span class="room-icon">${ROOM_ICON[room.type]}</span>
        <span class="room-text"><b>${ROOM_NAME[room.type]}</b><small>${sub}</small></span>
      </button>`;
    })
    .join('');
  $('#map-rooms').querySelectorAll('.room.next').forEach((b) => (b.onclick = () => enterRoom(+b.dataset.i)));
}

function enterRoom(i) {
  run.position = i;
  const room = run.map[i];
  if (room.type === 'rest') return restRoom();
  if (room.type === 'treasure') return treasureRoom();
  startCombat(room.enemies, room.type);
}

// --- Combat -----------------------------------------------------------------
function startCombat(enemyIds, roomType) {
  combat = createCombat(run, enemyIds);
  combat.roomType = roomType;
  pendingCard = null;
  renderCombat();
  show('combat');
}

function bars(cur, max) {
  const pct = Math.max(0, Math.round((cur / max) * 100));
  return `<div class="bar"><span style="width:${pct}%"></span><em>${Math.max(0, cur)}/${max}</em></div>`;
}

function statusBadges(ent) {
  let s = '';
  if (ent.block > 0) s += `<span class="badge blk">🛡 ${ent.block}</span>`;
  if (ent.strength > 0) s += `<span class="badge str">💪 ${ent.strength}</span>`;
  if (ent.vulnerable > 0) s += `<span class="badge vul">🎯 ${ent.vulnerable}</span>`;
  if (ent.weak > 0) s += `<span class="badge wk">💧 ${ent.weak}</span>`;
  return s;
}

function intentLabel(e) {
  const m = enemyIntent(e);
  if (m.type === 'attack' || m.type === 'attack_debuff') {
    const dmg = m.value + (e.strength || 0);
    return `<span class="intent atk">⚔️ ${dmg}${m.type === 'attack_debuff' ? '＋' : ''}</span>`;
  }
  if (m.type === 'block') return `<span class="intent def">🛡 ${m.value}</span>`;
  if (m.type === 'buff') return `<span class="intent buf">💪</span>`;
  return '';
}

function renderCombat() {
  // Enemies
  $('#enemies').innerHTML = combat.enemies
    .map((e, i) => {
      if (e.hp <= 0) return '';
      const targetable = pendingCard !== null ? 'targetable' : '';
      return `<button class="enemy ${targetable}" data-i="${i}">
        <div class="intent-row">${intentLabel(e)}</div>
        ${imgTag(e.img, 'enemy-art')}
        <div class="enemy-name">${e.name}</div>
        ${bars(e.hp, e.maxHp)}
        <div class="badges">${statusBadges(e)}</div>
      </button>`;
    })
    .join('');
  $('#enemies').querySelectorAll('.enemy').forEach((b) => (b.onclick = () => onEnemyClick(+b.dataset.i)));

  // Player stats
  const p = combat.player;
  $('#player-stats').innerHTML = `
    <div class="pstat">❤️ ${bars(p.hp, p.maxHp)}</div>
    <div class="pbadges">
      <span class="energy">⚡ ${p.energy}/${p.maxEnergy}</span>
      ${statusBadges(p)}
    </div>`;

  // Hand
  $('#hand').innerHTML = combat.hand
    .map((id, i) => {
      const c = CARDS[id];
      const cheap = c.cost <= p.energy;
      const sel = pendingCard === i ? 'selected' : '';
      return `<button class="card ${c.type} ${cheap ? '' : 'unaffordable'} ${sel}" data-i="${i}">
        <span class="cost">${c.cost}</span>
        ${imgTag(c.img, 'card-art')}
        <span class="cname">${c.name}</span>
        <span class="cdesc">${c.desc}</span>
      </button>`;
    })
    .join('');
  $('#hand').querySelectorAll('.card').forEach((b) => (b.onclick = () => onCardClick(+b.dataset.i)));

  $('#draw-count').textContent = combat.drawPile.length;
  $('#discard-count').textContent = combat.discardPile.length;

  if (combat.over) setTimeout(() => endCombat(), 400);
}

function aliveCount() {
  return combat.enemies.filter((e) => e.hp > 0).length;
}

function onCardClick(i) {
  const c = CARDS[combat.hand[i]];
  if (!c || c.cost > combat.player.energy || combat.over) return;
  const singleTargetAttack = c.effects.some((e) => e.op === 'damage' || e.op === 'vulnerable' || e.op === 'weak');
  if (singleTargetAttack && aliveCount() > 1) {
    pendingCard = pendingCard === i ? null : i; // toggle target mode
    renderCombat();
    return;
  }
  playCard(combat, i, combat.enemies.findIndex((e) => e.hp > 0));
  pendingCard = null;
  renderCombat();
}

function onEnemyClick(i) {
  if (pendingCard === null) return;
  playCard(combat, pendingCard, i);
  pendingCard = null;
  renderCombat();
}

function onEndTurn() {
  if (combat.over) return;
  pendingCard = null;
  endTurn(combat);
  renderCombat();
}

function endCombat() {
  if (!combat.won) return gameOver();
  run.hp = combat.player.hp; // carry HP forward
  if (combat.roomType === 'boss') return victory();
  rewardScreen(combat.roomType === 'elite');
}

// --- Reward / events --------------------------------------------------------
function rewardScreen(elite) {
  const choices = sample(REWARD_POOL, 3);
  $('#reward-title').textContent = elite ? 'Λάφυρα Ελίτ — διάλεξε μια κάρτα' : 'Νίκη! Διάλεξε μια κάρτα';
  $('#reward-cards').innerHTML = choices
    .map((id) => {
      const c = CARDS[id];
      return `<button class="card ${c.type}" data-id="${id}">
        <span class="cost">${c.cost}</span>${imgTag(c.img, 'card-art')}
        <span class="cname">${c.name}</span><span class="cdesc">${c.desc}</span>
      </button>`;
    })
    .join('');
  $('#reward-cards').querySelectorAll('.card').forEach((b) => (b.onclick = () => { run.deck.push(b.dataset.id); afterRoom(); }));
  if (elite) run.hp = Math.min(run.maxHp, run.hp + 10);
  show('reward');
}

function restRoom() {
  const heal = Math.round(run.maxHp * 0.3);
  run.hp = Math.min(run.maxHp, run.hp + heal);
  $('#event-icon').textContent = '🔥';
  $('#event-title').textContent = 'Ανάπαυση';
  $('#event-text').textContent = `Ξεκουράζεσαι στη φωτιά και γιατρεύεις ${heal} ζωή. (❤️ ${run.hp}/${run.maxHp})`;
  $('#event-cards').innerHTML = '';
  $('#event-continue').classList.remove('hidden');
  show('event');
}

function treasureRoom() {
  const choices = sample(REWARD_POOL, 3);
  $('#event-icon').textContent = '🎁';
  $('#event-title').textContent = 'Θησαυρός';
  $('#event-text').textContent = 'Βρίσκεις ένα σεντούκι. Διάλεξε μια κάρτα:';
  $('#event-cards').innerHTML = choices
    .map((id) => {
      const c = CARDS[id];
      return `<button class="card ${c.type}" data-id="${id}">
        <span class="cost">${c.cost}</span>${imgTag(c.img, 'card-art')}
        <span class="cname">${c.name}</span><span class="cdesc">${c.desc}</span>
      </button>`;
    })
    .join('');
  $('#event-cards').querySelectorAll('.card').forEach((b) => (b.onclick = () => { run.deck.push(b.dataset.id); afterRoom(); }));
  $('#event-continue').classList.add('hidden');
  show('event');
}

function afterRoom() {
  renderMap();
  show('map');
}

// --- End states -------------------------------------------------------------
function gameOver() {
  $('#end-emoji').textContent = '☠️';
  $('#end-title').textContent = 'Έπεσες στο μπουντρούνι';
  $('#end-text').textContent = `Έφτασες μέχρι το δωμάτιο ${run.position + 1}/${run.map.length}. Η περιπέτεια τελείωσε.`;
  show('end');
}

function victory() {
  $('#end-emoji').textContent = '👑';
  $('#end-title').textContent = 'Νίκησες τον Λιτς Άρχοντα!';
  $('#end-text').textContent = 'Κατέκτησες το μπουντρούνι. Μπράβο, ήρωα!';
  show('end');
}

// --- Wiring -----------------------------------------------------------------
function wire() {
  screens.title = $('#screen-title');
  screens.map = $('#screen-map');
  screens.combat = $('#screen-combat');
  screens.reward = $('#screen-reward');
  screens.event = $('#screen-event');
  screens.end = $('#screen-end');

  $('#btn-start').onclick = () => { music.start(); newRun(); };
  $('#end-turn').onclick = onEndTurn;
  $('#event-continue').onclick = afterRoom;
  $('#btn-restart').onclick = () => newRun();
  $('#mute').onclick = () => { $('#mute').textContent = music.toggle() ? '🔊' : '🔇'; };
}

wire();
show('title');

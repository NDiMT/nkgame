// Cardspire-style roguelike (Card Quest-inspired): attack/defense phases,
// combos, dodge, equipment-granted cards. Run state + flow + rendering + input.

import { CARDS, ENEMIES, STARTER_DECK, EQUIPMENT, COMMON_ENEMIES } from './data.js';
import { createCombat, playCard, canPlay, toDefense, resolveDefense, canMulligan, mulligan } from './engine.js';
import { Soundtrack } from './audio.js';

const $ = (s) => document.querySelector(s);
const screens = {};
const music = new Soundtrack();
let run = null;
let combat = null;

const sample = (arr, n) => { const p = [...arr]; const o = []; while (o.length < n && p.length) o.push(p.splice(Math.floor(Math.random() * p.length), 1)[0]); return o; };

const ROOM_ICON = { battle: '⚔️', elite: '💀', rest: '🔥', treasure: '🎁', boss: '🐲' };
const ROOM_NAME = { battle: 'Battle', elite: 'Elite', rest: 'Rest', treasure: 'Treasure', boss: 'Boss' };

function show(name) { Object.values(screens).forEach((el) => el.classList.add('hidden')); screens[name].classList.remove('hidden'); }
function img(key, cls) { return `<img class="${cls}" src="assets/img/${key}.jpg" alt="" loading="lazy" onerror="this.style.display='none'">`; }

// --- Run + map --------------------------------------------------------------
function newRun() {
  run = { hp: 70, maxHp: 70, deck: [...STARTER_DECK], map: genMap(), position: -1 };
  renderMap();
  show('map');
}

function genMap() {
  const layout = ['battle', 'battle', 'treasure', 'battle', 'rest', 'elite', 'treasure', 'battle', 'rest', 'boss'];
  return layout.map((type) => {
    if (type === 'battle') return { type, enemy: sample(COMMON_ENEMIES, 1)[0] };
    if (type === 'elite') return { type, enemy: 'orc' };
    if (type === 'boss') return { type, enemy: 'lich' };
    return { type };
  });
}

function renderMap() {
  $('#map-hp').textContent = `❤️ ${run.hp}/${run.maxHp}`;
  $('#map-deck').textContent = `🃏 ${run.deck.length}`;
  const next = run.position + 1;
  $('#map-rooms').innerHTML = run.map.map((room, i) => {
    const state = i < next ? 'done' : i === next ? 'next' : 'locked';
    const sub = room.enemy ? ENEMIES[room.enemy].name : ROOM_NAME[room.type];
    return `<button class="room ${state}" data-i="${i}" ${state === 'next' ? '' : 'disabled'}>
      <span class="room-icon">${ROOM_ICON[room.type]}</span>
      <span class="room-text"><b>${ROOM_NAME[room.type]}</b><small>${sub}</small></span></button>`;
  }).join('');
  $('#map-rooms').querySelectorAll('.room.next').forEach((b) => (b.onclick = () => enterRoom(+b.dataset.i)));
}

function enterRoom(i) {
  run.position = i;
  const room = run.map[i];
  if (room.type === 'rest') return restRoom();
  if (room.type === 'treasure') return treasureRoom();
  startCombat(room.enemy, room.type);
}

// --- Combat -----------------------------------------------------------------
function startCombat(enemyId, roomType) {
  combat = createCombat(run, enemyId);
  combat.roomType = roomType;
  renderCombat();
  show('combat');
}

function bar(cur, max, cls = '') {
  const pct = Math.max(0, Math.round((cur / max) * 100));
  return `<div class="bar ${cls}"><span style="width:${pct}%"></span><em>${Math.max(0, cur)}/${max}</em></div>`;
}

function planLabel(hits) { return hits.map((h) => `⚔️${h}`).join(' '); }

function renderCombat() {
  const c = combat, p = c.player, e = c.enemy;
  const defense = c.phase === 'defense';

  $('#phase-banner').textContent = defense ? 'DEFENSE PHASE — answer the incoming attack' : 'ATTACK PHASE — chain cards for combos';
  $('#phase-banner').className = 'phase-banner ' + (defense ? 'def' : 'atk');

  // Enemy
  const incoming = defense ? c.incoming : c.enemy.plan.hits;
  $('#enemy-area').innerHTML = `
    <div class="enemy">
      <div class="intent">${planLabel(incoming)}</div>
      ${img(e.img, 'enemy-art')}
      <div class="enemy-name">${e.name} ${e.dodge > 0 ? `<span class="badge dge">💨×${e.dodge}</span>` : ''}</div>
      ${bar(e.hp, e.maxHp)}
    </div>`;

  // Player stats
  $('#player-stats').innerHTML = `
    <div class="pstat">❤️ ${bar(p.hp, p.maxHp)}</div>
    <div class="pbadges">
      <span class="energy">⚡ ${p.stamina}/${p.maxStamina}</span>
      ${c.chain > 0 ? `<span class="badge cmb">🔗 chain ${c.chain}</span>` : ''}
      ${p.block > 0 ? `<span class="badge blk">🛡 ${p.block}</span>` : ''}
      ${p.dodge > 0 ? `<span class="badge dge">💨 ${p.dodge}</span>` : ''}
      ${p.counter > 0 ? `<span class="badge ctr">⚡counter ${p.counter}</span>` : ''}
    </div>`;

  // Phase button + mulligan
  const btn = $('#phase-btn');
  btn.textContent = defense ? 'Resolve ▶' : 'Defend ▶';
  btn.onclick = defense ? doResolve : doDefend;
  const mul = $('#mulligan');
  if (canMulligan(c)) { mul.classList.remove('hidden'); mul.onclick = doMulligan; }
  else mul.classList.add('hidden');

  // Hand
  $('#hand').innerHTML = c.hand.map((id, i) => {
    const card = CARDS[id];
    const playable = canPlay(c, i);
    return `<button class="card ${card.type} ${playable ? '' : 'unplayable'}" data-i="${i}">
      ${card.use !== 'defense' ? `<span class="cost">${card.cost}</span>` : '<span class="cost def">DEF</span>'}
      ${img(card.img, 'card-art')}
      <span class="cname">${card.name}</span><span class="cdesc">${card.desc}</span></button>`;
  }).join('');
  $('#hand').querySelectorAll('.card').forEach((b) => (b.onclick = () => onCard(+b.dataset.i)));

  $('#draw-count').textContent = c.drawPile.length;
  $('#discard-count').textContent = c.discardPile.length;

  if (c.over) setTimeout(endCombat, 350);
}

function onCard(i) {
  if (!canPlay(combat, i)) return;
  playCard(combat, i);
  renderCombat();
}
function doDefend() { toDefense(combat); renderCombat(); }
function doResolve() { resolveDefense(combat); renderCombat(); }
function doMulligan() { mulligan(combat); renderCombat(); }

function endCombat() {
  if (!combat.won) return gameOver();
  run.hp = combat.player.hp;
  if (combat.roomType === 'boss') return victory();
  rewardScreen(combat.roomType === 'elite');
}

// --- Rewards / events (equipment grants cards) ------------------------------
function equipCard(eq) {
  const c = CARDS[eq.cards[0]];
  return `<button class="card ${c.type}" data-id="${eq.id}">
    ${img(eq.img, 'card-art')}
    <span class="cname">${eq.name}</span><span class="cdesc">${eq.desc}</span></button>`;
}

function offerEquipment(container, onPick) {
  const choices = sample(EQUIPMENT, 3);
  container.innerHTML = choices.map(equipCard).join('');
  container.querySelectorAll('.card').forEach((b) => (b.onclick = () => {
    const eq = EQUIPMENT.find((x) => x.id === b.dataset.id);
    run.deck.push(...eq.cards);
    onPick();
  }));
}

function rewardScreen(elite) {
  $('#reward-title').textContent = elite ? 'Elite loot — pick equipment' : 'Victory! Pick equipment';
  if (elite) run.hp = Math.min(run.maxHp, run.hp + 12);
  offerEquipment($('#reward-cards'), afterRoom);
  show('reward');
}

function restRoom() {
  const heal = Math.round(run.maxHp * 0.3);
  run.hp = Math.min(run.maxHp, run.hp + heal);
  $('#event-icon').textContent = '🔥';
  $('#event-title').textContent = 'Rest';
  $('#event-text').textContent = `You rest by the fire and recover ${heal} HP. (❤️ ${run.hp}/${run.maxHp})`;
  $('#event-cards').innerHTML = '';
  $('#event-continue').classList.remove('hidden');
  show('event');
}

function treasureRoom() {
  $('#event-icon').textContent = '🎁';
  $('#event-title').textContent = 'Treasure';
  $('#event-text').textContent = 'You find a chest. Pick a piece of equipment:';
  $('#event-continue').classList.add('hidden');
  offerEquipment($('#event-cards'), afterRoom);
  show('event');
}

function afterRoom() { renderMap(); show('map'); }

function gameOver() {
  $('#end-emoji').textContent = '☠️';
  $('#end-title').textContent = 'You fell in the dungeon';
  $('#end-text').textContent = `You reached room ${run.position + 1}/${run.map.length}. The run is over.`;
  show('end');
}
function victory() {
  $('#end-emoji').textContent = '👑';
  $('#end-title').textContent = 'You slew the Lich Lord!';
  $('#end-text').textContent = 'You conquered the dungeon. Well fought, hero!';
  show('end');
}

// --- Wiring -----------------------------------------------------------------
function wire() {
  for (const n of ['title', 'map', 'combat', 'reward', 'event', 'end']) screens[n] = $('#screen-' + n);
  $('#btn-start').onclick = () => { music.start(); newRun(); };
  $('#event-continue').onclick = afterRoom;
  $('#btn-restart').onclick = () => newRun();
  $('#mute').onclick = () => { $('#mute').textContent = music.toggle() ? '🔊' : '🔇'; };
}
wire();
show('title');

// Cardspire-style roguelike (Card Quest-inspired): attack/defense phases,
// combos, dodge, equipment-granted cards. Run state + flow + rendering + input.

import { CARDS, ENEMIES, CLASSES, SPECS, EQUIPMENT_BY_CLASS, COMMON_ENEMIES } from './data.js';
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

// --- Class + specialization selection ---------------------------------------
function classSelect() {
  $('#class-cards').innerHTML = Object.values(CLASSES).map((cl) => `
    <button class="classcard" data-id="${cl.id}">
      ${img(cl.img, 'class-art')}
      <span class="cname">${cl.name}</span>
      <span class="cdesc">${cl.desc}</span>
    </button>`).join('');
  $('#class-cards').querySelectorAll('.classcard').forEach((b) => (b.onclick = () => specSelect(b.dataset.id)));
  show('class');
}

function passiveText(p) {
  const t = [];
  if (p.hp) t.push(`+${p.hp} HP`);
  if (p.stamina) t.push(`+${p.stamina} stamina`);
  if (p.charge) t.push(`start +${p.charge} charge`);
  return t.join(', ');
}

function specSelect(classId) {
  const cls = CLASSES[classId];
  $('#spec-title').textContent = `${cls.name} — choose a specialization`;
  $('#spec-cards').innerHTML = SPECS[classId].map((sp) => `
    <button class="classcard" data-id="${sp.id}">
      ${img(sp.img, 'class-art')}
      <span class="cname">${sp.name}</span>
      <span class="cdesc">${sp.desc}</span>
    </button>`).join('');
  $('#spec-cards').querySelectorAll('.classcard').forEach((b) => (b.onclick = () => newRun(classId, b.dataset.id)));
  show('spec');
}

// --- Run + map --------------------------------------------------------------
function newRun(classId, specId) {
  const cls = CLASSES[classId] || CLASSES.fighter;
  const spec = (SPECS[classId] || []).find((s) => s.id === specId) || SPECS[classId][0];
  const p = spec.passive || {};
  run = {
    classId: cls.id,
    specId: spec.id,
    maxHp: 70 + (p.hp || 0),
    hp: 70 + (p.hp || 0),
    maxStamina: cls.maxStamina + (p.stamina || 0),
    maxArcane: cls.maxArcane,
    startArcane: p.charge || 0,
    deck: [...spec.deck],
    map: genMap(),
    curNode: null,
    visited: new Set(),
  };
  renderMap();
  show('map');
}

// --- Branching dungeon map (Card Quest / StS style) -------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function nodeType(r, rows, i, count) {
  if (r === 0) return 'battle';
  if (r === rows - 1) return 'boss';
  if (r === rows - 2) return i === 0 ? 'rest' : 'battle'; // a rest before the boss
  const x = Math.random();
  if (r >= 3 && x < 0.12) return 'elite';
  if (x < 0.30) return 'treasure';
  if (x < 0.45) return 'rest';
  return 'battle';
}

function genMap() {
  const ROWS = 8;
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    const count = r === 0 ? 2 : r === ROWS - 1 ? 1 : 2 + (Math.random() < 0.5 ? 1 : 0);
    const row = [];
    for (let i = 0; i < count; i++) {
      const type = nodeType(r, ROWS, i, count);
      const node = { row: r, i, type, next: [] };
      if (type === 'battle') node.enemy = sample(COMMON_ENEMIES, 1)[0];
      else if (type === 'elite') node.enemy = 'orc';
      else if (type === 'boss') node.enemy = 'lich';
      row.push(node);
    }
    rows.push(row);
  }
  // Edges: connect each node to 1-2 nodes in the next row by relative column.
  for (let r = 0; r < ROWS - 1; r++) {
    const cur = rows[r], nxt = rows[r + 1];
    cur.forEach((node, idx) => {
      const center = cur.length === 1 ? (nxt.length - 1) / 2 : (idx * (nxt.length - 1)) / (cur.length - 1);
      const a = clamp(Math.round(center), 0, nxt.length - 1);
      const set = new Set([a]);
      if (Math.random() < 0.5) set.add(clamp(a + (Math.random() < 0.5 ? -1 : 1), 0, nxt.length - 1));
      node.next = [...set];
    });
    // Guarantee every next-row node is reachable.
    nxt.forEach((_, j) => {
      if (!cur.some((n) => n.next.includes(j))) {
        const from = clamp(Math.round((j * (cur.length - 1)) / Math.max(1, nxt.length - 1)), 0, cur.length - 1);
        if (!cur[from].next.includes(j)) cur[from].next.push(j);
      }
    });
  }
  return rows;
}

function availableNodes() {
  if (!run.curNode) return run.map[0];
  if (run.curNode.row >= run.map.length - 1) return [];
  return run.curNode.next.map((j) => run.map[run.curNode.row + 1][j]);
}

function renderMap() {
  $('#map-hp').textContent = `❤️ ${run.hp}/${run.maxHp}`;
  $('#map-deck').textContent = `🃏 ${run.deck.length}`;
  const avail = new Set(availableNodes().map((n) => `${n.row}-${n.i}`));
  const cont = $('#map-rooms');

  cont.innerHTML = '<svg id="map-edges"></svg>' + run.map.map((row) => `
    <div class="map-row">${row.map((n) => {
      const id = `${n.row}-${n.i}`;
      const state = run.visited.has(id) ? 'done' : avail.has(id) ? 'avail' : 'locked';
      return `<button class="node ${n.type} ${state}" data-row="${n.row}" data-i="${n.i}" ${state === 'avail' ? '' : 'disabled'}>
        <span class="node-icon">${ROOM_ICON[n.type]}</span></button>`;
    }).join('')}</div>`).join('');

  cont.querySelectorAll('.node.avail').forEach((b) => (b.onclick = () => enterRoom(run.map[+b.dataset.row][+b.dataset.i])));
  requestAnimationFrame(drawEdges);
}

function drawEdges() {
  const cont = $('#map-rooms');
  const svg = $('#map-edges');
  if (!svg) return;
  const cr = cont.getBoundingClientRect();
  svg.setAttribute('width', cont.clientWidth);
  svg.setAttribute('height', cont.scrollHeight);
  const center = (node) => {
    const el = cont.querySelector(`.node[data-row="${node.row}"][data-i="${node.i}"]`);
    const r = el.getBoundingClientRect();
    return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2 };
  };
  let lines = '';
  for (let r = 0; r < run.map.length - 1; r++) {
    for (const node of run.map[r]) {
      const a = center(node);
      for (const j of node.next) {
        const b = center(run.map[r + 1][j]);
        const done = run.visited.has(`${node.row}-${node.i}`);
        lines += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${done ? '#e3c269' : '#3a2f4d'}" stroke-width="3"/>`;
      }
    }
  }
  svg.innerHTML = lines;
}

function enterRoom(node) {
  run.curNode = node;
  run.visited.add(`${node.row}-${node.i}`);
  if (node.type === 'rest') return restRoom();
  if (node.type === 'treasure') return treasureRoom();
  startCombat(node.enemy, node.type);
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

  // Enemy on its "stage"
  const incoming = defense ? c.incoming : c.enemy.plan.hits;
  const intentClass = incoming.length > 1 ? 'intent rage' : 'intent';
  $('#enemy-area').innerHTML = `
    <div class="enemy">
      <div class="${intentClass}">${incoming.length ? planLabel(incoming) : '—'}</div>
      <div class="enemy-stage">${img(e.img, 'enemy-art')}<div class="shadow"></div></div>
      <div class="enemy-name">${e.name}
        ${e.dodge > 0 ? `<span class="badge dge">💨×${e.dodge}</span>` : ''}
        ${e.poison > 0 ? `<span class="badge psn">☠ ${e.poison}</span>` : ''}</div>
      ${bar(e.hp, e.maxHp)}
    </div>`;

  // Player HUD: hero portrait + stats
  const cls = CLASSES[run.classId];
  $('#player-stats').innerHTML = `
    <div class="hero">${img(cls.img, 'hero-portrait')}</div>
    <div class="hero-stats">
    <div class="pstat">❤️ ${bar(p.hp, p.maxHp)}</div>
    <div class="pbadges">
      <span class="energy">⚡ ${p.stamina}/${p.maxStamina}</span>
      ${p.maxArcane > 0 ? `<span class="badge arc">${(CLASSES[run.classId].chargeIcon || '🔮')} ${p.arcane}/${p.maxArcane}</span>` : ''}
      ${p.hidden > 0 ? `<span class="badge hid">🌫 hidden</span>` : ''}
      ${c.chain > 0 ? `<span class="badge cmb">🔗 chain ${c.chain}</span>` : ''}
      ${p.block > 0 ? `<span class="badge blk">🛡 ${p.block}</span>` : ''}
      ${p.dodge > 0 ? `<span class="badge dge">💨 ${p.dodge}</span>` : ''}
      ${p.counter > 0 ? `<span class="badge ctr">⚡counter ${p.counter}</span>` : ''}
    </div></div>`;

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
  const pool = EQUIPMENT_BY_CLASS[run.classId] || EQUIPMENT_BY_CLASS.fighter;
  const choices = sample(pool, 3);
  container.innerHTML = choices.map(equipCard).join('');
  container.querySelectorAll('.card').forEach((b) => (b.onclick = () => {
    const eq = pool.find((x) => x.id === b.dataset.id);
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
  $('#end-text').textContent = `You reached depth ${(run.curNode ? run.curNode.row + 1 : 0)}/${run.map.length}. The run is over.`;
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
  for (const n of ['title', 'class', 'spec', 'map', 'combat', 'reward', 'event', 'end']) screens[n] = $('#screen-' + n);
  $('#btn-start').onclick = () => { music.start(); classSelect(); };
  $('#event-continue').onclick = afterRoom;
  $('#btn-restart').onclick = () => classSelect();
  $('#mute').onclick = () => { $('#mute').textContent = music.toggle() ? '🔊' : '🔇'; };
}
wire();
show('title');

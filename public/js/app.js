// Dungeon Cards — loadout-based roguelite card crawler (Card Quest model).
import { CARDS, CLASSES, LOADOUT, BAGS, ENEMIES, COMMON_ENEMIES, ELITE_GROUPS } from './data.js';
import { createCombat, playCard, canPlay, endTurn, canMulligan, mulligan, setTarget, canUseBag, useBag } from './engine.js';
import { Soundtrack } from './audio.js';

const $ = (s) => document.querySelector(s);
const screens = {};
const music = new Soundtrack();
let run = null, combat = null;
let sel = { classId: null, subclass: null, weapon: null, trinket: null, bag: null }; // loadout in progress
const SLOTS = ['subclass', 'weapon', 'trinket', 'bag'];
function slotOptions(classId, slot) {
  const L = LOADOUT[classId];
  if (slot === 'bag') return L.bag.map((id) => ({ id, name: BAGS[id].name, desc: `${BAGS[id].desc} (${BAGS[id].charges} charges)`, img: BAGS[id].img }));
  return L[slot].map((p) => ({ ...p, img: CARDS[p.cards[0]].img }));
}

const sample = (arr, n) => { const p = [...arr]; const o = []; while (o.length < n && p.length) o.push(p.splice(Math.floor(Math.random() * p.length), 1)[0]); return o; };
const img = (key, cls) => `<img class="${cls}" src="assets/img/${key}.jpg" alt="" loading="lazy" onerror="this.style.display='none'">`;
function show(name) { Object.values(screens).forEach((el) => el.classList.add('hidden')); screens[name].classList.remove('hidden'); }
async function lockLandscape() { // best-effort (works in installed PWA / supported browsers)
  try { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); } catch {}
  try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch {}
}

// ---- Persistent unlocks (localStorage) ------------------------------------
function loadUnlocks() { try { return JSON.parse(localStorage.getItem('dc_unlocks')) || {}; } catch { return {}; } }
function saveUnlocks(u) { try { localStorage.setItem('dc_unlocks', JSON.stringify(u)); } catch {} }
function classUnlocks(classId) {
  const all = loadUnlocks();
  if (!all[classId]) {
    all[classId] = {};
    for (const slot of SLOTS) all[classId][slot] = [slotOptions(classId, slot)[0].id];
    saveUnlocks(all);
  }
  for (const slot of SLOTS) if (!all[classId][slot]) { all[classId][slot] = [slotOptions(classId, slot)[0].id]; saveUnlocks(all); }
  return all[classId];
}
function unlockRandom(classId) {
  const all = loadUnlocks(); const u = all[classId] || classUnlocks(classId);
  const locked = [];
  for (const slot of SLOTS) for (const piece of slotOptions(classId, slot)) if (!u[slot].includes(piece.id)) locked.push({ slot, piece });
  if (!locked.length) return null;
  const pick = locked[Math.floor(Math.random() * locked.length)];
  u[pick.slot].push(pick.piece.id); all[classId] = u; saveUnlocks(all);
  return pick.piece.name;
}

// ---- Class + loadout selection --------------------------------------------
function classSelect() {
  sel = { classId: null, subclass: null, weapon: null, trinket: null };
  $('#class-cards').innerHTML = Object.values(CLASSES).map((cl) => `
    <button class="classcard" data-id="${cl.id}">
      ${img(cl.img, 'class-art')}<span class="cname">${cl.name}</span>
      <span class="cdesc">${cl.desc}</span>
      <span class="cstat">❤️${cl.hp} ⚡${cl.energy}${cl.arcane ? ` ${cl.chargeIcon}${cl.arcane}` : ''}</span>
    </button>`).join('');
  $('#class-cards').querySelectorAll('.classcard').forEach((b) => (b.onclick = () => { sel.classId = b.dataset.id; loadoutScreen(); }));
  show('class');
}

const SLOT_LABEL = { subclass: 'Subclass', weapon: 'Weapon', trinket: 'Trinket', bag: 'Bag item' };
function loadoutScreen() {
  const u = classUnlocks(sel.classId);
  const slotHtml = (slot) => {
    const opts = slotOptions(sel.classId, slot).filter((p) => u[slot].includes(p.id));
    if (!sel[slot]) sel[slot] = opts[0].id;
    return `<h3>${SLOT_LABEL[slot]}</h3><div class="loadout-row" data-slot="${slot}">` + opts.map((p) => `
      <button class="loadcard ${sel[slot] === p.id ? 'selected' : ''}" data-slot="${slot}" data-id="${p.id}">
        ${img(p.img, 'load-art')}<span class="lc-text"><b>${p.name}</b><small>${p.desc}</small></span></button>`).join('') + `</div>`;
  };
  $('#loadout-title').textContent = `${CLASSES[sel.classId].name} — build your loadout`;
  $('#loadout-body').innerHTML = SLOTS.map(slotHtml).join('');
  $('#loadout-body').querySelectorAll('.loadcard').forEach((b) => (b.onclick = () => {
    sel[b.dataset.slot] = b.dataset.id;
    b.parentElement.querySelectorAll('.loadcard').forEach((x) => x.classList.toggle('selected', x === b));
  }));
  $('#loadout-start').disabled = false;
  $('#loadout-start').onclick = startRun;
  show('loadout');
}

function gearPiece(classId, slot, id) { return LOADOUT[classId][slot].find((p) => p.id === id); }

function startRun() {
  const cl = CLASSES[sel.classId];
  const parts = [gearPiece(sel.classId, 'subclass', sel.subclass), gearPiece(sel.classId, 'weapon', sel.weapon), gearPiece(sel.classId, 'trinket', sel.trinket)];
  const deck = [...cl.base];
  let hp = cl.hp, energy = cl.energy, arcane = cl.arcane;
  for (const p of parts) { deck.push(...p.cards); hp += p.mods.hp || 0; energy += p.mods.energy || 0; arcane += p.mods.arcane || 0; }
  run = { classId: cl.id, bag: sel.bag, deck, maxHp: hp, hp, maxEnergy: energy, maxArcane: arcane, gold: 0, map: genMap(), curNode: null, visited: new Set() };
  renderMap(); show('map');
}

// ---- Branching map ---------------------------------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ROOM_ICON = { battle: '⚔️', elite: '💀', rest: '🔥', treasure: '🎁', shop: '🛒', boss: '🐲' };
function nodeType(r, rows, i) {
  if (r === 0) return 'battle';
  if (r === rows - 1) return 'boss';
  if (r === rows - 2) return i === 0 ? 'rest' : 'battle';
  const x = Math.random();
  if (r >= 3 && x < 0.14) return 'elite';
  if (x < 0.22) return 'treasure';
  if (x < 0.34) return 'shop';
  if (x < 0.48) return 'rest';
  return 'battle';
}
function genMap() {
  const ROWS = 8, rows = [];
  for (let r = 0; r < ROWS; r++) {
    const count = r === 0 ? 2 : r === ROWS - 1 ? 1 : 2 + (Math.random() < 0.5 ? 1 : 0);
    const row = [];
    for (let i = 0; i < count; i++) {
      const type = nodeType(r, ROWS, i);
      const node = { row: r, i, type, next: [] };
      if (type === 'battle') {
        node.enemies = sample(COMMON_ENEMIES, 1 + (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.25 ? 1 : 0));
        if (r >= 2 && Math.random() < 0.25) node.ambush = sample(COMMON_ENEMIES, 1);
      } else if (type === 'elite') node.enemies = ELITE_GROUPS[Math.floor(Math.random() * ELITE_GROUPS.length)];
      else if (type === 'boss') node.enemies = ['lich'];
      row.push(node);
    }
    rows.push(row);
  }
  for (let r = 0; r < ROWS - 1; r++) {
    const cur = rows[r], nxt = rows[r + 1];
    cur.forEach((node, idx) => {
      const center = cur.length === 1 ? (nxt.length - 1) / 2 : (idx * (nxt.length - 1)) / (cur.length - 1);
      const a = clamp(Math.round(center), 0, nxt.length - 1); const set = new Set([a]);
      if (Math.random() < 0.5) set.add(clamp(a + (Math.random() < 0.5 ? -1 : 1), 0, nxt.length - 1));
      node.next = [...set];
    });
    nxt.forEach((_, j) => { if (!cur.some((n) => n.next.includes(j))) { const from = clamp(Math.round((j * (cur.length - 1)) / Math.max(1, nxt.length - 1)), 0, cur.length - 1); if (!cur[from].next.includes(j)) cur[from].next.push(j); } });
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
  $('#map-gold').textContent = `🪙 ${run.gold}`;
  $('#map-deck').textContent = `🃏 ${run.deck.length}`;
  const avail = new Set(availableNodes().map((n) => `${n.row}-${n.i}`));
  const cont = $('#map-rooms');
  cont.innerHTML = '<svg id="map-edges"></svg>' + run.map.map((row) => `<div class="map-row">${row.map((n) => {
    const id = `${n.row}-${n.i}`; const state = run.visited.has(id) ? 'done' : avail.has(id) ? 'avail' : 'locked';
    return `<button class="node ${n.type} ${state}" data-row="${n.row}" data-i="${n.i}" ${state === 'avail' ? '' : 'disabled'}><img class="node-img" src="assets/img/node_${n.type}.jpg" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'node-icon',textContent:'${ROOM_ICON[n.type]}'}))"></button>`;
  }).join('')}</div>`).join('');
  cont.querySelectorAll('.node.avail').forEach((b) => (b.onclick = () => enterRoom(run.map[+b.dataset.row][+b.dataset.i])));
  requestAnimationFrame(drawEdges);
}
function drawEdges() {
  const cont = $('#map-rooms'), svg = $('#map-edges'); if (!svg) return;
  const cr = cont.getBoundingClientRect(); svg.setAttribute('width', cont.clientWidth); svg.setAttribute('height', cont.scrollHeight);
  const center = (n) => { const el = cont.querySelector(`.node[data-row="${n.row}"][data-i="${n.i}"]`); const r = el.getBoundingClientRect(); return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2 }; };
  let lines = '';
  for (let r = 0; r < run.map.length - 1; r++) for (const node of run.map[r]) { const a = center(node); for (const j of node.next) { const b = center(run.map[r + 1][j]); const done = run.visited.has(`${node.row}-${node.i}`); lines += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${done ? '#e3c269' : '#3a2f4d'}" stroke-width="3"/>`; } }
  svg.innerHTML = lines;
}
function enterRoom(node) {
  run.curNode = node; run.visited.add(`${node.row}-${node.i}`);
  if (node.type === 'rest') return restRoom();
  if (node.type === 'treasure') return treasureRoom();
  if (node.type === 'shop') return shopRoom();
  startCombat(node.enemies, node.type, node.ambush || []);
}

// ---- Combat ----------------------------------------------------------------
function startCombat(enemyIds, roomType, ambush = []) { combat = createCombat(run, enemyIds, ambush); combat.roomType = roomType; renderCombat(); show('combat'); }
function bar(cur, max) { const pct = Math.max(0, Math.round((cur / max) * 100)); return `<div class="bar"><span style="width:${pct}%"></span><em>${Math.max(0, cur)}/${max}</em></div>`; }
function intentLabel(e) {
  if (e.stun > 0) return `<span class="intent stun">💫 stun</span>`;
  const m = e.intent || e.moves[0];
  if (m.type === 'buff') return `<span class="intent buf">🛡 +${m.value}</span>`;
  const hits = m.hits || [m.value]; const cls = hits.length > 1 ? 'intent rage' : 'intent';
  return `<span class="${cls}">${hits.map((h) => `⚔️${e.weak > 0 ? Math.floor(h * 0.7) : h}`).join(' ')}</span>`;
}
function eBadges(e) {
  let s = '';
  if (e.distant) s += `<span class="badge dist">🏹dist</span>`;
  if (e.armor > 0) s += `<span class="badge arm">🛡${e.armor}</span>`;
  if (e.dodge > 0) s += `<span class="badge dge">💨${e.dodge}</span>`;
  if (e.vulnerable > 0) s += `<span class="badge vul">🎯${e.vulnerable}</span>`;
  if (e.weak > 0) s += `<span class="badge wk">💧${e.weak}</span>`;
  if (e.poison > 0) s += `<span class="badge psn">☠${e.poison}</span>`;
  return s;
}
function renderCombat() {
  const c = combat, p = c.player;
  $('#enemy-area').innerHTML = c.enemies.map((e) => e.hp <= 0 ? '' : `
    <button class="enemy ${c.target === e.uid ? 'target' : ''}" data-uid="${e.uid}">
      <div class="intent-row">${intentLabel(e)}</div>
      <div class="enemy-stage">${img(e.img, 'enemy-art')}<div class="shadow"></div></div>
      <div class="enemy-name">${e.name}</div>${bar(e.hp, e.maxHp)}
      <div class="badges">${eBadges(e)}</div>
    </button>`).join('');
  $('#enemy-area').querySelectorAll('.enemy').forEach((b) => (b.onclick = () => { setTarget(c, +b.dataset.uid); renderCombat(); }));

  const cl = CLASSES[run.classId];
  $('#player-stats').innerHTML = `
    <div class="hero">${img(cl.img, 'hero-portrait')}</div>
    <div class="hero-stats">
      <div class="pstat">❤️ ${bar(p.hp, p.maxHp)}</div>
      <div class="pbadges">
        <span class="energy">⚡ ${p.energy}/${p.maxEnergy}</span>
        ${p.maxArcane > 0 ? `<span class="badge arc">${cl.chargeIcon || '🔮'} ${p.arcane}/${p.maxArcane}</span>` : ''}
        ${c.chain > 0 ? `<span class="badge cmb">🔗${c.chain}</span>` : ''}
        ${p.block > 0 ? `<span class="badge blk">🛡${p.block}</span>` : ''}
        ${p.dodge > 0 ? `<span class="badge dge">💨${p.dodge}</span>` : ''}
        ${p.poison > 0 ? `<span class="badge psn">☠${p.poison}</span>` : ''}
        ${p.weak > 0 ? `<span class="badge wk">💧${p.weak}</span>` : ''}
      </div>
    </div>`;

  const mul = $('#mulligan');
  if (canMulligan(c)) { mul.classList.remove('hidden'); mul.onclick = () => { mulligan(c); renderCombat(); }; } else mul.classList.add('hidden');
  const bagBtn = $('#bag');
  if (c.bag) { bagBtn.classList.remove('hidden'); bagBtn.textContent = `${c.bag.name} (${c.bagCharges})`; bagBtn.disabled = !canUseBag(c); bagBtn.onclick = () => { useBag(c); renderCombat(); }; }
  else bagBtn.classList.add('hidden');
  $('#phase-btn').textContent = 'End Turn ▶';
  $('#phase-btn').onclick = () => { endTurn(c); renderCombat(); };

  $('#hand').innerHTML = c.hand.map((id, i) => {
    const card = CARDS[id]; const ok = canPlay(c, i);
    const costTxt = card.arcaneCost ? `${card.cost}+${card.arcaneCost}${cl.chargeIcon || '🔮'}` : card.cost;
    return `<button class="card ${card.type} ${ok ? '' : 'unplayable'}" data-i="${i}">
      <span class="cost">${costTxt}</span>${card.range === 'ranged' ? '<span class="rng">🏹</span>' : ''}
      ${img(card.img, 'card-art')}<span class="cname">${card.name}</span><span class="cdesc">${card.desc}</span></button>`;
  }).join('');
  $('#hand').querySelectorAll('.card').forEach((b) => (b.onclick = () => { if (canPlay(c, +b.dataset.i)) { playCard(c, +b.dataset.i); renderCombat(); } }));

  $('#draw-count').textContent = c.drawPile.length;
  $('#discard-count').textContent = c.discardPile.length;
  if (c.over) setTimeout(endCombat, 400);
}
function endCombat() {
  if (!combat.won) return gameOver();
  run.hp = combat.player.hp;
  const t = combat.roomType;
  const gold = (t === 'boss' ? 40 : t === 'elite' ? 22 : 8) + Math.floor(Math.random() * 6);
  run.gold += gold;
  if (t === 'boss') { unlockRandom(run.classId); return victory(); }
  const heal = t === 'elite' ? 12 : 5;
  run.hp = Math.min(run.maxHp, run.hp + heal);
  let msg = `Victory! +${heal} HP, +${gold} 🪙.`;
  if (t === 'elite') { const u = unlockRandom(run.classId); if (u) msg += ` Unlocked: ${u}!`; }
  $('#event-icon').textContent = '⚔️'; $('#event-title').textContent = 'Battle won';
  $('#event-text').textContent = msg; $('#event-cards').innerHTML = '';
  $('#event-continue').classList.remove('hidden'); show('event');
}

// ---- Shop ------------------------------------------------------------------
function shopRoom() {
  const offers = [
    { name: 'Heal 25 HP', cost: 25, act: () => { run.hp = Math.min(run.maxHp, run.hp + 25); } },
    { name: '+8 Max HP', cost: 35, act: () => { run.maxHp += 8; run.hp += 8; } },
    { name: 'Unlock gear', cost: 45, act: () => { const u = unlockRandom(run.classId); return u ? `Unlocked ${u}` : 'All gear already unlocked'; } },
  ];
  $('#event-icon').textContent = '🛒'; $('#event-title').textContent = 'Shop';
  $('#event-text').textContent = `You have 🪙 ${run.gold}. Spend wisely.`;
  $('#event-cards').innerHTML = offers.map((o, i) => `<button class="loadcard buy" data-i="${i}" ${run.gold < o.cost ? 'disabled' : ''}><b>${o.name}</b><small>🪙 ${o.cost}</small></button>`).join('');
  $('#event-cards').querySelectorAll('.buy').forEach((b) => (b.onclick = () => {
    const o = offers[+b.dataset.i];
    if (run.gold < o.cost) return;
    run.gold -= o.cost; const r = o.act();
    $('#event-text').textContent = `${r || 'Done'}. 🪙 ${run.gold} left.`;
    shopRefresh(offers);
  }));
  $('#event-continue').classList.remove('hidden'); show('event');
}
function shopRefresh(offers) {
  $('#event-cards').querySelectorAll('.buy').forEach((b) => { b.disabled = run.gold < offers[+b.dataset.i].cost; });
}

// ---- Events ----------------------------------------------------------------
function restRoom() {
  const heal = Math.round(run.maxHp * 0.3); run.hp = Math.min(run.maxHp, run.hp + heal);
  $('#event-icon').textContent = '🔥'; $('#event-title').textContent = 'Rest';
  $('#event-text').textContent = `You rest and recover ${heal} HP. (❤️ ${run.hp}/${run.maxHp})`;
  $('#event-cards').innerHTML = ''; $('#event-continue').classList.remove('hidden'); show('event');
}
function treasureRoom() {
  const u = unlockRandom(run.classId);
  $('#event-icon').textContent = '🎁'; $('#event-title').textContent = 'Treasure';
  $('#event-text').textContent = u ? `You found new gear! Unlocked: ${u} (use it in your next run).` : 'You found a small cache. (All gear already unlocked.)';
  run.hp = Math.min(run.maxHp, run.hp + 4);
  $('#event-cards').innerHTML = ''; $('#event-continue').classList.remove('hidden'); show('event');
}
function afterRoom() { renderMap(); show('map'); }
function gameOver() {
  $('#end-emoji').textContent = '☠️'; $('#end-title').textContent = 'You fell in the dungeon';
  $('#end-text').textContent = `You reached depth ${(run.curNode ? run.curNode.row + 1 : 0)}/${run.map.length}. The run is over.`;
  show('end');
}
function victory() {
  $('#end-emoji').textContent = '👑'; $('#end-title').textContent = 'You slew the Lich Lord!';
  $('#end-text').textContent = 'You conquered the dungeon. New gear unlocked for future runs!';
  show('end');
}

// ---- Wiring ----------------------------------------------------------------
function wire() {
  for (const n of ['title', 'class', 'loadout', 'map', 'combat', 'event', 'end']) screens[n] = $('#screen-' + n);
  $('#btn-start').onclick = async () => { music.start(); await lockLandscape(); classSelect(); };
  $('#event-continue').onclick = afterRoom;
  $('#btn-restart').onclick = classSelect;
  $('#mute').onclick = () => { $('#mute').textContent = music.toggle() ? '🔊' : '🔇'; };
}
wire(); show('title');

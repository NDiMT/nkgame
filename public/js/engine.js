// ============================================================================
// Combat engine — Card Quest model.
//  • One shared Energy pool for attack AND defense (refills at turn start).
//  • Single player turn → End Turn → enemies act vs your prepared defenses.
//  • Multiple enemies, telegraphed intents, targeting + AOE.
//  • Statuses: enemy stun/weak/vulnerable/poison/armor/dodge; player block/dodge/
//    poison/weak. Distance: melee can't hit Distant enemies.
//  • Bag item with per-battle charges. Ambush waves. Chains + chainbreakers.
// ============================================================================
import { CARDS, ENEMIES, BAGS } from './data.js';

const HAND_LIMIT = 5;
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function makeEnemy(id, uid) {
  const d = ENEMIES[id];
  const hp = rand(d.hp[0], d.hp[1]);
  return { uid, id, name: d.name, img: d.img, hp, maxHp: hp, dodge: d.dodge || 0, armor: d.armor || 0,
    distant: !!d.distant, stun: 0, weak: 0, vulnerable: 0, poison: 0, moves: d.moves, intent: null };
}

export function createCombat(run, enemyIds, ambush = []) {
  const enemies = enemyIds.map((id, idx) => makeEnemy(id, idx));
  const bag = run.bag ? BAGS[run.bag] : null;
  const c = {
    player: { hp: run.hp, maxHp: run.maxHp, energy: run.maxEnergy, maxEnergy: run.maxEnergy,
      arcane: 0, maxArcane: run.maxArcane || 0, block: 0, dodge: 0, poison: 0, weak: 0 },
    enemies,
    bag, bagCharges: bag ? bag.charges : 0,
    ambush: [...ambush], nextUid: enemies.length,
    chain: 0, round: 1, mulliganUsed: false,
    drawPile: shuffle([...run.deck]), hand: [], discardPile: [],
    target: 0, log: [], over: false, won: false,
  };
  rollIntents(c); fill(c);
  return c;
}

function draw(c, n) {
  for (let i = 0; i < n; i++) {
    if (c.hand.length >= HAND_LIMIT) break;
    if (!c.drawPile.length) { if (!c.discardPile.length) break; c.drawPile = shuffle(c.discardPile); c.discardPile = []; }
    c.hand.push(c.drawPile.pop());
  }
}
const fill = (c) => draw(c, HAND_LIMIT - c.hand.length);
const alive = (c) => c.enemies.filter((e) => e.hp > 0);

function rollIntents(c) { for (const e of c.enemies) e.intent = e.hp <= 0 ? null : e.moves[Math.floor(Math.random() * e.moves.length)]; }

export function canMulligan(c) { return c.round === 1 && !c.mulliganUsed && c.player.energy >= 1; }
export function mulligan(c) { if (!canMulligan(c)) return; c.discardPile.push(...c.hand); c.hand = []; c.player.energy -= 1; c.mulliganUsed = true; fill(c); }

const firstAlive = (c) => { const a = alive(c); return a.length ? a[0].uid : -1; };
function targetEnemy(c) { let e = c.enemies[c.target]; if (!e || e.hp <= 0) { c.target = firstAlive(c); e = c.enemies[c.target]; } return e; }
export function setTarget(c, uid) { if (c.enemies[uid] && c.enemies[uid].hp > 0) c.target = uid; }

function pAtk(c, v) { return c.player.weak > 0 ? Math.floor(v * 0.7) : v; } // player Weak reduces damage dealt

function hitEnemy(c, e, amount, { ignoreDodge, ranged } = {}) {
  if (!e || e.hp <= 0 || amount <= 0) return;
  if (e.distant && !ranged) { c.log.push(`${e.name} is Distant — melee misses`); return; }
  if (!ignoreDodge && e.dodge > 0) { e.dodge--; c.log.push(`${e.name} dodged`); return; }
  let dmg = amount;
  if (e.vulnerable > 0) dmg = Math.ceil(dmg * 1.5);
  const blocked = Math.min(e.armor, dmg); e.armor -= blocked; dmg -= blocked;
  e.hp -= dmg; if (e.hp <= 0) { e.hp = 0; e.intent = null; }
}

function applyEffects(c, list, card) {
  const p = c.player; const tgt = () => targetEnemy(c); const ranged = !card || card.range === 'ranged' || card.bag;
  for (const e of list) {
    switch (e.op) {
      case 'damage': hitEnemy(c, tgt(), pAtk(c, e.value), { ignoreDodge: e.ignoreDodge, ranged }); break;
      case 'damageAll': for (const en of alive(c)) hitEnemy(c, en, pAtk(c, e.value), { ignoreDodge: e.ignoreDodge, ranged }); break;
      case 'chainDamage': hitEnemy(c, tgt(), pAtk(c, e.base + e.per * c.chain), { ranged }); break;
      case 'poisonDamage': { const t = tgt(); hitEnemy(c, t, pAtk(c, e.base + e.per * (t ? t.poison : 0)), { ranged }); } break;
      case 'block': p.block += e.value; break;
      case 'dodge': p.dodge += e.value; break;
      case 'draw': draw(c, e.value); break;
      case 'energy': p.energy += e.value; break;
      case 'arcane': p.arcane = Math.min(p.maxArcane, p.arcane + e.value); break;
      case 'heal': p.hp = Math.min(p.maxHp, p.hp + e.value); break;
      case 'cleanse': p.poison = 0; p.weak = 0; break;
      case 'stun': { const t = tgt(); if (t) t.stun += e.value; } break;
      case 'stunAll': for (const en of alive(c)) en.stun += e.value; break;
      case 'weak': { const t = tgt(); if (t) t.weak += e.value; } break;
      case 'vulnerable': { const t = tgt(); if (t) t.vulnerable += e.value; } break;
      case 'poison': { const t = tgt(); if (t) t.poison += e.value; } break;
      case 'poisonAll': for (const en of alive(c)) en.poison += e.value; break;
    }
  }
}

export function canPlay(c, i) {
  const card = CARDS[c.hand[i]];
  if (!card || c.over) return false;
  if (card.cost > c.player.energy) return false;
  if (card.arcaneCost && card.arcaneCost > c.player.arcane) return false;
  return true;
}

export function playCard(c, i) {
  if (!canPlay(c, i)) return { ok: false };
  const card = CARDS[c.hand[i]]; c.hand.splice(i, 1);
  const inChain = c.chain >= 1;
  applyEffects(c, card.effects, card);
  if (inChain && card.chain) applyEffects(c, card.chain, card);
  if (card.cost) c.player.energy -= card.cost;
  if (card.arcaneCost) c.player.arcane -= card.arcaneCost;
  c.chain = card.chainbreaker ? 0 : c.chain + 1;
  c.discardPile.push(card.id);
  checkWave(c);
  return { ok: true };
}

export function canUseBag(c) { return c.bag && c.bagCharges > 0 && !c.over; }
export function useBag(c) {
  if (!canUseBag(c)) return { ok: false };
  applyEffects(c, c.bag.effects, { bag: true }); // bag effects are free, ranged, don't touch the chain
  c.bagCharges--;
  checkWave(c);
  return { ok: true };
}

// All enemies down? Spawn the next ambush wave, or win.
function checkWave(c) {
  if (alive(c).length > 0) return;
  if (c.ambush.length) {
    const id = c.ambush.shift();
    const e = makeEnemy(id, c.nextUid++);
    e.intent = e.moves[Math.floor(Math.random() * e.moves.length)];
    c.enemies.push(e); c.target = e.uid; c.log.push(`Ambush! ${e.name} appears`);
    return;
  }
  c.over = true; c.won = true;
}

export function endTurn(c) {
  if (c.over) return;
  const p = c.player;
  c.discardPile.push(...c.hand); c.hand = [];

  for (const e of c.enemies) {
    if (e.hp <= 0) continue;
    if (e.poison > 0) { e.hp -= e.poison; e.poison--; if (e.hp <= 0) { e.hp = 0; continue; } }
    if (e.stun > 0) { e.stun--; continue; }
    const m = e.intent || e.moves[0];
    if (m.type === 'buff') { e.armor += m.value; }
    else { // attack / attack_status
      const hits = m.hits || [m.value];
      for (let dmg of hits) {
        if (e.weak > 0) dmg = Math.floor(dmg * 0.7);
        if (p.dodge > 0) { p.dodge--; continue; }
        const blk = Math.min(p.block, dmg); p.block -= blk; p.hp -= dmg - blk;
      }
      if (m.type === 'attack_status' && p.hp > 0) {
        if (m.status === 'poison') p.poison += m.amount;
        if (m.status === 'weak') p.weak += m.amount;
      }
    }
    if (e.weak > 0) e.weak--;
    if (e.vulnerable > 0) e.vulnerable--;
    if (p.hp <= 0) { p.hp = 0; c.over = true; c.won = false; return; }
  }
  if (alive(c).length === 0) { checkWave(c); if (c.over) return; }

  // Start next turn.
  if (p.poison > 0) { p.hp -= p.poison; p.poison--; if (p.hp <= 0) { p.hp = 0; c.over = true; c.won = false; return; } }
  if (p.weak > 0) p.weak--;
  p.energy = p.maxEnergy; p.block = 0; p.dodge = 0; c.chain = 0; c.round++;
  if (c.target < 0 || !c.enemies[c.target] || c.enemies[c.target].hp <= 0) c.target = firstAlive(c);
  rollIntents(c); fill(c);
}

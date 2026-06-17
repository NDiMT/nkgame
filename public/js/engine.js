// ============================================================================
// Combat engine — faithful to Card Quest:
//  • One shared resource (Energy) pays for BOTH attack and defense. No free
//    defense. Energy refills at the start of your turn only.
//  • Single player turn: play attacks/defense/utility, prepare block/dodge/
//    stuns, then End Turn → enemies act against what you prepared.
//  • Multiple enemies with telegraphed intents; targeting + AOE.
//  • Statuses: enemy stun / weak / vulnerable / poison; player block / dodge.
//  • Distance: melee cards can't hit Distant enemies (use ranged).
//  • Chains: consecutive non-chainbreaker cards grant bonuses (draw/energy).
// ============================================================================
import { CARDS, ENEMIES } from './data.js';

const HAND_LIMIT = 5;
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function createCombat(run, enemyIds) {
  const enemies = enemyIds.map((id, idx) => {
    const d = ENEMIES[id];
    const hp = rand(d.hp[0], d.hp[1]);
    return {
      uid: idx, id, name: d.name, img: d.img, hp, maxHp: hp,
      dodge: d.dodge || 0, armor: d.armor || 0, distant: !!d.distant,
      stun: 0, weak: 0, vulnerable: 0, poison: 0,
      moves: d.moves, intent: null,
    };
  });
  const c = {
    player: { hp: run.hp, maxHp: run.maxHp, energy: run.maxEnergy, maxEnergy: run.maxEnergy,
      arcane: 0, maxArcane: run.maxArcane || 0, block: 0, dodge: 0 },
    enemies,
    chain: 0, round: 1, mulliganUsed: false,
    drawPile: shuffle([...run.deck]), hand: [], discardPile: [],
    target: 0, log: [], over: false, won: false,
  };
  rollIntents(c);
  fill(c);
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

function rollIntents(c) {
  for (const e of c.enemies) {
    if (e.hp <= 0) { e.intent = null; continue; }
    e.intent = e.moves[Math.floor(Math.random() * e.moves.length)];
  }
}

export function canMulligan(c) { return c.round === 1 && !c.mulliganUsed && c.player.energy >= 1; }
export function mulligan(c) {
  if (!canMulligan(c)) return;
  c.discardPile.push(...c.hand); c.hand = []; c.player.energy -= 1; c.mulliganUsed = true; fill(c);
}

function firstAliveTarget(c) { const a = alive(c); return a.length ? a[0].uid : -1; }
function targetEnemy(c) {
  let e = c.enemies[c.target];
  if (!e || e.hp <= 0) { const u = firstAliveTarget(c); c.target = u; e = c.enemies[u]; }
  return e;
}

function hitEnemy(c, e, amount, { ignoreDodge, ranged } = {}) {
  if (!e || e.hp <= 0 || amount <= 0) return;
  if (e.distant && !ranged) { c.log.push(`${e.name} is Distant — melee misses`); return; }
  if (!ignoreDodge && e.dodge > 0) { e.dodge--; c.log.push(`${e.name} dodged`); return; }
  let dmg = amount;
  if (e.vulnerable > 0) dmg = Math.ceil(dmg * 1.5);
  const blocked = Math.min(e.armor, dmg); e.armor -= blocked; dmg -= blocked;
  e.hp -= dmg;
  if (e.hp <= 0) { e.hp = 0; e.intent = null; }
}

function applyEffects(c, list, card) {
  const p = c.player;
  const tgt = () => targetEnemy(c);
  const ranged = card && card.range === 'ranged';
  for (const e of list) {
    switch (e.op) {
      case 'damage': hitEnemy(c, tgt(), e.value, { ignoreDodge: e.ignoreDodge, ranged }); break;
      case 'damageAll': for (const en of alive(c)) hitEnemy(c, en, e.value, { ignoreDodge: e.ignoreDodge, ranged }); break;
      case 'chainDamage': hitEnemy(c, tgt(), e.base + e.per * c.chain, { ranged }); break;
      case 'poisonDamage': { const t = tgt(); hitEnemy(c, t, e.base + e.per * (t ? t.poison : 0), { ranged }); } break;
      case 'block': p.block += e.value; break;
      case 'dodge': p.dodge += e.value; break;
      case 'draw': draw(c, e.value); break;
      case 'energy': p.energy += e.value; break;
      case 'arcane': p.arcane = Math.min(p.maxArcane, p.arcane + e.value); break;
      case 'heal': p.hp = Math.min(p.maxHp, p.hp + e.value); break;
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

export function setTarget(c, uid) { if (c.enemies[uid] && c.enemies[uid].hp > 0) c.target = uid; }

export function playCard(c, i) {
  if (!canPlay(c, i)) return { ok: false };
  const card = CARDS[c.hand[i]];
  c.hand.splice(i, 1);
  const inChain = c.chain >= 1;
  applyEffects(c, card.effects, card);
  if (inChain && card.chain) applyEffects(c, card.chain, card);
  if (card.cost) c.player.energy -= card.cost;
  if (card.arcaneCost) c.player.arcane -= card.arcaneCost;
  c.chain = card.chainbreaker ? 0 : c.chain + 1;
  c.discardPile.push(card.id);
  if (alive(c).length === 0) { c.over = true; c.won = true; }
  return { ok: true };
}

// End your turn → enemies act against your prepared defenses.
export function endTurn(c) {
  if (c.over) return;
  const p = c.player;
  c.discardPile.push(...c.hand); c.hand = [];

  for (const e of c.enemies) {
    if (e.hp <= 0) continue;
    if (e.poison > 0) { e.hp -= e.poison; e.poison--; if (e.hp <= 0) { e.hp = 0; continue; } }
    if (e.stun > 0) { e.stun--; continue; } // stunned: skip turn
    const m = e.intent || e.moves[0];
    if (m.type === 'attack' || m.type === 'attack_status') {
      const hits = m.hits || [m.value];
      for (let dmg of hits) {
        if (e.weak > 0) dmg = Math.floor(dmg * 0.7);
        if (p.dodge > 0) { p.dodge--; continue; }
        const blk = Math.min(p.block, dmg); p.block -= blk; p.hp -= dmg - blk;
      }
      if (m.type === 'attack_status' && p.hp > 0) {
        // (player debuffs could go here; kept minimal)
      }
    } else if (m.type === 'buff') {
      e.armor += m.value;
    }
    if (e.weak > 0) e.weak--;
    if (e.vulnerable > 0) e.vulnerable--;
    if (p.hp <= 0) { p.hp = 0; c.over = true; c.won = false; return; }
  }
  if (alive(c).length === 0) { c.over = true; c.won = true; return; }

  // Start your next turn.
  p.energy = p.maxEnergy; p.block = 0; p.dodge = 0; c.chain = 0; c.round++;
  if (c.target < 0 || !c.enemies[c.target] || c.enemies[c.target].hp <= 0) c.target = firstAliveTarget(c);
  rollIntents(c);
  fill(c);
}

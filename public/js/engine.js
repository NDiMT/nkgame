// Card Quest-faithful combat:
//  Attack phase — spend stamina, CHAIN cards (consecutive non-chainbreakers) for
//  bonuses (draw / stamina refund) to cycle your deck; chainbreakers reset it.
//  Defense phase — answer the enemy's telegraphed hits with Block/Dodge/Parry,
//  then stamina recharges. 5-card hand, Mulligan on the opening hand.

import { CARDS, ENEMIES } from './data.js';

const HAND_LIMIT = 5;
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickPlan = (e) => e.plans[Math.floor(Math.random() * e.plans.length)];

export function createCombat(run, enemyId) {
  const def = ENEMIES[enemyId];
  const hp = rand(def.hp[0], def.hp[1]);
  const c = {
    player: { hp: run.hp, maxHp: run.maxHp, stamina: 3, maxStamina: 3, block: 0, dodge: 0, counter: 0 },
    enemy: { id: enemyId, name: def.name, img: def.img, hp, maxHp: hp, dodge: def.dodge, maxDodge: def.dodge, plans: def.plans, plan: pickPlan(def) },
    phase: 'attack',
    chain: 0,
    round: 1,
    mulliganUsed: false,
    drawPile: shuffle([...run.deck]),
    hand: [],
    discardPile: [],
    incoming: null,
    log: [],
    over: false,
    won: false,
  };
  fill(c);
  return c;
}

function draw(c, n) {
  for (let i = 0; i < n; i++) {
    if (c.hand.length >= HAND_LIMIT) break;
    if (!c.drawPile.length) {
      if (!c.discardPile.length) break;
      c.drawPile = shuffle(c.discardPile);
      c.discardPile = [];
    }
    c.hand.push(c.drawPile.pop());
  }
}
const fill = (c) => draw(c, HAND_LIMIT - c.hand.length);

export function canMulligan(c) {
  return c.phase === 'attack' && c.round === 1 && !c.mulliganUsed && c.player.stamina >= 1;
}
export function mulligan(c) {
  if (!canMulligan(c)) return;
  c.discardPile.push(...c.hand);
  c.hand = [];
  c.player.stamina -= 1;
  c.mulliganUsed = true;
  fill(c);
}

function dealToEnemy(c, amount, ignoreDodge) {
  if (amount <= 0) return;
  if (!ignoreDodge && c.enemy.dodge > 0) { c.enemy.dodge--; c.log.push('Enemy dodged!'); return; }
  c.enemy.hp -= amount;
  if (c.enemy.hp <= 0) { c.enemy.hp = 0; c.over = true; c.won = true; }
}

function applyEffects(c, list) {
  const p = c.player;
  for (const e of list) {
    switch (e.op) {
      case 'damage': dealToEnemy(c, e.value, e.ignoreDodge); break;
      case 'chainDamage': dealToEnemy(c, e.base + e.per * c.chain); break;
      case 'block': p.block += e.value; break;
      case 'dodge': p.dodge += e.value; break;
      case 'counter': p.counter += e.value; break;
      case 'draw': draw(c, e.value); break;
      case 'stamina': p.stamina += e.value; break;
      case 'heal': p.hp = Math.min(p.maxHp, p.hp + e.value); break;
    }
  }
}

export function canPlay(c, i) {
  const card = CARDS[c.hand[i]];
  if (!card || c.over) return false;
  if (c.phase === 'attack') return (card.use === 'attack' || card.use === 'utility') && card.cost <= c.player.stamina;
  return card.use === 'defense';
}

export function playCard(c, i) {
  if (!canPlay(c, i)) return { ok: false };
  const card = CARDS[c.hand[i]];
  // Remove from hand first so chain-draws can refill the freed slot.
  c.hand.splice(i, 1);

  if (c.phase === 'attack') {
    const inChain = c.chain >= 1;
    applyEffects(c, card.effects); // chainDamage reads the chain built so far
    if (inChain && card.chain) applyEffects(c, card.chain);
    if (card.cost) c.player.stamina -= card.cost;
    c.chain = card.chainbreaker ? 0 : c.chain + 1;
  } else {
    applyEffects(c, card.effects);
  }
  c.discardPile.push(card.id);
  return { ok: true };
}

export function toDefense(c) {
  if (c.over || c.phase !== 'attack') return;
  c.phase = 'defense';
  c.chain = 0;
  c.incoming = [...c.enemy.plan.hits];
}

export function resolveDefense(c) {
  if (c.over || c.phase !== 'defense') return;
  const p = c.player;
  for (const hit of c.incoming) {
    if (p.dodge > 0) { p.dodge--; continue; }
    const blocked = Math.min(p.block, hit);
    p.block -= blocked;
    p.hp -= hit - blocked;
  }
  if (p.counter > 0) dealToEnemy(c, p.counter, true);
  c.incoming = null;
  if (p.hp <= 0) { p.hp = 0; c.over = true; c.won = false; return; }
  if (c.over) return;
  endRound(c);
}

function endRound(c) {
  const p = c.player;
  c.discardPile.push(...c.hand);
  c.hand = [];
  p.stamina = p.maxStamina;
  p.block = 0;
  p.dodge = 0;
  p.counter = 0;
  c.chain = 0;
  c.round++;
  c.enemy.dodge = c.enemy.maxDodge;
  c.enemy.plan = pickPlan(c.enemy);
  c.phase = 'attack';
  fill(c);
}

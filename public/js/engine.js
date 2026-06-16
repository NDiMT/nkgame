// Card Quest-style combat: attack phase (spend stamina, chain cards for combos)
// → defense phase (play defense cards to answer the enemy's telegraphed hits)
// → round end (stamina recharges). Enemies have Dodge charges that eat hits.

import { CARDS, ENEMIES } from './data.js';

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickPlan = (e) => e.plans[Math.floor(Math.random() * e.plans.length)];

export function createCombat(run, enemyId) {
  const def = ENEMIES[enemyId];
  const hp = rand(def.hp[0], def.hp[1]);
  const c = {
    player: { hp: run.hp, maxHp: run.maxHp, stamina: 3, maxStamina: 3, block: 0, combo: 0, dodge: 0, counter: 0 },
    enemy: { id: enemyId, name: def.name, img: def.img, hp, maxHp: hp, dodge: def.dodge, maxDodge: def.dodge, plans: def.plans, plan: null },
    phase: 'attack',
    drawPile: shuffle([...run.deck]),
    hand: [],
    discardPile: [],
    incoming: null,
    log: [],
    over: false,
    won: false,
  };
  c.enemy.plan = pickPlan(def);
  draw(c, 5);
  return c;
}

function draw(c, n) {
  for (let i = 0; i < n; i++) {
    if (!c.drawPile.length) {
      if (!c.discardPile.length) break;
      c.drawPile = shuffle(c.discardPile);
      c.discardPile = [];
    }
    c.hand.push(c.drawPile.pop());
  }
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
      case 'comboDamage': dealToEnemy(c, e.value * p.combo); break;
      case 'finisher': dealToEnemy(c, e.value * p.combo); p.combo = 0; break;
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
  if (c.phase === 'attack') return (card.use === 'attack' || card.use === 'skill') && card.cost <= c.player.stamina;
  return card.use === 'defense';
}

export function playCard(c, i) {
  if (!canPlay(c, i)) return { ok: false };
  const card = CARDS[c.hand[i]];
  if (card.use === 'attack') c.player.combo++;
  applyEffects(c, card.effects);
  if (card.chain && c.player.combo >= card.chain.combo) applyEffects(c, card.chain.effects);
  if (card.cost) c.player.stamina -= card.cost;
  c.hand.splice(i, 1);
  c.discardPile.push(card.id);
  return { ok: true };
}

// Attack → Defense: reveal the enemy's incoming hits.
export function toDefense(c) {
  if (c.over || c.phase !== 'attack') return;
  c.phase = 'defense';
  c.incoming = [...c.enemy.plan.hits];
}

// Resolve the enemy's hits against the player's block/dodge, apply counters.
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
  if (c.over) return; // counter may have killed the enemy
  endRound(c);
}

function endRound(c) {
  const p = c.player;
  c.discardPile.push(...c.hand);
  c.hand = [];
  p.stamina = p.maxStamina;
  p.combo = 0;
  p.block = 0;
  p.dodge = 0;
  p.counter = 0;
  c.enemy.dodge = c.enemy.maxDodge; // enemy dodge recharges each round
  c.enemy.plan = pickPlan(c.enemy);
  c.phase = 'attack';
  draw(c, 5);
}

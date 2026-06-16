// Turn-based card combat engine. Pure logic over a combat state object; the UI
// renders from this state and calls these functions on input.

import { CARDS, ENEMIES } from './data.js';

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export function createCombat(run, enemyIds) {
  const enemies = enemyIds.map((id) => {
    const def = ENEMIES[id];
    const hp = rand(def.hp[0], def.hp[1]);
    return { id, name: def.name, img: def.img, hp, maxHp: hp, block: 0, strength: 0, weak: 0, vulnerable: 0, moves: def.moves, intentIndex: Math.floor(Math.random() * def.moves.length) };
  });
  const c = {
    player: { hp: run.hp, maxHp: run.maxHp, block: 0, energy: 3, maxEnergy: 3, strength: 0, weak: 0, vulnerable: 0 },
    enemies,
    drawPile: shuffle([...run.deck]),
    hand: [],
    discardPile: [],
    log: [],
    over: false,
    won: false,
  };
  startPlayerTurn(c, true);
  return c;
}

export function startPlayerTurn(c, first = false) {
  c.player.block = 0;
  c.player.energy = c.player.maxEnergy;
  drawCards(c, 5);
  if (!first) c.log.push('— Ο γύρος σου —');
}

export function drawCards(c, n) {
  for (let i = 0; i < n; i++) {
    if (c.drawPile.length === 0) {
      if (c.discardPile.length === 0) break;
      c.drawPile = shuffle(c.discardPile);
      c.discardPile = [];
    }
    c.hand.push(c.drawPile.pop());
  }
}

function attack(attacker, defender, base) {
  let amt = base + (attacker.strength || 0);
  if (attacker.weak > 0) amt = Math.floor(amt * 0.75);
  if (defender.vulnerable > 0) amt = Math.ceil(amt * 1.5);
  amt = Math.max(0, amt);
  const blocked = Math.min(defender.block, amt);
  defender.block -= blocked;
  defender.hp -= amt - blocked;
  return amt;
}

const aliveEnemies = (c) => c.enemies.filter((e) => e.hp > 0);

// targetIndex indexes into c.enemies (alive ones). Returns {ok, reason}.
export function playCard(c, handIndex, targetIndex) {
  if (c.over || c.player.turn === 'enemy') return { ok: false };
  const cardId = c.hand[handIndex];
  const card = CARDS[cardId];
  if (!card) return { ok: false };
  if (card.cost > c.player.energy) return { ok: false, reason: 'energy' };

  const enemies = c.enemies;
  let target = enemies[targetIndex];
  if (!target || target.hp <= 0) target = aliveEnemies(c)[0];

  for (const e of card.effects) {
    switch (e.op) {
      case 'damage':
        if (target && target.hp > 0) attack(c.player, target, e.value);
        break;
      case 'damageAll':
        for (const en of aliveEnemies(c)) attack(c.player, en, e.value);
        break;
      case 'block':
        c.player.block += e.value;
        break;
      case 'draw':
        drawCards(c, e.value);
        break;
      case 'strength':
        c.player.strength += e.value;
        break;
      case 'heal':
        c.player.hp = Math.min(c.player.maxHp, c.player.hp + e.value);
        break;
      case 'vulnerable':
        if (target && target.hp > 0) target.vulnerable += e.value;
        break;
      case 'weak':
        if (target && target.hp > 0) target.weak += e.value;
        break;
    }
  }

  c.player.energy -= card.cost;
  // remove from hand → discard
  c.hand.splice(handIndex, 1);
  c.discardPile.push(cardId);

  if (aliveEnemies(c).length === 0) {
    c.over = true;
    c.won = true;
  }
  return { ok: true };
}

export function endTurn(c) {
  if (c.over) return;
  // Player end-of-turn: discard hand, tick player debuffs.
  c.discardPile.push(...c.hand);
  c.hand = [];
  if (c.player.weak > 0) c.player.weak--;
  if (c.player.vulnerable > 0) c.player.vulnerable--;

  // Enemy phase.
  for (const e of c.enemies) {
    if (e.hp <= 0) continue;
    e.block = 0;
    const move = e.moves[e.intentIndex % e.moves.length];
    switch (move.type) {
      case 'attack':
        attack(e, c.player, move.value);
        break;
      case 'attack_debuff':
        attack(e, c.player, move.value);
        if (move.debuff === 'weak') c.player.weak += move.amount;
        if (move.debuff === 'vulnerable') c.player.vulnerable += move.amount;
        break;
      case 'block':
        e.block += move.value;
        break;
      case 'buff':
        e.strength += move.value;
        break;
    }
    e.intentIndex = (e.intentIndex + 1) % e.moves.length;
    if (e.weak > 0) e.weak--;
    if (e.vulnerable > 0) e.vulnerable--;
    if (c.player.hp <= 0) {
      c.player.hp = 0;
      c.over = true;
      c.won = false;
      return;
    }
  }
  startPlayerTurn(c);
}

// The move an enemy will perform next turn (for the intent display).
export function enemyIntent(e) {
  return e.moves[e.intentIndex % e.moves.length];
}

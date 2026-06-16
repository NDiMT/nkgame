// Game data (English) — faithful to Card Quest's combat:
//  • 5-card hand, stamina cost, Mulligan
//  • three card types: attack / defense / utility
//  • CHAINING: cards played consecutively form a chain; chain cards gain a bonus
//    (usually card draw / stamina refund) enabling long combo turns.
//    `chainbreaker` cards reset the chain.
//  • attack phase / defense phase; enemy Dodge eats hits; enemy Rage = multi-hit.
//
// Effect ops: damage, chainDamage(base,per), block, dodge, counter, draw,
//             stamina, heal

export const CARDS = {
  // --- attacks ---
  jab: { id: 'jab', name: 'Quick Jab', use: 'attack', cost: 1, type: 'attack', img: 'card_jab',
    desc: 'Deal 3.  Chain: draw 1.', effects: [{ op: 'damage', value: 3 }], chain: [{ op: 'draw', value: 1 }] },
  slash: { id: 'slash', name: 'Slash', use: 'attack', cost: 1, type: 'attack', img: 'card_slash',
    desc: 'Deal 6.', effects: [{ op: 'damage', value: 6 }] },
  combo: { id: 'combo', name: 'Combo Strike', use: 'attack', cost: 1, type: 'attack', img: 'card_cleave',
    desc: 'Deal 5.  Chain: refund 1 stamina.', effects: [{ op: 'damage', value: 5 }], chain: [{ op: 'stamina', value: 1 }] },
  heavy: { id: 'heavy', name: 'Heavy Smash', use: 'attack', cost: 2, type: 'attack', img: 'card_heavy',
    desc: 'Deal 12. Ignores Dodge. Breaks the chain.', effects: [{ op: 'damage', value: 12, ignoreDodge: true }], chainbreaker: true },
  finisher: { id: 'finisher', name: 'Finisher', use: 'attack', cost: 2, type: 'attack', img: 'card_finisher',
    desc: 'Deal 4 +3 per chained card. Breaks the chain.', effects: [{ op: 'chainDamage', base: 4, per: 3 }], chainbreaker: true },
  // --- utility ---
  focus: { id: 'focus', name: 'Focus', use: 'utility', cost: 1, type: 'utility', img: 'card_focus',
    desc: 'Draw 2. Gain 1 stamina.  Chain: draw 1 more.', effects: [{ op: 'draw', value: 2 }, { op: 'stamina', value: 1 }], chain: [{ op: 'draw', value: 1 }] },
  // --- defense (defense phase, free) ---
  block: { id: 'block', name: 'Block', use: 'defense', type: 'defense', img: 'card_block',
    desc: 'Gain 7 block.', effects: [{ op: 'block', value: 7 }] },
  dodge: { id: 'dodge', name: 'Dodge', use: 'defense', type: 'defense', img: 'card_dodge',
    desc: 'Negate the next incoming hit.', effects: [{ op: 'dodge', value: 1 }] },
  parry: { id: 'parry', name: 'Parry', use: 'defense', type: 'defense', img: 'card_parry',
    desc: 'Negate 1 hit and counter for 5.', effects: [{ op: 'dodge', value: 1 }, { op: 'counter', value: 5 }] },
  brace: { id: 'brace', name: 'Brace', use: 'defense', type: 'defense', img: 'card_brace',
    desc: 'Gain 4 block. Heal 3.', effects: [{ op: 'block', value: 4 }, { op: 'heal', value: 3 }] },
};

// Fighter starter deck.
export const STARTER_DECK = ['jab', 'jab', 'slash', 'combo', 'combo', 'heavy', 'focus', 'block', 'dodge', 'parry'];

// Equipment grants cards (deck growth via loot — like Card Quest).
export const EQUIPMENT = [
  { id: 'greatsword', name: 'Greatsword', desc: 'Adds Finisher + Heavy Smash.', cards: ['finisher', 'heavy'], img: 'card_finisher' },
  { id: 'twindaggers', name: 'Twin Daggers', desc: 'Adds 2× Quick Jab (chain).', cards: ['jab', 'jab'], img: 'card_jab' },
  { id: 'comboblade', name: 'Combo Blade', desc: 'Adds 2× Combo Strike (chain).', cards: ['combo', 'combo'], img: 'card_cleave' },
  { id: 'towershield', name: 'Tower Shield', desc: 'Adds 2× Block.', cards: ['block', 'block'], img: 'card_block' },
  { id: 'cloak', name: 'Shadow Cloak', desc: 'Adds Dodge + Parry.', cards: ['dodge', 'parry'], img: 'card_dodge' },
  { id: 'amulet', name: 'Focus Amulet', desc: 'Adds Focus + Brace.', cards: ['focus', 'brace'], img: 'card_focus' },
];

// Enemies: Dodge charges, hp, telegraphed attack PLANS (multi-hit = Rage).
export const ENEMIES = {
  goblin: { id: 'goblin', name: 'Goblin', img: 'enemy_goblin', hp: [14, 17], dodge: 1,
    plans: [{ hits: [5] }, { hits: [3, 3], rage: true }] },
  skeleton: { id: 'skeleton', name: 'Skeleton', img: 'enemy_skeleton', hp: [20, 24], dodge: 0,
    plans: [{ hits: [9] }, { hits: [4, 4], rage: true }] },
  bandit: { id: 'bandit', name: 'Bandit', img: 'enemy_bandit', hp: [16, 19], dodge: 2,
    plans: [{ hits: [4, 4], rage: true }, { hits: [7] }] },
  orc: { id: 'orc', name: 'Orc Warlord', img: 'enemy_orc', hp: [44, 50], dodge: 1, elite: true,
    plans: [{ hits: [13] }, { hits: [6, 6], rage: true }, { hits: [5, 5, 5], rage: true }] },
  lich: { id: 'lich', name: 'The Lich Lord', img: 'enemy_lich', hp: [85, 85], dodge: 2, boss: true,
    plans: [{ hits: [18] }, { hits: [9, 9], rage: true }, { hits: [7, 7, 7], rage: true }] },
};

export const COMMON_ENEMIES = ['goblin', 'skeleton', 'bandit'];

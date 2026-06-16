// Game data (English). Card Quest-inspired: attack/defense phases with stamina,
// card chaining (combos), enemy & player dodge, equipment that grants cards.
//
// Card fields:
//   use: 'attack' (play in attack phase, costs stamina) |
//        'defense' (play in defense phase, free) | 'skill' (attack phase)
//   cost: stamina (attack/skill only)
//   effects: declarative ops the engine interprets
//   chain: optional bonus applied when combo >= chain.combo
//
// Effect ops:
//   damage, ignoreDamage(=damage that ignores dodge via flag), block, dodge,
//   counter, draw, stamina, heal, finisher(=combo*value, resets combo)

export const CARDS = {
  // --- attacks ---
  slash:   { id: 'slash',   name: 'Slash',        use: 'attack', cost: 1, type: 'attack', img: 'card_slash',
    desc: 'Deal 5. Chain: +3 if combo ≥ 2.', effects: [{ op: 'damage', value: 5 }], chain: { combo: 2, effects: [{ op: 'damage', value: 3 }] } },
  jab:     { id: 'jab',     name: 'Quick Jab',    use: 'attack', cost: 1, type: 'attack', img: 'card_jab',
    desc: 'Deal 3. Draw 1.', effects: [{ op: 'damage', value: 3 }, { op: 'draw', value: 1 }] },
  heavy:   { id: 'heavy',   name: 'Heavy Blow',   use: 'attack', cost: 2, type: 'attack', img: 'card_heavy',
    desc: 'Deal 11. Ignores Dodge.', effects: [{ op: 'damage', value: 11, ignoreDodge: true }] },
  cleave:  { id: 'cleave',  name: 'Cleave',       use: 'attack', cost: 2, type: 'attack', img: 'card_cleave',
    desc: 'Deal 7. Chain: +combo damage.', effects: [{ op: 'damage', value: 7 }], chain: { combo: 1, effects: [{ op: 'comboDamage', value: 1 }] } },
  finisher:{ id: 'finisher',name: 'Finisher',     use: 'attack', cost: 2, type: 'attack', img: 'card_finisher',
    desc: 'Deal 4 × combo, then reset combo.', effects: [{ op: 'finisher', value: 4 }] },
  // --- skills ---
  focus:   { id: 'focus',   name: 'Focus',        use: 'skill',  cost: 0, type: 'skill', img: 'card_focus',
    desc: 'Gain 1 stamina. Draw 1.', effects: [{ op: 'stamina', value: 1 }, { op: 'draw', value: 1 }] },
  // --- defense (played in the defense phase, free) ---
  block:   { id: 'block',   name: 'Block',        use: 'defense', type: 'defense', img: 'card_block',
    desc: 'Gain 7 block.', effects: [{ op: 'block', value: 7 }] },
  dodge:   { id: 'dodge',   name: 'Dodge',        use: 'defense', type: 'defense', img: 'card_dodge',
    desc: 'Negate the next incoming hit.', effects: [{ op: 'dodge', value: 1 }] },
  parry:   { id: 'parry',   name: 'Parry',        use: 'defense', type: 'defense', img: 'card_parry',
    desc: 'Negate 1 hit and counter for 5.', effects: [{ op: 'dodge', value: 1 }, { op: 'counter', value: 5 }] },
  brace:   { id: 'brace',   name: 'Brace',        use: 'defense', type: 'defense', img: 'card_brace',
    desc: 'Gain 4 block. Heal 3.', effects: [{ op: 'block', value: 4 }, { op: 'heal', value: 3 }] },
};

// Fighter starter deck (Arming Sword + Round Shield).
export const STARTER_DECK = ['slash', 'slash', 'jab', 'heavy', 'cleave', 'block', 'block', 'dodge', 'parry', 'focus'];

// Equipment rewards — each grants cards (this is how decks grow in Card Quest).
export const EQUIPMENT = [
  { id: 'battleaxe', name: 'Battle Axe', desc: 'Adds 2× Cleave.', cards: ['cleave', 'cleave'], img: 'card_cleave' },
  { id: 'greatsword', name: 'Greatsword', desc: 'Adds Heavy Blow + Finisher.', cards: ['heavy', 'finisher'], img: 'card_heavy' },
  { id: 'towershield', name: 'Tower Shield', desc: 'Adds 2× Block.', cards: ['block', 'block'], img: 'card_block' },
  { id: 'cloak', name: 'Shadow Cloak', desc: 'Adds 2× Dodge.', cards: ['dodge', 'dodge'], img: 'card_dodge' },
  { id: 'rapier', name: 'Rapier', desc: 'Adds Parry + Quick Jab.', cards: ['parry', 'jab'], img: 'card_parry' },
  { id: 'amulet', name: 'War Amulet', desc: 'Adds Focus + Slash.', cards: ['focus', 'slash'], img: 'card_focus' },
];

// Enemies: dodge charges, hp, and telegraphed attack PLANS (multi-hit).
// plans: array of {hits:[...], label} — engine picks one per round and shows it.
export const ENEMIES = {
  goblin: { id: 'goblin', name: 'Goblin', img: 'enemy_goblin', hp: [14, 17], dodge: 1,
    plans: [{ hits: [5] }, { hits: [3, 3] }] },
  skeleton: { id: 'skeleton', name: 'Skeleton', img: 'enemy_skeleton', hp: [20, 24], dodge: 0,
    plans: [{ hits: [9] }, { hits: [4, 4] }] },
  bandit: { id: 'bandit', name: 'Bandit', img: 'enemy_bandit', hp: [16, 19], dodge: 2,
    plans: [{ hits: [4, 4] }, { hits: [7] }] },
  orc: { id: 'orc', name: 'Orc Warlord', img: 'enemy_orc', hp: [44, 50], dodge: 1, elite: true,
    plans: [{ hits: [13] }, { hits: [6, 6] }, { hits: [5, 5, 5] }] },
  lich: { id: 'lich', name: 'The Lich Lord', img: 'enemy_lich', hp: [85, 85], dodge: 2, boss: true,
    plans: [{ hits: [18] }, { hits: [9, 9] }, { hits: [7, 7, 7] }] },
};

export const COMMON_ENEMIES = ['goblin', 'skeleton', 'bandit'];

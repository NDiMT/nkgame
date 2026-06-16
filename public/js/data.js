// Game data (English) — Card Quest-faithful combat with multiple classes.
//
// Combat: 5-card hand, stamina + (Wizard) arcane charges, Mulligan, attack/
// defense phases, CHAINING (consecutive non-chainbreaker cards give draw/stamina
// advantage to cycle your deck), enemy Dodge + Rage.
//
// Effect ops: damage, chainDamage(base,per), block, dodge, counter, draw,
//             stamina, heal, arcane

export const CARDS = {
  // ===== Fighter =====
  jab: { id: 'jab', name: 'Quick Jab', use: 'attack', cost: 1, type: 'attack', img: 'card_jab',
    desc: 'Deal 3.  Chain: draw 1.', effects: [{ op: 'damage', value: 3 }], chain: [{ op: 'draw', value: 1 }] },
  slash: { id: 'slash', name: 'Slash', use: 'attack', cost: 1, type: 'attack', img: 'card_slash',
    desc: 'Deal 6.', effects: [{ op: 'damage', value: 6 }] },
  combo: { id: 'combo', name: 'Combo Strike', use: 'attack', cost: 1, type: 'attack', img: 'card_cleave',
    desc: 'Deal 5.  Chain: refund 1 stamina.', effects: [{ op: 'damage', value: 5 }], chain: [{ op: 'stamina', value: 1 }] },
  heavy: { id: 'heavy', name: 'Heavy Smash', use: 'attack', cost: 2, type: 'attack', img: 'card_heavy',
    desc: 'Deal 12. Ignores Dodge. Breaks chain.', effects: [{ op: 'damage', value: 12, ignoreDodge: true }], chainbreaker: true },
  finisher: { id: 'finisher', name: 'Finisher', use: 'attack', cost: 2, type: 'attack', img: 'card_finisher',
    desc: 'Deal 4 +3 per chained card. Breaks chain.', effects: [{ op: 'chainDamage', base: 4, per: 3 }], chainbreaker: true },
  focus: { id: 'focus', name: 'Focus', use: 'utility', cost: 1, type: 'utility', img: 'card_focus',
    desc: 'Draw 2. Gain 1 stamina.  Chain: draw 1 more.', effects: [{ op: 'draw', value: 2 }, { op: 'stamina', value: 1 }], chain: [{ op: 'draw', value: 1 }] },
  block: { id: 'block', name: 'Block', use: 'defense', type: 'defense', img: 'card_block',
    desc: 'Gain 7 block.', effects: [{ op: 'block', value: 7 }] },
  dodge: { id: 'dodge', name: 'Dodge', use: 'defense', type: 'defense', img: 'card_dodge',
    desc: 'Negate the next incoming hit.', effects: [{ op: 'dodge', value: 1 }] },
  parry: { id: 'parry', name: 'Parry', use: 'defense', type: 'defense', img: 'card_parry',
    desc: 'Negate 1 hit and counter for 5.', effects: [{ op: 'dodge', value: 1 }, { op: 'counter', value: 5 }] },
  brace: { id: 'brace', name: 'Brace', use: 'defense', type: 'defense', img: 'card_brace',
    desc: 'Gain 4 block. Heal 3.', effects: [{ op: 'block', value: 4 }, { op: 'heal', value: 3 }] },

  // ===== Wizard ===== (arcane charges build up, then power big spells)
  spark: { id: 'spark', name: 'Spark', use: 'attack', cost: 1, type: 'attack', img: 'card_spark',
    desc: 'Deal 3. Gain 1 arcane.  Chain: draw 1.', effects: [{ op: 'damage', value: 3 }, { op: 'arcane', value: 1 }], chain: [{ op: 'draw', value: 1 }] },
  lightning: { id: 'lightning', name: 'Lightning', use: 'attack', cost: 1, type: 'attack', img: 'card_lightning',
    desc: 'Deal 5.  Chain: refund 1 stamina and draw 1.', effects: [{ op: 'damage', value: 5 }], chain: [{ op: 'stamina', value: 1 }, { op: 'draw', value: 1 }] },
  arcanebolt: { id: 'arcanebolt', name: 'Arcane Bolt', use: 'attack', cost: 1, arcaneCost: 2, type: 'attack', img: 'card_arcanebolt',
    desc: 'Spend 2 arcane. Deal 12. Ignores Dodge.', effects: [{ op: 'damage', value: 12, ignoreDodge: true }] },
  fireball: { id: 'fireball', name: 'Fireball', use: 'attack', cost: 2, arcaneCost: 1, type: 'attack', img: 'card_fireball',
    desc: 'Spend 1 arcane. Deal 9. Breaks chain.', effects: [{ op: 'damage', value: 9 }], chainbreaker: true },
  insight: { id: 'insight', name: 'Arcane Insight', use: 'utility', cost: 1, type: 'utility', img: 'card_insight',
    desc: 'Draw 2. Gain 1 arcane.  Chain: draw 1 more.', effects: [{ op: 'draw', value: 2 }, { op: 'arcane', value: 1 }], chain: [{ op: 'draw', value: 1 }] },
  magicshield: { id: 'magicshield', name: 'Magic Shield', use: 'defense', type: 'defense', img: 'card_magicshield',
    desc: 'Gain 9 block.', effects: [{ op: 'block', value: 9 }] },
  blink: { id: 'blink', name: 'Blink', use: 'defense', type: 'defense', img: 'card_blink',
    desc: 'Negate the next hit. Draw 1.', effects: [{ op: 'dodge', value: 1 }, { op: 'draw', value: 1 }] },
};

export const CLASSES = {
  fighter: {
    id: 'fighter', name: 'Fighter', img: 'class_fighter',
    desc: 'Stamina-driven melee. Chain strikes, then smash. Tough and forgiving.',
    maxStamina: 3, maxArcane: 0,
    deck: ['jab', 'jab', 'slash', 'combo', 'combo', 'heavy', 'focus', 'block', 'dodge', 'parry'],
  },
  wizard: {
    id: 'wizard', name: 'Wizard', img: 'class_wizard',
    desc: 'Build arcane charges with Spark, chain Lightning to cycle your deck, then unleash Arcane Bolt & Fireball.',
    maxStamina: 3, maxArcane: 6,
    deck: ['spark', 'spark', 'lightning', 'lightning', 'fireball', 'arcanebolt', 'insight', 'magicshield', 'blink', 'blink'],
  },
};

// Equipment grants cards (deck growth via loot), per class.
export const EQUIPMENT_BY_CLASS = {
  fighter: [
    { id: 'greatsword', name: 'Greatsword', desc: 'Adds Finisher + Heavy Smash.', cards: ['finisher', 'heavy'], img: 'card_finisher' },
    { id: 'twindaggers', name: 'Twin Daggers', desc: 'Adds 2× Quick Jab.', cards: ['jab', 'jab'], img: 'card_jab' },
    { id: 'comboblade', name: 'Combo Blade', desc: 'Adds 2× Combo Strike.', cards: ['combo', 'combo'], img: 'card_cleave' },
    { id: 'towershield', name: 'Tower Shield', desc: 'Adds 2× Block.', cards: ['block', 'block'], img: 'card_block' },
    { id: 'cloak', name: 'Shadow Cloak', desc: 'Adds Dodge + Parry.', cards: ['dodge', 'parry'], img: 'card_dodge' },
    { id: 'amulet', name: 'Focus Amulet', desc: 'Adds Focus + Brace.', cards: ['focus', 'brace'], img: 'card_focus' },
  ],
  wizard: [
    { id: 'stormstaff', name: 'Storm Staff', desc: 'Adds 2× Lightning.', cards: ['lightning', 'lightning'], img: 'card_lightning' },
    { id: 'firetome', name: 'Fire Tome', desc: 'Adds Fireball + Arcane Bolt.', cards: ['fireball', 'arcanebolt'], img: 'card_fireball' },
    { id: 'arcaneorb', name: 'Arcane Orb', desc: 'Adds 2× Spark.', cards: ['spark', 'spark'], img: 'card_spark' },
    { id: 'wardrobe', name: 'Warding Robe', desc: 'Adds 2× Magic Shield.', cards: ['magicshield', 'magicshield'], img: 'card_magicshield' },
    { id: 'blinkboots', name: 'Blink Boots', desc: 'Adds 2× Blink.', cards: ['blink', 'blink'], img: 'card_blink' },
    { id: 'sagegem', name: 'Sage Gem', desc: 'Adds 2× Arcane Insight.', cards: ['insight', 'insight'], img: 'card_insight' },
  ],
};

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

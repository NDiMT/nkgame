// Game data (English) — Card Quest-faithful combat, four classes.
//
// Combat: 5-card hand, stamina + optional class CHARGE (Wizard=arcane, Hunter=aim),
// Mulligan, attack/defense phases, CHAINING (consecutive non-chainbreaker cards
// give draw/stamina advantage to cycle your deck), enemy Dodge + Rage.
// Rogue adds Hidden (stealth → enemy can't attack) and Poison (damage over time).
//
// Effect ops: damage, chainDamage(base,per), sneakDamage(base,bonus),
//   poisonDamage(base,per), block, dodge, counter, draw, stamina, arcane(charge),
//   heal, hide, poison

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

  // ===== Wizard (arcane charges) =====
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

  // ===== Rogue (Hidden + Poison) =====
  throwknife: { id: 'throwknife', name: 'Throwing Knife', use: 'attack', cost: 1, type: 'attack', img: 'card_throwknife',
    desc: 'Deal 3.  Chain: draw 1.', effects: [{ op: 'damage', value: 3 }], chain: [{ op: 'draw', value: 1 }] },
  backstab: { id: 'backstab', name: 'Backstab', use: 'attack', cost: 1, type: 'attack', img: 'card_backstab',
    desc: 'Deal 4. +6 if Hidden.', effects: [{ op: 'sneakDamage', base: 4, bonus: 6 }] },
  poisonblade: { id: 'poisonblade', name: 'Poison Blade', use: 'attack', cost: 1, type: 'attack', img: 'card_poisonblade',
    desc: 'Deal 2. Apply 3 Poison.  Chain: draw 1.', effects: [{ op: 'damage', value: 2 }, { op: 'poison', value: 3 }], chain: [{ op: 'draw', value: 1 }] },
  shadowstep: { id: 'shadowstep', name: 'Shadowstep', use: 'attack', cost: 1, type: 'attack', img: 'card_shadowstep',
    desc: 'Deal 5.  Chain: refund 1 stamina and draw 1.', effects: [{ op: 'damage', value: 5 }], chain: [{ op: 'stamina', value: 1 }, { op: 'draw', value: 1 }] },
  eviscerate: { id: 'eviscerate', name: 'Eviscerate', use: 'attack', cost: 2, type: 'attack', img: 'card_eviscerate',
    desc: 'Deal 5 +3 per Poison on the enemy. Breaks chain.', effects: [{ op: 'poisonDamage', base: 5, per: 3 }], chainbreaker: true },
  vanish: { id: 'vanish', name: 'Vanish', use: 'utility', cost: 1, type: 'utility', img: 'card_vanish',
    desc: 'Become Hidden (enemy can’t attack next phase). Draw 1.', effects: [{ op: 'hide', value: 1 }, { op: 'draw', value: 1 }] },
  smokebomb: { id: 'smokebomb', name: 'Smoke Bomb', use: 'defense', type: 'defense', img: 'card_smokebomb',
    desc: 'Negate the next 3 hits.', effects: [{ op: 'dodge', value: 3 }] },
  trickdodge: { id: 'trickdodge', name: 'Trick Dodge', use: 'defense', type: 'defense', img: 'card_trickdodge',
    desc: 'Negate 1 hit and counter for 6.', effects: [{ op: 'dodge', value: 1 }, { op: 'counter', value: 6 }] },

  // ===== Hunter (aim charges, chain-heavy) =====
  shoot: { id: 'shoot', name: 'Shoot', use: 'attack', cost: 1, type: 'attack', img: 'card_shoot',
    desc: 'Deal 4. Gain 1 aim.  Chain: draw 1.', effects: [{ op: 'damage', value: 4 }, { op: 'arcane', value: 1 }], chain: [{ op: 'draw', value: 1 }] },
  volley: { id: 'volley', name: 'Volley', use: 'attack', cost: 1, type: 'attack', img: 'card_volley',
    desc: 'Deal 3.  Chain: refund 1 stamina and draw 1.', effects: [{ op: 'damage', value: 3 }], chain: [{ op: 'stamina', value: 1 }, { op: 'draw', value: 1 }] },
  aimedshot: { id: 'aimedshot', name: 'Aimed Shot', use: 'attack', cost: 1, arcaneCost: 2, type: 'attack', img: 'card_aimedshot',
    desc: 'Spend 2 aim. Deal 13. Ignores Dodge.', effects: [{ op: 'damage', value: 13, ignoreDodge: true }] },
  multishot: { id: 'multishot', name: 'Multishot', use: 'attack', cost: 2, arcaneCost: 1, type: 'attack', img: 'card_multishot',
    desc: 'Spend 1 aim. Deal 10. Breaks chain.', effects: [{ op: 'damage', value: 10 }], chainbreaker: true },
  takeaim: { id: 'takeaim', name: 'Take Aim', use: 'utility', cost: 1, type: 'utility', img: 'card_takeaim',
    desc: 'Draw 2. Gain 1 aim.  Chain: draw 1 more.', effects: [{ op: 'draw', value: 2 }, { op: 'arcane', value: 1 }], chain: [{ op: 'draw', value: 1 }] },
  trap: { id: 'trap', name: 'Snare Trap', use: 'defense', type: 'defense', img: 'card_trap',
    desc: 'Negate 1 hit and counter for 6.', effects: [{ op: 'dodge', value: 1 }, { op: 'counter', value: 6 }] },
  dodgeroll: { id: 'dodgeroll', name: 'Dodge Roll', use: 'defense', type: 'defense', img: 'card_dodgeroll',
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
    id: 'wizard', name: 'Wizard', img: 'class_wizard', chargeIcon: '🔮', chargeName: 'arcane',
    desc: 'Build arcane with Spark, chain Lightning to cycle your deck, then unleash Arcane Bolt & Fireball.',
    maxStamina: 3, maxArcane: 6,
    deck: ['spark', 'spark', 'lightning', 'lightning', 'fireball', 'arcanebolt', 'insight', 'magicshield', 'blink', 'blink'],
  },
  rogue: {
    id: 'rogue', name: 'Rogue', img: 'class_rogue',
    desc: 'Vanish to go Hidden (enemy can’t hit you), stack Poison, and Eviscerate. Backstabs hit harder from stealth.',
    maxStamina: 3, maxArcane: 0,
    deck: ['throwknife', 'throwknife', 'backstab', 'poisonblade', 'poisonblade', 'shadowstep', 'eviscerate', 'vanish', 'smokebomb', 'trickdodge'],
  },
  hunter: {
    id: 'hunter', name: 'Hunter', img: 'class_hunter', chargeIcon: '🎯', chargeName: 'aim',
    desc: 'Ranged and chain-heavy. Build aim, chain Volley/Shoot to cycle, then Aimed Shot & Multishot. Hardest class.',
    maxStamina: 3, maxArcane: 6,
    deck: ['shoot', 'shoot', 'volley', 'volley', 'aimedshot', 'multishot', 'takeaim', 'trap', 'dodgeroll', 'volley'],
  },
};

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
  rogue: [
    { id: 'venomkit', name: 'Venom Kit', desc: 'Adds 2× Poison Blade.', cards: ['poisonblade', 'poisonblade'], img: 'card_poisonblade' },
    { id: 'daggerpair', name: 'Twin Stilettos', desc: 'Adds Backstab + Throwing Knife.', cards: ['backstab', 'throwknife'], img: 'card_backstab' },
    { id: 'killer', name: 'Assassin’s Edge', desc: 'Adds Eviscerate + Shadowstep.', cards: ['eviscerate', 'shadowstep'], img: 'card_eviscerate' },
    { id: 'smokekit', name: 'Smoke Kit', desc: 'Adds 2× Smoke Bomb.', cards: ['smokebomb', 'smokebomb'], img: 'card_smokebomb' },
    { id: 'shadowcloak2', name: 'Veil Cloak', desc: 'Adds Vanish + Trick Dodge.', cards: ['vanish', 'trickdodge'], img: 'card_vanish' },
  ],
  hunter: [
    { id: 'longbow', name: 'Longbow', desc: 'Adds Aimed Shot + Take Aim.', cards: ['aimedshot', 'takeaim'], img: 'card_aimedshot' },
    { id: 'quiver', name: 'Full Quiver', desc: 'Adds 2× Volley.', cards: ['volley', 'volley'], img: 'card_volley' },
    { id: 'crossbow', name: 'Heavy Crossbow', desc: 'Adds Multishot + Shoot.', cards: ['multishot', 'shoot'], img: 'card_multishot' },
    { id: 'trapkit', name: 'Trap Kit', desc: 'Adds 2× Snare Trap.', cards: ['trap', 'trap'], img: 'card_trap' },
    { id: 'scout', name: 'Scout Boots', desc: 'Adds 2× Dodge Roll.', cards: ['dodgeroll', 'dodgeroll'], img: 'card_dodgeroll' },
  ],
};

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

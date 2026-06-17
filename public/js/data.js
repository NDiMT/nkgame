// ============================================================================
// Game data — Card Quest model: LOADOUT-based decks. The deck is defined before
// the run by class + subclass + weapon + trinket (each grants cards / stat mods).
// Cards share ONE energy pool for attack AND defense. Tags: range melee/ranged.
// ============================================================================

// ---- Cards ----------------------------------------------------------------
// use: attack | defense | utility ; range: melee | ranged (attacks)
export const CARDS = {
  // Fighter
  slash:   { id:'slash', name:'Slash', use:'attack', range:'melee', cost:1, type:'attack', img:'card_slash', desc:'Deal 6.', effects:[{op:'damage',value:6}] },
  combo:   { id:'combo', name:'Combo Strike', use:'attack', range:'melee', cost:1, type:'attack', img:'card_cleave', desc:'Deal 5. Chain: refund 1 energy.', effects:[{op:'damage',value:5}], chain:[{op:'energy',value:1}] },
  bash:    { id:'bash', name:'Shield Bash', use:'attack', range:'melee', cost:1, type:'attack', img:'card_finisher', desc:'Deal 4. Stun 1.', effects:[{op:'damage',value:4},{op:'stun',value:1}] },
  heavy:   { id:'heavy', name:'Heavy Smash', use:'attack', range:'melee', cost:2, type:'attack', img:'card_heavy', desc:'Deal 12. Pierces armor. Breaks chain.', effects:[{op:'damage',value:12,ignoreDodge:true}], chainbreaker:true },
  cleave:  { id:'cleave', name:'Cleave', use:'attack', range:'melee', cost:2, type:'attack', img:'card_cleave', desc:'Deal 7 to ALL.', effects:[{op:'damageAll',value:7}] },
  throwaxe:{ id:'throwaxe', name:'Throwing Axe', use:'attack', range:'ranged', cost:1, type:'attack', img:'card_throwknife', desc:'Deal 5 (ranged).', effects:[{op:'damage',value:5}] },
  block:   { id:'block', name:'Block', use:'defense', cost:1, type:'defense', img:'card_block', desc:'Gain 8 block.', effects:[{op:'block',value:8}] },
  brace:   { id:'brace', name:'Brace', use:'defense', cost:1, type:'defense', img:'card_brace', desc:'Gain 5 block. Heal 4.', effects:[{op:'block',value:5},{op:'heal',value:4}] },
  rally:   { id:'rally', name:'Rally', use:'utility', cost:1, type:'utility', img:'card_focus', desc:'Draw 2. Gain 1 energy.', effects:[{op:'draw',value:2},{op:'energy',value:1}] },

  // Wizard (ranged spells, arcane)
  spark:    { id:'spark', name:'Spark', use:'attack', range:'ranged', cost:1, type:'attack', img:'card_spark', desc:'Deal 3. Gain 1 arcane. Chain: draw 1.', effects:[{op:'damage',value:3},{op:'arcane',value:1}], chain:[{op:'draw',value:1}] },
  lightning:{ id:'lightning', name:'Lightning', use:'attack', range:'ranged', cost:1, type:'attack', img:'card_lightning', desc:'Deal 5. Chain: refund 1 energy, draw 1.', effects:[{op:'damage',value:5}], chain:[{op:'energy',value:1},{op:'draw',value:1}] },
  fireball: { id:'fireball', name:'Fireball', use:'attack', range:'ranged', cost:2, arcaneCost:1, type:'attack', img:'card_fireball', desc:'Spend 1 arcane. Deal 6 to ALL. Breaks chain.', effects:[{op:'damageAll',value:6}], chainbreaker:true },
  arcanebolt:{ id:'arcanebolt', name:'Arcane Bolt', use:'attack', range:'ranged', cost:1, arcaneCost:2, type:'attack', img:'card_arcanebolt', desc:'Spend 2 arcane. Deal 13. Pierces.', effects:[{op:'damage',value:13,ignoreDodge:true}] },
  frost:    { id:'frost', name:'Frost Nova', use:'attack', range:'ranged', cost:2, type:'attack', img:'card_blink', desc:'Deal 2 to ALL. Stun 1 to ALL. Breaks chain.', effects:[{op:'damageAll',value:2},{op:'stun',value:0}], chainbreaker:true },
  magicshield:{ id:'magicshield', name:'Magic Shield', use:'defense', cost:1, type:'defense', img:'card_magicshield', desc:'Gain 9 block.', effects:[{op:'block',value:9}] },
  blink:    { id:'blink', name:'Blink', use:'defense', cost:1, type:'defense', img:'card_blink', desc:'Negate next hit. Draw 1.', effects:[{op:'dodge',value:1},{op:'draw',value:1}] },
  insight:  { id:'insight', name:'Arcane Insight', use:'utility', cost:1, type:'utility', img:'card_insight', desc:'Draw 2. Gain 1 arcane. Chain: draw 1.', effects:[{op:'draw',value:2},{op:'arcane',value:1}], chain:[{op:'draw',value:1}] },

  // Rogue (Poison, dodge, control)
  knife:    { id:'knife', name:'Throwing Knife', use:'attack', range:'ranged', cost:1, type:'attack', img:'card_throwknife', desc:'Deal 3 (ranged). Chain: draw 1.', effects:[{op:'damage',value:3}], chain:[{op:'draw',value:1}] },
  backstab: { id:'backstab', name:'Backstab', use:'attack', range:'melee', cost:1, type:'attack', img:'card_backstab', desc:'Deal 6. Vulnerable 1.', effects:[{op:'damage',value:6},{op:'vulnerable',value:1}] },
  poisonblade:{ id:'poisonblade', name:'Poison Blade', use:'attack', range:'melee', cost:1, type:'attack', img:'card_poisonblade', desc:'Deal 2. Poison 3.', effects:[{op:'damage',value:2},{op:'poison',value:3}] },
  eviscerate:{ id:'eviscerate', name:'Eviscerate', use:'attack', range:'melee', cost:2, type:'attack', img:'card_eviscerate', desc:'Deal 4 +3 per Poison. Breaks chain.', effects:[{op:'poisonDamage',base:4,per:3}], chainbreaker:true },
  toxiccloud:{ id:'toxiccloud', name:'Toxic Cloud', use:'attack', range:'ranged', cost:2, type:'attack', img:'card_smokebomb', desc:'Poison 3 to ALL. Breaks chain.', effects:[{op:'poisonAll',value:3}], chainbreaker:true },
  smokebomb:{ id:'smokebomb', name:'Smoke Bomb', use:'defense', cost:1, type:'defense', img:'card_smokebomb', desc:'Negate next 3 hits.', effects:[{op:'dodge',value:3}] },
  trickdodge:{ id:'trickdodge', name:'Trick Dodge', use:'defense', cost:1, type:'defense', img:'card_trickdodge', desc:'Negate next hit. Gain 4 block.', effects:[{op:'dodge',value:1},{op:'block',value:4}] },
  prep:     { id:'prep', name:'Prepare', use:'utility', cost:1, type:'utility', img:'card_vanish', desc:'Draw 2. Gain 1 energy.', effects:[{op:'draw',value:2},{op:'energy',value:1}] },

  // Hunter (ranged, aim)
  shoot:    { id:'shoot', name:'Shoot', use:'attack', range:'ranged', cost:1, type:'attack', img:'card_shoot', desc:'Deal 4. Gain 1 aim. Chain: draw 1.', effects:[{op:'damage',value:4},{op:'arcane',value:1}], chain:[{op:'draw',value:1}] },
  volley:   { id:'volley', name:'Volley', use:'attack', range:'ranged', cost:1, type:'attack', img:'card_volley', desc:'Deal 3. Chain: refund 1 energy, draw 1.', effects:[{op:'damage',value:3}], chain:[{op:'energy',value:1},{op:'draw',value:1}] },
  aimedshot:{ id:'aimedshot', name:'Aimed Shot', use:'attack', range:'ranged', cost:1, arcaneCost:2, type:'attack', img:'card_aimedshot', desc:'Spend 2 aim. Deal 14. Pierces.', effects:[{op:'damage',value:14,ignoreDodge:true}] },
  multishot:{ id:'multishot', name:'Multishot', use:'attack', range:'ranged', cost:2, arcaneCost:1, type:'attack', img:'card_multishot', desc:'Spend 1 aim. Deal 5 to ALL. Breaks chain.', effects:[{op:'damageAll',value:5}], chainbreaker:true },
  takeaim:  { id:'takeaim', name:'Take Aim', use:'utility', cost:1, type:'utility', img:'card_takeaim', desc:'Draw 2. Gain 1 aim. Chain: draw 1.', effects:[{op:'draw',value:2},{op:'arcane',value:1}], chain:[{op:'draw',value:1}] },
  snare:    { id:'snare', name:'Snare Trap', use:'attack', range:'ranged', cost:1, type:'attack', img:'card_trap', desc:'Deal 2. Stun 1.', effects:[{op:'damage',value:2},{op:'stun',value:1}] },
  dodgeroll:{ id:'dodgeroll', name:'Dodge Roll', use:'defense', cost:1, type:'defense', img:'card_dodgeroll', desc:'Negate next hit. Draw 1.', effects:[{op:'dodge',value:1},{op:'draw',value:1}] },
  netcard:  { id:'netcard', name:'Net', use:'defense', cost:1, type:'defense', img:'card_trap', desc:'Gain 6 block.', effects:[{op:'block',value:6}] },
};
// fix: frost stun should apply to all — handled via stunAll op alias
CARDS.frost.effects = [{op:'damageAll',value:2},{op:'stunAll',value:1}];

// ---- Classes (base stats + core deck) -------------------------------------
export const CLASSES = {
  fighter:{ id:'fighter', name:'Fighter', img:'class_fighter', hp:80, energy:4, arcane:0, chargeIcon:'',
    desc:'Durable melee. High HP & energy, strong blocks and stuns.',
    base:['slash','slash','block','block','bash','rally'] },
  wizard:{ id:'wizard', name:'Wizard', img:'class_wizard', hp:55, energy:3, arcane:6, chargeIcon:'🔮',
    desc:'Fragile but explosive. Arcane charges, chains, area damage.',
    base:['spark','spark','lightning','magicshield','blink','insight'] },
  rogue:{ id:'rogue', name:'Rogue', img:'class_rogue', hp:65, energy:3, arcane:0, chargeIcon:'',
    desc:'Evasive & combo-based. Poison, vulnerability, dodges.',
    base:['knife','knife','backstab','poisonblade','smokebomb','prep'] },
  hunter:{ id:'hunter', name:'Hunter', img:'class_hunter', hp:58, energy:3, arcane:6, chargeIcon:'🎯',
    desc:'Ranged & planning-heavy. Build aim, chain volleys, big shots.',
    base:['shoot','shoot','volley','volley','dodgeroll','takeaim'] },
};

// ---- Loadout pieces: subclass / weapon / trinket --------------------------
// Each: { id, name, desc, cards:[...], mods:{hp,energy,arcane} }
export const LOADOUT = {
  fighter: {
    subclass: [
      { id:'berserker', name:'Berserker', desc:'+0 HP. Adds Heavy Smash + Cleave.', cards:['heavy','cleave'], mods:{} },
      { id:'paladin', name:'Paladin', desc:'+15 HP. Adds Brace + Block.', cards:['brace','block'], mods:{hp:15} },
    ],
    weapon: [
      { id:'arming', name:'Arming Sword', desc:'Adds Slash + Combo Strike.', cards:['slash','combo'], mods:{} },
      { id:'greatsword', name:'Greatsword', desc:'+1 energy. Adds Heavy Smash + Cleave.', cards:['heavy','cleave'], mods:{energy:1} },
    ],
    trinket: [
      { id:'axes', name:'Throwing Axes', desc:'Adds 2× Throwing Axe (ranged).', cards:['throwaxe','throwaxe'], mods:{} },
      { id:'banner', name:'War Banner', desc:'+10 HP. Adds Rally.', cards:['rally'], mods:{hp:10} },
    ],
    bag: ['flask', 'bomb'],
  },
  wizard: {
    subclass: [
      { id:'pyromancer', name:'Pyromancer', desc:'Adds 2× Fireball.', cards:['fireball','fireball'], mods:{} },
      { id:'stormcaller', name:'Stormcaller', desc:'+1 energy. Adds 2× Lightning.', cards:['lightning','lightning'], mods:{energy:1} },
    ],
    weapon: [
      { id:'staff', name:'Storm Staff', desc:'Adds Lightning + Arcane Bolt.', cards:['lightning','arcanebolt'], mods:{} },
      { id:'tome', name:'Fire Tome', desc:'Adds Fireball + Frost Nova.', cards:['fireball','frost'], mods:{} },
    ],
    trinket: [
      { id:'orb', name:'Arcane Orb', desc:'+2 max arcane. Adds Arcane Insight.', cards:['insight'], mods:{arcane:2} },
      { id:'robe', name:'Warding Robe', desc:'+10 HP. Adds Magic Shield.', cards:['magicshield'], mods:{hp:10} },
    ],
    bag: ['manapot', 'firescroll'],
  },
  rogue: {
    subclass: [
      { id:'assassin', name:'Assassin', desc:'Adds 2× Backstab.', cards:['backstab','backstab'], mods:{} },
      { id:'venomancer', name:'Venomancer', desc:'+5 HP. Adds Poison Blade + Eviscerate.', cards:['poisonblade','eviscerate'], mods:{hp:5} },
    ],
    weapon: [
      { id:'daggers', name:'Twin Daggers', desc:'Adds Backstab + Throwing Knife.', cards:['backstab','knife'], mods:{} },
      { id:'venom', name:'Venom Kit', desc:'Adds Poison Blade + Toxic Cloud.', cards:['poisonblade','toxiccloud'], mods:{} },
    ],
    trinket: [
      { id:'cloak', name:'Shadow Cloak', desc:'+5 HP. Adds Trick Dodge.', cards:['trickdodge'], mods:{hp:5} },
      { id:'smoke', name:'Smoke Pouch', desc:'Adds 2× Smoke Bomb.', cards:['smokebomb','smokebomb'], mods:{} },
    ],
    bag: ['poisonvial', 'antidote'],
  },
  hunter: {
    subclass: [
      { id:'sharpshooter', name:'Sharpshooter', desc:'Adds 2× Aimed Shot.', cards:['aimedshot','aimedshot'], mods:{} },
      { id:'trapper', name:'Trapper', desc:'+5 HP. Adds Snare + Net.', cards:['snare','netcard'], mods:{hp:5} },
    ],
    weapon: [
      { id:'longbow', name:'Longbow', desc:'Adds Aimed Shot + Take Aim.', cards:['aimedshot','takeaim'], mods:{} },
      { id:'crossbow', name:'Crossbow', desc:'Adds Multishot + Shoot.', cards:['multishot','shoot'], mods:{} },
    ],
    trinket: [
      { id:'quiver', name:'Full Quiver', desc:'+2 max aim. Adds Volley.', cards:['volley'], mods:{arcane:2} },
      { id:'boots', name:'Scout Boots', desc:'+8 HP. Adds Dodge Roll.', cards:['dodgeroll'], mods:{hp:8} },
    ],
    bag: ['trapbag', 'quiver'],
  },
};

// ---- Bag items (limited charges per battle, free to use) ------------------
export const BAGS = {
  flask:     { id:'flask', name:'Healing Flask', desc:'Heal 14.', charges:2, img:'card_brace', effects:[{op:'heal',value:14}] },
  bomb:      { id:'bomb', name:'Bomb Pouch', desc:'Deal 7 to ALL.', charges:2, img:'card_finisher', effects:[{op:'damageAll',value:7}] },
  manapot:   { id:'manapot', name:'Mana Potion', desc:'Gain 3 arcane, 2 energy.', charges:2, img:'card_insight', effects:[{op:'arcane',value:3},{op:'energy',value:2}] },
  firescroll:{ id:'firescroll', name:'Fire Scroll', desc:'Deal 9 to ALL.', charges:1, img:'card_fireball', effects:[{op:'damageAll',value:9}] },
  poisonvial:{ id:'poisonvial', name:'Poison Vial', desc:'Poison 4 to ALL.', charges:2, img:'card_poisonblade', effects:[{op:'poisonAll',value:4}] },
  antidote:  { id:'antidote', name:'Antidote', desc:'Cleanse poison/weak, heal 8.', charges:2, img:'card_brace', effects:[{op:'cleanse'},{op:'heal',value:8}] },
  trapbag:   { id:'trapbag', name:'Trap Kit', desc:'Deal 3 + Stun 1 to ALL.', charges:2, img:'card_trap', effects:[{op:'damageAll',value:3},{op:'stunAll',value:1}] },
  quiver:    { id:'quiver', name:'Quiver Refill', desc:'Gain 3 aim, draw 2.', charges:2, img:'card_takeaim', effects:[{op:'arcane',value:3},{op:'draw',value:2}] },
};

// ---- Enemies (multi, armor, dodge, distant, intents, player debuffs) ------
export const ENEMIES = {
  slime:   { id:'slime', name:'Slime', img:'enemy_goblin', hp:[7,9],
    moves:[{type:'attack',hits:[3]},{type:'attack',hits:[2,2]}] },
  mage:    { id:'mage', name:'Dark Mage', img:'enemy_lich', hp:[15,18], distant:true,
    moves:[{type:'attack',hits:[6]},{type:'attack_status',hits:[3],status:'weak',amount:2},{type:'attack_status',hits:[4],status:'poison',amount:3}] },
  goblin:  { id:'goblin', name:'Goblin', img:'enemy_goblin', hp:[12,15], dodge:1,
    moves:[{type:'attack',hits:[5]},{type:'attack',hits:[3,3]}] },
  skeleton:{ id:'skeleton', name:'Skeleton', img:'enemy_skeleton', hp:[18,22], armor:4,
    moves:[{type:'attack',hits:[9]},{type:'buff',value:6}] },
  archer:  { id:'archer', name:'Bandit Archer', img:'enemy_bandit', hp:[12,15], distant:true,
    moves:[{type:'attack',hits:[7]},{type:'attack',hits:[4,4]}] },
  orc:     { id:'orc', name:'Orc Warlord', img:'enemy_orc', hp:[44,50], armor:6, elite:true,
    moves:[{type:'attack',hits:[13]},{type:'attack',hits:[6,6]},{type:'buff',value:8}] },
  lich:    { id:'lich', name:'The Lich Lord', img:'enemy_lich', hp:[90,90], dodge:2, boss:true,
    moves:[{type:'attack',hits:[18]},{type:'attack',hits:[9,9]},{type:'attack_status',hits:[7],status:'poison',amount:4},{type:'attack',hits:[6,6,6]}] },
};
export const COMMON_ENEMIES = ['goblin','skeleton','archer','slime'];
export const ELITE_GROUPS = [['orc'],['orc','goblin'],['mage','skeleton'],['mage','archer']];

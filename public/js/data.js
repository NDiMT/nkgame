// Static game data: cards and enemies. Effects are declarative ({op,value})
// so the engine can interpret them — no eval, easy to extend.

// op values the engine understands:
//   damage, damageAll, block, draw, vulnerable (enemy), weak (enemy),
//   strength (self), heal (self)

export const CARDS = {
  strike: { id: 'strike', name: 'Χτύπημα', cost: 1, type: 'attack', img: 'card_strike',
    desc: 'Κάνε 6 ζημιά.', effects: [{ op: 'damage', value: 6 }] },
  defend: { id: 'defend', name: 'Άμυνα', cost: 1, type: 'skill', img: 'card_defend',
    desc: 'Κέρδισε 5 ασπίδα.', effects: [{ op: 'block', value: 5 }] },
  bash: { id: 'bash', name: 'Σύνθλιψη', cost: 2, type: 'attack', img: 'card_bash',
    desc: 'Κάνε 8 ζημιά. Εφάρμοσε 2 Ευάλωτο.', effects: [{ op: 'damage', value: 8 }, { op: 'vulnerable', value: 2 }] },
  cleave: { id: 'cleave', name: 'Διχοτόμηση', cost: 1, type: 'attack', img: 'card_cleave',
    desc: 'Κάνε 7 ζημιά σε ΟΛΟΥΣ.', effects: [{ op: 'damageAll', value: 7 }] },
  ironwave: { id: 'ironwave', name: 'Σιδερένιο Κύμα', cost: 1, type: 'attack', img: 'card_ironwave',
    desc: 'Κάνε 5 ζημιά. Κέρδισε 5 ασπίδα.', effects: [{ op: 'damage', value: 5 }, { op: 'block', value: 5 }] },
  pommel: { id: 'pommel', name: 'Λαβή Σπαθιού', cost: 1, type: 'attack', img: 'card_pommel',
    desc: 'Κάνε 6 ζημιά. Τράβα 1 κάρτα.', effects: [{ op: 'damage', value: 6 }, { op: 'draw', value: 1 }] },
  heavyblade: { id: 'heavyblade', name: 'Βαριά Λεπίδα', cost: 2, type: 'attack', img: 'card_heavyblade',
    desc: 'Κάνε 14 ζημιά.', effects: [{ op: 'damage', value: 14 }] },
  shrug: { id: 'shrug', name: 'Αψήφισέ το', cost: 1, type: 'skill', img: 'card_shrug',
    desc: 'Κέρδισε 8 ασπίδα. Τράβα 1 κάρτα.', effects: [{ op: 'block', value: 8 }, { op: 'draw', value: 1 }] },
  warcry: { id: 'warcry', name: 'Πολεμική Κραυγή', cost: 1, type: 'power', img: 'card_warcry',
    desc: 'Κέρδισε 2 Δύναμη.', effects: [{ op: 'strength', value: 2 }] },
  bandage: { id: 'bandage', name: 'Επίδεσμος', cost: 1, type: 'skill', img: 'card_bandage',
    desc: 'Γιατρέψου 7.', effects: [{ op: 'heal', value: 7 }] },
  enfeeble: { id: 'enfeeble', name: 'Εξασθένηση', cost: 1, type: 'skill', img: 'card_enfeeble',
    desc: 'Εφάρμοσε 2 Αδυναμία.', effects: [{ op: 'weak', value: 2 }] },
  whirlwind: { id: 'whirlwind', name: 'Ανεμοστρόβιλος', cost: 2, type: 'attack', img: 'card_whirlwind',
    desc: 'Κάνε 5 ζημιά σε ΟΛΟΥΣ δύο φορές.', effects: [{ op: 'damageAll', value: 5 }, { op: 'damageAll', value: 5 }] },
};

// Starting deck for the Knight.
export const STARTER_DECK = ['strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'bash'];

// Cards offered as combat rewards.
export const REWARD_POOL = ['cleave', 'ironwave', 'pommel', 'heavyblade', 'shrug', 'warcry', 'bandage', 'enfeeble', 'whirlwind'];

// intents: { type:'attack'|'block'|'buff'|'attack_debuff', value, debuff }
export const ENEMIES = {
  slime: { id: 'slime', name: 'Πράσινο Σλάιμ', img: 'enemy_slime', hp: [13, 16],
    moves: [{ type: 'attack', value: 6 }, { type: 'attack_debuff', value: 4, debuff: 'weak', amount: 1 }] },
  bat: { id: 'bat', name: 'Νυχτερίδα', img: 'enemy_bat', hp: [10, 12],
    moves: [{ type: 'attack', value: 4 }, { type: 'attack', value: 7 }] },
  skeleton: { id: 'skeleton', name: 'Σκελετός', img: 'enemy_skeleton', hp: [18, 22],
    moves: [{ type: 'attack', value: 9 }, { type: 'block', value: 8 }] },
  orc: { id: 'orc', name: 'Ορκ Πολεμιστής', img: 'enemy_orc', hp: [42, 48], elite: true,
    moves: [{ type: 'attack', value: 12 }, { type: 'buff', value: 3 }, { type: 'attack', value: 8 }] },
  lich: { id: 'lich', name: 'Ο Λιτς Άρχοντας', img: 'enemy_lich', hp: [80, 80], boss: true,
    moves: [{ type: 'attack', value: 16 }, { type: 'attack_debuff', value: 10, debuff: 'vulnerable', amount: 2 }, { type: 'buff', value: 4 }] },
};

// Which enemies can appear in normal combats (1-2 of these).
export const COMMON_ENEMIES = ['slime', 'bat', 'skeleton'];

// High-quality AI pixel art for EVERYTHING via Gemini. Dark, detailed,
// Card Quest-style. Run: GEMINI_API_KEY=... node tools/gen-ai-art.js
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'assets', 'img');

async function loadEnv() {
  const p = path.join(ROOT, '.env'); if (!existsSync(p)) return;
  for (const line of (await readFile(p, 'utf8')).split('\n')) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}

const STYLE = 'detailed 16-bit SNES JRPG pixel art, dark moody dungeon fantasy, rich shading and dramatic lighting, strong black outline, limited muted dark palette, centered subject, plain very dark background, no text, no UI, no watermark';
const ICON_STYLE = 'detailed 16-bit pixel-art game item icon, dark fantasy, rich shading, strong black outline, limited muted palette, centered single object, plain very dark background, no text';

const CARDS = {
  card_slash:'a gleaming steel longsword slashing', card_cleave:'a heavy battle axe mid-swing', card_finisher:'a glowing golden executioner greatsword',
  card_heavy:'a massive two-handed iron greatsword', card_throwknife:'a spinning thrown dagger', card_block:'an iron-rimmed wooden round shield raised',
  card_brace:'a knight shield with a small red heart emblem', card_focus:'an open glowing spell scroll', card_spark:'a crackling blue electric spark',
  card_lightning:'a forked yellow-white lightning bolt', card_fireball:'a blazing orange fireball', card_arcanebolt:'a glowing purple arcane energy orb',
  card_blink:'a swirl of cyan teleport magic', card_magicshield:'a glowing blue hexagonal magic barrier', card_insight:'a purple glowing arcane spellbook',
  card_backstab:'a dark curved assassin dagger', card_poisonblade:'a dagger dripping green poison', card_eviscerate:'two crossed bloody daggers',
  card_smokebomb:'a burst of grey smoke', card_trickdodge:'a swirling golden evasion motion', card_shoot:'a single wooden arrow', card_volley:'two arrows in flight',
  card_aimedshot:'a red and gold targeting reticle', card_multishot:'three arrows in a spread', card_takeaim:'a hunter eye with a focus reticle',
  card_trap:'a metal spiked snare bear trap', card_dodgeroll:'a green swirling dodge-roll motion',
};
const ENEMIES = {
  enemy_slime:'a glossy dark-green gelatinous slime monster with menacing eyes', enemy_mage:'a sinister hooded dark mage with a glowing purple staff',
  enemy_goblin:'a vicious green goblin with a rusty dagger and big ears', enemy_skeleton:'an undead skeleton warrior with sword and shield, glowing eye sockets',
  enemy_bandit:'a hooded bandit archer drawing a longbow', enemy_orc:'a hulking brutish orc warlord wielding a huge axe',
  enemy_lich:'an undead lich sorcerer-king with a dark crown, tattered robes and glowing cyan eyes, final boss',
};
const CLASSES = {
  class_fighter:'a stalwart armored knight hero portrait, sword and shield, determined', class_wizard:'a robed wizard hero portrait with a glowing staff and pointed hat',
  class_rogue:'a hooded rogue assassin hero portrait with twin daggers and a sly grin', class_hunter:'a ranger hunter hero portrait with a longbow, green hood and quiver',
};
const NODES = {
  node_battle:'crossed swords battle icon', node_elite:'a menacing horned skull icon', node_rest:'a cozy campfire icon',
  node_treasure:'a golden treasure chest icon', node_shop:'a merchant coin pouch with gold coins icon', node_boss:'a fearsome dragon skull crown boss icon',
};

let ai; async function client(){ if(ai) return ai; const { GoogleGenAI } = await import('@google/genai'); ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); return ai; }
async function gen(prompt, name, w, h, style) {
  const c = await client();
  for (let a=1;a<=3;a++) {
    try {
      const res = await c.models.generateContent({ model:'gemini-2.5-flash-image', contents:`${prompt}. ${style}` });
      const part = (res?.candidates?.[0]?.content?.parts ?? []).find(p=>p.inlineData?.data);
      if (!part) throw new Error('no image');
      const info = await sharp(Buffer.from(part.inlineData.data,'base64')).resize(w,h,{fit:'cover'}).jpeg({quality:88}).toFile(path.join(OUT,`${name}.jpg`));
      return info.size;
    } catch(e){ if(a===3) throw e; await new Promise(r=>setTimeout(r, 1500)); }
  }
}

async function main() {
  await loadEnv(); if(!process.env.GEMINI_API_KEY) throw new Error('no key'); await mkdir(OUT,{recursive:true});
  const jobs = [
    ['cover','an epic dark dungeon-crawler title scene: a hooded hero descending torchlit stone stairs toward a looming dragon, dramatic',384,384,STYLE],
    ['bg_battle','a dark dungeon interior battle backdrop: stone brick walls, lit torches, shadowy, atmospheric, no characters',384,512,STYLE],
    ...Object.entries(CLASSES).map(([k,p])=>[k,p,208,208,STYLE]),
    ...Object.entries(ENEMIES).map(([k,p])=>[k,p,200,200,STYLE]),
    ...Object.entries(NODES).map(([k,p])=>[k,p,120,120,ICON_STYLE]),
    ...Object.entries(CARDS).map(([k,p])=>[k,p,168,126,ICON_STYLE]),
  ];
  let ok=0,total=0;
  for (const [name,prompt,w,h,style] of jobs) {
    process.stdout.write(`${name} ... `);
    try { const b=await gen(prompt,name,w,h,style); ok++; total+=b; console.log(`ok ${(b/1024).toFixed(0)}KB`); }
    catch(e){ console.log('FAIL '+e.message); }
  }
  console.log(`\n${ok}/${jobs.length} images, ${(total/1024).toFixed(0)}KB`);
}
main().catch(e=>{ console.error(e.message); process.exit(1); });

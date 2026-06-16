// Pixel-art generator: one image per card + enemy + a cover, via Gemini.
// Downscaled with nearest-neighbour so pixels stay crisp.
//
//   GEMINI_API_KEY=... npm run gen-art
// (the key is also read from .env)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CARDS, ENEMIES } from '../public/js/data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'assets', 'img');

async function loadEnv() {
  const p = path.join(ROOT, '.env');
  if (!existsSync(p)) return;
  for (const line of (await readFile(p, 'utf8')).split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const STYLE =
  '16-bit pixel art, retro SNES JRPG style, bold limited palette, crisp clean pixels, dark dungeon fantasy mood, strong outline, centered subject, simple dark background, no text, no watermark';

// Visual prompt per card id (the card art).
const CARD_PROMPTS = {
  slash: 'a gleaming steel sword mid-slash with a slash arc',
  jab: 'a quick thrusting dagger jab with a motion streak',
  heavy: 'a massive two-handed greatsword crashing down',
  cleave: 'a broad battle axe sweeping in a wide arc',
  finisher: 'a glowing executioner sword strike, dramatic finisher',
  focus: 'a meditating warrior with a calm glowing blue aura',
  block: 'a sturdy iron-rimmed round shield raised in guard',
  dodge: 'an agile rogue leaping aside dodging, motion blur',
  parry: 'two swords clashing in a sparking parry',
  brace: 'a kneeling knight bracing behind a tower shield',
};

const ENEMY_PROMPTS = {
  goblin: 'a small green goblin with a jagged dagger and big ears, sneaky',
  skeleton: 'an undead skeleton warrior holding a rusty sword and shield',
  bandit: 'a hooded human bandit with twin daggers and a mask, agile',
  orc: 'a huge muscular brutish orc warlord wielding a giant axe, intimidating elite boss',
  lich: 'an undead lich sorcerer king with glowing cyan eyes, tattered robes and a dark crown, menacing final boss',
};

let ai, MODEL = 'gemini-2.5-flash-image';
async function client() {
  if (ai) return ai;
  const { GoogleGenAI } = await import('@google/genai');
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return ai;
}

async function gen(prompt, outName, w, h) {
  const c = await client();
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await c.models.generateContent({ model: MODEL, contents: `${prompt}. ${STYLE}` });
      const part = (res?.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data);
      if (!part) throw new Error('no image');
      const info = await sharp(Buffer.from(part.inlineData.data, 'base64'))
        .resize(w, h, { fit: 'cover', kernel: 'nearest' })
        .jpeg({ quality: 88 })
        .toFile(path.join(OUT, `${outName}.jpg`));
      return info.size;
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
}

async function main() {
  await loadEnv();
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing (.env)');
  await mkdir(OUT, { recursive: true });

  let total = 0;
  const jobs = [
    ['cover', 'A hooded knight descending stone stairs into a torchlit dungeon, treasure chest and a looming dragon shadow, epic title splash', 256, 256],
    ...Object.values(CARDS).map((c) => [c.img, CARD_PROMPTS[c.id], 160, 120]),
    ...Object.values(ENEMIES).map((e) => [e.img, ENEMY_PROMPTS[e.id], 160, 160]),
  ];

  for (const [name, prompt, w, h] of jobs) {
    process.stdout.write(`art ${name} ... `);
    try {
      const b = await gen(prompt, name, w, h);
      total += b;
      console.log(`ok ${(b / 1024).toFixed(0)}KB`);
    } catch (e) {
      console.log('FAIL ' + e.message);
    }
  }
  console.log(`\nTotal: ${(total / 1024).toFixed(0)}KB → ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => {
  console.error('Generation failed:', e.message);
  process.exit(1);
});

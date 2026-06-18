// Gemini sprite generator for the castle-defense game. Generates pixel-art on a
// green chroma screen, then keys out the green → transparent PNG sprites the
// canvas game can blit. Backgrounds/cover are plain JPEG. Run:
//   GEMINI_API_KEY=... node tools/gen-sprites.js
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const OUT = path.join(ROOT, 'public', 'assets');

async function loadEnv() { const p = ROOT + '/.env'; if (!existsSync(p)) return; for (const l of (await readFile(p,'utf8')).split('\n')) { const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m&&!process.env[m[1]]) process.env[m[1]]=m[2]; } }

const STYLE = '16-bit pixel art game sprite, bold thick solid black outline, clean readable silhouette, dark fantasy, vivid but moody colors, rich shading and detail, single centered subject, full body, flat lighting, NO shadow on ground, NO text';
const GREEN = 'isolated on a completely solid, flat, uniform bright magenta background color rgb(255,0,255) that fully fills the frame behind the subject';

let ai; async function client(){ if(ai) return ai; const {GoogleGenAI}=await import('@google/genai'); ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY}); return ai; }

async function raw(prompt) {
  const c = await client();
  for (let a=1;a<=3;a++){ try {
    const r = await c.models.generateContent({ model:'gemini-2.5-flash-image', contents: prompt });
    const part=(r?.candidates?.[0]?.content?.parts??[]).find(p=>p.inlineData?.data);
    if(!part) throw new Error('no image'); return Buffer.from(part.inlineData.data,'base64');
  } catch(e){ if(a===3) throw e; await new Promise(r=>setTimeout(r,1500)); } }
}

// keyed transparent PNG sprite — flood-fill the background from the borders
async function sprite(name, desc, w, h) {
  process.stdout.write(name+' ... ');
  try {
    const { data, info } = await sharp(await raw(`${desc}. ${STYLE}. ${GREEN}.`)).resize(w, h, { fit:'cover' }).ensureAlpha().raw().toBuffer({ resolveWithObject:true });
    const W = info.width, H = info.height; const idx = (x,y)=>(y*W+x)*4;
    const bg = [data[0], data[1], data[2]]; const tol = 100;
    const near = (i)=> Math.abs(data[i]-bg[0]) + Math.abs(data[i+1]-bg[1]) + Math.abs(data[i+2]-bg[2]) < tol;
    const st = []; const push = (x,y)=>{ if (x<0||y<0||x>=W||y>=H) return; const i=idx(x,y); if (data[i+3]===0) return; if (near(i)) { data[i+3]=0; st.push(x,y); } };
    for (let x=0;x<W;x++){ push(x,0); push(x,H-1); } for (let y=0;y<H;y++){ push(0,y); push(W-1,y); }
    while (st.length){ const y=st.pop(), x=st.pop(); push(x+1,y); push(x-1,y); push(x,y+1); push(x,y-1); }
    await sharp(data, { raw:{width:W,height:H,channels:4} }).png().toFile(path.join(OUT,`${name}.png`));
    console.log('ok'); return true;
  } catch(e){ console.log('FAIL '+e.message); return false; }
}
// plain JPEG (no key)
async function plain(name, desc, w, h, style) {
  process.stdout.write(name+' ... ');
  try { const buf = await raw(`${desc}. ${style}`); await sharp(buf).resize(w,h,{fit:'cover'}).jpeg({quality:86}).toFile(path.join(OUT,`${name}.jpg`)); console.log('ok'); return true; }
  catch(e){ console.log('FAIL '+e.message); return false; }
}

async function main() {
  await loadEnv(); if(!process.env.GEMINI_API_KEY) throw new Error('no key'); await mkdir(OUT,{recursive:true});
  await plain('ground', 'seamless top-down dark battlefield ground: cracked dirt and dark grass, gloomy, tileable', 256, 256, '16-bit pixel art, dark muted palette, no text');
  await plain('cover', 'an epic castle under siege at night: a lone stone keep with a banner surrounded by a horde of monsters, dramatic moonlight', 384, 256, STYLE.replace('single centered subject, full body','wide scene'));
  await sprite('castle', 'a sturdy stone castle keep tower with battlements and a red banner, front view, the fortress you defend', 132, 132);
  await sprite('hero', 'a heroic knight defender in blue armor holding a sword and shield, top-down three-quarter view', 48, 48);
  await sprite('enemy_goblin', 'a small vicious green goblin grunt charging with a club', 40, 40);
  await sprite('enemy_zombie', 'a rotting green-grey zombie monster shambling, arms out', 40, 40);
  await sprite('enemy_bat', 'a fast purple demon bat with sharp fangs, wings spread', 34, 34);
  await sprite('enemy_brute', 'a huge armored ogre brute with a massive club, hulking', 64, 64);
  await sprite('boss', 'a giant horned demon warlord boss wreathed in dark fire, menacing', 96, 96);
  await sprite('gem', 'a single glowing cyan-green experience crystal gem, faceted', 16, 16);
  await sprite('bolt', 'a glowing golden magic energy bolt projectile, small orb with trail', 22, 22);
  await sprite('turret', 'a round stone turret base mount platform with a metal pivot ring on top, top-down view, NO cannon barrel, just the circular base', 40, 40);
  console.log('done');
}
main().catch(e=>{ console.error(e.message); process.exit(1); });

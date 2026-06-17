// Free code-drawn pixel sprites (transparent PNG) for the castle-defense game.
// Same filenames as gen-sprites.js, so Gemini art can overwrite them later.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
const OUT = new URL('../public/assets/', import.meta.url).pathname;

function C(w, h) { return { w, h, b: new Uint8Array(w * h * 4) }; }
const isT = (c, x, y) => c.b[(y * c.w + x) * 4 + 3] === 0;
function px(c, x, y, col, a = 255) { x|=0; y|=0; if (x<0||y<0||x>=c.w||y>=c.h) return; const i=(y*c.w+x)*4; c.b[i]=col[0]; c.b[i+1]=col[1]; c.b[i+2]=col[2]; c.b[i+3]=a; }
function rect(c, x, y, w, h, col) { for (let j=0;j<h;j++) for (let i=0;i<w;i++) px(c,x+i,y+j,col); }
function disc(c, cx, cy, r, col) { for (let y=Math.ceil(cy-r);y<=cy+r;y++) for (let x=Math.ceil(cx-r);x<=cx+r;x++){ const dx=x-cx,dy=y-cy; if (dx*dx+dy*dy<=r*r) px(c,x,y,col); } }
function ell(c, cx, cy, rx, ry, col) { for (let y=Math.ceil(cy-ry);y<=cy+ry;y++) for (let x=Math.ceil(cx-rx);x<=cx+rx;x++){ const dx=(x-cx)/rx,dy=(y-cy)/ry; if (dx*dx+dy*dy<=1) px(c,x,y,col); } }
function tri(c, x, y, w, h, col, up = true) { for (let j=0;j<h;j++){ const ww=Math.round(w*(up?(h-j)/h:(j+1)/h)); rect(c, x+((w-ww)>>1), y+j, ww, 1, col); } }

function shadeOutline(c) {
  for (let y=0;y<c.h;y++) for (let x=0;x<c.w;x++){ if (isT(c,x,y)) continue; let f=y<c.h*0.32?1.14:(y>c.h*0.66?0.8:1); if (f!==1){ const i=(y*c.w+x)*4; c.b[i]=Math.min(255,c.b[i]*f); c.b[i+1]=Math.min(255,c.b[i+1]*f); c.b[i+2]=Math.min(255,c.b[i+2]*f); } }
  const out=[]; for (let y=0;y<c.h;y++) for (let x=0;x<c.w;x++){ if (!isT(c,x,y)) continue; if ([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const nx=x+dx,ny=y+dy; return nx>=0&&ny>=0&&nx<c.w&&ny<c.h&&!isT(c,nx,ny);})) out.push([x,y]); }
  for (const [x,y] of out) px(c,x,y,[12,10,18]);
}
const png = (c, name) => sharp(Buffer.from(c.b), { raw:{width:c.w,height:c.h,channels:4} }).png().toFile(OUT + name + '.png');

const K = { hero:[70,150,235], heroD:[40,95,165], skin:[226,170,120], steel:[205,214,230], steelD:[120,130,150],
  stone:[150,150,162], stoneD:[96,96,110], roof:[170,60,54], flag:[210,70,64], green:[96,176,86], greenD:[52,108,52],
  zomb:[120,150,90], bat:[140,96,200], brute:[200,96,70], bruteD:[120,48,36], boss:[150,70,200], bossD:[92,40,130],
  gem:[90,225,150], gemH:[200,255,220], gold:[235,200,90], eye:[20,16,28], red:[210,70,64] };

function hero() { const c=C(48,48); ell(c,24,32,12,13,K.hero); rect(c,12,30,24,12,K.heroD); disc(c,24,16,9,K.skin); ell(c,24,9,11,5,K.steel); rect(c,13,8,22,3,K.steelD); px(c,20,16,K.eye); px(c,28,16,K.eye); // sword + shield
  rect(c,38,14,3,22,K.steel); rect(c,36,12,7,3,K.gold); ell(c,9,30,5,7,K.steelD); ell(c,9,30,3,5,K.steel); shadeOutline(c); return png(c,'hero'); }

function castle() { const c=C(132,132); rect(c,18,46,96,80,K.stone); // body
  for (let i=0;i<6;i++) rect(c,18+i*18,38,12,10,K.stone); // battlements
  rect(c,30,86,24,40,K.stoneD); ell(c,42,86,12,12,K.stoneD); // gate
  rect(c,74,64,18,18,K.stoneD); rect(c,40,60,16,16,K.stoneD); // windows
  for (let y=46;y<126;y+=8) rect(c,18,y,96,1,K.stoneD); // brick lines
  // tower + roof + flag
  rect(c,54,16,24,30,K.stone); for (let i=0;i<3;i++) rect(c,54+i*9,10,6,8,K.stone); tri(c,50,-2,32,18,K.roof);
  rect(c,66,2,2,16,[120,90,60]); rect(c,68,3,14,8,K.flag); shadeOutline(c); return png(c,'castle'); }

function humanoid(name, w, body, head) { const c=C(w,w); const cx=w/2; ell(c,cx,w*0.66,w*0.30,w*0.32,body); rect(c,cx-w*0.28,w*0.6,w*0.56,w*0.28,body); disc(c,cx,w*0.32,w*0.24,head); px(c,cx-w*0.12,w*0.30,K.eye); px(c,cx+w*0.12,w*0.30,K.eye); shadeOutline(c); return png(c,name); }

function goblin(){ const c=C(40,40); ell(c,20,26,11,12,K.green); rect(c,9,24,22,10,K.greenD); disc(c,20,13,9,K.green); ell(c,7,11,4,2.5,K.green); ell(c,33,11,4,2.5,K.green); px(c,16,13,K.red); px(c,24,13,K.red); rect(c,16,16,8,1,K.eye); rect(c,30,22,3,12,[120,82,44]); shadeOutline(c); return png(c,'enemy_goblin'); }
function bat(){ const c=C(34,34); disc(c,17,18,6,K.bat); ell(c,6,16,6,3.5,K.bat); ell(c,28,16,6,3.5,K.bat); px(c,15,17,K.red); px(c,19,17,K.red); shadeOutline(c); return png(c,'enemy_bat'); }
function brute(){ const c=C(64,64); ell(c,32,40,18,20,K.brute); rect(c,12,36,40,18,K.bruteD); disc(c,32,18,12,K.brute); px(c,26,18,K.red); px(c,38,18,K.red); rect(c,24,24,16,2,K.eye); rect(c,8,30,8,20,K.bruteD); rect(c,48,30,8,20,K.bruteD); shadeOutline(c); return png(c,'enemy_brute'); }
function boss(){ const c=C(96,96); ell(c,48,58,28,30,K.boss); rect(c,16,52,64,30,K.bossD); disc(c,48,26,18,K.boss); for (let i=0;i<2;i++){ tri(c, i?60:24, 4, 14, 16, K.bossD); } px(c,40,26,K.red); px(c,56,26,K.red); disc(c,40,26,3,K.red); disc(c,56,26,3,K.red); rect(c,38,34,20,3,K.eye); shadeOutline(c); return png(c,'boss'); }

function gem(){ const c=C(16,16); for (let y=0;y<16;y++){ const hw=Math.round(7-Math.abs(y-7.5)); if(hw>0) rect(c,8-hw,y,hw*2,1,K.gem); } rect(c,6,4,2,2,K.gemH); shadeOutline(c); return png(c,'gem'); }
function bolt(){ const c=C(22,22); disc(c,11,11,6,K.gold); disc(c,11,11,3,K.gemH); shadeOutline(c); return png(c,'bolt'); }
function turret(){ const c=C(40,40); rect(c,8,22,24,14,K.stone); ell(c,20,22,12,6,K.stoneD); rect(c,18,8,18,5,[80,80,92]); disc(c,18,30,3,K.gold); shadeOutline(c); return png(c,'turret'); }

async function ground() { const w=256,h=256,c=C(w,h); for (let y=0;y<h;y++) for (let x=0;x<w;x++){ const n=((Math.sin(x*0.21)+Math.cos(y*0.18)+Math.sin((x+y)*0.07))); const base= n>0.6? [44,52,36] : n<-0.7? [42,34,28] : [34,40,30]; px(c,x,y, base, 255); if ((x*7+y*13)%97===0) px(c,x,y,[26,30,22]); } await sharp(Buffer.from(c.b),{raw:{width:w,height:h,channels:4}}).jpeg({quality:80}).toFile(OUT+'ground.jpg'); }
async function cover() { const w=384,h=256,c=C(w,h); for (let y=0;y<h;y++) for (let x=0;x<w;x++) px(c,x,y, y>h*0.62?[30,34,26]:[18,16,30],255); disc(c,w-70,60,30,[60,60,110]); // moon
  // castle silhouette center
  rect(c,150,120,84,90,[40,40,52]); rect(c,178,90,28,30,[40,40,52]); tri(c,172,68,40,24,[120,46,42]); rect(c,196,72,2,18,[120,90,60]); rect(c,198,73,18,9,K.flag);
  for (let i=0;i<22;i++){ const x=10+i*17; disc(c,x,200+(i%3)*8,5,[70,40,60]); } // horde
  await sharp(Buffer.from(c.b),{raw:{width:w,height:h,channels:4}}).jpeg({quality:84}).toFile(OUT+'cover.jpg'); }

async function main() {
  await mkdir(OUT, { recursive: true });
  await hero(); await castle(); await goblin(); await humanoid('enemy_zombie',40,K.zomb,K.zomb); await bat(); await brute(); await boss();
  await gem(); await bolt(); await turret(); await ground(); await cover();
  console.log('code sprites written');
}
main();

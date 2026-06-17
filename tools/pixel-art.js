// Hand-coded pixel-art generator — no external API. Draws sprites pixel by
// pixel into an RGBA buffer, then upscales with nearest-neighbour (crisp pixels)
// and writes a JPEG. This is art generated purely in code.
import sharp from 'sharp';

const W = 32, H = 32, BG = [20, 16, 26];

function canvas() { const b = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) { b[i*4]=BG[0]; b[i*4+1]=BG[1]; b[i*4+2]=BG[2]; b[i*4+3]=255; } return b; }
function px(b, x, y, c) { if (x<0||y<0||x>=W||y>=H) return; const i=(y*W+x)*4; b[i]=c[0]; b[i+1]=c[1]; b[i+2]=c[2]; b[i+3]=255; }
function ellipse(b, cx, cy, rx, ry, c) { for (let y=0;y<H;y++) for (let x=0;x<W;x++){ const dx=(x-cx)/rx, dy=(y-cy)/ry; if (dx*dx+dy*dy<=1) px(b,x,y,c); } }
function disc(b, cx, cy, r, c) { ellipse(b, cx, cy, r, r, c); }
function rect(b, x0, y0, w, h, c) { for (let y=y0;y<y0+h;y++) for (let x=x0;x<x0+w;x++) px(b,x,y,c); }
async function save(b, name) { await sharp(Buffer.from(b), { raw: { width: W, height: H, channels: 4 } }).resize(160, 160, { kernel: 'nearest' }).jpeg({ quality: 88 }).toFile(`public/assets/img/${name}.jpg`); console.log('drew', name); }

// ---- Slime ----------------------------------------------------------------
function slime() {
  const b = canvas();
  ellipse(b, 16, 21, 12, 9, [22, 90, 40]);   // outline
  ellipse(b, 16, 21, 10.5, 7.6, [63, 174, 84]); // body
  ellipse(b, 12, 17, 5, 3, [126, 224, 138]);  // highlight
  // eyes
  disc(b, 12, 20, 2, [255, 255, 255]); disc(b, 20, 20, 2, [255, 255, 255]);
  disc(b, 12, 21, 1, [20, 20, 20]); disc(b, 20, 21, 1, [20, 20, 20]);
  // shine + mouth
  px(b, 11, 19, [255,255,255]); px(b, 19, 19, [255,255,255]);
  rect(b, 14, 24, 4, 1, [22, 90, 40]);
  return save(b, 'enemy_slime');
}

// ---- Dark Mage ------------------------------------------------------------
function mage() {
  const b = canvas();
  const robe = [58, 42, 90], robeO = [32, 22, 58], hood = [70, 52, 110];
  // robe (widening trapezoid)
  for (let y = 13; y <= 30; y++) { const w = Math.min(13, 3 + (y - 13)); rect(b, 16 - w, y, w * 2, 1, robe); px(b, 16 - w - 1, y, robeO); px(b, 16 + w, y, robeO); }
  // hood
  ellipse(b, 16, 11, 7, 7, hood); ellipse(b, 16, 8, 6, 4, robeO);
  // face shadow + glowing eyes
  ellipse(b, 16, 13, 4, 5, [10, 7, 16]);
  px(b, 14, 13, [120, 230, 255]); px(b, 18, 13, [120, 230, 255]); px(b,14,14,[80,180,220]); px(b,18,14,[80,180,220]);
  // staff + orb
  for (let y = 7; y <= 30; y++) px(b, 25, y, [110, 74, 42]);
  disc(b, 25, 6, 3, [111, 224, 255]); disc(b, 25, 6, 1, [235, 255, 255]);
  return save(b, 'enemy_mage');
}

await slime();
await mage();
console.log('done');

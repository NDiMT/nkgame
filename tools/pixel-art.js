// Full hand-coded pixel-art generator — NO external API. Draws every sprite,
// card icon, hero portrait, cover and background pixel-by-pixel, then upscales
// nearest-neighbour via sharp. Run: node tools/pixel-art.js
import sharp from 'sharp';

const BG = [12, 10, 16];
// palette — darker, muted, Card Quest-like
const P = {
  steel:[168,180,198], steelD:[88,98,120], gold:[198,162,72], goldD:[110,84,28],
  wood:[118,80,44], woodD:[70,46,24], leather:[104,74,46], bone:[200,194,172], boneD:[132,124,100],
  green:[68,150,78], greenD:[30,86,42], poison:[120,190,86], red:[182,64,56], redD:[96,30,28],
  fire:[220,124,40], fireC:[244,196,108], arc:[124,90,206], arcC:[176,148,236], cyan:[96,196,234],
  white:[222,224,234], black:[8,7,12], grey:[118,120,132], greyD:[66,68,80], skin:[198,148,110],
  purple:[78,56,116], purpleD:[42,28,70], crown:[204,174,74], shadow:[8,6,12],
};

function C(w = 32, h = 32) { const buf = new Uint8Array(w * h * 4); for (let i = 0; i < w * h; i++) { buf[i*4]=BG[0]; buf[i*4+1]=BG[1]; buf[i*4+2]=BG[2]; buf[i*4+3]=255; } return { w, h, buf }; }
function px(c, x, y, col) { x|=0; y|=0; if (x<0||y<0||x>=c.w||y>=c.h) return; const i=(y*c.w+x)*4; c.buf[i]=col[0]; c.buf[i+1]=col[1]; c.buf[i+2]=col[2]; c.buf[i+3]=255; }
function rect(c, x, y, w, h, col) { for (let j=0;j<h;j++) for (let i=0;i<w;i++) px(c,x+i,y+j,col); }
function ell(c, cx, cy, rx, ry, col) { for (let y=Math.ceil(cy-ry);y<=cy+ry;y++) for (let x=Math.ceil(cx-rx);x<=cx+rx;x++){ const dx=(x-cx)/rx, dy=(y-cy)/ry; if (dx*dx+dy*dy<=1) px(c,x,y,col); } }
const disc = (c,cx,cy,r,col) => ell(c,cx,cy,r,r,col);
function line(c, x0, y0, x1, y1, col, t = 1) { x0|=0;y0|=0;x1|=0;y1|=0; const dx=Math.abs(x1-x0), dy=-Math.abs(y1-y0), sx=x0<x1?1:-1, sy=y0<y1?1:-1; let err=dx+dy; for(;;){ disc(c,x0,y0,t/2,col); if(x0===x1&&y0===y1)break; const e2=2*err; if(e2>=dy){err+=dy;x0+=sx;} if(e2<=dx){err+=dx;y0+=sy;} } }
const isBg = (c, x, y) => { const i=(y*c.w+x)*4; return c.buf[i]===BG[0] && c.buf[i+1]===BG[1] && c.buf[i+2]===BG[2]; };
// directional shading: highlight the top, shadow the bottom of filled pixels → depth
function shade(c) {
  for (let y=0;y<c.h;y++) for (let x=0;x<c.w;x++) {
    if (isBg(c,x,y)) continue;
    let f = 1; if (y < c.h*0.30) f = 1.14; else if (y > c.h*0.64) f = 0.78;
    if (f === 1) continue;
    const i=(y*c.w+x)*4;
    c.buf[i]=Math.max(0,Math.min(255,c.buf[i]*f))|0; c.buf[i+1]=Math.max(0,Math.min(255,c.buf[i+1]*f))|0; c.buf[i+2]=Math.max(0,Math.min(255,c.buf[i+2]*f))|0;
  }
}
// crisp black outline around the silhouette (and internal holes) → 90s look
function outline(c) {
  const todo=[];
  for (let y=0;y<c.h;y++) for (let x=0;x<c.w;x++) {
    if (!isBg(c,x,y)) continue;
    if ([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const nx=x+dx,ny=y+dy; return nx>=0&&ny>=0&&nx<c.w&&ny<c.h&&!isBg(c,nx,ny);})) todo.push([x,y]);
  }
  for (const [x,y] of todo) px(c,x,y,P.black);
}
async function save(c, name) { shade(c); outline(c); await sharp(Buffer.from(c.buf), { raw:{width:c.w,height:c.h,channels:4} }).resize(c.w*6, c.h*6, { kernel:'nearest' }).jpeg({ quality:88 }).toFile(`public/assets/img/${name}.jpg`); }

// vignette/edge for portraits
function frame(c, col) { for (let x=0;x<c.w;x++){px(c,x,0,col);px(c,x,c.h-1,col);} for (let y=0;y<c.h;y++){px(c,0,y,col);px(c,c.w-1,y,col);} }

// ===== Card icons (32x32) ==================================================
function bladeUp(c, x, top, bot, col, edge) { for (let y=top;y<=bot;y++){ const w = y<top+2?1:2; rect(c,x-w,y,w*2,1,col); px(c,x-w-1,y,edge); px(c,x+w,y,edge); } }
function iconSword(c, col=P.steel, hilt=P.gold) { bladeUp(c,16,6,21,col,P.steelD); rect(c,11,21,10,2,hilt); rect(c,15,23,2,6,P.wood); disc(c,16,29,1.4,hilt); return c; }
function iconBigSword(c, col=P.steel) { for(let y=5;y<=22;y++){const w=y<7?1:3; rect(c,16-w,y,w*2,1,col); px(c,16-w-1,y,P.steelD); px(c,16+w,y,P.steelD);} rect(c,9,22,14,2,P.gold); rect(c,15,24,2,6,P.wood); disc(c,16,30,1.6,P.gold); return c; }
function iconSwordsX(c, col=P.steel) { line(c,8,26,24,7,P.steelD,3); line(c,24,26,8,7,P.steelD,3); line(c,8,26,24,7,col,1.5); line(c,24,26,8,7,col,1.5); disc(c,8,27,2,P.gold); disc(c,24,27,2,P.gold); return c; }
function iconKnife(c, col=P.steel) { bladeUp(c,16,8,20,col,P.steelD); rect(c,13,20,6,1,P.gold); rect(c,15,21,2,6,P.leather); return c; }
function iconShield(c, col=P.steel, boss=P.gold) { for(let y=6;y<=26;y++){ const t=(y-6)/20; const w=Math.round(9*(1-t*0.6)*(y>22?(26-y)/4:1)); if(w>0){rect(c,16-w,y,w*2,1,col); px(c,16-w-1,y,P.steelD); px(c,16+w,y,P.steelD);} } disc(c,16,15,3,boss); disc(c,16,15,1.4,P.white); return c; }
function iconShieldHeart(c) { iconShield(c,P.steel,P.red); disc(c,14,14,1.6,P.red); disc(c,18,14,1.6,P.red); rect(c,13,15,7,3,P.red); px(c,16,19,P.red); return c; }
function iconScroll(c, col=P.bone) { rect(c,9,7,14,18,col); rect(c,9,7,14,2,P.boneD); rect(c,9,23,14,2,P.boneD); for(let i=0;i<4;i++) rect(c,12,11+i*3,8,1,P.greyD); return c; }
function iconBolt(c, col=P.cyan) { line(c,18,5,12,16,col,2); line(c,12,16,19,16,col,2); line(c,19,16,12,27,col,2); for(const [x,y] of [[18,5],[14,16],[13,27]]) px(c,x,y,P.white); return c; }
function iconFlame(c) { ell(c,16,19,7,9,P.fire); ell(c,16,21,4,6,P.fireC); for(const [x,y] of [[16,8],[12,12],[20,12]]) line(c,16,18,x,y,P.fire,2); disc(c,16,22,2,P.white); return c; }
function iconOrb(c, col=P.arc, hi=P.arcC) { disc(c,16,17,8,col); disc(c,16,17,8,col); disc(c,13,14,3,hi); disc(c,16,17,8.5,col); for(let a=0;a<8;a++){const r=11; px(c,16+Math.cos(a)*r,17+Math.sin(a)*r,hi);} return c; }
function iconSwirl(c, col=P.cyan) { for(let a=0;a<260;a+=12){ const t=a/260; const r=3+t*9; px(c,16+Math.cos(a*Math.PI/180)*r,16+Math.sin(a*Math.PI/180)*r,col); px(c,16+Math.cos(a*Math.PI/180)*r,16+Math.sin(a*Math.PI/180)*r+1,col);} return c; }
function iconVial(c, liquid=P.poison) { rect(c,13,7,6,2,P.grey); rect(c,12,9,8,14,P.steelD); rect(c,13,14,6,8,liquid); ell(c,16,22,3,2,liquid); disc(c,14,16,1,P.white); return c; }
function iconArrow(c, col=P.wood, n=1) { const xs = n===1?[16]: n===2?[12,20]:[10,16,22]; for(const x of xs){ line(c,x,27,x,8,col,1.5); line(c,x,8,x-2,12,P.steel,1.5); line(c,x,8,x+2,12,P.steel,1.5); px(c,x-2,25,P.red); px(c,x+2,25,P.red);} return c; }
function iconTarget(c) { for(const r of [9,6,3]) for(let a=0;a<360;a+=14) px(c,16+Math.cos(a*Math.PI/180)*r,16+Math.sin(a*Math.PI/180)*r, r===6?P.gold:P.red); disc(c,16,16,1.5,P.white); return c; }
function iconTrap(c) { rect(c,8,20,16,3,P.steelD); for(let i=0;i<6;i++){ line(c,10+i*2.4,20,11+i*2.4,14,P.steel,1);} for(let i=0;i<6;i++){ line(c,10+i*2.4,23,11+i*2.4,29,P.steel,1);} disc(c,16,21,1.5,P.gold); return c; }
function iconSmoke(c) { for(const [x,y,r] of [[13,18,4],[19,16,5],[16,21,5],[20,21,3]]) disc(c,x,y,r,P.grey); for(const [x,y,r] of [[18,17,2],[15,20,2]]) disc(c,x,y,r,P.greyD); return c; }

// ===== Enemies (32x32) =====================================================
function slime() { const c=C(); ell(c,16,21,12,9,P.greenD); ell(c,16,21,10.5,7.6,P.green); ell(c,12,17,5,3,P.poison); disc(c,12,20,2,P.white); disc(c,20,20,2,P.white); disc(c,12,21,1,P.black); disc(c,20,21,1,P.black); rect(c,14,25,4,1,P.greenD); return save(c,'enemy_slime'); }
function mage() { const c=C(); const robe=P.purple, robeO=P.purpleD; for(let y=13;y<=30;y++){const w=Math.min(13,3+(y-13)); rect(c,16-w,y,w*2,1,robe); px(c,16-w-1,y,robeO); px(c,16+w,y,robeO);} ell(c,16,11,7,7,[112,84,150]); ell(c,16,8,6,4,robeO); ell(c,16,13,4,5,P.shadow); px(c,14,13,P.cyan); px(c,18,13,P.cyan); px(c,14,14,[80,180,220]); px(c,18,14,[80,180,220]); for(let y=7;y<=30;y++) px(c,25,y,P.wood); disc(c,25,6,3,P.cyan); disc(c,25,6,1,P.white); return save(c,'enemy_mage'); }
function goblin() { const c=C(); rect(c,10,14,12,12,P.greenD); rect(c,11,15,10,10,P.green); disc(c,16,10,6,P.green); disc(c,16,10,6.5,P.greenD); ell(c,16,10,5,4.5,P.green); // ears
  line(c,11,9,7,6,P.green,2); line(c,21,9,25,6,P.green,2); disc(c,13,10,1.3,P.red); disc(c,19,10,1.3,P.red); rect(c,13,12,6,1,P.black); // dagger
  line(c,23,22,27,12,P.steel,1.5); rect(c,22,22,3,1,P.gold); return save(c,'enemy_goblin'); }
function skeleton() { const c=C(); disc(c,16,11,6,P.bone); ell(c,16,12,4,4.5,P.boneD); disc(c,14,11,1.6,P.black); disc(c,18,11,1.6,P.black); rect(c,14,15,4,1,P.black); rect(c,15,17,2,9,P.bone); for(let i=0;i<4;i++) rect(c,12,19+i*2,8,1,P.bone); // ribs
  line(c,11,24,11,16,P.boneD,1.5); iconShield({...C(),w:0}); rect(c,20,18,6,8,P.steelD); disc(c,23,22,2,P.gold); return save(c,'enemy_skeleton'); }
function archer() { const c=C(); ell(c,16,11,5,5,P.leather); ell(c,16,9,5,3,P.woodD); ell(c,16,13,3,3,P.shadow); px(c,15,12,P.white); px(c,18,12,P.white); rect(c,11,16,10,12,P.leather); rect(c,12,17,8,10,[150,110,70]); // bow
  for(let y=8;y<=26;y++){ const dx=Math.round(6*Math.sin((y-8)/18*Math.PI)); px(c,24-dx,y,P.wood);} line(c,24,8,24,26,P.bone,1); line(c,24,17,12,17,P.bone,1); line(c,12,17,8,17,P.steel,1); return save(c,'enemy_bandit'); }
function orc() { const c=C(); rect(c,8,13,16,16,P.greenD); rect(c,9,14,14,14,P.green); disc(c,16,9,6.5,P.green); disc(c,16,9,7,P.greenD); ell(c,16,9,5.5,5,P.green); disc(c,13,9,1.4,P.red); disc(c,19,9,1.4,P.red); px(c,13,12,P.white); px(c,19,12,P.white); // tusks
  rect(c,9,28,14,2,P.greenD); // axe
  line(c,25,26,25,8,P.wood,1.5); ell(c,25,9,4,5,P.steel); ell(c,27,9,3,5,P.steelD); return save(c,'enemy_orc'); }
function lich() { const c=C(); const robe=[60,40,96], robeO=[34,22,60]; for(let y=12;y<=30;y++){const w=Math.min(14,4+(y-12)); rect(c,16-w,y,w*2,1,robe); px(c,16-w-1,y,robeO); px(c,16+w,y,robeO);} ell(c,16,10,7,7,P.boneD); ell(c,16,11,5.5,6,P.shadow); px(c,13,11,P.cyan); px(c,19,11,P.cyan); disc(c,13,11,1.3,P.cyan); disc(c,19,11,1.3,P.cyan); // crown
  for(let i=0;i<5;i++){ line(c,11+i*2.5,5,11+i*2.5,2,P.crown,1); } rect(c,10,5,12,2,P.crown); // staff
  for(let y=4;y<=30;y++) px(c,26,y,P.woodD); disc(c,26,3,3,P.arcC); disc(c,26,3,1.4,P.white); return save(c,'enemy_lich'); }

// ===== Class portraits (32x32) =============================================
function pFighter() { const c=C(); frame(c,P.goldD); disc(c,16,15,8,P.steel); rect(c,8,15,16,8,P.steelD); rect(c,8,13,16,2,P.steel); rect(c,15,10,2,8,P.steelD); disc(c,12,16,1.4,P.cyan); disc(c,20,16,1.4,P.cyan); line(c,24,28,28,12,P.steel,2); rect(c,23,27,5,2,P.gold); return save(c,'class_fighter'); }
function pWizard() { const c=C(); frame(c,P.goldD); for(let y=4;y<=14;y++){const w=Math.round((14-y)/1.2); rect(c,16-w,y,w*2,1,P.purple);} rect(c,9,14,14,2,P.arc); disc(c,16,20,6,P.skin); rect(c,11,20,10,9,P.purple); disc(c,14,19,1.3,P.black); disc(c,18,19,1.3,P.black); line(c,25,30,25,8,P.wood,1.5); disc(c,25,7,3,P.cyan); disc(c,25,7,1,P.white); return save(c,'class_wizard'); }
function pRogue() { const c=C(); frame(c,P.goldD); ell(c,16,14,8,8,P.purpleD); ell(c,16,11,8,5,[60,55,75]); ell(c,16,16,5,5,P.shadow); disc(c,14,15,1.2,P.cyan); disc(c,18,15,1.2,P.cyan); rect(c,9,21,14,8,P.purpleD); line(c,24,27,27,16,P.steel,1.5); rect(c,23,27,4,1,P.gold); return save(c,'class_rogue'); }
function pHunter() { const c=C(); frame(c,P.goldD); ell(c,16,12,7,5,P.greenD); rect(c,9,12,14,2,P.green); disc(c,16,17,6,P.skin); rect(c,11,20,10,9,P.greenD); disc(c,14,16,1.3,P.black); disc(c,18,16,1.3,P.black); for(let y=8;y<=28;y++){const dx=Math.round(6*Math.sin((y-8)/20*Math.PI)); px(c,26-dx,y,P.wood);} line(c,26,8,26,28,P.bone,1); return save(c,'class_hunter'); }

// ===== Cover + battle background ===========================================
function cover() { const c=C(48,48); // dungeon bricks
  for(let y=0;y<48;y++) for(let x=0;x<48;x++){ const br=((Math.floor(y/4))+ (Math.floor((x+ (Math.floor(y/4)%2?4:0))/8)))%2; px(c,x,y, br?[40,32,52]:[34,27,46]); }
  rect(c,0,40,48,8,[24,18,32]); // arch glow
  disc(c,10,12,3,P.fire); disc(c,38,12,3,P.fire); disc(c,10,12,1.5,P.fireC); disc(c,38,12,1.5,P.fireC);
  // big sword centerpiece
  for(let y=14;y<=34;y++){const w=y<16?1:3; rect(c,24-w,y,w*2,1,P.steel); px(c,24-w-1,y,P.steelD); px(c,24+w,y,P.steelD);} rect(c,18,34,12,2,P.gold); rect(c,23,36,2,7,P.wood); disc(c,24,43,1.6,P.gold);
  return save(c,'cover'); }
function bg() { const c=C(40,56);
  for(let y=0;y<56;y++) for(let x=0;x<40;x++){ const br=((Math.floor(y/5))+(Math.floor((x+(Math.floor(y/5)%2?5:0))/10)))%2; px(c,x,y, br?[30,24,40]:[24,19,33]); }
  // torches
  for(const tx of [6,33]){ rect(c,tx,18,2,8,P.woodD); disc(c,tx+1,16,2.5,P.fire); disc(c,tx+1,15,1.3,P.fireC); }
  rect(c,0,50,40,6,[16,12,22]);
  return save(c,'bg_battle'); }

// ---- card icon map → renders all card_* keys ------------------------------
const ICONS = {
  card_slash:(c)=>iconSword(c), card_cleave:(c)=>iconSwordsX(c), card_finisher:(c)=>iconBigSword(c,P.gold),
  card_heavy:(c)=>iconBigSword(c,P.steel), card_throwknife:(c)=>iconKnife(c), card_block:(c)=>iconShield(c),
  card_brace:(c)=>iconShieldHeart(c), card_focus:(c)=>iconScroll(c), card_spark:(c)=>iconBolt(c,P.cyan),
  card_lightning:(c)=>iconBolt(c,P.fireC), card_fireball:(c)=>iconFlame(c), card_arcanebolt:(c)=>iconOrb(c),
  card_blink:(c)=>iconSwirl(c,P.cyan), card_magicshield:(c)=>iconShield(c,P.arc,P.cyan), card_insight:(c)=>iconScroll(c,[200,180,240]),
  card_backstab:(c)=>iconKnife(c,P.greyD), card_poisonblade:(c)=>iconVial(c,P.poison), card_eviscerate:(c)=>iconSwordsX(c,P.red),
  card_smokebomb:(c)=>iconSmoke(c), card_trickdodge:(c)=>iconSwirl(c,P.gold), card_shoot:(c)=>iconArrow(c,P.wood,1),
  card_volley:(c)=>iconArrow(c,P.wood,2), card_aimedshot:(c)=>iconTarget(c), card_multishot:(c)=>iconArrow(c,P.wood,3),
  card_takeaim:(c)=>iconTarget(c), card_trap:(c)=>iconTrap(c), card_dodgeroll:(c)=>iconSwirl(c,P.green),
};

async function main() {
  for (const [name, fn] of Object.entries(ICONS)) { await save(fn(C()), name); }
  await slime(); await mage(); await goblin(); await skeleton(); await archer(); await orc(); await lich();
  await pFighter(); await pWizard(); await pRogue(); await pHunter();
  await cover(); await bg();
  console.log('rendered all pixel art');
}
main();

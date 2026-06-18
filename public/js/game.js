// Castle Wall Defense — YOU are the wall+gate at the bottom. Enemies pour down
// from the top toward your wall; turrets on the wall auto-fire upward; the gate
// cannon aims where you touch. Kills give XP/gold; level up to upgrade the wall.

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

const ENEMIES = {
  bat:    { hp: 6,  spd: 70, dmg: 4,  r: 10, xp: 1, gold: 1, spr: 'enemy_bat' },
  goblin: { hp: 12, spd: 46, dmg: 6,  r: 13, xp: 1, gold: 1, spr: 'enemy_goblin' },
  zombie: { hp: 26, spd: 32, dmg: 9,  r: 14, xp: 2, gold: 2, spr: 'enemy_zombie' },
  brute:  { hp: 80, spd: 24, dmg: 18, r: 22, xp: 6, gold: 5, spr: 'enemy_brute' },
  boss:   { hp: 1800, spd: 20, dmg: 50, r: 40, xp: 80, gold: 60, spr: 'boss', boss: true },
};

// Upgrade categories: 4 incremental ranks, then rank 5 = ULTIMATE. Up to 4
// categories may be invested in per run.
const CATS = {
  damage: { name: 'Damage', icon: 'bolt', desc: '+30% damage (all turrets).', ult: 'Explosive Rounds', ultDesc: 'Shots explode on hit — splash damage to nearby foes.' },
  rate:   { name: 'Fire Rate', icon: 'bolt', desc: '+30% fire rate (all turrets).', ult: 'Sniper Protocol', ultDesc: 'Every few seconds a sniper shot one-shots a normal foe & blasts bosses.' },
  twin:   { name: 'Twin Shot', icon: 'turret', desc: '+1 projectile (all turrets).', ult: 'Bullet Storm', ultDesc: '+2 projectiles in a wide spread.' },
  range:  { name: 'Range', icon: 'turret', desc: '+25% range (all turrets).', ult: 'Overwatch', ultDesc: 'Turrets cover the whole screen.' },
  pierce: { name: 'Piercing', icon: 'bolt', desc: 'Shots pierce +1 enemy.', ult: 'Railgun', ultDesc: 'Shots pierce everything and hit harder.' },
  tower:  { name: 'Extra Tower', icon: 'turret', desc: 'Mount another turret.', ult: 'Fortress', ultDesc: '+2 turrets and +30% damage to all.' },
  wall:   { name: 'Fortify Wall', icon: 'castle', desc: '+120 max wall HP & repair.', ult: 'Aegis', ultDesc: 'The wall regenerates over time.' },
};
const CAT_CAP = 4;

export class Game {
  constructor(canvas, assets, cb) { this.cv = canvas; this.ctx = canvas.getContext('2d'); this.A = assets; this.cb = cb; this.aim = null; this.reset(); }
  dpr() { return Math.min(window.devicePixelRatio || 1, 2); }

  reset() {
    this.W = innerWidth; this.H = innerHeight;
    this.wallH = 70; this.wallY = this.H - this.wallH;       // top edge of the wall
    this.gateX = this.W / 2;
    this.wall = { hp: 800, maxHp: 800 };
    this.turrets = [{ x: this.gateX, main: true, dmg: 9, rate: 0.68, range: 300, t: 0, lvl: 1 }];
    this.t = 0; this.level = 1; this.xp = 0; this.xpNext = 5; this.kills = 0; this.gold = 0;
    this.enemies = []; this.shots = []; this.fx = [];
    this.spawnT = 0; this.bossT = 80;
    this.passive = { dmg: 1, rate: 1, range: 1, pierce: 0, count: 0 };
    this.upg = { damage: 0, rate: 0, twin: 0, range: 0, pierce: 0, tower: 0, wall: 0 };
    this.ult = {}; this.sniperT = 6;
    this.over = false; this.paused = false;
  }
  resize() { const d = this.dpr(); this.cv.width = innerWidth * d; this.cv.height = innerHeight * d; this.cv.style.width = innerWidth + 'px'; this.cv.style.height = innerHeight + 'px'; this.ctx.setTransform(d, 0, 0, d, 0, 0); this.ctx.imageSmoothingEnabled = false; this.W = innerWidth; this.H = innerHeight; this.wallY = this.H - this.wallH; this.gateX = this.W / 2; if (this.turrets) this.layoutTurrets(); }
  setAim(x, y) { this.aim = (x == null) ? null : { x, y }; }

  layoutTurrets() { // main cannon at the gate; extra turrets go far L, R, L, R…
    const main = this.turrets.find(t => t.main); if (main) main.x = this.gateX;
    const ts = this.turrets.filter(t => !t.main);
    const base = this.W * 0.26, step = this.W * 0.18; // well clear of the gate
    ts.forEach((t, k) => { const side = k % 2 === 0 ? -1 : 1; const tier = Math.floor(k / 2); let x = this.gateX + side * (base + tier * step); t.x = Math.max(40, Math.min(this.W - 40, x)); });
  }

  spawn() {
    const tmin = this.t / 60, roll = Math.random(); let type = 'goblin';
    if (tmin > 2.5 && roll < 0.18) type = 'brute';
    else if (tmin > 1 && roll < 0.45) type = 'zombie';
    else if (roll < 0.35) type = 'bat';
    this.addEnemy(type, rand(20, this.W - 20), -30);
  }
  addEnemy(type, x, y) { const d = ENEMIES[type], s = 1 + this.t / 120; this.enemies.push({ type, x, y, r: d.r, hp: d.hp * s, maxHp: d.hp * s, spd: d.spd, dmg: d.dmg, xp: d.xp, gold: d.gold, spr: d.spr, boss: !!d.boss, dead: false, atk: 0, hit: 0 }); }
  nearest(x, y, maxd) { let best = null, bd = maxd * maxd; for (const e of this.enemies) { if (e.dead) continue; const d = d2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } } return best; }

  hurt(e, dmg) { e.hp -= dmg; e.hit = 0.08; this.fx.push({ x: e.x, y: e.y - e.r, txt: Math.round(dmg), life: 0.5 }); if (e.hp <= 0 && !e.dead) { e.dead = true; this.kills++; this.gold += e.gold; this.gainXp(e.xp); } }

  update(dt) {
    if (this.over || this.paused) return;
    this.t += dt;
    if (this.ult.aegis) this.wall.hp = Math.min(this.wall.maxHp, this.wall.hp + 30 * dt);
    if (this.ult.sniper) { this.sniperT -= dt; if (this.sniperT <= 0) { this.sniperShot(); this.sniperT = 4; } }
    // spawns
    this.spawnT -= dt; if (this.spawnT <= 0) { const n = 1 + Math.floor(this.t / 30); for (let i = 0; i < n; i++) this.spawn(); this.spawnT = Math.max(0.4, 1.7 - this.t / 90); }
    this.bossT -= dt; if (this.bossT <= 0) { this.addEnemy('boss', this.W / 2, -50); this.bossT = 95; }

    // enemies descend → attack wall
    for (const e of this.enemies) { if (e.dead) continue; if (e.hit > 0) e.hit -= dt;
      if (e.y < this.wallY - e.r) { e.y += e.spd * dt; e.x += Math.sign(this.gateX - e.x) * Math.min(12, e.spd * 0.25) * dt; }
      else { e.y = this.wallY - e.r; e.atk -= dt; if (e.atk <= 0) { this.wall.hp -= e.dmg; e.atk = 1; this.fx.push({ x: e.x, y: e.y, txt: '-' + e.dmg, life: 0.6, bad: true }); } }
    }

    // turrets fire
    for (const tr of this.turrets) { tr.t -= dt; if (tr.t > 0) continue;
      const tx = tr.x, ty = this.wallY - 6;
      let target;
      if (tr.main && this.aim) { target = { x: this.aim.x, y: this.aim.y }; }
      else target = this.nearest(tx, ty, tr.range * this.passive.range);
      if (!target) continue;
      const shots = 1 + this.passive.count; // every turret gets the multishot upgrade
      for (let i = 0; i < shots; i++) {
        const spread = (i - (shots - 1) / 2) * 0.12;
        this.shoot(tx, ty, target, tr.dmg * this.passive.dmg, spread);
      }
      tr.t = tr.rate / this.passive.rate;
    }

    // shots
    for (const s of this.shots) { if (s.dead) continue; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.y < -30 || s.x < -30 || s.x > this.W + 30 || s.y > this.H + 30) { s.dead = true; continue; }
      for (const e of this.enemies) { if (e.dead) continue; if (d2(s.x, s.y, e.x, e.y) < (e.r + 6) * (e.r + 6)) { this.hurt(e, s.dmg); if (this.ult.explosive) this.explode(e.x, e.y, s.dmg, e); if (--s.pierce < 0) { s.dead = true; break; } } } }

    for (const f of this.fx) f.life -= dt;
    this.enemies = this.enemies.filter(e => !e.dead); this.shots = this.shots.filter(s => !s.dead); this.fx = this.fx.filter(f => f.life > 0);

    if (this.wall.hp <= 0) { this.wall.hp = 0; this.over = true; this.cb.onGameOver(this.stats()); }
    this.cb.onHud(this.hud());
  }

  explode(x, y, dmg, except) { const R = 60; for (const e of this.enemies) { if (e.dead || e === except) continue; if (d2(x, y, e.x, e.y) < R * R) this.hurt(e, dmg * 0.55); } this.fx.push({ x, y, boom: R, life: 0.2 }); }
  sniperShot() {
    let target = this.enemies.find(e => !e.dead && e.boss);
    if (!target) { let my = -1; for (const e of this.enemies) { if (!e.dead && e.y > my) { my = e.y; target = e; } } }
    if (!target) return;
    this.hurt(target, target.boss ? 240 * this.passive.dmg : 99999);
    this.fx.push({ beam: { x1: this.gateX, y1: this.wallY - 8, x2: target.x, y2: target.y }, life: 0.22 });
  }

  shoot(x, y, target, dmg, spread = 0) { let a = Math.atan2(target.y - y, target.x - x) + spread; const sp = 420; this.shots.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, pierce: this.passive.pierce, dead: false }); }

  gainXp(n) { this.xp += n; if (!this.paused) this.checkLevel(); }
  checkLevel() { if (this.xp >= this.xpNext) { this.xp -= this.xpNext; this.level++; this.xpNext = Math.round(this.xpNext * 1.3 + 4); this.paused = true; this.cb.onLevelUp(this.choices()); } }

  choices() {
    const keys = Object.keys(CATS);
    const selected = keys.filter(k => this.upg[k] > 0).length;
    const elig = keys.filter(k => this.upg[k] < 5 && (this.upg[k] > 0 || selected < CAT_CAP));
    const opts = elig.map(k => { const next = this.upg[k] + 1, c = CATS[k], ult = next === 5;
      return { id: k, name: ult ? `★ ${c.ult}` : `${c.name} ${next}/5`, icon: c.icon, desc: ult ? c.ultDesc : c.desc, ult }; });
    // always-available fillers (don't count toward the cap)
    opts.push({ id: 'repair', name: 'Repair', icon: 'castle', desc: 'Restore 220 wall HP.' });
    opts.push({ id: 'bounty', name: 'Bounty', icon: 'gem', desc: '+60 gold.' });
    const out = []; const used = new Set();
    while (out.length < 3 && opts.length) { const c = opts.splice(Math.floor(Math.random() * opts.length), 1)[0]; if (used.has(c.id)) continue; used.add(c.id); out.push(c); }
    return out;
  }
  addTurret() { const m = this.turrets.find(t => t.main); this.turrets.push({ x: 0, dmg: m.dmg, rate: m.rate, range: m.range, t: 0, lvl: 1 }); this.layoutTurrets(); }
  applyUpgrade(id) {
    if (id === 'repair') this.wall.hp = Math.min(this.wall.maxHp, this.wall.hp + 220);
    else if (id === 'bounty') this.gold += 60;
    else { const lvl = ++this.upg[id]; this.applyCat(id, lvl); }
    this.paused = false; this.checkLevel();
  }
  applyCat(id, lvl) {
    const ult = lvl >= 5, P = this.passive;
    switch (id) {
      case 'damage': ult ? (this.ult.explosive = true) : (P.dmg *= 1.3); break;
      case 'rate': ult ? (this.ult.sniper = true, this.sniperT = 4) : (P.rate *= 1.3); break;
      case 'twin': ult ? (P.count += 2, this.ult.storm = true) : (P.count += 1); break;
      case 'range': ult ? (P.range = 99, this.ult.overwatch = true) : (P.range *= 1.25); break;
      case 'pierce': ult ? (P.pierce = 999, P.dmg *= 1.2, this.ult.railgun = true) : (P.pierce += 1); break;
      case 'tower': if (ult) { this.addTurret(); this.addTurret(); P.dmg *= 1.3; } else this.addTurret(); break;
      case 'wall': this.wall.maxHp += 120; this.wall.hp = Math.min(this.wall.maxHp, this.wall.hp + 120); if (ult) this.ult.aegis = true; break;
    }
  }

  stats() { return { time: this.t, level: this.level, kills: this.kills, gold: this.gold }; }
  hud() { return { wall: this.wall.hp, wallMax: this.wall.maxHp, xp: this.xp, xpNext: this.xpNext, level: this.level, time: this.t, kills: this.kills, gold: this.gold }; }

  // ---- render ----
  drawSprite(name, x, y, scale = 1, rot = 0) { const s = this.A[name]; if (!s) return; const w = s.width * scale, h = s.height * scale; const ctx = this.ctx; if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(s, -w / 2, -h / 2, w, h); ctx.restore(); } else ctx.drawImage(s, x - w / 2, y - h / 2, w, h); }

  render() {
    const ctx = this.ctx, W = this.W, H = this.H; ctx.imageSmoothingEnabled = false;
    const g = this.A.ground; if (g) { if (!this._pat) this._pat = ctx.createPattern(g, 'repeat'); ctx.fillStyle = this._pat; } else ctx.fillStyle = '#1a2018';
    ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(0, 0, W, H);

    // enemies
    for (const e of this.enemies) { if (e.hit > 0) ctx.globalAlpha = 0.6; this.drawSprite(e.spr, e.x, e.y, 1); ctx.globalAlpha = 1; if (e.boss) this.bar(e.x - 30, e.y - e.r - 12, 60, 5, e.hp / e.maxHp, '#e07a3a'); }
    // shots
    for (const s of this.shots) this.drawSprite('bolt', s.x, s.y, 0.8);

    // WALL at the bottom
    const wy = this.wallY;
    ctx.fillStyle = '#5a5a66'; ctx.fillRect(0, wy, W, this.wallH);
    ctx.fillStyle = '#3e3e48'; for (let x = 0; x < W; x += 20) ctx.fillRect(x, wy, 10, 10); // battlements
    ctx.fillStyle = '#2c2c34'; for (let y = wy + 14; y < H; y += 12) ctx.fillRect(0, y, W, 2); // brick lines
    for (let x = 0; x < W; x += 40) { ctx.fillRect(x, wy + 10, 2, this.wallH); }
    // gate
    const gw = 64; ctx.fillStyle = '#241a12'; ctx.fillRect(this.gateX - gw / 2, wy + 12, gw, this.wallH); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(this.gateX - gw / 2 + 4, wy + 16, gw - 8, this.wallH);
    // turret range rings (subtle) + turrets on the wall
    ctx.strokeStyle = 'rgba(201,162,63,0.10)'; ctx.lineWidth = 1;
    for (const tr of this.turrets) { ctx.beginPath(); ctx.arc(tr.x, wy - 6, tr.range * this.passive.range, 0, TAU); ctx.stroke(); }
    // brown wooden base under each extra turret (matches the gate)
    for (const tr of this.turrets) { if (tr.main) continue; ctx.fillStyle = '#241a12'; ctx.fillRect(tr.x - 17, wy + 10, 34, this.wallH); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(tr.x - 13, wy + 14, 26, this.wallH); }
    for (const tr of this.turrets) this.drawSprite('turret', tr.x, wy - 4, tr.main ? 1.25 : 1);
    // every turret has a barrel that aims at its target
    for (const tr of this.turrets) {
      const tgt = (tr.main && this.aim) ? this.aim : this.nearest(tr.x, wy, tr.range * this.passive.range);
      const a = tgt ? Math.atan2(tgt.y - (wy - 8), tgt.x - tr.x) : -Math.PI / 2;
      const len = tr.main ? 26 : 22;
      ctx.save(); ctx.translate(tr.x, wy - 8); ctx.rotate(a);
      ctx.fillStyle = '#3a3a44'; ctx.fillRect(0, -4, len, 8);
      ctx.fillStyle = '#1a1a22'; ctx.fillRect(len - 4, -5, 5, 10);
      ctx.restore();
    }
    // aim reticle
    if (this.aim) { ctx.strokeStyle = 'rgba(201,162,63,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.aim.x, this.aim.y, 12, 0, TAU); ctx.moveTo(this.aim.x - 18, this.aim.y); ctx.lineTo(this.aim.x + 18, this.aim.y); ctx.moveTo(this.aim.x, this.aim.y - 18); ctx.lineTo(this.aim.x, this.aim.y + 18); ctx.stroke(); }

    // effects: explosions, sniper beam, floating damage
    for (const f of this.fx) {
      if (f.beam) { ctx.strokeStyle = `rgba(150,230,255,${Math.max(0, f.life * 4)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(f.beam.x1, f.beam.y1); ctx.lineTo(f.beam.x2, f.beam.y2); ctx.stroke(); }
      else if (f.boom) { const a = Math.max(0, f.life * 4); ctx.fillStyle = `rgba(255,140,40,${a * 0.4})`; ctx.strokeStyle = `rgba(255,190,80,${a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, f.boom * (1 - f.life), 0, TAU); ctx.fill(); ctx.stroke(); }
      else if (f.txt !== undefined) { ctx.fillStyle = f.bad ? '#ff7a6a' : '#fff'; ctx.font = '12px monospace'; ctx.globalAlpha = Math.max(0, f.life * 2); ctx.fillText(f.txt, f.x - 6, f.y - (0.5 - f.life) * 20); ctx.globalAlpha = 1; }
    }
  }
  bar(x, y, w, h, frac, col) { const ctx = this.ctx; ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, frac), h); }
}

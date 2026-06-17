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
      const shots = 1 + (tr.main ? this.passive.count : 0);
      for (let i = 0; i < shots; i++) {
        const spread = (i - (shots - 1) / 2) * 0.12;
        this.shoot(tx, ty, target, tr.dmg * this.passive.dmg, spread);
      }
      tr.t = tr.rate / this.passive.rate;
    }

    // shots
    for (const s of this.shots) { if (s.dead) continue; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.y < -30 || s.x < -30 || s.x > this.W + 30 || s.y > this.H + 30) { s.dead = true; continue; }
      for (const e of this.enemies) { if (e.dead) continue; if (d2(s.x, s.y, e.x, e.y) < (e.r + 6) * (e.r + 6)) { this.hurt(e, s.dmg); if (--s.pierce < 0) { s.dead = true; break; } } } }

    for (const f of this.fx) f.life -= dt;
    this.enemies = this.enemies.filter(e => !e.dead); this.shots = this.shots.filter(s => !s.dead); this.fx = this.fx.filter(f => f.life > 0);

    if (this.wall.hp <= 0) { this.wall.hp = 0; this.over = true; this.cb.onGameOver(this.stats()); }
    this.cb.onHud(this.hud());
  }

  shoot(x, y, target, dmg, spread = 0) { let a = Math.atan2(target.y - y, target.x - x) + spread; const sp = 420; this.shots.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, pierce: this.passive.pierce, dead: false }); }

  gainXp(n) { this.xp += n; if (!this.paused) this.checkLevel(); }
  checkLevel() { if (this.xp >= this.xpNext) { this.xp -= this.xpNext; this.level++; this.xpNext = Math.round(this.xpNext * 1.3 + 4); this.paused = true; this.cb.onLevelUp(this.choices()); } }

  choices() {
    const pool = [
      { id: 'turret', name: 'Add Turret', icon: 'turret', desc: `Mount another auto-turret on the wall.` },
      { id: 'power', name: 'Heavy Rounds', icon: 'bolt', desc: '+25% turret damage.' },
      { id: 'rapid', name: 'Rapid Fire', icon: 'bolt', desc: '+20% fire rate.' },
      { id: 'range', name: 'Long Barrels', icon: 'turret', desc: '+25% range.' },
      { id: 'pierce', name: 'AP Rounds', icon: 'bolt', desc: 'Shots pierce +1 enemy.' },
      { id: 'multishot', name: 'Twin Cannon', icon: 'turret', desc: 'Gate cannon fires +1 shot.' },
      { id: 'reinforce', name: 'Reinforce Wall', icon: 'castle', desc: '+150 max wall HP & repair.' },
      { id: 'repair', name: 'Repair', icon: 'castle', desc: 'Restore 200 wall HP.' },
    ];
    const out = []; const used = new Set();
    while (out.length < 3 && pool.length) { const c = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; if (used.has(c.id)) continue; used.add(c.id); out.push(c); }
    return out;
  }
  applyUpgrade(id) {
    if (id === 'turret') { const m = this.turrets.find(t => t.main); this.turrets.push({ x: 0, dmg: m.dmg, rate: m.rate, range: m.range, t: 0, lvl: 1 }); this.layoutTurrets(); }
    else if (id === 'power') this.passive.dmg *= 1.25;
    else if (id === 'rapid') this.passive.rate *= 1.2;
    else if (id === 'range') this.passive.range *= 1.25;
    else if (id === 'pierce') this.passive.pierce += 1;
    else if (id === 'multishot') this.passive.count += 1;
    else if (id === 'reinforce') { this.wall.maxHp += 150; this.wall.hp = Math.min(this.wall.maxHp, this.wall.hp + 150); }
    else if (id === 'repair') this.wall.hp = Math.min(this.wall.maxHp, this.wall.hp + 200);
    this.paused = false; this.checkLevel();
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
    // gate cannon barrel toward aim
    const main = this.turrets.find(t => t.main); if (main) { const tgt = this.aim || this.nearest(main.x, wy, 9999) || { x: main.x, y: wy - 60 }; const a = Math.atan2(tgt.y - (wy - 6), tgt.x - main.x); ctx.save(); ctx.translate(main.x, wy - 8); ctx.rotate(a); ctx.fillStyle = '#3a3a44'; ctx.fillRect(0, -4, 26, 8); ctx.fillStyle = '#1a1a22'; ctx.fillRect(22, -5, 5, 10); ctx.restore(); }
    // aim reticle
    if (this.aim) { ctx.strokeStyle = 'rgba(201,162,63,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.aim.x, this.aim.y, 12, 0, TAU); ctx.moveTo(this.aim.x - 18, this.aim.y); ctx.lineTo(this.aim.x + 18, this.aim.y); ctx.moveTo(this.aim.x, this.aim.y - 18); ctx.lineTo(this.aim.x, this.aim.y + 18); ctx.stroke(); }

    // floating dmg
    for (const f of this.fx) { ctx.fillStyle = f.bad ? '#ff7a6a' : '#fff'; ctx.font = '12px monospace'; ctx.globalAlpha = Math.max(0, f.life * 2); ctx.fillText(f.txt, f.x - 6, f.y - (0.5 - f.life) * 20); ctx.globalAlpha = 1; }
  }
  bar(x, y, w, h, frac, col) { const ctx = this.ctx; ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, frac), h); }
}

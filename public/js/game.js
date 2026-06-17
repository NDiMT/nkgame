// Castle Survivors — defend the castle. Real-time bullet-heaven roguelite.
// Fixed camera (castle centered). Hordes path to the castle; you fight them off
// with auto-firing weapons; kills drop XP; level up to pick upgrades.

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

const ENEMIES = {
  bat:    { hp: 5,  spd: 86, dmg: 5,  r: 10, xp: 1, spr: 'enemy_bat' },
  goblin: { hp: 10, spd: 48, dmg: 7,  r: 13, xp: 1, spr: 'enemy_goblin' },
  zombie: { hp: 22, spd: 32, dmg: 10, r: 14, xp: 2, spr: 'enemy_zombie' },
  brute:  { hp: 70, spd: 26, dmg: 20, r: 22, xp: 6, spr: 'enemy_brute' },
  boss:   { hp: 1500, spd: 24, dmg: 45, r: 40, xp: 80, spr: 'boss', boss: true },
};

export class Game {
  constructor(canvas, assets, cb) { this.cv = canvas; this.ctx = canvas.getContext('2d'); this.A = assets; this.cb = cb; this.move = { x: 0, y: 0 }; this.reset(); }

  reset() {
    const w = this.cv.width / this.dpr(), h = this.cv.height / this.dpr();
    this.W = w; this.H = h;
    this.castle = { x: w / 2, y: h / 2, r: 46, hp: 500, maxHp: 500 };
    this.player = { x: w / 2, y: h / 2 + 100, r: 12, hp: 100, maxHp: 100, speed: 135, ifr: 0, face: 1 };
    this.t = 0; this.level = 1; this.xp = 0; this.xpNext = 5; this.kills = 0;
    this.enemies = []; this.gems = []; this.shots = []; this.orbs = []; this.turrets = []; this.fx = [];
    this.spawnT = 0; this.bossT = 60; this.passive = { dmg: 1, rate: 1, speed: 1, magnet: 64, count: 0 };
    this.weapons = { bolt: { lvl: 1, t: 0 } };
    this.over = false; this.paused = false;
  }
  dpr() { return Math.min(window.devicePixelRatio || 1, 2); }
  resize() { const d = this.dpr(); this.cv.width = innerWidth * d; this.cv.height = innerHeight * d; this.cv.style.width = innerWidth + 'px'; this.cv.style.height = innerHeight + 'px'; this.ctx.setTransform(d, 0, 0, d, 0, 0); this.ctx.imageSmoothingEnabled = false; this.W = innerWidth; this.H = innerHeight; if (this.castle) { this.castle.x = this.W / 2; this.castle.y = this.H / 2; } }
  setMove(x, y) { this.move.x = x; this.move.y = y; }

  nearest(x, y, maxd = 1e9) { let best = null, bd = maxd * maxd; for (const e of this.enemies) { if (e.dead) continue; const d = dist2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } } return best; }

  spawn() {
    const edge = Math.floor(rand(0, 4)); let x, y;
    const m = 30;
    if (edge === 0) { x = rand(-m, this.W + m); y = -m; } else if (edge === 1) { x = this.W + m; y = rand(-m, this.H + m); }
    else if (edge === 2) { x = rand(-m, this.W + m); y = this.H + m; } else { x = -m; y = rand(-m, this.H + m); }
    // weighted type by time
    const tmin = this.t / 60; let type = 'goblin';
    const roll = Math.random();
    if (tmin > 2.5 && roll < 0.18) type = 'brute';
    else if (tmin > 1 && roll < 0.45) type = 'zombie';
    else if (roll < 0.35) type = 'bat';
    this.addEnemy(type, x, y);
  }
  addEnemy(type, x, y) { const d = ENEMIES[type]; const hpScale = 1 + this.t / 110; this.enemies.push({ type, x, y, r: d.r, hp: d.hp * hpScale, maxHp: d.hp * hpScale, spd: d.spd, dmg: d.dmg, xp: d.xp, spr: d.spr, boss: !!d.boss, dead: false, atk: 0, hit: 0 }); }

  hurt(e, dmg) { e.hp -= dmg; e.hit = 0.08; this.fx.push({ x: e.x, y: e.y - e.r, txt: Math.round(dmg), life: 0.5 }); if (e.hp <= 0 && !e.dead) { e.dead = true; this.kills++; const n = e.boss ? 20 : 1; for (let i = 0; i < n; i++) this.gems.push({ x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), xp: e.boss ? 4 : e.xp, vx: 0, vy: 0 }); } }

  update(dt) {
    if (this.over || this.paused) return;
    this.t += dt;
    const p = this.player;
    // move player
    p.x += this.move.x * p.speed * this.passive.speed * dt; p.y += this.move.y * p.speed * this.passive.speed * dt;
    if (this.move.x) p.face = this.move.x < 0 ? -1 : 1;
    p.x = Math.max(10, Math.min(this.W - 10, p.x)); p.y = Math.max(10, Math.min(this.H - 10, p.y));
    if (p.ifr > 0) p.ifr -= dt;

    // spawn
    this.spawnT -= dt; if (this.spawnT <= 0) { const count = 1 + Math.floor(this.t / 25); for (let i = 0; i < count; i++) this.spawn(); this.spawnT = Math.max(0.32, 1.5 - this.t / 80); }
    this.bossT -= dt; if (this.bossT <= 0) { this.addEnemy('boss', rand(40, this.W - 40), -40); this.bossT = 90; }

    // enemies → castle
    for (const e of this.enemies) {
      if (e.dead) continue; if (e.hit > 0) e.hit -= dt;
      const dcx = this.castle.x - e.x, dcy = this.castle.y - e.y; const dc = Math.hypot(dcx, dcy);
      if (dc > this.castle.r + e.r) { e.x += (dcx / dc) * e.spd * dt; e.y += (dcy / dc) * e.spd * dt; }
      else { e.atk -= dt; if (e.atk <= 0) { this.castle.hp -= e.dmg; e.atk = 1; this.fx.push({ x: e.x, y: e.y, txt: '-' + e.dmg, life: 0.6, bad: true }); } }
      // contact player
      if (p.ifr <= 0 && dist2(p.x, p.y, e.x, e.y) < (p.r + e.r) * (p.r + e.r)) { p.hp -= Math.ceil(e.dmg * 0.4); p.ifr = 0.8; }
    }

    this.fireWeapons(dt);

    // shots
    for (const s of this.shots) { if (s.dead) continue; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.life <= 0 || s.x < -40 || s.y < -40 || s.x > this.W + 40 || s.y > this.H + 40) { s.dead = true; continue; }
      for (const e of this.enemies) { if (e.dead) continue; if (dist2(s.x, s.y, e.x, e.y) < (e.r + 6) * (e.r + 6)) { this.hurt(e, s.dmg); if (--s.pierce < 0) { s.dead = true; break; } } } }

    // orbs
    this.orbAng = (this.orbAng || 0) + dt * 2.4;
    for (let i = 0; i < this.orbs.length; i++) { const o = this.orbs[i]; const a = this.orbAng + (i / this.orbs.length) * TAU; o.x = p.x + Math.cos(a) * 52; o.y = p.y + Math.sin(a) * 52; o.cd = (o.cd || {});
      for (const e of this.enemies) { if (e.dead) continue; if ((o.cd[e._id = e._id || Math.random()] || 0) <= this.t && dist2(o.x, o.y, e.x, e.y) < (e.r + 10) * (e.r + 10)) { this.hurt(e, o.dmg); o.cd[e._id] = this.t + 0.4; } } }

    // turrets
    for (const tr of this.turrets) { tr.t -= dt; if (tr.t <= 0) { const e = this.nearest(tr.x, tr.y, 320); if (e) { this.shoot(tr.x, tr.y, e, tr.dmg, 300, 0); tr.t = 1.3; } } }

    // gems
    for (const g of this.gems) { if (g.dead) continue; const d = Math.hypot(p.x - g.x, p.y - g.y);
      if (d < this.passive.magnet) { g.x += (p.x - g.x) / d * 260 * dt; g.y += (p.y - g.y) / d * 260 * dt; }
      if (d < p.r + 8) { g.dead = true; this.gainXp(g.xp); } }

    for (const f of this.fx) f.life -= dt;
    this.enemies = this.enemies.filter(e => !e.dead); this.shots = this.shots.filter(s => !s.dead); this.gems = this.gems.filter(g => !g.dead); this.fx = this.fx.filter(f => f.life > 0);

    if (this.castle.hp <= 0 || p.hp <= 0) { this.castle.hp = Math.max(0, this.castle.hp); p.hp = Math.max(0, p.hp); this.over = true; this.cb.onGameOver(this.stats()); }
    this.cb.onHud(this.hud());
  }

  shoot(x, y, target, dmg, speed, pierce) { const dx = target.x - x, dy = target.y - y, d = Math.hypot(dx, dy) || 1; this.shots.push({ x, y, vx: dx / d * speed, vy: dy / d * speed, dmg, pierce, life: 2.4, dead: false }); }

  fireWeapons(dt) {
    const p = this.player, P = this.passive;
    const bolt = this.weapons.bolt;
    if (bolt) { bolt.t -= dt; if (bolt.t <= 0) { const shots = 1 + this.passive.count + Math.floor(bolt.lvl / 3); const targets = this.enemies.filter(e => !e.dead).sort((a, b) => dist2(p.x, p.y, a.x, a.y) - dist2(p.x, p.y, b.x, b.y)).slice(0, shots);
      for (const e of targets) this.shoot(p.x, p.y, e, (5 + bolt.lvl * 2) * P.dmg, 340, Math.floor(bolt.lvl / 4)); bolt.t = 0.9 / P.rate; } }
    const slash = this.weapons.slash;
    if (slash) { slash.t -= dt; if (slash.t <= 0) { const R = 60 + slash.lvl * 8; this.fx.push({ x: p.x, y: p.y, slash: R, life: 0.18 });
      for (const e of this.enemies) { if (!e.dead && dist2(p.x, p.y, e.x, e.y) < (R + e.r) * (R + e.r)) this.hurt(e, (9 + slash.lvl * 4) * P.dmg); } slash.t = 1.1 / P.rate; } }
  }

  gainXp(n) { this.xp += n; if (!this.paused) this.checkLevel(); }
  checkLevel() { if (this.xp >= this.xpNext) { this.xp -= this.xpNext; this.level++; this.xpNext = Math.round(this.xpNext * 1.32 + 3); this.paused = true; this.cb.onLevelUp(this.upgradeChoices()); } }

  upgradeChoices() {
    const pool = [];
    const wl = (id) => this.weapons[id] ? this.weapons[id].lvl : 0;
    if (!this.weapons.slash) pool.push({ id: 'slash', name: 'Sword Slash', icon: 'hero', desc: 'Damage all foes around you.' });
    else pool.push({ id: 'slash', name: 'Sword Slash+', icon: 'hero', desc: `Lv${wl('slash') + 1}: bigger, harder slashes.` });
    pool.push({ id: 'bolt', name: 'Crossbow+', icon: 'bolt', desc: `Lv${wl('bolt') + 1}: more bolts & damage.` });
    if (this.orbs.length < 6) pool.push({ id: 'orb', name: 'Orbiting Shield', icon: 'gem', desc: `Add an orbiting orb (${this.orbs.length + 1}).` });
    if (this.turrets.length < 6) pool.push({ id: 'turret', name: 'Cannon Turret', icon: 'turret', desc: 'Deploy an auto-firing turret.' });
    pool.push({ id: 'might', name: 'Might', icon: 'bolt', desc: '+20% damage.' });
    pool.push({ id: 'haste', name: 'Haste', icon: 'turret', desc: '+18% fire rate.' });
    pool.push({ id: 'boots', name: 'Swift Boots', icon: 'hero', desc: '+12% move speed.' });
    pool.push({ id: 'repair', name: 'Repair Crew', icon: 'castle', desc: 'Restore 120 castle HP.' });
    pool.push({ id: 'vitality', name: 'Vitality', icon: 'gem', desc: '+30 max HP & heal.' });
    pool.push({ id: 'magnet', name: 'Magnet', icon: 'gem', desc: '+40 pickup range.' });
    // pick 3 unique
    const out = []; const used = new Set();
    while (out.length < 3 && pool.length) { const i = Math.floor(Math.random() * pool.length); const c = pool.splice(i, 1)[0]; if (used.has(c.id)) continue; used.add(c.id); out.push(c); }
    return out;
  }
  applyUpgrade(id) {
    const W = this.weapons;
    if (id === 'bolt') W.bolt.lvl++;
    else if (id === 'slash') W.slash ? W.slash.lvl++ : (W.slash = { lvl: 1, t: 0 });
    else if (id === 'orb') this.orbs.push({ dmg: 9 + this.orbs.length * 2 });
    else if (id === 'turret') { const a = rand(0, TAU); this.turrets.push({ x: this.castle.x + Math.cos(a) * 90, y: this.castle.y + Math.sin(a) * 90, dmg: 8, t: 0 }); }
    else if (id === 'might') this.passive.dmg *= 1.2;
    else if (id === 'haste') this.passive.rate *= 1.18;
    else if (id === 'boots') this.passive.speed *= 1.12;
    else if (id === 'magnet') this.passive.magnet += 40;
    else if (id === 'repair') this.castle.hp = Math.min(this.castle.maxHp, this.castle.hp + 120);
    else if (id === 'vitality') { this.player.maxHp += 30; this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30); }
    // refresh orb damage scaling
    this.orbs.forEach((o, i) => o.dmg = 9 + i * 2);
    this.paused = false;
    this.checkLevel(); // chain if multiple level-ups are pending
  }

  stats() { return { time: this.t, level: this.level, kills: this.kills }; }
  hud() { return { castle: this.castle.hp, castleMax: this.castle.maxHp, hp: this.player.hp, hpMax: this.player.maxHp, xp: this.xp, xpNext: this.xpNext, level: this.level, time: this.t, kills: this.kills }; }

  // ---- render ----
  spr(name) { return this.A[name]; }
  drawSprite(name, x, y, scale = 1) { const s = this.spr(name); if (!s) { this.ctx.fillStyle = '#c44'; this.ctx.fillRect(x - 8, y - 8, 16, 16); return; } const w = s.width * scale, h = s.height * scale; this.ctx.drawImage(s, x - w / 2, y - h / 2, w, h); }

  render() {
    const ctx = this.ctx; ctx.imageSmoothingEnabled = false;
    // ground
    const g = this.spr('ground');
    if (g) { if (!this._pat) this._pat = ctx.createPattern(g, 'repeat'); ctx.fillStyle = this._pat; } else ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(0, 0, this.W, this.H);

    // gems
    for (const gm of this.gems) this.drawSprite('gem', gm.x, gm.y, 1);
    // castle
    this.drawSprite('castle', this.castle.x, this.castle.y, 1);
    this.bar(this.castle.x - 40, this.castle.y - this.castle.r - 30, 80, 7, this.castle.hp / this.castle.maxHp, '#d6584f');
    // turrets
    for (const tr of this.turrets) this.drawSprite('turret', tr.x, tr.y, 1);
    // enemies
    for (const e of this.enemies) { if (e.hit > 0) ctx.globalAlpha = 0.6; this.drawSprite(e.spr, e.x, e.y, 1); ctx.globalAlpha = 1; if (e.boss) this.bar(e.x - 30, e.y - e.r - 12, 60, 5, e.hp / e.maxHp, '#e07a3a'); }
    // orbs
    for (const o of this.orbs) this.drawSprite('gem', o.x, o.y, 1.1);
    // shots
    ctx.fillStyle = '#f4d27a'; for (const s of this.shots) { this.drawSprite('bolt', s.x, s.y, 0.8); }
    // player
    const p = this.player; if (p.ifr > 0 && Math.floor(this.t * 20) % 2) ctx.globalAlpha = 0.4;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.face, 1); this.drawSprite('hero', 0, 0, 1); ctx.restore(); ctx.globalAlpha = 1;
    // slash fx
    for (const f of this.fx) { if (f.slash) { ctx.strokeStyle = `rgba(255,255,255,${f.life / 0.18 * 0.6})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, f.slash, 0, TAU); ctx.stroke(); }
      else if (f.txt !== undefined) { ctx.fillStyle = f.bad ? '#ff7a6a' : '#fff'; ctx.font = '12px monospace'; ctx.globalAlpha = Math.max(0, f.life * 2); ctx.fillText(f.txt, f.x - 6, f.y - (0.5 - f.life) * 20); ctx.globalAlpha = 1; } }
  }
  bar(x, y, w, h, frac, col) { const ctx = this.ctx; ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = '#111'; ctx.fillRect(x, y, w, h); ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, frac), h); }
}

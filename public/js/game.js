// Ashen Vale — a small 3rd-person action-RPG (Zelda / Elden Ring vibe) built on
// Three.js. One playable area: roll, swing a sword, fend off waves, rest at the
// golden grace tree to heal. Mobile-first (virtual stick + look + buttons).
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { buildHumanoid } from './mob.js';

const PLAYER = { speed: 7.2, hp: 100, stamina: 100, reach: 2.6, arc: 0.6, dmg: 34,
  atkCost: 22, rollCost: 28, stRegen: 26, rollSpeed: 16, rollTime: 0.42, iFrames: 0.34 };

export class Game {
  constructor(canvas, cb) {
    this.cb = cb || {};
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x0a0d13);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
    this.clock = new THREE.Clock();

    // camera orbit state
    this.camYaw = Math.PI; this.camPitch = 0.42; this.camDist = 9;
    this._camPos = new THREE.Vector3();

    // scratch vectors (avoid per-frame allocation)
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3();
    this.alive = false;
  }

  setInput(input) { this.input = input; }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  reset() {
    // fresh scene each run
    this.scene = new THREE.Scene();
    this.world = buildWorld(this.scene);

    // player
    const ph = buildHumanoid({ skin: 0xe0b48c, cloth: 0x2f4a63, accent: 0x6b4a2a, withSword: true, sword: 0xdfe6f0 });
    this.player = {
      group: ph.group, parts: ph.parts,
      pos: this.world.grace.clone().add(new THREE.Vector3(0, 0, 6)),
      yaw: Math.PI, hp: PLAYER.hp, st: PLAYER.stamina,
      atk: 0, roll: 0, iframe: 0, walk: 0, hitFlash: 0,
    };
    this.player.pos.y = this.world.terrainY(this.player.pos.x, this.player.pos.z);
    this.scene.add(this.player.group);

    this.enemies = [];
    this.wave = 0; this.waveT = 1.2; this.time = 0; this.kills = 0;
    this.graceMsg = false;
    this.alive = true;

    // snap camera behind
    this.camYaw = this.player.yaw + Math.PI;
    this._placeCamera(1);
  }

  // ---- enemy factory ----
  spawnEnemy(x, z, kind = 'grunt') {
    const big = kind === 'brute';
    const h = buildHumanoid(big
      ? { skin: 0x8a5a3a, cloth: 0x5a2a2a, accent: 0x33201a, scale: 1.7, withSword: true, sword: 0x9aa0aa }
      : { skin: 0x6b8a4a, cloth: 0x44402e, accent: 0x2f2a1e, scale: 1.05, withSword: true, sword: 0x8a8f99 });
    h.group.position.set(x, this.world.terrainY(x, z), z);
    this.scene.add(h.group);
    // floating health bar (billboarded, lives in the scene — not the mob group)
    const bar = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthTest: false }));
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.12), new THREE.MeshBasicMaterial({ color: 0xc23a32, depthTest: false }));
    fill.position.z = 0.01; bar.add(bg); bar.add(fill);
    bar.renderOrder = 999; bar.visible = false; this.scene.add(bar);
    const barH = big ? 3.9 : 2.7;
    const maxHp = big ? 220 : 60;
    this.enemies.push({
      group: h.group, parts: h.parts, kind, big,
      pos: h.group.position.clone(), yaw: 0,
      hp: maxHp, maxHp, bar, barFill: fill, barH,
      state: 'idle', stateT: Math.random() * 2, attackCd: 1.2 + Math.random(),
      wind: 0, hit: 0, dead: 0, walk: Math.random() * 6,
      speed: big ? 3.6 : 4.6 + Math.random(), dmg: big ? 26 : 12,
      reach: big ? 3.0 : 2.0, aggro: big ? 26 : 18,
    });
  }

  spawnWave() {
    this.wave++;
    const n = 2 + this.wave;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 18;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const brute = this.wave >= 3 && i === 0;
      this.spawnEnemy(x, z, brute ? 'brute' : 'grunt');
    }
    if (this.cb.onToast) this.cb.onToast(`WAVE ${this.wave}`);
  }

  // ---- collision against world obstacles + arena rim ----
  _resolve(pos, r) {
    for (const o of this.world.obstacles) {
      const dx = pos.x - o.x, dz = pos.z - o.z;
      const d = Math.hypot(dx, dz), min = o.r + r;
      if (d < min && d > 1e-4) { const k = (min - d) / d; pos.x += dx * k; pos.z += dz * k; }
    }
    const dc = Math.hypot(pos.x, pos.z);
    if (dc > this.world.radius) { const k = this.world.radius / dc; pos.x *= k; pos.z *= k; }
  }

  // ---------------------------------------------------------------- update
  update(dt) {
    if (!this.alive) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const P = this.player, I = this.input;
    I.poll();

    // --- camera look ---
    const look = I.takeLook();
    this.camYaw -= look.dx * 0.005;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch - look.dy * 0.004, 0.08, 1.15);

    // forward/right on XZ derived from camera yaw
    const F = this._a.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const Rx = -F.z, Rz = F.x;

    // --- intents ---
    if (I.takeRoll() && P.roll <= 0 && P.st >= PLAYER.rollCost) {
      P.roll = PLAYER.rollTime; P.iframe = PLAYER.iFrames; P.st -= PLAYER.rollCost;
      // roll in movement dir, else facing
      let mx = F.x * -I.move.y + Rx * I.move.x, mz = F.z * -I.move.y + Rz * I.move.x;
      if (!mx && !mz) { mx = Math.sin(P.yaw); mz = Math.cos(P.yaw); }
      const l = Math.hypot(mx, mz) || 1; P.rollDir = { x: mx / l, z: mz / l };
      P.yaw = Math.atan2(P.rollDir.x, P.rollDir.z);
    }
    if (I.takeAttack() && P.atk <= 0 && P.roll <= 0 && P.st >= PLAYER.atkCost) {
      P.atk = 0.45; P.st -= PLAYER.atkCost; P.hitSet = new Set();
    }

    // --- movement ---
    let moved = false;
    if (P.roll > 0) {
      P.roll -= dt; P.iframe -= dt;
      const sp = PLAYER.rollSpeed * (P.roll / PLAYER.rollTime + 0.35);
      P.pos.x += P.rollDir.x * sp * dt; P.pos.z += P.rollDir.z * sp * dt;
      moved = true;
    } else {
      const mx = F.x * -I.move.y + Rx * I.move.x, mz = F.z * -I.move.y + Rz * I.move.x;
      const ml = Math.hypot(mx, mz);
      if (ml > 0.05) {
        const slow = P.atk > 0 ? 0.35 : 1;        // slow while swinging
        const nx = mx / ml, nz = mz / ml;
        P.pos.x += nx * PLAYER.speed * slow * dt; P.pos.z += nz * PLAYER.speed * slow * dt;
        P.yaw = Math.atan2(nx, nz); moved = true;
      }
    }
    this._resolve(P.pos, 0.5);
    P.pos.y = this.world.terrainY(P.pos.x, P.pos.z);

    // --- attack timing & hit detection ---
    if (P.atk > 0) {
      P.atk -= dt;
      const phase = 1 - P.atk / 0.45;            // 0..1 over the swing
      if (phase > 0.18 && phase < 0.6) this._meleeHit();
    }

    // --- stamina regen ---
    if (P.atk <= 0 && P.roll <= 0) P.st = Math.min(PLAYER.stamina, P.st + PLAYER.stRegen * dt);
    P.hitFlash = Math.max(0, P.hitFlash - dt * 3);

    // --- grace healing (rest when no foe is near) ---
    const dg = Math.hypot(P.pos.x - this.world.grace.x, P.pos.z - this.world.grace.z);
    const foeNear = this.enemies.some(e => e.dead <= 0 && Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z) < 12);
    if (dg < 5 && !foeNear) {
      P.hp = Math.min(PLAYER.hp, P.hp + 24 * dt);
      P.st = Math.min(PLAYER.stamina, P.st + 40 * dt);
      if (!this.graceMsg && P.hp < PLAYER.hp - 1) { /* heal silently */ }
      if (!this.graceMsg) { this.graceMsg = true; if (this.cb.onToast) this.cb.onToast('GRACE'); }
    } else if (dg > 8) this.graceMsg = false;

    // --- enemies ---
    for (const e of this.enemies) this._updateEnemy(e, dt, P);
    // cull dead
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.dead > 0 && e.dead > 1.4) { this.scene.remove(e.group); this.scene.remove(e.bar); this.enemies.splice(i, 1); }
    }

    // --- waves ---
    const living = this.enemies.filter(e => e.dead <= 0).length;
    if (living === 0) { this.waveT -= dt; if (this.waveT <= 0) { this.spawnWave(); this.waveT = 3.5; } }

    // --- animate & camera & hud ---
    this._animatePlayer(dt, moved);
    this._placeCamera(1 - Math.pow(0.0001, dt));   // smooth follow

    if (this.cb.onHud) this.cb.onHud({ hp: P.hp, hpMax: PLAYER.hp, st: P.st, stMax: PLAYER.stamina, foes: living });

    if (P.hp <= 0) this._die();
  }

  _meleeHit() {
    const P = this.player;
    const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
    for (const e of this.enemies) {
      if (e.dead > 0 || P.hitSet.has(e)) continue;
      const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > PLAYER.reach + (e.big ? 0.8 : 0)) continue;
      const dot = (dx * fx + dz * fz) / (d || 1);
      if (dot < PLAYER.arc) continue;
      P.hitSet.add(e);
      e.hp -= PLAYER.dmg; e.hit = 0.18;
      e.knock = { x: (dx / (d || 1)) * 4, z: (dz / (d || 1)) * 4 };
      if (e.hp <= 0 && e.dead <= 0) { e.dead = 0.001; this.kills++; if (this.cb.onToast && e.big) this.cb.onToast('FELLED'); }
    }
  }

  _updateEnemy(e, dt, P) {
    // billboard health bar (scene-space, faces camera)
    const hpFrac = Math.max(0, e.hp / e.maxHp);
    e.barFill.scale.x = hpFrac; e.barFill.position.x = -(1 - hpFrac) * 0.58;
    e.bar.visible = e.dead <= 0 && hpFrac < 1;
    if (e.bar.visible) { e.bar.position.set(e.pos.x, e.pos.y + e.barH, e.pos.z); e.bar.quaternion.copy(this.camera.quaternion); }

    if (e.dead > 0) {                       // death: topple & sink
      e.dead += dt;
      e.group.rotation.x = Math.min(Math.PI / 2, e.dead * 3);
      e.group.position.y -= dt * 1.4;
      return;
    }

    // knockback
    if (e.knock) {
      e.pos.x += e.knock.x * dt * 6; e.pos.z += e.knock.z * dt * 6;
      e.knock.x *= 0.82; e.knock.z *= 0.82;
      if (Math.hypot(e.knock.x, e.knock.z) < 0.2) e.knock = null;
    }
    e.hit = Math.max(0, e.hit - dt);

    const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z;
    const d = Math.hypot(dx, dz);
    e.stateT -= dt; e.attackCd -= dt;

    if (e.wind > 0) {                        // winding up an attack
      e.wind -= dt;
      if (e.wind <= 0) {                     // strike lands
        if (d < e.reach + 0.4 && P.iframe <= 0) {
          P.hp -= e.dmg; P.hitFlash = 1;
          P.pos.x -= (dx / (d || 1)) * 0.6; P.pos.z -= (dz / (d || 1)) * 0.6;
        }
        e.attackCd = 1.4 + Math.random();
      }
    } else if (d < e.reach && e.attackCd <= 0) {
      e.wind = 0.5;                          // telegraph
    } else if (d < e.aggro) {                // chase
      const sp = e.speed;
      e.pos.x += (dx / d) * sp * dt; e.pos.z += (dz / d) * sp * dt;
      e.yaw = Math.atan2(dx, dz); e.walk += dt * 9;
    } else {                                 // idle wander
      if (e.stateT <= 0) { e.wanderYaw = Math.random() * Math.PI * 2; e.stateT = 1.5 + Math.random() * 2; }
      if (e.wanderYaw !== undefined) {
        e.pos.x += Math.sin(e.wanderYaw) * 1.4 * dt; e.pos.z += Math.cos(e.wanderYaw) * 1.4 * dt;
        e.yaw = e.wanderYaw; e.walk += dt * 5;
      }
    }

    this._resolve(e.pos, e.big ? 0.9 : 0.5);
    e.pos.y = this.world.terrainY(e.pos.x, e.pos.z);
    e.group.position.copy(e.pos);
    e.group.rotation.y = e.yaw;

    // limb anim
    const sw = Math.sin(e.walk) * 0.7;
    e.parts.legL.rotation.x = sw; e.parts.legR.rotation.x = -sw;
    e.parts.armL.rotation.x = -sw * 0.6;
    // arm raise on wind-up / swing down
    e.parts.armR.rotation.x = e.wind > 0 ? -1.6 * (e.wind / 0.5) - 0.2 : (sw * 0.6);
    // hit flash tint
    const tint = e.hit > 0 ? 0.6 : 0;
    e.parts.torso.material.emissive && e.parts.torso.material.emissive.setRGB(tint, 0, 0);
  }

  _animatePlayer(dt, moving) {
    const P = this.player;
    P.group.position.copy(P.pos);
    P.group.rotation.y = P.yaw;
    if (P.roll > 0) {
      P.group.rotation.x = (1 - P.roll / PLAYER.rollTime) * Math.PI * 2;  // forward roll spin
    } else {
      P.group.rotation.x = 0;
      P.walk += dt * (moving ? 10 : 0);
      const sw = Math.sin(P.walk) * (moving ? 0.7 : 0);
      P.parts.legL.rotation.x = sw; P.parts.legR.rotation.x = -sw;
      P.parts.armL.rotation.x = -sw * 0.6;
    }
    // sword swing overrides right arm
    if (P.atk > 0) {
      const ph = 1 - P.atk / 0.45;
      const a = ph < 0.25 ? -1.8 * (ph / 0.25)              // raise
              : -1.8 + (ph - 0.25) / 0.55 * 3.4;            // slash down across
      P.parts.armR.rotation.x = a;
      P.parts.armR.rotation.z = Math.sin(ph * Math.PI) * -0.6;
    } else if (P.roll <= 0) {
      const sw = Math.sin(P.walk) * (moving ? 0.6 : 0);
      P.parts.armR.rotation.x = sw; P.parts.armR.rotation.z = 0;
    }
    // damage flash: tint torso
    if (P.parts.torso.material.emissive) P.parts.torso.material.emissive.setRGB(P.hitFlash * 0.7, 0, 0);
  }

  _placeCamera(k) {
    const P = this.player;
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    const ox = Math.sin(this.camYaw) * cp, oz = Math.cos(this.camYaw) * cp;
    this._b.set(P.pos.x + ox * this.camDist, P.pos.y + 2.0 + sp * this.camDist, P.pos.z + oz * this.camDist);
    this._camPos.lerp(this._b, k);
    if (this._camPos.lengthSq() === 0) this._camPos.copy(this._b);
    this.camera.position.copy(this._camPos);
    this.camera.lookAt(P.pos.x, P.pos.y + 1.6, P.pos.z);
  }

  _die() {
    this.alive = false;
    if (this.cb.onDeath) this.cb.onDeath({ time: this.time, wave: this.wave, kills: this.kills });
  }

  render() { if (this.scene) this.renderer.render(this.scene, this.camera); }
}

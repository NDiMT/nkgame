// Σταχτοχώρι — a 3rd-person, story-driven exploration game (Zelda / Elden Ring
// vibe) on Three.js. Chapter 1: you arrive on horseback at an abandoned, silent
// village, explore its empty houses for clues, and uncover what happened.
import * as THREE from 'three';
import { buildVillage } from './world.js';
import { buildHumanoid } from './mob.js';
import { PLACES, RELIC, OBJECTIVES, OUTRO } from './story.js';

const SPEED = 6.2, ROLL_SPEED = 15, ROLL_TIME = 0.4, ROLL_CD = 0.6;
const RANGE = { house: 4.4, well: 3.2, relic: 2.8, chapel: 5.5 };

export class Game {
  constructor(canvas, cb) {
    this.cb = cb || {};
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x2a2630);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 320);

    this.camYaw = 0; this.camPitch = 0.4; this.camDist = 8.5;
    this._camPos = new THREE.Vector3();
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3();
    this.paused = false; this.alive = false;
  }

  setInput(input) { this.input = input; }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  reset() {
    this.scene = new THREE.Scene();
    this.world = buildVillage(this.scene, { PLACES, RELIC });

    // player on foot, at the south entrance beside the horse, facing north
    const ph = buildHumanoid({ skin: 0xe0b48c, cloth: 0x3a4636, accent: 0x4a3322, cloak: 0x6b2f2a, hood: 0x4a3322, metal: 0x9a9ea6, withSword: false });
    this.player = { group: ph.group, parts: ph.parts, pos: new THREE.Vector3(0, 0, 16), yaw: Math.PI, walk: 0, roll: 0, rollCd: 0, rollDir: null };
    this.player.pos.y = this.world.terrainY(0, 16);
    this.scene.add(ph.group);
    this.hasSword = false;

    // build interactable spots from the story
    this.spots = [];
    for (const p of PLACES) {
      const kind = p.kind === 'chapel' ? 'finale' : 'clue';
      this.spots.push(this._mkSpot(p, kind, p.kind === 'chapel' ? 'chapel' : p.kind));
    }
    this.spots.push(this._mkSpot(RELIC, 'relic', 'relic'));
    this.clueTotal = this.spots.filter(s => s.kind === 'clue').length;
    this.cluesFound = 0;
    this.chapelUnlocked = false;
    this.phase = 'explore';
    this.nearSpot = null; this._lastPrompt = undefined;
    this.t = 0; this.paused = false; this.alive = true;

    this.camYaw = this.player.yaw + Math.PI;
    this._placeCamera(1);
    this._emitHud();
  }

  _mkSpot(p, kind, rangeKey) {
    // floating wisp marker over the point of interest
    const wisp = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 8),
      new THREE.MeshBasicMaterial({ color: kind === 'relic' ? 0xffd17a : 0x8fd6ff, transparent: true, opacity: 0.9, depthWrite: false })
    );
    const halo = new THREE.PointLight(kind === 'relic' ? 0xffc15a : 0x6fb6ff, 0.8, 6, 2);
    wisp.add(halo);
    const y = this.world.terrainY(p.x, p.z) + 2.6;
    wisp.position.set(p.x, y, p.z);
    wisp.visible = kind !== 'finale';     // chapel wisp hidden until unlocked
    this.scene.add(wisp);
    return { id: p.id, x: p.x, z: p.z, lines: p.lines, label: p.label, kind, range: RANGE[rangeKey] || 3.5, found: false, wisp, baseY: y };
  }

  // collision against village obstacles + arena rim
  _resolve(pos, r) {
    for (const o of this.world.obstacles) {
      const dx = pos.x - o.x, dz = pos.z - o.z, d = Math.hypot(dx, dz), min = o.r + r;
      if (d < min && d > 1e-4) { const k = (min - d) / d; pos.x += dx * k; pos.z += dz * k; }
    }
    const dc = Math.hypot(pos.x, pos.z);
    if (dc > this.world.radius) { const k = this.world.radius / dc; pos.x *= k; pos.z *= k; }
  }

  // called by main.js when the interact button is tapped
  interact() {
    if (this.paused || this.phase === 'done' || !this.nearSpot) return;
    const spot = this.nearSpot;
    this.paused = true;
    if (this.cb.onDialogue) this.cb.onDialogue(spot.lines, () => this._afterDialogue(spot));
    else this._afterDialogue(spot);
  }

  _afterDialogue(spot) {
    this.paused = false;
    if (spot.found) return;
    spot.found = true; spot.wisp.visible = false; this.scene.remove(spot.wisp);

    if (spot.kind === 'relic') {
      this._giveSword();
      if (this.cb.onToast) this.cb.onToast('Πήρες το σπαθί του φύλακα');
    } else if (spot.kind === 'clue') {
      this.cluesFound++;
      if (this.cluesFound >= this.clueTotal && !this.chapelUnlocked) this._unlockChapel();
    } else if (spot.kind === 'finale') {
      this.phase = 'done';
      this.world.beacon.visible = false;
      if (this.cb.onChapterEnd) this.cb.onChapterEnd(OUTRO);
    }
    this.nearSpot = null; this._lastPrompt = undefined;
    if (this.cb.onPrompt) this.cb.onPrompt(null);
    this._emitHud();
  }

  _unlockChapel() {
    this.chapelUnlocked = true;
    this.phase = 'chapel';
    const ch = this.spots.find(s => s.kind === 'finale');
    if (ch) { ch.wisp.visible = true; }
    this.world.beacon.position.set(ch.x, this.world.terrainY(ch.x, ch.z) + 15, ch.z);
    this.world.beacon.visible = true;
    if (this.cb.onToast) this.cb.onToast('Στο εκκλησάκι καίει φως…');
  }

  _giveSword() {
    const P = this.player;
    const M = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    const blade = new THREE.Group();
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.1), M(0x5a3a26)); hilt.position.y = -0.78; blade.add(hilt);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.12), M(0x8a8f99)); guard.position.y = -0.66; blade.add(guard);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 0.05), new THREE.MeshStandardMaterial({ color: 0xe8e2d0, emissive: 0xcf9a3a, emissiveIntensity: 0.4, metalness: 0.4, roughness: 0.4 }));
    b.position.y = -0.04; b.castShadow = true; blade.add(b);
    P.parts.armR.add(blade);
    if (this.world.swordMesh) { this.scene.remove(this.world.swordMesh); this.world.swordMesh = null; }
    this.hasSword = true;
  }

  // ---------------------------------------------------------------- update
  update(dt) {
    if (!this.alive) return;
    dt = Math.min(dt, 0.05);
    this.t += dt;
    const P = this.player, I = this.input;

    // bob the wisps regardless of pause
    for (const s of this.spots) if (s.wisp.visible) { s.wisp.position.y = s.baseY + Math.sin(this.t * 2 + s.x) * 0.18; s.wisp.rotation.y += dt; }

    if (!this.paused) {
      I.poll();
      const look = I.takeLook();
      this.camYaw -= look.dx * 0.005;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch - look.dy * 0.004, 0.12, 1.05);

      const F = this._a.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
      const Rx = -F.z, Rz = F.x;

      // dodge roll
      P.rollCd = Math.max(0, P.rollCd - dt);
      if (I.takeRoll() && P.roll <= 0 && P.rollCd <= 0) {
        P.roll = ROLL_TIME; P.rollCd = ROLL_CD;
        let mx = F.x * -I.move.y + Rx * I.move.x, mz = F.z * -I.move.y + Rz * I.move.x;
        if (!mx && !mz) { mx = Math.sin(P.yaw); mz = Math.cos(P.yaw); }
        const l = Math.hypot(mx, mz) || 1; P.rollDir = { x: mx / l, z: mz / l }; P.yaw = Math.atan2(P.rollDir.x, P.rollDir.z);
      }
      I.takeAttack(); // consume (unused this chapter)

      let moving = false;
      if (P.roll > 0) {
        P.roll -= dt;
        const sp = ROLL_SPEED * (P.roll / ROLL_TIME + 0.35);
        P.pos.x += P.rollDir.x * sp * dt; P.pos.z += P.rollDir.z * sp * dt; moving = true;
      } else {
        const mx = F.x * -I.move.y + Rx * I.move.x, mz = F.z * -I.move.y + Rz * I.move.x;
        const ml = Math.hypot(mx, mz);
        if (ml > 0.05) { const nx = mx / ml, nz = mz / ml; P.pos.x += nx * SPEED * dt; P.pos.z += nz * SPEED * dt; P.yaw = Math.atan2(nx, nz); moving = true; }
      }
      this._resolve(P.pos, 0.5);
      P.pos.y = this.world.terrainY(P.pos.x, P.pos.z);
      this._animate(dt, moving);

      this._proximity();
    }

    this._placeCamera(1 - Math.pow(0.0001, dt));
  }

  _proximity() {
    const P = this.player; let best = null, bd = Infinity;
    for (const s of this.spots) {
      if (s.found) continue;
      if (s.kind === 'finale' && !this.chapelUnlocked) continue;
      const d = Math.hypot(s.x - P.pos.x, s.z - P.pos.z);
      if (d < s.range && d < bd) { bd = d; best = s; }
    }
    this.nearSpot = best;
    const label = best ? best.label : null;
    if (label !== this._lastPrompt) { this._lastPrompt = label; if (this.cb.onPrompt) this.cb.onPrompt(label); }
  }

  _animate(dt, moving) {
    const P = this.player;
    P.group.position.copy(P.pos);
    P.group.rotation.y = P.yaw;
    if (P.roll > 0) { P.group.rotation.x = (1 - P.roll / ROLL_TIME) * Math.PI * 2; }
    else {
      P.group.rotation.x = 0;
      P.walk += dt * (moving ? 9 : 0);
      const sw = Math.sin(P.walk) * (moving ? 0.7 : 0);
      P.parts.legL.rotation.x = sw; P.parts.legR.rotation.x = -sw;
      P.parts.armL.rotation.x = -sw * 0.6; P.parts.armR.rotation.x = sw * 0.6;
    }
  }

  _placeCamera(k) {
    const P = this.player;
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    const ox = Math.sin(this.camYaw) * cp, oz = Math.cos(this.camYaw) * cp;
    this._b.set(P.pos.x + ox * this.camDist, P.pos.y + 2.0 + sp * this.camDist, P.pos.z + oz * this.camDist);
    this._camPos.lerp(this._b, k);
    this.camera.position.copy(this._camPos);
    this.camera.lookAt(P.pos.x, P.pos.y + 1.5, P.pos.z);
  }

  _emitHud() {
    let obj = OBJECTIVES.search;
    if (this.phase === 'chapel') obj = OBJECTIVES.chapel;
    else if (this.phase === 'done') obj = OBJECTIVES.done;
    if (this.cb.onHud) this.cb.onHud({ objective: obj, found: this.cluesFound, total: this.clueTotal, showCount: this.phase === 'explore' });
  }

  render() { if (this.scene) this.renderer.render(this.scene, this.camera); }
}

// Touch + keyboard input for Ashen Vale.
//  • Left virtual stick  → movement vector (move.x, move.y in [-1,1])
//  • Right-half drag      → camera look (look.dx accumulates yaw, look.dy pitch)
//  • Attack / Roll buttons→ one-shot edge flags consumed by the game
//  • Desktop: WASD/arrows move, mouse-drag looks, J/Space attack, Shift roll
export class Input {
  constructor() {
    this.move = { x: 0, y: 0 };     // normalized stick
    this.look = { dx: 0, dy: 0 };   // delta since last poll (radians-ish)
    this._attack = false; this._roll = false;
    this.stickId = null; this.lookId = null;
    this.keys = {};
  }

  attach() {
    const stick = document.getElementById('stick');
    const nub = document.getElementById('stick-nub');
    const R = 50; // max nub travel (px)

    const setNub = (dx, dy) => { nub.style.transform = `translate(${dx}px, ${dy}px)`; };
    const resetStick = () => { this.move.x = 0; this.move.y = 0; setNub(0, 0); this.stickId = null; };

    const stickStart = (id, x, y) => {
      this.stickId = id; this._origin = { x, y }; stickMove(x, y);
    };
    const stickMove = (x, y) => {
      let dx = x - this._origin.x, dy = y - this._origin.y;
      const len = Math.hypot(dx, dy) || 1;
      const clamped = Math.min(len, R);
      const nx = (dx / len) * clamped, ny = (dy / len) * clamped;
      setNub(nx, ny);
      this.move.x = nx / R; this.move.y = ny / R;
    };

    // ---- touch ----
    const onDown = (e) => {
      for (const t of e.changedTouches) {
        const onStick = (t.target === stick || t.target === nub);
        if (onStick && this.stickId === null) { stickStart(t.identifier, t.clientX, t.clientY); }
        else if (t.clientX > innerWidth * 0.45 && this.lookId === null) {
          this.lookId = t.identifier; this._lookPrev = { x: t.clientX, y: t.clientY };
        }
      }
    };
    const onMove = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stickId) stickMove(t.clientX, t.clientY);
        else if (t.identifier === this.lookId) {
          this.look.dx += (t.clientX - this._lookPrev.x);
          this.look.dy += (t.clientY - this._lookPrev.y);
          this._lookPrev = { x: t.clientX, y: t.clientY };
        }
      }
    };
    const onUp = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stickId) resetStick();
        if (t.identifier === this.lookId) this.lookId = null;
      }
    };
    addEventListener('touchstart', onDown, { passive: false });
    addEventListener('touchmove', onMove, { passive: false });
    addEventListener('touchend', onUp); addEventListener('touchcancel', onUp);

    // ---- buttons ----
    const btnA = document.getElementById('btn-attack');
    const btnR = document.getElementById('btn-roll');
    const tap = (el, fn) => { el.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, { passive: false });
                              el.addEventListener('mousedown', (e) => { e.preventDefault(); fn(); }); };
    tap(btnA, () => { this._attack = true; });
    tap(btnR, () => { this._roll = true; });

    // ---- desktop mouse look ----
    let mdown = false, mprev = null;
    const cv = document.getElementById('game');
    cv.addEventListener('mousedown', (e) => { mdown = true; mprev = { x: e.clientX, y: e.clientY }; });
    addEventListener('mousemove', (e) => { if (!mdown) return; this.look.dx += e.clientX - mprev.x; this.look.dy += e.clientY - mprev.y; mprev = { x: e.clientX, y: e.clientY }; });
    addEventListener('mouseup', () => { mdown = false; });

    // ---- keyboard ----
    addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyJ' || e.code === 'Space') this._attack = true;
      if (e.code === 'ShiftLeft' || e.code === 'KeyK') this._roll = true;
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
  }

  // merge keyboard into movement each frame
  poll() {
    let kx = 0, ky = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) ky -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) ky += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) kx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) kx += 1;
    if (kx || ky) { const l = Math.hypot(kx, ky); this.move.x = kx / l; this.move.y = ky / l; }
  }

  takeLook() { const d = { dx: this.look.dx, dy: this.look.dy }; this.look.dx = 0; this.look.dy = 0; return d; }
  takeAttack() { const a = this._attack; this._attack = false; return a; }
  takeRoll() { const r = this._roll; this._roll = false; return r; }
}

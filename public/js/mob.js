import * as THREE from 'three';

// Builds a detailed low-poly humanoid: tapered torso, pauldrons, gloved hands,
// boots, belt+buckle, a hooded head with a shadowed face, and a back cape.
// Limbs pivot from shoulder/hip groups so walk cycles and sword swings animate.
// Returns { group, parts } — parts keeps the animated limb pivots.
export function buildHumanoid(opts = {}) {
  const {
    skin = 0xd8a878, cloth = 0x3a4a6a, accent = 0x6b3a2a,
    cloak = null, hood = null, metal = 0x8a8f99,
    scale = 1, withSword = false, sword = 0xcfd6e0,
  } = opts;

  const M = (c, flat = true) => new THREE.MeshLambertMaterial({ color: c, flatShading: flat });
  const skinM = M(skin), clothM = M(cloth), accM = M(accent), metalM = M(metal);
  const cloakM = M(cloak ?? accent), hoodM = M(hood ?? accent), darkM = M(0x0c0a0e);
  const group = new THREE.Group();
  const cast = (m) => { m.castShadow = true; return m; };

  // --- torso: chest + tapered waist ---
  const chest = cast(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.5, 0.42), clothM));
  chest.position.y = 1.42; group.add(chest);
  const torso = cast(new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.45, 0.38), clothM));
  torso.position.y = 1.05; group.add(torso);                 // waist (kept as `torso` for flash hooks)
  // chest strap / accent
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.66, 0.44), accM);
  strap.position.set(0.12, 1.3, 0.01); strap.rotation.z = 0.18; group.add(strap);
  // belt + buckle
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.14, 0.42), accM); belt.position.y = 0.82; group.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.06), metalM); buckle.position.set(0, 0.82, 0.22); group.add(buckle);

  // --- head: skull, hood shell, shadowed face, hair, eyes ---
  const head = cast(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.42), skinM));
  head.position.y = 1.92; group.add(head);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.06), darkM);    // shadowed brow/visor
  face.position.set(0, 1.96, 0.21); group.add(face);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xbfe6ff });
  for (const ex of [-0.08, 0.08]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), eyeM); e.position.set(ex, 1.97, 0.235); group.add(e); }
  const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), hoodM); hoodTop.position.y = 2.18; cast(hoodTop); group.add(hoodTop);
  const hoodBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.18), hoodM); hoodBack.position.set(0, 1.95, -0.22); group.add(hoodBack);

  // --- cape (static, angled off the upper back) ---
  const cape = new THREE.Mesh(new THREE.BoxGeometry(0.66, 1.15, 0.08), cloakM);
  cape.position.set(0, 1.15, -0.26); cape.rotation.x = 0.16; cast(cape); group.add(cape);

  // --- limb factory: pivot at joint; optional end-cap (hand/boot) ---
  function limb(w, h, d, mat, jx, jy, cap) {
    const pivot = new THREE.Group(); pivot.position.set(jx, jy, 0);
    const mesh = cast(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); mesh.position.y = -h / 2; pivot.add(mesh);
    if (cap) { const c = cast(new THREE.Mesh(new THREE.BoxGeometry(cap.w, cap.h, cap.d), cap.mat)); c.position.set(0, -h - cap.h / 2 + 0.02, cap.z || 0); pivot.add(c); }
    group.add(pivot); return pivot;
  }
  const armL = limb(0.2, 0.72, 0.22, clothM, -0.46, 1.58, { w: 0.22, h: 0.2, d: 0.24, mat: skinM });
  const armR = limb(0.2, 0.72, 0.22, clothM, 0.46, 1.58, { w: 0.22, h: 0.2, d: 0.24, mat: skinM });
  const legL = limb(0.24, 0.74, 0.26, accM, -0.16, 0.86, { w: 0.28, h: 0.18, d: 0.36, mat: darkM, z: 0.05 });
  const legR = limb(0.24, 0.74, 0.26, accM, 0.16, 0.86, { w: 0.28, h: 0.18, d: 0.36, mat: darkM, z: 0.05 });
  // pauldrons (ride the shoulders, follow the arms)
  for (const [arm, sx] of [[armL, -1], [armR, 1]]) { const p = cast(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.34), metalM)); p.position.set(0.02 * sx, -0.02, 0); arm.add(p); }

  let bladeGroup = null;
  if (withSword) {
    bladeGroup = new THREE.Group();
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.1), accM); hilt.position.y = -0.78; bladeGroup.add(hilt);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.12), metalM); guard.position.y = -0.66; bladeGroup.add(guard);
    const blade = cast(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 0.05), M(sword))); blade.position.y = -0.04; bladeGroup.add(blade);
    armR.add(bladeGroup);
  }

  group.scale.setScalar(scale);
  return { group, parts: { torso, head, armL, armR, legL, legR, blade: bladeGroup } };
}

// A simple low-poly horse — set dressing at the village entrance.
export function buildHorse() {
  const M = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const hide = M(0x4a3324), mane = M(0x271a10);
  const g = new THREE.Group();
  const cast = (m) => { m.castShadow = true; g.add(m); return m; };
  const body = cast(new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 2.2), hide)); body.position.set(0, 1.5, 0);
  const neck = cast(new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.6), hide)); neck.position.set(0, 2.1, 1.1); neck.rotation.x = -0.5;
  const head = cast(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.0), hide)); head.position.set(0, 2.5, 1.7);
  const m = cast(new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.7), mane)); m.position.set(0, 2.3, 0.95); m.rotation.x = -0.5;
  const tail = cast(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.3), mane)); tail.position.set(0, 1.4, -1.2); tail.rotation.x = 0.6;
  for (const [lx, lz] of [[-0.35, 0.8], [0.35, 0.8], [-0.35, -0.8], [0.35, -0.8]]) {
    const leg = cast(new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.4, 0.24), hide)); leg.position.set(lx, 0.7, lz);
  }
  return g;
}

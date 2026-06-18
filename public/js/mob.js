import * as THREE from 'three';

// Builds a low-poly humanoid. Limbs pivot from shoulder/hip groups so we can
// animate walk cycles and sword swings. Returns { group, parts }.
export function buildHumanoid(opts = {}) {
  const {
    skin = 0xd8a878, cloth = 0x3a4a6a, accent = 0x6b3a2a,
    scale = 1, withSword = false, sword = 0xcfd6e0,
  } = opts;

  const M = (c, flat = true) => new THREE.MeshLambertMaterial({ color: c, flatShading: flat });
  const skinM = M(skin), clothM = M(cloth), accM = M(accent);
  const group = new THREE.Group();
  const cast = (m) => { m.castShadow = true; return m; };

  // torso
  const torso = cast(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.42), clothM));
  torso.position.y = 1.15; group.add(torso);
  // belt / accent
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.16, 0.46), accM);
  belt.position.y = 0.78; group.add(belt);
  // head
  const head = cast(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), skinM));
  head.position.y = 1.85; group.add(head);
  // hair / hood
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.26, 0.52), accM);
  hood.position.y = 2.04; group.add(hood);

  // limb factory: pivot group at joint, mesh hangs below
  function limb(w, h, d, mat, jx, jy) {
    const pivot = new THREE.Group();
    pivot.position.set(jx, jy, 0);
    const mesh = cast(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
    mesh.position.y = -h / 2;
    pivot.add(mesh);
    group.add(pivot);
    return pivot;
  }
  const armL = limb(0.22, 0.78, 0.24, skinM, -0.46, 1.5);
  const armR = limb(0.22, 0.78, 0.24, skinM, 0.46, 1.5);
  const legL = limb(0.26, 0.8, 0.28, accM, -0.18, 0.72);
  const legR = limb(0.26, 0.8, 0.28, accM, 0.18, 0.72);

  let bladeGroup = null;
  if (withSword) {
    bladeGroup = new THREE.Group();
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.1), accM);
    hilt.position.y = -0.78; bladeGroup.add(hilt);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.12), M(0x8a8f99));
    guard.position.y = -0.66; bladeGroup.add(guard);
    const blade = cast(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 0.05), M(sword)));
    blade.position.y = -0.04; bladeGroup.add(blade);
    armR.add(bladeGroup);     // sword follows the right arm
  }

  group.scale.setScalar(scale);
  return { group, parts: { torso, head, armL, armR, legL, legR, blade: bladeGroup } };
}

import * as THREE from 'three';
import { buildHorse } from './mob.js';

// Builds the abandoned village at dusk. Returns collision + scene handles.
//   { obstacles, radius, terrainY, swordMesh, beacon, fog }
export function buildVillage(scene, story) {
  const radius = 34;
  const obstacles = [];

  // gentle, near-flat terrain (buildings need stable ground)
  const terrainY = (x, z) => Math.sin(x * 0.06) * Math.cos(z * 0.05) * 0.5;

  // ---- dusk sky ----
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(260, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color('#1a2030') }, mid: { value: new THREE.Color('#3a3142') }, bot: { value: new THREE.Color('#6e4a3a') } },
      vertexShader: `varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying float h; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
        void main(){ float t=clamp(h*1.1+0.25,0.0,1.0); vec3 c = h<0.12 ? mix(bot,mid,clamp(h/0.12,0.0,1.0)) : mix(mid,top,clamp((h-0.12)/0.88,0.0,1.0)); gl_FragColor=vec4(c,1.0); }`,
    })
  );
  scene.add(sky);
  const fog = new THREE.FogExp2(0x2a2630, 0.03);
  scene.fog = fog;

  // ---- terrain mesh ----
  const segs = 48, size = 110;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, colors = [];
  const cGrass = new THREE.Color('#3c4030'), cDirt = new THREE.Color('#4a3e2c'), cPath = new THREE.Color('#5b4a33');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, terrainY(x, z));
    const onPath = Math.abs(x) < 2.4 && z < 18 && z > -24;       // dirt path south→chapel
    const c = (onPath ? cPath : cGrass.clone().lerp(cDirt, Math.random() * 0.4));
    const cc = c.clone ? c.clone() : c; colors.push(cc.r, cc.g, cc.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  ground.receiveShadow = true; scene.add(ground);

  // ---- lighting: low dusk sun + dim cool ambient ----
  scene.add(new THREE.HemisphereLight(0x4a5066, 0x20181a, 0.6));
  const sun = new THREE.DirectionalLight(0xffb074, 0.9);
  sun.position.set(-26, 20, 30); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const s = 40, c = sun.shadow.camera; c.left = -s; c.right = s; c.top = s; c.bottom = -s; c.near = 1; c.far = 120; sun.shadow.bias = -0.0006;
  scene.add(sun);

  // ---- materials ----
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x8a7a64 });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4a3526 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x0c0a0e });
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x6b6f78, flatShading: true });

  function placeOnGround(g, x, z) { g.position.set(x, terrainY(x, z), z); }

  // ---- house ----
  function house(p) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), wallMat);
    body.position.y = p.h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
    // hipped roof (4-sided pyramid)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(p.w, p.d) * 0.78, p.h * 0.7, 4), new THREE.MeshLambertMaterial({ color: p.roof, flatShading: true }));
    roof.position.y = p.h + p.h * 0.35; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
    // dark doorway facing village centre
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.9, 0.2), darkMat);
    door.position.set(0, 0.95, p.d / 2 + 0.01); g.add(door);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.2), darkMat);
    win.position.set(p.w / 2 - 0.9, p.h * 0.55, p.d / 2 + 0.01); g.add(win);
    // face the centre of the village
    g.rotation.y = Math.atan2(-p.x, -p.z);
    placeOnGround(g, p.x, p.z); scene.add(g);
    obstacles.push({ x: p.x, z: p.z, r: Math.max(p.w, p.d) * 0.55 });
  }

  // ---- well (with broken planks pushed from below) ----
  function well(p) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 1.0, 12, 1, true), stoneMat);
    ring.position.y = 0.5; ring.castShadow = true; g.add(ring);
    for (let i = 0; i < 4; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.4), woodMat);
      plank.position.set(0, 1.02, -0.7 + i * 0.45);
      if (i === 1) { plank.rotation.x = -0.5; plank.position.y = 1.25; }   // splintered upward
      g.add(plank);
    }
    const dark = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 12), darkMat);
    dark.position.y = 0.96; g.add(dark);
    placeOnGround(g, p.x, p.z); scene.add(g);
    obstacles.push({ x: p.x, z: p.z, r: 1.5 });
  }

  // ---- chapel (bell tower + cross) ----
  function chapel(p) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), wallMat);
    body.position.y = p.h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(p.w * 0.8, 3, 4), new THREE.MeshLambertMaterial({ color: p.roof, flatShading: true }));
    roof.position.y = p.h + 1.4; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2, p.h + 3, 2), wallMat);
    tower.position.set(p.w / 2 - 1, (p.h + 3) / 2, p.d / 2 - 1); tower.castShadow = true; g.add(tower);
    const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.2), woodMat);
    cross1.position.set(p.w / 2 - 1, p.h + 4.2, p.d / 2 - 1); g.add(cross1);
    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.2), woodMat);
    cross2.position.set(p.w / 2 - 1, p.h + 4.4, p.d / 2 - 1); g.add(cross2);
    // warm doorway glow facing the village (south, +z)
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.2), new THREE.MeshBasicMaterial({ color: 0x3a2a1a }));
    door.position.set(0, 1.3, p.d / 2 + 0.02); g.add(door);
    const glow = new THREE.PointLight(0xffb05a, 1.6, 14, 2);
    glow.position.set(0, 2.2, p.d / 2 + 1.5); g.add(glow);
    placeOnGround(g, p.x, p.z); scene.add(g);
    obstacles.push({ x: p.x, z: p.z, r: Math.max(p.w, p.d) * 0.55 });
  }

  // ---- build all places ----
  for (const pl of story.PLACES) {
    if (pl.kind === 'house') house(pl);
    else if (pl.kind === 'well') well(pl);
    else if (pl.kind === 'chapel') chapel(pl);
  }

  // ---- the guardian's sword, stuck in a shrine stone ----
  const sg = new THREE.Group();
  const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), stoneMat);
  stone.position.y = 0.5; stone.scale.y = 0.7; stone.castShadow = true; sg.add(stone);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 0.06), new THREE.MeshStandardMaterial({ color: 0xe8e2d0, emissive: 0xcf9a3a, emissiveIntensity: 0.5, metalness: 0.4, roughness: 0.4 }));
  blade.position.y = 1.7; sg.add(blade);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.16), new THREE.MeshLambertMaterial({ color: 0x8a8f99 }));
  guard.position.y = 1.0; sg.add(guard);
  const slight = new THREE.PointLight(0xffcf6a, 1.2, 9, 2); slight.position.set(0, 1.6, 0); sg.add(slight);
  placeOnGround(sg, story.RELIC.x, story.RELIC.z); scene.add(sg);
  obstacles.push({ x: story.RELIC.x, z: story.RELIC.z, r: 1.1 });
  const swordMesh = sg;

  // ---- the tied horse at the south entrance ----
  const horse = buildHorse();
  placeOnGround(horse, 2.4, 17); horse.rotation.y = -0.5; scene.add(horse);
  obstacles.push({ x: 2.4, z: 17, r: 1.2 });

  // ---- enclosing dark pines + a low border fence ----
  const pineMat = new THREE.MeshLambertMaterial({ color: 0x1f2a22, flatShading: true });
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2, d = radius + 1 + Math.random() * 8;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const t = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 5), woodMat); tr.position.y = 1; t.add(tr);
    for (let k = 0; k < 3; k++) { const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6 - k * 0.4, 2, 6), pineMat); cone.position.y = 2.3 + k * 1.1; t.add(cone); }
    placeOnGround(t, x, z); t.children.forEach(m => m.castShadow = true); scene.add(t);
  }

  // ---- waypoint beacon (a soft column of light), positioned by the game ----
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 30, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
  );
  beacon.position.y = 15; beacon.visible = false; scene.add(beacon);

  return { obstacles, radius, terrainY, swordMesh, beacon, fog };
}

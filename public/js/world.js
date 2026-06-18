import * as THREE from 'three';

// Builds the static environment of the vale and returns collision data.
// Low-poly, flat-shaded, mobile-friendly. Returns { grace, obstacles, radius }.
export function buildWorld(scene) {
  const radius = 58;               // playable radius
  const obstacles = [];            // { x, z, r } circular blockers

  // ---- sky gradient ----
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(300, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color('#2b3a52') }, bot: { value: new THREE.Color('#0a0d13') } },
      vertexShader: `varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying float h; uniform vec3 top; uniform vec3 bot; void main(){ gl_FragColor = vec4(mix(bot, top, clamp(h*1.2+0.3,0.0,1.0)), 1.0); }`,
    })
  );
  scene.add(sky);
  scene.fog = new THREE.FogExp2(0x12161f, 0.018);

  // ---- terrain (gently rolling, low-poly, vertex coloured) ----
  const segs = 64, size = 150;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  const cLow = new THREE.Color('#3a4a32'), cHigh = new THREE.Color('#586a3e'), cDirt = new THREE.Color('#4a4030');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.hypot(x, z);
    let y = Math.sin(x * 0.13) * Math.cos(z * 0.11) * 1.6 + Math.sin(x * 0.05 + z * 0.07) * 1.0;
    if (d > radius) y += (d - radius) * (d - radius) * 0.05;   // rim rises into hills
    pos.setY(i, y);
    const t = THREE.MathUtils.clamp((y + 2) / 5, 0, 1);
    const c = cLow.clone().lerp(cHigh, t).lerp(cDirt, Math.random() * 0.12);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- lighting ----
  scene.add(new THREE.HemisphereLight(0x9fb0c8, 0x33402c, 0.85));
  const sun = new THREE.DirectionalLight(0xffe6b0, 1.15);
  sun.position.set(28, 44, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const s = 56; const c = sun.shadow.camera;
  c.left = -s; c.right = s; c.top = s; c.bottom = -s; c.near = 1; c.far = 140;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  // ---- decoration helpers ----
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3526 });
  const leafMats = [0x2f5233, 0x3a5f3a, 0x46683a].map(c => new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x6b6f78, flatShading: true });

  function tree(x, z, scl = 1) {
    const g = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scl, 0.34 * scl, 2.4 * scl, 6), trunkMat);
    tr.position.y = 1.2 * scl; tr.castShadow = true; g.add(tr);
    const layers = 3;
    for (let i = 0; i < layers; i++) {
      const r = (1.7 - i * 0.42) * scl;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 1.7 * scl, 7), leafMats[i % leafMats.length]);
      cone.position.y = (2.3 + i * 1.1) * scl; cone.castShadow = true; cone.rotation.y = Math.random();
      g.add(cone);
    }
    g.position.set(x, terrainY(x, z), z);
    scene.add(g);
    obstacles.push({ x, z, r: 0.6 * scl });
  }
  function rock(x, z, scl = 1) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 * scl, 0), rockMat);
    m.position.set(x, terrainY(x, z) + 0.3 * scl, z);
    m.rotation.set(Math.random(), Math.random(), Math.random());
    m.scale.y *= 0.7; m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    obstacles.push({ x, z, r: 0.7 * scl });
  }
  function grass(x, z) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 4), leafMats[1]);
    m.position.set(x, terrainY(x, z) + 0.3, z); m.rotation.y = Math.random();
    scene.add(m);
  }

  // approximate terrain height (matches the displacement formula, ignoring rim)
  function terrainY(x, z) {
    return Math.sin(x * 0.13) * Math.cos(z * 0.11) * 1.6 + Math.sin(x * 0.05 + z * 0.07) * 1.0;
  }

  // ---- scatter ----
  const rand = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 46; i++) {
    const a = Math.random() * Math.PI * 2, d = rand(8, radius - 2);
    tree(Math.cos(a) * d, Math.sin(a) * d, rand(0.8, 1.6));
  }
  for (let i = 0; i < 34; i++) {
    const a = Math.random() * Math.PI * 2, d = rand(6, radius);
    rock(Math.cos(a) * d, Math.sin(a) * d, rand(0.7, 1.8));
  }
  for (let i = 0; i < 120; i++) {
    const a = Math.random() * Math.PI * 2, d = rand(4, radius);
    grass(Math.cos(a) * d, Math.sin(a) * d);
  }

  // ---- ring of standing stones at the border ----
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, d = radius + 2;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const h = rand(5, 9);
    const m = new THREE.Mesh(new THREE.BoxGeometry(rand(1.5, 2.6), h, rand(1.2, 2)), rockMat);
    m.position.set(x, terrainY(x, z) + h / 2 - 1, z); m.rotation.y = a + rand(-0.3, 0.3); m.castShadow = true;
    scene.add(m);
  }

  // ---- the golden grace tree (rest / heal landmark) ----
  const grace = new THREE.Vector3(0, 0, -16);
  grace.y = terrainY(grace.x, grace.z);
  const gg = new THREE.Group();
  const gtrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 5, 8), new THREE.MeshLambertMaterial({ color: 0x6b5526 }));
  gtrunk.position.y = 2.5; gtrunk.castShadow = true; gg.add(gtrunk);
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe8c45a, emissive: 0xc8902a, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.3, flatShading: true });
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2 - i * 0.7, 2.4, 8), goldMat);
    cone.position.y = 5 + i * 1.4; cone.castShadow = true; gg.add(cone);
  }
  gg.position.copy(grace);
  scene.add(gg);
  const gl = new THREE.PointLight(0xffcf6a, 2.2, 30, 2);
  gl.position.set(grace.x, grace.y + 7, grace.z);
  scene.add(gl);
  obstacles.push({ x: grace.x, z: grace.z, r: 1.2 });

  return { grace, obstacles, radius, terrainY };
}

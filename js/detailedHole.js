import * as THREE from "three";

// ---------------------------------------------------------------------------
// Texture loader
// ---------------------------------------------------------------------------

export async function loadHoleTextures() {
  const loader = new THREE.TextureLoader();
  const load = (path) => loader.loadAsync(path);

  const [
    grassMap, grassNor,
    woodMap, woodNor,
    stoneMap, stoneNor,
    thatchMap,
    plasterMap,
  ] = await Promise.all([
    load("assets/textures/grass_diff.jpg"),
    load("assets/textures/grass_nor.jpg"),
    load("assets/textures/wood_diff.jpg"),
    load("assets/textures/wood_nor.jpg"),
    load("assets/textures/stone_diff.jpg"),
    load("assets/textures/stone_nor.jpg"),
    load("assets/textures/thatch_diff.jpg"),
    load("assets/textures/plaster_diff.jpg"),
  ]);

  const colorMaps = [grassMap, woodMap, stoneMap, thatchMap, plasterMap];
  const normalMaps = [grassNor, woodNor, stoneNor];

  for (const t of colorMaps) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  }
  for (const t of normalMaps) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 8;
  }

  return { grassMap, grassNor, woodMap, woodNor, stoneMap, stoneNor, thatchMap, plasterMap };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ms(geometry, material, cast = true, receive = true) {
  const obj = new THREE.Mesh(geometry, material);
  obj.castShadow = cast;
  obj.receiveShadow = receive;
  return obj;
}

function grassMat(tex) {
  const m = tex.grassMap.clone();
  m.repeat.set(4, 4);
  const n = tex.grassNor.clone();
  n.repeat.set(4, 4);
  return new THREE.MeshStandardMaterial({
    map: m,
    normalMap: n,
    color: 0xb8e08a,
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.45,
  });
}

function stoneMat(tex, repeatX = 3, repeatY = 3) {
  const m = tex.stoneMap.clone();
  m.repeat.set(repeatX, repeatY);
  const n = tex.stoneNor.clone();
  n.repeat.set(repeatX, repeatY);
  return new THREE.MeshStandardMaterial({
    map: m,
    normalMap: n,
    roughness: 0.88,
    metalness: 0.05,
    envMapIntensity: 0.55,
  });
}

function woodMat(tex, repeatX = 2, repeatY = 2) {
  const m = tex.woodMap.clone();
  m.repeat.set(repeatX, repeatY);
  const n = tex.woodNor.clone();
  n.repeat.set(repeatX, repeatY);
  return new THREE.MeshStandardMaterial({
    map: m,
    normalMap: n,
    roughness: 0.82,
    metalness: 0.05,
    envMapIntensity: 0.5,
  });
}

function plasterMat(tex) {
  const m = tex.plasterMap.clone();
  m.repeat.set(2, 2);
  return new THREE.MeshStandardMaterial({
    map: m,
    roughness: 0.9,
    metalness: 0.0,
    envMapIntensity: 0.4,
  });
}

function createCollider(minX, maxX, minY, maxY, minZ, maxZ) {
  return { minX, maxX, minY, maxY, minZ, maxZ, active: true };
}

function colliderFromMesh(mesh, padding = 0) {
  const box = new THREE.Box3().setFromObject(mesh);
  return createCollider(
    box.min.x - padding,
    box.max.x + padding,
    box.min.y,
    box.max.y,
    box.min.z - padding,
    box.max.z + padding,
  );
}

// ---------------------------------------------------------------------------
// Mound (organic shape from overlapping hemispheres)
// ---------------------------------------------------------------------------

function buildMound(group, tex) {
  const mat = grassMat(tex);

  // Keep front open so the round door stays visible
  const spheres = [
    { x: 0, y: 0, z: -7.2, rx: 5.6, ry: 2.5, rz: 3.4 },
    { x: -2.8, y: -0.1, z: -7.6, rx: 3.4, ry: 2.2, rz: 3.0 },
    { x: 2.8, y: -0.1, z: -7.6, rx: 3.4, ry: 2.2, rz: 3.0 },
    { x: 0, y: 0.2, z: -8.8, rx: 4.5, ry: 2.0, rz: 2.8 },
    { x: -4.2, y: -0.2, z: -6.6, rx: 2.4, ry: 1.8, rz: 2.4 },
    { x: 4.2, y: -0.2, z: -6.6, rx: 2.4, ry: 1.8, rz: 2.4 },
  ];

  for (const s of spheres) {
    const geo = new THREE.SphereGeometry(1, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const mound = ms(geo, mat.clone(), true, true);
    mound.scale.set(s.rx, s.ry, s.rz);
    mound.position.set(s.x, s.y, s.z);
    group.add(mound);
  }

  return colliderFromMesh(group, 0);
}

// ---------------------------------------------------------------------------
// Door frame (circular stone arch) & round wooden door
// ---------------------------------------------------------------------------

function buildRoundDoor(group, tex) {
  const stMat = stoneMat(tex, 4, 1);
  // Torus lies in XY by default (faces ±Z) — correct for a front door
  const frame = ms(
    new THREE.TorusGeometry(1.08, 0.16, 14, 36),
    stMat,
  );
  frame.position.set(0, 1.15, -2.95);
  group.add(frame);

  // Outer stone lip
  const lip = ms(
    new THREE.TorusGeometry(1.22, 0.08, 10, 36),
    stoneMat(tex, 2, 1),
  );
  lip.position.set(0, 1.15, -2.9);
  group.add(lip);

  const doorMat = woodMat(tex, 1, 1);
  doorMat.color.set(0x7a4f24);

  const pivot = new THREE.Group();
  pivot.position.set(0.85, 1.15, -3.0);

  // Cylinder is Y-up; rotate so the disc faces the player (±Z)
  const doorDisc = ms(
    new THREE.CylinderGeometry(0.92, 0.92, 0.1, 36),
    doorMat,
  );
  doorDisc.rotation.x = Math.PI / 2;
  doorDisc.position.set(-0.85, 0, 0);

  // Panels on the door face
  const plankH = ms(
    new THREE.BoxGeometry(1.55, 0.05, 0.04),
    woodMat(tex, 2, 0.5),
  );
  plankH.position.set(-0.85, 0.15, 0.06);
  const plankV = ms(
    new THREE.BoxGeometry(0.05, 1.55, 0.04),
    woodMat(tex, 0.5, 2),
  );
  plankV.position.set(-0.85, 0, 0.06);

  // Ring handle
  const ringHandle = ms(
    new THREE.TorusGeometry(0.09, 0.018, 10, 16),
    new THREE.MeshStandardMaterial({
      color: 0xd4a017,
      roughness: 0.3,
      metalness: 0.85,
      envMapIntensity: 1.4,
    }),
  );
  ringHandle.position.set(-0.55, 0, 0.08);

  const ringMount = ms(
    new THREE.CylinderGeometry(0.025, 0.025, 0.04, 10),
    new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      roughness: 0.35,
      metalness: 0.9,
    }),
  );
  ringMount.rotation.x = Math.PI / 2;
  ringMount.position.set(-0.55, 0.08, 0.07);

  pivot.add(doorDisc, plankH, plankV, ringHandle, ringMount);
  group.add(pivot);

  const doorCollider = colliderFromMesh(doorDisc, 0.04);
  doorCollider.mesh = doorDisc;

  return {
    pivot,
    mesh: doorDisc,
    collider: doorCollider,
    label: "Hobbit hole",
    role: "entrance",
    open: false,
    openAmount: 0,
    targetOpen: 0,
    hingeSide: 1,
    interactPoint: new THREE.Vector3(0, 1, -3.0),
    zone: "outside",
  };
}

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------

function buildWindows(group, tex) {
  const frameMat = woodMat(tex, 1, 1);
  frameMat.color.set(0x8d6e4a);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffe8a0,
    roughness: 0.2,
    metalness: 0.05,
    emissive: 0xffb060,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.75,
  });

  const positions = [
    { x: -3.0, y: 1.4, z: -4.5 },
    { x: 3.0, y: 1.4, z: -4.5 },
  ];

  for (const pos of positions) {
    const frameRing = ms(
      new THREE.TorusGeometry(0.45, 0.07, 10, 24),
      frameMat.clone(),
    );
    frameRing.position.set(pos.x, pos.y, pos.z);
    group.add(frameRing);

    const glass = ms(
      new THREE.CircleGeometry(0.42, 24),
      glassMat.clone(),
      false,
      false,
    );
    glass.position.set(pos.x, pos.y, pos.z + 0.02);
    group.add(glass);

    const crossH = ms(
      new THREE.BoxGeometry(0.82, 0.04, 0.04),
      frameMat.clone(),
    );
    crossH.position.set(pos.x, pos.y, pos.z + 0.03);
    const crossV = ms(
      new THREE.BoxGeometry(0.04, 0.82, 0.04),
      frameMat.clone(),
    );
    crossV.position.set(pos.x, pos.y, pos.z + 0.03);
    group.add(crossH, crossV);
  }
}

// ---------------------------------------------------------------------------
// Stone steps
// ---------------------------------------------------------------------------

function buildSteps(group, tex) {
  const stepMat = stoneMat(tex, 1, 1);
  const steps = [
    { x: 0, y: 0.06, z: -2.3, w: 2.0, h: 0.12, d: 0.6 },
    { x: 0, y: 0.15, z: -2.7, w: 1.7, h: 0.12, d: 0.5 },
    { x: 0, y: 0.24, z: -3.05, w: 1.5, h: 0.12, d: 0.4 },
  ];

  for (const s of steps) {
    const step = ms(new THREE.BoxGeometry(s.w, s.h, s.d), stepMat.clone());
    step.position.set(s.x, s.y, s.z);
    group.add(step);
  }

  const welcomeMat = ms(
    new THREE.BoxGeometry(1.2, 0.04, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xbf360c, roughness: 0.9 }),
  );
  welcomeMat.position.set(0, 0.26, -2.9);
  group.add(welcomeMat);
}

// ---------------------------------------------------------------------------
// Chimney
// ---------------------------------------------------------------------------

function buildChimney(group, tex) {
  const chimneyMat = stoneMat(tex, 1, 2);

  const base = ms(new THREE.BoxGeometry(0.6, 1.6, 0.6), chimneyMat);
  base.position.set(3.2, 2.4, -7.5);
  group.add(base);

  const cap = ms(
    new THREE.BoxGeometry(0.75, 0.1, 0.75),
    stoneMat(tex, 1, 1),
  );
  cap.position.set(3.2, 3.25, -7.5);
  group.add(cap);

  return new THREE.Vector3(3.2, 3.4, -7.5);
}

// ---------------------------------------------------------------------------
// Barrels & flower boxes
// ---------------------------------------------------------------------------

function buildBarrels(group, tex) {
  const barrelMat = woodMat(tex, 2, 1);

  const barrelPositions = [
    { x: -2.0, z: -3.2 },
    { x: -2.4, z: -3.6 },
  ];

  for (const p of barrelPositions) {
    const barrel = ms(
      new THREE.CylinderGeometry(0.25, 0.28, 0.65, 14),
      barrelMat.clone(),
    );
    barrel.position.set(p.x, 0.32, p.z);
    group.add(barrel);

    const band1 = ms(
      new THREE.TorusGeometry(0.27, 0.015, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.7 }),
    );
    band1.rotation.x = Math.PI / 2;
    band1.position.set(p.x, 0.18, p.z);
    const band2 = band1.clone();
    band2.position.y = 0.46;
    group.add(band1, band2);
  }
}

function buildFlowerBoxes(group, tex) {
  const boxMat = woodMat(tex, 1, 1);

  const boxPositions = [
    { x: 2.0, z: -3.3 },
    { x: 2.5, z: -3.7 },
  ];

  for (const p of boxPositions) {
    const box = ms(
      new THREE.BoxGeometry(0.55, 0.3, 0.3),
      boxMat.clone(),
    );
    box.position.set(p.x, 0.18, p.z);
    group.add(box);

    const colors = [0xff6b8a, 0xffeb3b, 0xff4081, 0xffa726];
    for (let i = 0; i < 4; i++) {
      const flower = ms(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.6 }),
        true,
        false,
      );
      flower.position.set(
        p.x - 0.15 + i * 0.1,
        0.38,
        p.z + (i % 2 === 0 ? 0.04 : -0.04),
      );
      group.add(flower);

      const stem = ms(
        new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6),
        new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8 }),
      );
      stem.position.set(flower.position.x, 0.32, flower.position.z);
      group.add(stem);
    }
  }
}

// ---------------------------------------------------------------------------
// Interior walls (plaster + wood-trimmed)
// ---------------------------------------------------------------------------

function buildInterior(game, group, tex) {
  const wallMat = plasterMat(tex);
  const trimMat = woodMat(tex, 3, 0.5);

  function wall(w, h, d, x, y, z) {
    const wl = ms(new THREE.BoxGeometry(w, h, d), wallMat.clone());
    wl.position.set(x, y + h / 2, z);
    group.add(wl);
    game.colliders.push(colliderFromMesh(wl));
    return wl;
  }

  function trimStrip(w, d, x, y, z) {
    const trim = ms(new THREE.BoxGeometry(w, 0.08, d), trimMat.clone());
    trim.position.set(x, y, z);
    group.add(trim);
  }

  // Back wall
  wall(8.5, 2.6, 0.3, 0, 0.2, -8.8);
  trimStrip(8.5, 0.3, 0, 0.24, -8.8);

  // Side walls
  wall(0.3, 2.6, 8.5, -4.2, 0.2, -12.5);
  wall(0.3, 2.6, 8.5, 4.2, 0.2, -12.5);

  // Far back wall
  wall(8.5, 2.6, 0.3, 0, 0.2, -16.2);

  // Interior floor
  const floorMat = woodMat(tex, 4, 4);
  const floor = ms(new THREE.BoxGeometry(8, 0.35, 8), floorMat, false, true);
  floor.position.set(0, -0.18, -12.5);
  group.add(floor);
  game.groundHeights.push({
    minX: -4, maxX: 4,
    minZ: -16.5, maxZ: -8.5,
    height: 0,
  });

  // Inner divider walls
  wall(0.3, 2.3, 6.5, -3.6, 0.2, -10.8);
  wall(0.3, 2.3, 6.5, 3.6, 0.2, -10.8);

  // Pantry door
  const pantryDoor = buildInteriorDoor(group, tex, 0, 0.2, -10.55, "Pantry");
  game.doors.push(pantryDoor);
  game.colliders.push(pantryDoor.collider);

  // Pantry dividers
  wall(0.3, 2.3, 4.2, 0, 0.2, -13.5);
  wall(3.8, 2.3, 0.3, -1.9, 0.2, -15.2);
  wall(3.8, 2.3, 0.3, 1.9, 0.2, -15.2);

  buildFurniture(group, tex, 0, -12, false);
  buildFurniture(group, tex, -2.5, -14, true);
}

// ---------------------------------------------------------------------------
// Interior door (round-topped wooden door)
// ---------------------------------------------------------------------------

function buildInteriorDoor(group, tex, x, y, z, label) {
  const frameMat = woodMat(tex, 1, 1);
  frameMat.color.set(0x5d3a1a);
  const frame = ms(new THREE.BoxGeometry(2.1, 2.25, 0.22), frameMat);
  frame.position.set(x, y + 1.12, z);
  group.add(frame);

  const pivot = new THREE.Group();
  pivot.position.set(x + 0.85, y + 1.0, z);

  const doorMat = woodMat(tex, 1, 2);
  doorMat.color.set(0x7a4f24);
  const door = ms(new THREE.BoxGeometry(1.65, 1.95, 0.16), doorMat);
  door.position.set(-0.82, 0, 0);

  const knob = ms(
    new THREE.CylinderGeometry(0.05, 0.05, 0.06, 8),
    new THREE.MeshStandardMaterial({ color: 0xf4d03f, roughness: 0.4, metalness: 0.7 }),
  );
  knob.rotation.z = Math.PI / 2;
  knob.position.set(-0.35, 0, 0.1);
  pivot.add(door, knob);
  group.add(pivot);

  const collider = colliderFromMesh(door, 0.04);
  collider.mesh = door;

  return {
    pivot,
    mesh: door,
    collider,
    label,
    open: false,
    openAmount: 0,
    targetOpen: 0,
    hingeSide: 1,
    interactPoint: new THREE.Vector3(x, y + 1, z),
  };
}

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------

function buildFurniture(group, tex, x, z, isPantry) {
  const rugMat = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.85 });
  const rug = ms(
    new THREE.BoxGeometry(isPantry ? 2.2 : 3, 0.04, isPantry ? 2 : 2.5),
    rugMat,
    false,
    true,
  );
  rug.position.set(x, 0.03, z);
  group.add(rug);

  if (!isPantry) {
    const tableMat = woodMat(tex, 1, 1);
    const table = ms(new THREE.BoxGeometry(1.6, 0.12, 1.0), tableMat);
    table.position.set(x, 0.55, z);

    const legMat = woodMat(tex, 0.5, 1);
    const legs = [
      [x - 0.65, 0.27, z - 0.35],
      [x + 0.65, 0.27, z - 0.35],
      [x - 0.65, 0.27, z + 0.35],
      [x + 0.65, 0.27, z + 0.35],
    ];
    for (const [lx, ly, lz] of legs) {
      const leg = ms(new THREE.BoxGeometry(0.12, 0.55, 0.12), legMat.clone());
      leg.position.set(lx, ly, lz);
      group.add(leg);
    }

    const bowl = ms(
      new THREE.CylinderGeometry(0.18, 0.22, 0.12, 10),
      new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.6 }),
    );
    bowl.position.set(x, 0.68, z);
    group.add(table, bowl);

    const chairMat = woodMat(tex, 1, 1);
    chairMat.color.set(0x795548);
    const chairL = ms(new THREE.BoxGeometry(0.45, 0.45, 0.45), chairMat);
    chairL.position.set(x - 1.3, 0.22, z);
    const chairR = chairL.clone();
    chairR.position.x = x + 1.3;
    group.add(chairL, chairR);
  } else {
    const shelfMat = woodMat(tex, 2, 1);
    shelfMat.color.set(0x6d4c41);
    const shelf = ms(new THREE.BoxGeometry(2.2, 1.8, 0.35), shelfMat);
    shelf.position.set(x, 1.0, z - 1.2);

    const jarA = ms(
      new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8),
      new THREE.MeshStandardMaterial({ color: 0x81d4fa, roughness: 0.4 }),
    );
    jarA.position.set(x - 0.5, 1.4, z - 1.0);

    const jarB = ms(
      new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8),
      new THREE.MeshStandardMaterial({ color: 0xffab91, roughness: 0.4 }),
    );
    jarB.position.set(x + 0.4, 1.2, z - 1.0);
    group.add(shelf, jarA, jarB);
  }
}

// ---------------------------------------------------------------------------
// Entrance tunnel (carved into the mound so the doorway is walkable)
// ---------------------------------------------------------------------------

function buildEntrance(group, tex) {
  const tunMat = stoneMat(tex, 2, 2);

  const tunnelFloor = ms(
    new THREE.BoxGeometry(2.2, 0.1, 2.2),
    woodMat(tex, 2, 2),
    false,
    true,
  );
  tunnelFloor.position.set(0, 0.01, -3.9);
  group.add(tunnelFloor);

  const wallL = ms(new THREE.BoxGeometry(0.2, 2.3, 2.2), tunMat.clone());
  wallL.position.set(-1.1, 1.15, -3.9);
  const wallR = wallL.clone();
  wallR.position.x = 1.1;
  group.add(wallL, wallR);

  const ceiling = ms(new THREE.BoxGeometry(2.4, 0.2, 2.2), tunMat.clone());
  ceiling.position.set(0, 2.25, -3.9);
  group.add(ceiling);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function buildDetailedHobbitHole(game, textures) {
  const group = new THREE.Group();
  const tex = textures;

  // Earthen mound
  buildMound(group, tex);

  // Shallow porch behind the door (Bag End interior is a separate zone)
  buildEntrance(group, tex);

  // Round door with stone frame
  const doorData = buildRoundDoor(group, tex);
  game.doors.push(doorData);
  game.colliders.push(doorData.collider);

  // Windows
  buildWindows(group, tex);

  // Stone steps
  buildSteps(group, tex);

  // Chimney
  const smokeOrigin = buildChimney(group, tex);
  game.smokeOrigin = smokeOrigin;
  game.smokeParticles = [];

  // Barrels & flower boxes
  buildBarrels(group, tex);
  buildFlowerBoxes(group, tex);

  // Mound collider — leave the doorway clear
  const moundL = createCollider(-5.5, -1.1, 0, 2.6, -9.5, -3.0);
  const moundR = createCollider(1.1, 5.5, 0, 2.6, -9.5, -3.0);
  const moundBack = createCollider(-5.5, 5.5, 0, 2.6, -9.5, -8.5);
  moundL.zone = moundR.zone = moundBack.zone = "outside";
  game.colliders.push(moundL, moundR, moundBack);

  doorData.collider.zone = "outside";

  game.scene.add(group);
  return group;
}

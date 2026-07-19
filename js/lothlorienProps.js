import * as THREE from "three";
import { createReflectiveWater } from "./water.js";
import { createDriftField, createWindGrass } from "./vegetation.js";

export const LOTHLORIEN_ORIGIN = new THREE.Vector3(0, 0, 520);

export function L(x, y, z) {
  return new THREE.Vector3(
    LOTHLORIEN_ORIGIN.x + x,
    LOTHLORIEN_ORIGIN.y + y,
    LOTHLORIEN_ORIGIN.z + z
  );
}

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.82,
    metalness: options.metalness ?? 0.04,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 1,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
  });
}

function mesh(geometry, material, cast = true, receive = true) {
  const object = new THREE.Mesh(geometry, material);
  object.castShadow = cast;
  object.receiveShadow = receive;
  return object;
}

function addCollider(game, minX, maxX, minY, maxY, minZ, maxZ) {
  game.colliders.push({
    minX: LOTHLORIEN_ORIGIN.x + minX,
    maxX: LOTHLORIEN_ORIGIN.x + maxX,
    minY,
    maxY,
    minZ: LOTHLORIEN_ORIGIN.z + minZ,
    maxZ: LOTHLORIEN_ORIGIN.z + maxZ,
    active: false,
    level: "lothlorien",
  });
}

function addGround(game, minX, maxX, minZ, maxZ, height) {
  game.groundHeights.push({
    minX: LOTHLORIEN_ORIGIN.x + minX,
    maxX: LOTHLORIEN_ORIGIN.x + maxX,
    minZ: LOTHLORIEN_ORIGIN.z + minZ,
    maxZ: LOTHLORIEN_ORIGIN.z + maxZ,
    height,
    level: "lothlorien",
  });
}

function addMallorn(game, group, x, z, scale = 1, platformHeight = null) {
  const bark = mat(0xb7aa86, { roughness: 0.9 });
  const trunk = mesh(new THREE.CylinderGeometry(0.85 * scale, 1.1 * scale, 18 * scale, 14), bark);
  trunk.position.set(x, 9 * scale, z);
  group.add(trunk);
  // Keep the trunk collider slim (just inside the visual bark) so players can
  // always walk around it on the talans and across the narrow bridges.
  addCollider(
    game,
    x - 0.95 * scale,
    x + 0.95 * scale,
    0,
    18 * scale,
    z - 0.95 * scale,
    z + 0.95 * scale
  );

  const branchMat = mat(0x978968, { roughness: 0.92 });
  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2;
    const branch = mesh(new THREE.CylinderGeometry(0.18 * scale, 0.42 * scale, 6 * scale, 8), branchMat);
    branch.position.set(
      x + Math.sin(angle) * 1.05 * scale,
      13.5 * scale + (i % 2) * 0.8,
      z + Math.cos(angle) * 1.05 * scale
    );
    branch.rotation.z = Math.PI / 2.8;
    branch.rotation.y = angle;
    group.add(branch);
  }

  const leafMaterials = [
    mat(0xe5bd4d, { roughness: 0.9 }),
    mat(0xf3d678, { roughness: 0.86, emissive: 0x4c3504, emissiveIntensity: 0.18 }),
    mat(0xbfa63f, { roughness: 0.92 }),
  ];
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const canopy = mesh(new THREE.SphereGeometry(2.8 * scale, 11, 9), leafMaterials[i % 3]);
    canopy.position.set(
      x + Math.sin(angle) * (3.2 + (i % 3)) * scale,
      (15 + (i % 4) * 1.2) * scale,
      z + Math.cos(angle) * (3.2 + (i % 3)) * scale
    );
    canopy.scale.y = 0.72;
    group.add(canopy);
  }

  if (platformHeight !== null) {
    const platform = mesh(
      new THREE.CylinderGeometry(6.2 * scale, 6.5 * scale, 0.45, 24),
      mat(0xd9cda8, { roughness: 0.76 })
    );
    platform.position.set(x, platformHeight - 0.22, z);
    group.add(platform);
    addGround(
      game,
      x - 5.4 * scale,
      x + 5.4 * scale,
      z - 5.4 * scale,
      z + 5.4 * scale,
      platformHeight
    );

    const railMat = mat(0xf0e6c9, { roughness: 0.72 });
    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2;
      if (Math.abs(Math.sin(angle)) < 0.22) continue;
      const rail = mesh(new THREE.CylinderGeometry(0.055, 0.075, 1, 7), railMat);
      rail.position.set(
        x + Math.sin(angle) * 5.75 * scale,
        platformHeight + 0.5,
        z + Math.cos(angle) * 5.75 * scale
      );
      group.add(rail);
    }
  }
}

// `openings` lets a connecting bridge pass through a rail: each entry is
// { side, from, to } where `side` is -1/1 (which rail) and from/to are the
// gap range along the rail's long axis (local coords). Both the rail mesh and
// its collider are omitted across the gap so junctions stay walkable.
function railSegments(start, end, openings) {
  const gaps = openings
    .map((o) => [Math.max(start, o.from), Math.min(end, o.to)])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  const segments = [];
  let cursor = start;
  for (const [a, b] of gaps) {
    if (a > cursor) segments.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < end) segments.push([cursor, end]);
  return segments;
}

function addSafeBridge(game, group, {
  x,
  z,
  width,
  depth,
  height,
  axis = "z",
  openings = [],
}) {
  const bridge = mesh(
    new THREE.BoxGeometry(width, 0.34, depth),
    mat(0xd8ca9c, { roughness: 0.72 })
  );
  bridge.position.set(x, height - 0.17, z);
  group.add(bridge);
  addGround(game, x - width / 2, x + width / 2, z - depth / 2, z + depth / 2, height);

  const railMat = mat(0xf0e5c3, { roughness: 0.68 });
  for (const side of [-1, 1]) {
    const sideOpenings = openings.filter((o) => o.side === side);
    if (axis === "z") {
      const railX = x + side * (width / 2 - 0.1);
      const colMinX = x + side * width / 2 - 0.18;
      const colMaxX = x + side * width / 2 + 0.18;
      for (const [s, e] of railSegments(z - depth / 2, z + depth / 2, sideOpenings)) {
        const len = e - s;
        if (len <= 0.05) continue;
        const rail = mesh(new THREE.BoxGeometry(0.1, 0.72, len), railMat);
        rail.position.set(railX, height + 0.72, (s + e) / 2);
        group.add(rail);
        addCollider(game, colMinX, colMaxX, height, height + 1.8, s, e);
      }
    } else {
      const railZ = z + side * (depth / 2 - 0.1);
      const colMinZ = z + side * depth / 2 - 0.18;
      const colMaxZ = z + side * depth / 2 + 0.18;
      for (const [s, e] of railSegments(x - width / 2, x + width / 2, sideOpenings)) {
        const len = e - s;
        if (len <= 0.05) continue;
        const rail = mesh(new THREE.BoxGeometry(len, 0.72, 0.1), railMat);
        rail.position.set((s + e) / 2, height + 0.72, railZ);
        group.add(rail);
        addCollider(game, s, e, height, height + 1.8, colMinZ, colMaxZ);
      }
    }
  }
}

function addStairs(game, group, startZ, count, startHeight, endHeight) {
  const stepDepth = 2.25;
  const stepWidth = 7;
  for (let i = 0; i < count; i += 1) {
    const t = (i + 1) / count;
    const height = THREE.MathUtils.lerp(startHeight, endHeight, t);
    const z = startZ + i * stepDepth;
    const step = mesh(
      new THREE.BoxGeometry(stepWidth, height, stepDepth + 0.12),
      mat(0xe5ddc5, { roughness: 0.84 })
    );
    step.position.set(0, height / 2, z);
    group.add(step);
    addGround(game, -stepWidth / 2, stepWidth / 2, z - stepDepth / 2, z + stepDepth / 2, height);
    addCollider(game, -4.1, -3.5, height - 0.3, height + 1.4, z - stepDepth / 2, z + stepDepth / 2);
    addCollider(game, 3.5, 4.1, height - 0.3, height + 1.4, z - stepDepth / 2, z + stepDepth / 2);
  }
}

function addSilverLamp(group, x, y, z) {
  const lamp = mesh(
    new THREE.SphereGeometry(0.16, 10, 9),
    mat(0xe8f4ff, { emissive: 0xa9d8ff, emissiveIntensity: 1.5 }),
    false,
    false
  );
  lamp.position.set(x, y, z);
  const light = new THREE.PointLight(0xcde9ff, 1.05, 11, 2);
  light.position.copy(lamp.position);
  group.add(lamp, light);
}

export function buildLothlorienWorld(game, group) {
  const ground = mesh(
    new THREE.CylinderGeometry(45, 50, 2, 32),
    mat(0x78934e, { roughness: 0.96 })
  );
  ground.position.set(0, -1, 10);
  group.add(ground);
  addGround(game, -43, 43, -50, 65, 0);

  const path = mesh(new THREE.BoxGeometry(9, 0.12, 34), mat(0xd8c995, { roughness: 0.9 }));
  path.position.set(0, 0.06, -34);
  group.add(path);

  // Ground-level and elevated mallorn city.
  addMallorn(game, group, -22, -18, 0.8, null);
  addMallorn(game, group, 22, -10, 0.9, null);
  addMallorn(game, group, -20, 18, 1, 4);
  addMallorn(game, group, 20, 17, 1, 4);
  addMallorn(game, group, -18, 43, 1.05, 8);
  addMallorn(game, group, 18, 44, 1.05, 8);
  addMallorn(game, group, 0, 39, 1.35, 8);
  // Off to the side of the stair-top junction so the main path stays clear
  addMallorn(game, group, 8, -2, 1.1, 4);

  // Broad white stairs and protected bridges connect three walkable levels.
  // Cross-bridge rails are opened where the central bridge joins so the
  // junctions stay walkable instead of being walled off.
  addStairs(game, group, -18, 8, 0, 4);
  addSafeBridge(game, group, { x: 0, z: 7, width: 6, depth: 20, height: 4, axis: "z" });
  // Cross bridges need rail gaps on BOTH sides where the main path crosses:
  // the near side meets the central bridge, the far side meets the next stairs.
  addSafeBridge(game, group, {
    x: -10, z: 18, width: 20, depth: 4, height: 4, axis: "x",
    openings: [{ side: -1, from: -3.8, to: 3.8 }, { side: 1, from: -3.8, to: 3.8 }],
  });
  addSafeBridge(game, group, {
    x: 10, z: 18, width: 20, depth: 4, height: 4, axis: "x",
    openings: [{ side: -1, from: -3.8, to: 3.8 }, { side: 1, from: -3.8, to: 3.8 }],
  });
  addStairs(game, group, 18, 8, 4, 8);
  // Rails stay closed over the exposed gap (z 30–34) but open onto the broad
  // top talan so the fountain and mirror are reachable.
  addSafeBridge(game, group, {
    x: 0, z: 38, width: 6, depth: 16, height: 8, axis: "z",
    openings: [{ side: -1, from: 34, to: 46 }, { side: 1, from: 34, to: 46 }],
  });
  addSafeBridge(game, group, {
    x: -9, z: 43, width: 18, depth: 4, height: 8, axis: "x",
    openings: [{ side: -1, from: -3.8, to: 3.8 }, { side: 1, from: -3.8, to: 3.8 }],
  });
  addSafeBridge(game, group, {
    x: 9, z: 44, width: 18, depth: 4, height: 8, axis: "x",
    openings: [{ side: -1, from: -3.8, to: 3.8 }, { side: 1, from: -3.8, to: 3.8 }],
  });

  // Open flets and graceful tree houses.
  const houseMat = mat(0xeee4c9, { roughness: 0.76 });
  for (const [x, y, z] of [[-20, 4.6, 18], [20, 4.6, 17], [-18, 8.6, 43], [18, 8.6, 44]]) {
    const roof = mesh(new THREE.ConeGeometry(4.8, 2.3, 12), mat(0xb8a75d, { roughness: 0.88 }));
    roof.position.set(x, y + 3.5, z);
    const screen = mesh(new THREE.CylinderGeometry(4.2, 4.2, 2.8, 12, 1, true), houseMat);
    screen.position.set(x, y + 1.4, z);
    group.add(roof, screen);
  }

  // Galadriel's fountain and mirror garden on the highest talan.
  const fountainBase = mesh(new THREE.CylinderGeometry(2.4, 2.8, 0.45, 24), mat(0xd9e4df, { metalness: 0.35, roughness: 0.32 }));
  fountainBase.position.set(-3.8, 8.25, 39);
  const water = createReflectiveWater(new THREE.CircleGeometry(2.05, 24), {
    waterColor: 0x3d7a8a,
    distortionScale: 0.7,
    size: 8,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(-3.8, 8.52, 39);
  game.waterSurfaces.push(water);
  const mirror = mesh(
    new THREE.CylinderGeometry(1.3, 1.05, 1.2, 18),
    mat(0xc5d6d8, { metalness: 0.65, roughness: 0.2 })
  );
  mirror.position.set(4, 8.6, 39);
  group.add(fountainBase, water, mirror);

  for (const [x, y, z] of [
    [-4, 3, -20], [4, 3, -20], [-4, 6, 3], [4, 6, 12],
    [-13, 6, 18], [13, 6, 18], [-4, 10, 35], [4, 10, 42],
    [-14, 10, 44], [14, 10, 44],
  ]) {
    addSilverLamp(group, x, y, z);
  }

  // Golden mallorn leaves drifting down through the wood
  const leaves = createDriftField({
    count: 240,
    bounds: { minX: -40, maxX: 40, minY: 1, maxY: 20, minZ: -45, maxZ: 60 },
    color: 0xe8c65a,
    size: 0.14,
    opacity: 0.7,
    fallSpeed: 0.55,
    driftSpeed: 0.5,
  });
  leaves.userData.level = "lothlorien";
  group.add(leaves);
  game.driftFields.push(leaves);

  // Meadow grass swaying beneath the mallorns (one instanced draw call)
  const meadow = createWindGrass({
    count: 2600,
    color: 0x6d8f47,
    tipColor: 0xd8c05e,
    windStrength: 0.18,
    placer: () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * 40;
      const x = Math.cos(angle) * radius;
      const z = 10 + Math.sin(angle) * radius;
      if (Math.abs(x) < 5 && z < -16) return null; // keep the entry path clear
      return { x, y: 0, z };
    },
  });
  group.add(meadow);
  game.windGrasses.push(meadow);

  game.lothlorienLights = [];
  const fireflyMat = mat(0xffeb86, { emissive: 0xffd740, emissiveIntensity: 2 }, false, false);
  for (let i = 0; i < 70; i += 1) {
    const firefly = mesh(new THREE.SphereGeometry(0.035, 6, 5), fireflyMat, false, false);
    firefly.position.set(
      -35 + Math.random() * 70,
      0.8 + Math.random() * 12,
      -42 + Math.random() * 98
    );
    firefly.userData.baseY = firefly.position.y;
    firefly.userData.phase = Math.random() * Math.PI * 2;
    group.add(firefly);
    game.lothlorienLights.push(firefly);
  }

  group.position.copy(LOTHLORIEN_ORIGIN);
  game.lothlorienSpawn = L(0, 0, -47);
  return group;
}

export function animateLothlorienWorld(game, time) {
  for (const firefly of game.lothlorienLights || []) {
    const phase = firefly.userData.phase;
    firefly.position.y = firefly.userData.baseY + Math.sin(time * 1.7 + phase) * 0.35;
    firefly.position.x += Math.sin(time * 0.8 + phase) * 0.0015;
  }
}

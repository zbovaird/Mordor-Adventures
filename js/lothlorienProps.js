import * as THREE from "three";

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
  const trunk = mesh(new THREE.CylinderGeometry(1.75 * scale, 2.45 * scale, 18 * scale, 14), bark);
  trunk.position.set(x, 9 * scale, z);
  group.add(trunk);
  addCollider(
    game,
    x - 1.65 * scale,
    x + 1.65 * scale,
    0,
    18 * scale,
    z - 1.65 * scale,
    z + 1.65 * scale
  );

  const branchMat = mat(0x978968, { roughness: 0.92 });
  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2;
    const branch = mesh(new THREE.CylinderGeometry(0.18 * scale, 0.42 * scale, 6 * scale, 8), branchMat);
    branch.position.set(
      x + Math.sin(angle) * 2.25 * scale,
      13.5 * scale + (i % 2) * 0.8,
      z + Math.cos(angle) * 2.25 * scale
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

function addSafeBridge(game, group, {
  x,
  z,
  width,
  depth,
  height,
  axis = "z",
}) {
  const bridge = mesh(
    new THREE.BoxGeometry(width, 0.34, depth),
    mat(0xd8ca9c, { roughness: 0.72 })
  );
  bridge.position.set(x, height - 0.17, z);
  group.add(bridge);
  addGround(game, x - width / 2, x + width / 2, z - depth / 2, z + depth / 2, height);

  const railMat = mat(0xf0e5c3, { roughness: 0.68 });
  if (axis === "z") {
    for (const side of [-1, 1]) {
      const rail = mesh(new THREE.BoxGeometry(0.1, 0.72, depth), railMat);
      rail.position.set(x + side * (width / 2 - 0.1), height + 0.72, z);
      group.add(rail);
      addCollider(
        game,
        x + side * width / 2 - 0.18,
        x + side * width / 2 + 0.18,
        height,
        height + 1.8,
        z - depth / 2,
        z + depth / 2
      );
    }
  } else {
    for (const side of [-1, 1]) {
      const rail = mesh(new THREE.BoxGeometry(width, 0.72, 0.1), railMat);
      rail.position.set(x, height + 0.72, z + side * (depth / 2 - 0.1));
      group.add(rail);
      addCollider(
        game,
        x - width / 2,
        x + width / 2,
        height,
        height + 1.8,
        z + side * depth / 2 - 0.18,
        z + side * depth / 2 + 0.18
      );
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
  addMallorn(game, group, 0, -2, 1.1, 4);

  // Broad white stairs and protected bridges connect three walkable levels.
  addStairs(game, group, -18, 8, 0, 4);
  addSafeBridge(game, group, { x: 0, z: 7, width: 6, depth: 20, height: 4, axis: "z" });
  addSafeBridge(game, group, { x: -10, z: 18, width: 20, depth: 4, height: 4, axis: "x" });
  addSafeBridge(game, group, { x: 10, z: 18, width: 20, depth: 4, height: 4, axis: "x" });
  addStairs(game, group, 18, 8, 4, 8);
  addSafeBridge(game, group, { x: 0, z: 38, width: 6, depth: 16, height: 8, axis: "z" });
  addSafeBridge(game, group, { x: -9, z: 43, width: 18, depth: 4, height: 8, axis: "x" });
  addSafeBridge(game, group, { x: 9, z: 44, width: 18, depth: 4, height: 8, axis: "x" });

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
  const water = mesh(
    new THREE.CylinderGeometry(2.05, 2.05, 0.09, 24),
    mat(0x9fd7ea, { transparent: true, opacity: 0.72, metalness: 0.2, roughness: 0.18 }),
    false,
    true
  );
  water.position.set(-3.8, 8.51, 39);
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

import * as THREE from "three";

export const MORIA_ORIGIN = new THREE.Vector3(0, 0, 300);

export function M(x, y, z) {
  return new THREE.Vector3(MORIA_ORIGIN.x + x, MORIA_ORIGIN.y + y, MORIA_ORIGIN.z + z);
}

function material(color, roughness = 0.9, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.08,
    emissive,
    emissiveIntensity: emissive ? 1.2 : 0,
  });
}

function mesh(geometry, mat, cast = true, receive = true) {
  const object = new THREE.Mesh(geometry, mat);
  object.castShadow = cast;
  object.receiveShadow = receive;
  return object;
}

function addCollider(game, minX, maxX, minY, maxY, minZ, maxZ) {
  game.colliders.push({
    minX: MORIA_ORIGIN.x + minX,
    maxX: MORIA_ORIGIN.x + maxX,
    minY,
    maxY,
    minZ: MORIA_ORIGIN.z + minZ,
    maxZ: MORIA_ORIGIN.z + maxZ,
    active: false,
    level: "moria",
  });
}

function addGroundHeight(game, minX, maxX, minZ, maxZ, height = 0) {
  game.groundHeights.push({
    minX: MORIA_ORIGIN.x + minX,
    maxX: MORIA_ORIGIN.x + maxX,
    minZ: MORIA_ORIGIN.z + minZ,
    maxZ: MORIA_ORIGIN.z + maxZ,
    height,
    level: "moria",
  });
}

function addTorch(group, x, y, z, color = 0xff8a3d) {
  const bracket = mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 0.9, 8),
    material(0x4a3428, 0.82)
  );
  bracket.position.set(x, y - 0.35, z);
  const flame = mesh(
    new THREE.ConeGeometry(0.18, 0.62, 9),
    material(0xffa23d, 0.3, 0xff4a00),
    false,
    false
  );
  flame.position.set(x, y + 0.25, z);
  const light = new THREE.PointLight(color, 2.2, 16, 2);
  light.position.set(x, y + 0.2, z);
  group.add(bracket, flame, light);
  return flame;
}

function addDwarfColumn(game, group, x, z, height = 15) {
  const stone = material(0x45484b, 0.82);
  const base = mesh(new THREE.BoxGeometry(3.2, 1.1, 3.2), stone);
  base.position.set(x, 0.55, z);
  const shaft = mesh(new THREE.CylinderGeometry(1.05, 1.35, height, 8), stone);
  shaft.position.set(x, 1.1 + height / 2, z);
  const capital = mesh(new THREE.BoxGeometry(3.5, 1.1, 3.5), material(0x55595d, 0.78));
  capital.position.set(x, 1.1 + height + 0.5, z);
  group.add(base, shaft, capital);
  addCollider(game, x - 1.45, x + 1.45, 0, height + 2, z - 1.45, z + 1.45);
}

function addRock(group, x, y, z, scale, color = 0x32363a) {
  const rock = mesh(
    new THREE.DodecahedronGeometry(1, 0),
    material(color, 0.97)
  );
  rock.position.set(x, y, z);
  rock.scale.set(scale * 1.4, scale, scale * 1.15);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  group.add(rock);
}

export function buildMoriaWorld(game, group) {
  const blackStone = material(0x24282c, 0.9);
  const polishedStone = material(0x3d4247, 0.68);
  const ancientStone = material(0x55504a, 0.94);

  // West tunnel into the vast Dwarrowdelf.
  const tunnelFloor = mesh(new THREE.BoxGeometry(14, 0.6, 34), polishedStone);
  tunnelFloor.position.set(0, -0.3, -42);
  const tunnelLeft = mesh(new THREE.BoxGeometry(2.5, 13, 34), blackStone);
  tunnelLeft.position.set(-8, 6, -42);
  const tunnelRight = tunnelLeft.clone();
  tunnelRight.position.x = 8;
  const tunnelCeiling = mesh(new THREE.BoxGeometry(18.5, 2, 34), blackStone);
  tunnelCeiling.position.set(0, 12.5, -42);
  group.add(tunnelFloor, tunnelLeft, tunnelRight, tunnelCeiling);
  addGroundHeight(game, -7, 7, -59, -25, 0);
  addCollider(game, -9.25, -6.75, 0, 13, -59, -25);
  addCollider(game, 6.75, 9.25, 0, 13, -59, -25);

  // The great hall: broad enough for ranks of columns and a large battle.
  const hallFloor = mesh(new THREE.BoxGeometry(52, 0.7, 82), polishedStone);
  hallFloor.position.set(0, -0.35, 15);
  const hallLeft = mesh(new THREE.BoxGeometry(4, 22, 86), blackStone);
  hallLeft.position.set(-28, 10, 15);
  const hallRight = hallLeft.clone();
  hallRight.position.x = 28;
  const hallCeiling = mesh(new THREE.BoxGeometry(60, 3, 86), blackStone);
  hallCeiling.position.set(0, 20.5, 15);
  group.add(hallFloor, hallLeft, hallRight, hallCeiling);
  addGroundHeight(game, -26, 26, -26, 56, 0);
  addCollider(game, -30, -26, 0, 22, -28, 58);
  addCollider(game, 26, 30, 0, 22, -28, 58);

  for (const x of [-18, -9, 9, 18]) {
    for (const z of [-18, -3, 12, 27, 42]) {
      addDwarfColumn(game, group, x, z, 15 + ((Math.abs(x) + z) % 3));
    }
  }

  // High ribs suggest that the halls were carved from the mountain itself.
  for (const z of [-22, -7, 8, 23, 38, 53]) {
    const rib = mesh(new THREE.TorusGeometry(25, 0.65, 8, 32, Math.PI), ancientStone);
    rib.rotation.z = Math.PI;
    rib.position.set(0, 18.2, z);
    group.add(rib);
  }

  // Balin's tomb and the Chamber of Mazarbul.
  const chamberDais = mesh(new THREE.CylinderGeometry(8, 8.8, 0.7, 12), ancientStone);
  chamberDais.position.set(0, 0.35, 48);
  const tomb = mesh(new THREE.BoxGeometry(4.8, 1.6, 2.2), material(0x777169, 0.83));
  tomb.position.set(0, 1.15, 48);
  const tombTop = mesh(new THREE.BoxGeometry(5.2, 0.35, 2.6), material(0x8b8479, 0.76));
  tombTop.position.set(0, 2.05, 48);
  group.add(chamberDais, tomb, tombTop);
  addCollider(game, -2.7, 2.7, 0, 2.3, 46.6, 49.4);

  // Stairs descend toward the narrow, rail-less Bridge of Khazad-dûm.
  for (let i = 0; i < 6; i += 1) {
    const step = mesh(new THREE.BoxGeometry(10 - i * 0.8, 0.3, 2), ancientStone);
    step.position.set(0, 0.15 + i * 0.13, 57 + i * 1.65);
    group.add(step);
  }

  const bridge = mesh(new THREE.BoxGeometry(3.2, 1.1, 31), material(0x514d48, 0.92));
  bridge.position.set(0, 0.25, 77);
  group.add(bridge);
  addGroundHeight(game, -1.6, 1.6, 61.5, 92.5, 0.8);

  // The abyss is visual; invisible side walls keep the child-friendly game playable.
  const abyssMat = material(0x030304, 1);
  const abyssLeft = mesh(new THREE.BoxGeometry(25, 1, 38), abyssMat, false, false);
  abyssLeft.position.set(-14.2, -3.2, 76);
  const abyssRight = abyssLeft.clone();
  abyssRight.position.x = 14.2;
  group.add(abyssLeft, abyssRight);
  addCollider(game, -27, -1.75, -1, 5, 60, 94);
  addCollider(game, 1.75, 27, -1, 5, 60, 94);

  // Final hall and eastern gate behind the Balrog.
  const arena = mesh(new THREE.CylinderGeometry(15, 17, 0.8, 16), polishedStone);
  arena.position.set(0, -0.4, 103);
  group.add(arena);
  addGroundHeight(game, -15, 15, 91, 115, 0);
  const gateL = mesh(new THREE.BoxGeometry(5, 15, 4), ancientStone);
  gateL.position.set(-7, 7.5, 116);
  const gateR = gateL.clone();
  gateR.position.x = 7;
  const gateArch = mesh(new THREE.TorusGeometry(7, 1.2, 10, 32, Math.PI), ancientStone);
  gateArch.rotation.z = Math.PI;
  gateArch.position.set(0, 8, 115);
  group.add(gateL, gateR, gateArch);
  addCollider(game, -10, -4.5, 0, 15, 113, 119);
  addCollider(game, 4.5, 10, 0, 15, 113, 119);

  // Firelight, crystal lamps, rubble and rough mountain surfaces.
  game.moriaFlames = [];
  for (const [x, y, z] of [
    [-5.8, 3, -49], [5.8, 3, -35], [-23.5, 4, -15], [23.5, 4, -2],
    [-23.5, 4, 18], [23.5, 4, 34], [-6, 3, 55], [6, 3, 55],
    [-3, 2.5, 96], [3, 2.5, 96],
  ]) {
    game.moriaFlames.push(addTorch(group, x, y, z));
  }

  const crystalMat = material(0x8ec5e8, 0.22, 0x285c86);
  for (const [x, z] of [[-21, -10], [21, 5], [-21, 25], [21, 40]]) {
    const crystal = mesh(new THREE.OctahedronGeometry(0.55, 0), crystalMat);
    crystal.position.set(x, 3.2, z);
    crystal.scale.y = 2.2;
    const glow = new THREE.PointLight(0x70bfff, 1.2, 12, 2);
    glow.position.copy(crystal.position);
    group.add(crystal, glow);
  }

  for (let i = 0; i < 46; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    addRock(
      group,
      side * (23 + Math.random() * 5),
      1 + Math.random() * 17,
      -55 + Math.random() * 170,
      1.2 + Math.random() * 2.5
    );
  }

  group.position.copy(MORIA_ORIGIN);
  game.moriaSpawn = M(0, 0, -54);
  game.moriaExit = M(0, 0, 113);
  return group;
}

export function animateMoriaWorld(game, time) {
  for (let i = 0; i < (game.moriaFlames || []).length; i += 1) {
    const flame = game.moriaFlames[i];
    const pulse = 0.86 + Math.sin(time * 8 + i * 1.7) * 0.16;
    flame.scale.set(pulse, 0.9 + pulse * 0.2, pulse);
    flame.rotation.z = Math.sin(time * 6 + i) * 0.08;
  }
}

import * as THREE from "three";
import { createDriftField, createLightShaft } from "./vegetation.js";
import { fitModel } from "./assets.js";

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

/** Prefer Poly Haven stone maps (already loaded for Bag End) when available. */
function stoneMaterial(game, { tint = 0xffffff, roughness = 0.88, repeat = 4 } = {}) {
  const tex = game.holeTextures;
  if (tex?.stoneMap && tex?.stoneNor) {
    const map = tex.stoneMap.clone();
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeat, repeat);
    const normalMap = tex.stoneNor.clone();
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(repeat, repeat);
    return new THREE.MeshStandardMaterial({
      map,
      normalMap,
      color: tint,
      roughness,
      metalness: 0.05,
      envMapIntensity: 0.45,
    });
  }
  return material(tint, roughness);
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

function addGroundRamp(game, minX, maxX, minZ, maxZ, heightStart, heightEnd) {
  game.groundHeights.push({
    minX: MORIA_ORIGIN.x + minX,
    maxX: MORIA_ORIGIN.x + maxX,
    minZ: MORIA_ORIGIN.z + minZ,
    maxZ: MORIA_ORIGIN.z + maxZ,
    heightStart,
    heightEnd,
    rampAxis: "z",
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

function addDwarfColumn(game, group, x, z, height = 15, stoneMat = null) {
  const stone = stoneMat || material(0x45484b, 0.82);
  const capitalMat = stoneMat
    ? stoneMaterial(game, { tint: 0xb0b4b8, roughness: 0.78, repeat: 2 })
    : material(0x55595d, 0.78);
  const base = mesh(new THREE.BoxGeometry(3.2, 1.1, 3.2), stone);
  base.position.set(x, 0.55, z);
  const shaft = mesh(new THREE.CylinderGeometry(1.05, 1.35, height, 8), stone);
  shaft.position.set(x, 1.1 + height / 2, z);
  const capital = mesh(new THREE.BoxGeometry(3.5, 1.1, 3.5), capitalMat);
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

function scatterKenneyRubble(game, group) {
  if (!game.assets?.has?.("rock_largeA")) return;
  const large = ["rock_largeA", "rock_largeB", "rock_tallA"];
  const small = ["rock_smallA", "rock_smallB", "rock_smallE", "stone_smallA", "stone_smallB", "stone_smallFlatA"];
  const rng = (() => {
    let s = 77;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  })();

  for (let i = 0; i < 14; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const key = large[Math.floor(rng() * large.length)];
    if (!game.assets.has(key)) continue;
    const model = game.assets.clone(key);
    const h = 1.1 + rng() * 1.4;
    fitModel(model, h);
    const x = side * (22 + rng() * 3.5);
    const z = -40 + rng() * 145;
    if (Math.abs(z - 48) < 10 && Math.abs(x) < 12) continue;
    if (Math.abs(x) < 4 && z > 55 && z < 95) continue;
    model.position.set(x, 0, z);
    model.rotation.y = rng() * Math.PI * 2;
    group.add(model);
    addCollider(game, x - 0.7, x + 0.7, 0, h, z - 0.7, z + 0.7);
  }

  for (let i = 0; i < 28; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const available = small.filter((k) => game.assets.has(k));
    if (!available.length) break;
    const key = available[Math.floor(rng() * available.length)];
    const model = game.assets.clone(key);
    fitModel(model, 0.35 + rng() * 0.55);
    const x = side * (20 + rng() * 5);
    const z = -50 + rng() * 160;
    if (Math.abs(x) < 3.5 && z > 58 && z < 94) continue;
    model.position.set(x, 0, z);
    model.rotation.y = rng() * Math.PI * 2;
    group.add(model);
  }
}

export function buildMoriaWorld(game, group) {
  const blackStone = stoneMaterial(game, { tint: 0x6a7078, roughness: 0.92, repeat: 3 });
  const polishedStone = stoneMaterial(game, { tint: 0xa8aeb4, roughness: 0.72, repeat: 8 });
  const ancientStone = stoneMaterial(game, { tint: 0x9a9080, roughness: 0.94, repeat: 3 });
  const aisleStone = stoneMaterial(game, { tint: 0x8a8680, roughness: 0.8, repeat: 12 });
  const columnStone = stoneMaterial(game, { tint: 0x9aa0a6, roughness: 0.84, repeat: 2 });

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

  // The great hall: side bays + darker center aisle for tiled dwarf-hall depth.
  const hallFloorL = mesh(new THREE.BoxGeometry(20, 0.7, 82), polishedStone);
  hallFloorL.position.set(-16, -0.35, 15);
  const hallFloorR = mesh(new THREE.BoxGeometry(20, 0.7, 82), polishedStone);
  hallFloorR.position.set(16, -0.35, 15);
  const hallAisle = mesh(new THREE.BoxGeometry(14, 0.72, 82), aisleStone);
  hallAisle.position.set(0, -0.34, 15);
  // Carved floor inlays along the aisle
  for (const z of [-10, 5, 20, 35]) {
    const inlay = mesh(new THREE.BoxGeometry(6.5, 0.08, 6.5), ancientStone);
    inlay.position.set(0, 0.02, z);
    group.add(inlay);
  }
  const hallLeft = mesh(new THREE.BoxGeometry(4, 22, 86), blackStone);
  hallLeft.position.set(-28, 10, 15);
  const hallRight = hallLeft.clone();
  hallRight.position.x = 28;
  const hallCeiling = mesh(new THREE.BoxGeometry(60, 3, 86), blackStone);
  hallCeiling.position.set(0, 20.5, 15);
  group.add(hallFloorL, hallFloorR, hallAisle, hallLeft, hallRight, hallCeiling);
  addGroundHeight(game, -26, 26, -26, 56, 0);
  addCollider(game, -30, -26, 0, 22, -28, 58);
  addCollider(game, 26, 30, 0, 22, -28, 58);

  for (const x of [-18, -9, 9, 18]) {
    for (const z of [-18, -3, 12, 27, 42]) {
      addDwarfColumn(game, group, x, z, 15 + ((Math.abs(x) + z) % 3), columnStone);
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
  const tomb = mesh(new THREE.BoxGeometry(4.8, 1.6, 2.2), stoneMaterial(game, { tint: 0xb8b0a4, roughness: 0.83, repeat: 2 }));
  tomb.position.set(0, 1.15, 48);
  const tombTop = mesh(new THREE.BoxGeometry(5.2, 0.35, 2.6), stoneMaterial(game, { tint: 0xcac2b6, roughness: 0.76, repeat: 2 }));
  tombTop.position.set(0, 2.05, 48);
  // Book of Mazarbul on a lectern beside the tomb
  const lectern = mesh(new THREE.BoxGeometry(0.7, 1.1, 0.55), material(0x5c4030, 0.88));
  lectern.position.set(3.6, 1.25, 46.2);
  const book = mesh(new THREE.BoxGeometry(0.55, 0.12, 0.4), material(0x2a2218, 0.7));
  book.position.set(3.6, 1.85, 46.2);
  group.add(chamberDais, tomb, tombTop, lectern, book);
  // Walkable dais (cylinder ≈ r8 → AABB); tomb blocks above the platform.
  addGroundHeight(game, -7.6, 7.6, 40.5, 55.5, 0.7);
  addCollider(game, -2.7, 2.7, 0.7, 2.3, 46.6, 49.4);
  addCollider(game, 3.2, 4.0, 0.7, 2.0, 45.8, 46.6);

  // Stairs ascend toward the narrow, rail-less Bridge of Khazad-dûm.
  for (let i = 0; i < 6; i += 1) {
    const stepW = 10 - i * 0.8;
    const step = mesh(new THREE.BoxGeometry(stepW, 0.3, 2), ancientStone);
    const stepY = 0.15 + i * 0.13;
    const stepZ = 57 + i * 1.65;
    step.position.set(0, stepY, stepZ);
    group.add(step);
    const top = stepY + 0.15;
    addGroundHeight(game, -stepW / 2, stepW / 2, stepZ - 1.05, stepZ + 1.05, top);
  }
  // Smooth blend from last steps onto the bridge deck
  addGroundRamp(game, -4, 4, 62.0, 64.5, 0.75, 0.8);

  const bridge = mesh(new THREE.BoxGeometry(3.2, 1.1, 31), stoneMaterial(game, { tint: 0x8a847c, roughness: 0.9, repeat: 4 }));
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

  // High wall rubble (visual only) + Kenney floor rubble with colliders
  for (let i = 0; i < 28; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    addRock(
      group,
      side * (24 + Math.random() * 4),
      4 + Math.random() * 14,
      -50 + Math.random() * 160,
      1.0 + Math.random() * 2.2
    );
  }
  scatterKenneyRubble(game, group);

  // Dust motes hanging in the dark air of the Dwarrowdelf.
  const dust = createDriftField({
    count: 320,
    bounds: { minX: -24, maxX: 24, minY: 0.5, maxY: 16, minZ: -55, maxZ: 110 },
    color: 0xc9b899,
    size: 0.05,
    opacity: 0.4,
    fallSpeed: 0.05,
    driftSpeed: 0.16,
  });
  dust.userData.level = "moria";
  group.add(dust);
  game.driftFields.push(dust);

  // Pale shafts of light falling from unseen crevices high above.
  for (const [x, z, height] of [[-12, -8, 21], [8, 20, 21], [-4, 44, 21], [0, 48, 20]]) {
    const shaft = createLightShaft({
      radiusTop: 0.7,
      radiusBottom: 4.2,
      height,
      color: 0x9fb8d8,
      opacity: 0.045,
    });
    shaft.position.set(x, height / 2, z);
    group.add(shaft);
  }

  // Embers drifting near the Balrog arena
  const embers = createDriftField({
    count: 90,
    bounds: { minX: -10, maxX: 10, minY: 0.4, maxY: 8, minZ: 94, maxZ: 112 },
    color: 0xff6a28,
    size: 0.07,
    opacity: 0.55,
    fallSpeed: 0.12,
    driftSpeed: 0.45,
  });
  embers.userData.level = "moria";
  group.add(embers);
  game.driftFields.push(embers);

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

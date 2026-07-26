import * as THREE from "three";
import { createReflectiveWater } from "./water.js";
import { createDriftField } from "./vegetation.js";
import { decorateAnduinLandscape } from "./natureProps.js";

export const ANDUIN_ORIGIN = new THREE.Vector3(0, 0, 720);
export const ANDUIN_WATER_Y = 0.12;

export function A(x, y, z) {
  return new THREE.Vector3(
    ANDUIN_ORIGIN.x + x,
    ANDUIN_ORIGIN.y + y,
    ANDUIN_ORIGIN.z + z
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

function addCollider(game, minX, maxX, minY, maxY, minZ, maxZ, extra = {}) {
  game.colliders.push({
    minX: ANDUIN_ORIGIN.x + minX,
    maxX: ANDUIN_ORIGIN.x + maxX,
    minY,
    maxY,
    minZ: ANDUIN_ORIGIN.z + minZ,
    maxZ: ANDUIN_ORIGIN.z + maxZ,
    active: false,
    level: "anduin",
    ...extra,
  });
}

function addGround(game, minX, maxX, minZ, maxZ, height) {
  game.groundHeights.push({
    minX: ANDUIN_ORIGIN.x + minX,
    maxX: ANDUIN_ORIGIN.x + maxX,
    minZ: ANDUIN_ORIGIN.z + minZ,
    maxZ: ANDUIN_ORIGIN.z + maxZ,
    height,
    level: "anduin",
  });
}

function addRock(game, group, x, z, scale = 1) {
  const rock = mesh(
    new THREE.DodecahedronGeometry(1.1 * scale, 0),
    mat(0x6a6862, { roughness: 0.95 })
  );
  rock.position.set(x, ANDUIN_WATER_Y + 0.35 * scale, z);
  rock.rotation.set(0.2, Math.random() * Math.PI, 0.15);
  group.add(rock);
  const r = 1.15 * scale;
  addCollider(game, x - r, x + r, 0, 3 * scale, z - r, z + r, { hazard: true });
}

/**
 * Movie-inspired Argonath: two kings carved from the cliffs, palms raised,
 * cloaks, crested helms (left winged, right tall crown + beard + sword).
 */
function addArgonath(group, x, z, faceSign, variant = "left") {
  const stone = mat(0x7a7872, { roughness: 0.9, metalness: 0.06 });
  const worn = mat(0x8f8c84, { roughness: 0.86 });
  const dark = mat(0x5c5a55, { roughness: 0.92 });

  // Cliff mass behind / under each king (gorge walls)
  const cliff = mesh(new THREE.BoxGeometry(14, 42, 18), dark, true, true);
  cliff.position.set(x + faceSign * 6, 18, z - 2);
  cliff.rotation.y = faceSign * 0.08;
  const cliffCap = mesh(new THREE.ConeGeometry(9, 10, 7), dark, true, true);
  cliffCap.position.set(x + faceSign * 5.5, 40, z - 1);
  group.add(cliff, cliffCap);

  // Rocky pedestal rising from the waterline
  const pedestal = mesh(new THREE.CylinderGeometry(4.2, 5.5, 8, 8), stone);
  pedestal.position.set(x, 3.8, z);
  group.add(pedestal);

  // Cloaked torso
  const torso = mesh(new THREE.CylinderGeometry(2.6, 3.4, 16, 10), stone);
  torso.position.set(x, 16, z);
  const cloak = mesh(new THREE.ConeGeometry(4.2, 18, 10, 1, true), worn);
  cloak.position.set(x, 15, z - 0.35);
  cloak.rotation.x = Math.PI;
  group.add(torso, cloak);

  // Head
  const head = mesh(new THREE.SphereGeometry(2.15, 12, 10), worn);
  head.position.set(x, 26.2, z + 0.35);
  head.scale.set(0.95, 1.15, 1.05);
  group.add(head);

  if (variant === "left") {
    // Winged / crested helm
    const helm = mesh(new THREE.SphereGeometry(2.35, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), stone);
    helm.position.set(x, 27.1, z + 0.2);
    const crestL = mesh(new THREE.BoxGeometry(0.35, 3.2, 1.8), stone);
    crestL.position.set(x - 1.6, 28.6, z + 0.1);
    crestL.rotation.z = 0.45;
    const crestR = mesh(new THREE.BoxGeometry(0.35, 3.2, 1.8), stone);
    crestR.position.set(x + 1.6, 28.6, z + 0.1);
    crestR.rotation.z = -0.45;
    group.add(helm, crestL, crestR);
  } else {
    // Tall pointed crown + beard
    const crown = mesh(new THREE.ConeGeometry(2.4, 4.2, 8), stone);
    crown.position.set(x, 29.2, z + 0.15);
    const beard = mesh(new THREE.ConeGeometry(1.3, 3.4, 8), worn);
    beard.position.set(x, 24.4, z + 1.35);
    beard.rotation.x = 0.35;
    group.add(crown, beard);
  }

  // Raised warning hand (palm outward toward the river)
  const upperArm = mesh(new THREE.CylinderGeometry(0.55, 0.7, 7.5, 8), stone);
  upperArm.position.set(x + faceSign * 0.2, 22.5, z + 2.2);
  upperArm.rotation.x = -1.05;
  const forearm = mesh(new THREE.CylinderGeometry(0.45, 0.55, 5.5, 8), stone);
  forearm.position.set(x + faceSign * 0.15, 28.5, z + 3.6);
  forearm.rotation.x = -0.15;
  const palm = mesh(new THREE.BoxGeometry(2.2, 2.6, 0.55), worn);
  palm.position.set(x + faceSign * 0.1, 32.2, z + 3.9);
  const thumb = mesh(new THREE.BoxGeometry(0.45, 1.1, 0.4), worn);
  thumb.position.set(x + faceSign * 1.1, 31.4, z + 3.9);
  group.add(upperArm, forearm, palm, thumb);

  // Lower arm / sword or resting hand
  if (variant === "right") {
    const swordArm = mesh(new THREE.CylinderGeometry(0.5, 0.6, 6, 8), stone);
    swordArm.position.set(x - faceSign * 2.4, 16, z + 1.2);
    swordArm.rotation.z = faceSign * 0.35;
    const hilt = mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.4, 8), worn);
    hilt.position.set(x - faceSign * 3.2, 13.2, z + 1.4);
    const blade = mesh(new THREE.BoxGeometry(0.35, 9.5, 0.7), worn);
    blade.position.set(x - faceSign * 3.2, 8.2, z + 1.4);
    group.add(swordArm, hilt, blade);
  } else {
    const restArm = mesh(new THREE.CylinderGeometry(0.5, 0.65, 7, 8), stone);
    restArm.position.set(x - faceSign * 2.8, 15.5, z + 0.8);
    restArm.rotation.z = faceSign * 0.55;
    restArm.rotation.x = 0.25;
    group.add(restArm);
  }
}

function addTree(group, x, z, scale = 1) {
  const trunk = mesh(
    new THREE.CylinderGeometry(0.25 * scale, 0.35 * scale, 4 * scale, 8),
    mat(0x5c4632, { roughness: 0.9 })
  );
  trunk.position.set(x, 2 * scale, z);
  const canopy = mesh(
    new THREE.SphereGeometry(1.8 * scale, 10, 8),
    mat(0x4f6b3a, { roughness: 0.88 })
  );
  canopy.position.set(x, 4.4 * scale, z);
  group.add(trunk, canopy);
}

function addLandingPad(game, group, x, z, y, walkWidth, rampMat) {
  const pad = mesh(new THREE.BoxGeometry(walkWidth + 0.6, 0.32, walkWidth + 0.6), rampMat);
  pad.position.set(x, y - 0.05, z);
  group.add(pad);
  addGround(
    game,
    x - walkWidth / 2 - 0.2,
    x + walkWidth / 2 + 0.2,
    z - walkWidth / 2 - 0.2,
    z + walkWidth / 2 + 0.2,
    y
  );
}

function addRampSpan(game, group, a, b, walkWidth, rampMat, railMat) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const dy = b.y - a.y;
  const horiz = Math.hypot(dx, dz);
  if (horiz < 0.05) return;
  const slopeLen = Math.hypot(horiz, dy);
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const midZ = (a.z + b.z) / 2;
  const yaw = Math.atan2(dx, dz);
  const pitch = Math.atan2(dy, horiz);

  // Overlap landings slightly so spans fuse visually
  const deck = mesh(new THREE.BoxGeometry(walkWidth, 0.3, slopeLen + 0.5), rampMat);
  deck.position.set(midX, midY, midZ);
  deck.rotation.order = "YXZ";
  deck.rotation.y = yaw;
  deck.rotation.x = -pitch;
  group.add(deck);

  const samples = Math.max(8, Math.ceil(horiz / 0.9));
  const halfW = walkWidth / 2 - 0.05;
  for (let i = 0; i < samples; i += 1) {
    const t = (i + 0.5) / samples;
    const cx = THREE.MathUtils.lerp(a.x, b.x, t);
    const cz = THREE.MathUtils.lerp(a.z, b.z, t);
    const h = THREE.MathUtils.lerp(a.y, b.y, t);
    const step = horiz / samples;
    addGround(game, cx - halfW - step, cx + halfW + step, cz - halfW - step, cz + halfW + step, h);
  }

  const perpX = Math.cos(yaw);
  const perpZ = -Math.sin(yaw);
  const railCount = Math.max(5, Math.ceil(horiz / 1.2));
  for (let i = 1; i < railCount; i += 1) {
    const t = i / railCount;
    if (t < 0.1 || t > 0.9) continue;
    const cx = THREE.MathUtils.lerp(a.x, b.x, t);
    const cz = THREE.MathUtils.lerp(a.z, b.z, t);
    const h = THREE.MathUtils.lerp(a.y, b.y, t);
    for (const side of [-1, 1]) {
      const rx = cx + perpX * side * (walkWidth / 2 - 0.12);
      const rz = cz + perpZ * side * (walkWidth / 2 - 0.12);
      const rail = mesh(new THREE.BoxGeometry(0.12, 0.78, horiz / railCount + 0.06), railMat);
      rail.position.set(rx, h + 0.55, rz);
      rail.rotation.order = "YXZ";
      rail.rotation.y = yaw;
      rail.rotation.x = -pitch;
      group.add(rail);
      addCollider(game, rx - 0.2, rx + 0.2, h, h + 1.7, rz - 0.2, rz + 0.2);
    }
  }
}

export function buildAnduinWorld(game, group) {
  const valley = mesh(
    new THREE.BoxGeometry(90, 1.2, 220),
    mat(0x5f7345, { roughness: 0.96 }),
    false,
    true
  );
  valley.position.set(0, -0.7, 10);
  group.add(valley);

  const water = createReflectiveWater(new THREE.PlaneGeometry(22, 190, 1, 1), {
    waterColor: 0x2f6f7a,
    distortionScale: 1.4,
    size: 5,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, ANDUIN_WATER_Y, 10);
  water.userData.level = "anduin";
  group.add(water);
  game.waterSurfaces.push(water);

  const bankMat = mat(0x6d834d, { roughness: 0.94 });
  for (const side of [-1, 1]) {
    const bank = mesh(new THREE.BoxGeometry(18, 2.4, 200), bankMat, true, true);
    bank.position.set(side * 20, 0.6, 10);
    group.add(bank);
  }
  addCollider(game, 11, 29, 0, 4, -90, 110);
  addCollider(game, -29, -11, 0, 4, -90, 76);
  addCollider(game, -29, -11, 0, 4, 100, 110);
  addCollider(game, -36, -26, 0, 1.8, 76, 84);

  addGround(game, -11, 11, -90, 110, ANDUIN_WATER_Y);

  const rockSpots = [
    [-7.2, -42, 0.85], [7.4, -30, 1], [-7.6, -10, 0.95], [7.2, 4, 0.8],
    [-7.4, 24, 1.05], [7.5, 40, 0.9], [-7.3, 55, 0.85], [7.2, 70, 1],
  ];
  for (const [x, z, s] of rockSpots) addRock(game, group, x, z, s);

  // The Argonath — kings of old, palms raised in warning (movie silhouette)
  addArgonath(group, -18, 14, -1, "left");
  addArgonath(group, 18, 14, 1, "right");
  addCollider(game, -28, -12, 0, 40, 6, 22);
  addCollider(game, 12, 28, 0, 40, 6, 22);

  // Parth Galen beach + wooden dock for stepping ashore
  const beach = mesh(
    new THREE.BoxGeometry(28, 0.5, 24),
    mat(0xc2b48a, { roughness: 0.9 }),
    true,
    true
  );
  beach.position.set(-22, 0.35, 88);
  group.add(beach);
  const dock = mesh(
    new THREE.BoxGeometry(8, 0.35, 14),
    mat(0xb89f72, { roughness: 0.84 }),
    true,
    true
  );
  dock.position.set(-12, 0.4, 86);
  group.add(dock);
  addGround(game, -36, -8, 76, 100, 0.6);
  addGround(game, -16, -8, 80, 94, 0.55);

  const hill = mesh(
    new THREE.ConeGeometry(14, 14, 18),
    mat(0x5a7040, { roughness: 0.95 }),
    true,
    true
  );
  hill.position.set(-48, 6.5, 104);
  group.add(hill);
  addCollider(game, -58, -42, 0, 13, 88, 118);

  // Connected switchback: each ramp shares endpoints with landing pads
  const rampMat = mat(0xcfc3a0, { roughness: 0.82 });
  const railMat = mat(0xe8dfc4, { roughness: 0.7 });
  const walkWidth = 5.4;
  const landings = [
    { x: -20, z: 86, y: 0.6 },
    { x: -20, z: 95, y: 3.6 },
    { x: -28, z: 95, y: 6.4 },
    { x: -28, z: 104, y: 9.4 },
    { x: -34, z: 108, y: 12.4 },
  ];
  for (let i = 0; i < landings.length; i += 1) {
    addLandingPad(game, group, landings[i].x, landings[i].z, landings[i].y, walkWidth, rampMat);
    if (i < landings.length - 1) {
      addRampSpan(game, group, landings[i], landings[i + 1], walkWidth, rampMat, railMat);
    }
  }

  const seatBase = mesh(new THREE.CylinderGeometry(2.4, 2.8, 1.2, 12), mat(0x8a867c, { roughness: 0.88 }));
  seatBase.position.set(-34, 12.2, 108);
  const seatBack = mesh(new THREE.BoxGeometry(2.2, 2.4, 0.45), mat(0x7e7a70, { roughness: 0.9 }));
  seatBack.position.set(-34, 13.8, 109.1);
  const seatPad = mesh(new THREE.BoxGeometry(1.6, 0.25, 1.4), mat(0x959087, { roughness: 0.84 }));
  seatPad.position.set(-34, 12.95, 107.9);
  group.add(seatBase, seatBack, seatPad);
  addGround(game, -37, -31, 105, 111, 12.4);
  addCollider(game, -35.2, -32.8, 12.4, 15.5, 108.6, 109.5);
  for (let i = 0; i < 14; i += 1) {
    const ang = (i / 14) * Math.PI * 2;
    if (ang > 0.35 && ang < 1.35) continue;
    const rx = -34 + Math.sin(ang) * 3.4;
    const rz = 108 + Math.cos(ang) * 3.4;
    const post = mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.1, 6), railMat);
    post.position.set(rx, 12.95, rz);
    group.add(post);
    addCollider(game, rx - 0.18, rx + 0.18, 12.4, 14.2, rz - 0.18, rz + 0.18);
  }

  game.anduinSeatPoint = A(-34, 12.4, 107.5);
  game.anduinLandingPoint = A(-12, 0.55, 86);
  game.anduinShoreSpawn = A(-14, 0.6, 86);
  game.anduinDockPoint = A(-10, ANDUIN_WATER_Y, 86);

  for (const [x, z, s] of [
    [-24, 82, 1], [-30, 90, 1.2], [-40, 100, 0.9], [-26, 104, 1.1],
    [22, -50, 1], [24, 40, 1.15], [-24, -20, 1], [26, 90, 0.95],
  ]) {
    addTree(group, x, z, s);
  }

  // Shire-density foliage: textured trees, wind grass, Kenney bushes/flowers
  decorateAnduinLandscape(game, group, ANDUIN_ORIGIN);

  const mist = createDriftField({
    count: 160,
    bounds: { minX: -10, maxX: 10, minY: 0.4, maxY: 5, minZ: -70, maxZ: 100 },
    color: 0xd7e8ea,
    size: 0.12,
    opacity: 0.35,
    fallSpeed: 0.08,
    driftSpeed: 0.35,
  });
  mist.userData.level = "anduin";
  group.add(mist);
  game.driftFields.push(mist);

  group.position.copy(ANDUIN_ORIGIN);
  game.anduinBoatSpawn = A(0, ANDUIN_WATER_Y, -70);
  return group;
}

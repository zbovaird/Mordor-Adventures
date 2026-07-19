import * as THREE from "three";
import { createReflectiveWater, createFlowingWaterMaterial } from "./water.js";

export const RIVENDELL_ORIGIN = new THREE.Vector3(0, 0, 120);

function ms(geometry, material, cast = true, receive = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function stone(color = 0xc9c2b2) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.88,
    metalness: 0.05,
    envMapIntensity: 0.55,
  });
}

function paleWood() {
  return new THREE.MeshStandardMaterial({
    color: 0xd8cbb0,
    roughness: 0.78,
    metalness: 0.04,
    envMapIntensity: 0.5,
  });
}

function makeWaterTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, "#9ad8ff");
  gradient.addColorStop(0.35, "#6ec6ff");
  gradient.addColorStop(0.7, "#8fd0ff");
  gradient.addColorStop(1, "#5eb8f5");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 18; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${0.08 + (i % 3) * 0.04})`;
    ctx.fillRect(4 + (i * 11) % 56, (i * 17) % 120, 8, 22);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function waterMat() {
  return new THREE.MeshStandardMaterial({
    map: makeWaterTexture(),
    color: 0x9ad8ff,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.72,
    envMapIntensity: 1.2,
  });
}

export function W(x, y, z) {
  return new THREE.Vector3(RIVENDELL_ORIGIN.x + x, RIVENDELL_ORIGIN.y + y, RIVENDELL_ORIGIN.z + z);
}

function addCollider(game, minX, maxX, minY, maxY, minZ, maxZ) {
  game.colliders.push({
    minX: RIVENDELL_ORIGIN.x + minX,
    maxX: RIVENDELL_ORIGIN.x + maxX,
    minY,
    maxY,
    minZ: RIVENDELL_ORIGIN.z + minZ,
    maxZ: RIVENDELL_ORIGIN.z + maxZ,
    active: false,
    level: "rivendell",
  });
}

export function addAutumnTree(group, x, z, scale = 1) {
  const trunk = ms(
    new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, 1.6 * scale, 8),
    new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 })
  );
  trunk.position.set(x, 0.8 * scale, z);
  const canopy = ms(
    new THREE.SphereGeometry(1.1 * scale, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xd4782a, roughness: 0.85 })
  );
  canopy.position.set(x, 2.0 * scale, z);
  const canopy2 = ms(
    new THREE.SphereGeometry(0.75 * scale, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.85 })
  );
  canopy2.position.set(x + 0.4 * scale, 2.2 * scale, z - 0.2 * scale);
  group.add(trunk, canopy, canopy2);
}

function addGreenery(group, x, z, scale = 1) {
  const stem = ms(
    new THREE.CylinderGeometry(0.05 * scale, 0.08 * scale, 0.65 * scale, 7),
    new THREE.MeshStandardMaterial({ color: 0x4e5b38, roughness: 1 })
  );
  stem.position.set(x, 0.32 * scale, z);
  const leaves = new THREE.MeshStandardMaterial({
    color: 0x4f7f47,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const bush = new THREE.Group();
  for (let i = 0; i < 5; i += 1) {
    const leaf = ms(new THREE.SphereGeometry(0.34 * scale, 8, 6), leaves, false, true);
    const angle = (i / 5) * Math.PI * 2;
    leaf.scale.set(1, 0.65, 0.75);
    leaf.position.set(
      x + Math.cos(angle) * 0.26 * scale,
      (0.55 + (i % 2) * 0.16) * scale,
      z + Math.sin(angle) * 0.26 * scale
    );
    bush.add(leaf);
  }
  group.add(stem, bush);
}

export function addLantern(group, x, y, z) {
  const post = ms(new THREE.CylinderGeometry(0.05, 0.06, y, 8), paleWood());
  post.position.set(x, y / 2, z);
  const lamp = ms(
    new THREE.SphereGeometry(0.14, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffe082,
      emissive: 0xffb300,
      emissiveIntensity: 0.8,
    })
  );
  lamp.position.set(x, y + 0.1, z);
  const light = new THREE.PointLight(0xffe082, 0.55, 8, 2);
  light.position.set(x, y + 0.1, z);
  group.add(post, lamp, light);
}

function addElvenTower(group, x, z, height = 10, radius = 1.5) {
  const towerStone = stone(0xd8d0c0);
  const body = ms(new THREE.CylinderGeometry(radius * 0.88, radius, height, 12), towerStone);
  body.position.set(x, 1.2 + height / 2, z);
  const crown = ms(new THREE.CylinderGeometry(radius * 1.08, radius * 0.95, 0.55, 12), stone(0xe8e0d0));
  crown.position.set(x, 1.2 + height, z);
  const roof = ms(new THREE.ConeGeometry(radius * 1.45, 3.4, 8), stone(0x71807a));
  roof.position.set(x, 1.2 + height + 1.9, z);
  const finial = ms(
    new THREE.ConeGeometry(0.13, 1.1, 8),
    new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.7, roughness: 0.3 })
  );
  finial.position.set(x, 1.2 + height + 4.05, z);
  group.add(body, crown, roof, finial);

  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2;
    const buttress = ms(
      new THREE.CylinderGeometry(0.12, 0.22, height * 0.72, 7),
      stone(0xeee7da)
    );
    buttress.position.set(
      x + Math.cos(angle) * radius * 0.92,
      1.2 + height * 0.36,
      z + Math.sin(angle) * radius * 0.92
    );
    group.add(buttress);
  }
}

function addArchedWindow(group, x, y, z, scale = 1) {
  const glass = ms(
    new THREE.PlaneGeometry(0.75 * scale, 1.7 * scale),
    new THREE.MeshStandardMaterial({
      color: 0x6f91a1,
      emissive: 0x24445a,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.15,
    }),
    false,
    false
  );
  glass.position.set(x, y, z);
  glass.rotation.y = Math.PI;
  const arch = ms(
    new THREE.TorusGeometry(0.38 * scale, 0.075 * scale, 8, 18, Math.PI),
    stone(0xf0eadf)
  );
  arch.rotation.z = Math.PI;
  arch.position.set(x, y + 0.84 * scale, z - 0.015);
  group.add(glass, arch);
}

/**
 * Last Homely House vignette: terraces, arches, waterfall, bridges, courtyard.
 */
export function buildRivendellWorld(game, group) {
  const wood = paleWood();
  const rock = stone();

  // Valley floor
  const ground = ms(new THREE.BoxGeometry(70, 0.4, 70), stone(0x8f9e7a), false, true);
  ground.position.set(0, -0.2, 0);
  group.add(ground);
  game.groundHeights.push({
    minX: RIVENDELL_ORIGIN.x - 35,
    maxX: RIVENDELL_ORIGIN.x + 35,
    minZ: RIVENDELL_ORIGIN.z - 35,
    maxZ: RIVENDELL_ORIGIN.z + 35,
    height: 0,
    level: "rivendell",
  });

  // River — real planar-reflection water (three.js Water addon)
  game.rivendellWater = [];
  const river = createReflectiveWater(new THREE.PlaneGeometry(8, 40), {
    waterColor: 0x2b5e70,
    distortionScale: 1.4,
    size: 4,
  });
  river.rotation.x = -Math.PI / 2;
  river.position.set(-8, 0.1, 0);
  group.add(river);
  game.waterSurfaces.push(river);

  // Waterfall cliff + flowing sheets (scrolling normal maps — cheap)
  const cliff = ms(new THREE.BoxGeometry(10, 10, 4), rock);
  cliff.position.set(-8, 5, -18);
  group.add(cliff);
  addCollider(game, -13, -3, 0, 10, -20, -16);
  const fall = ms(new THREE.PlaneGeometry(4.5, 9), createFlowingWaterMaterial({ flowSpeed: 0.85, repeat: [1.6, 3] }), false, false);
  fall.position.set(-8, 4.5, -15.8);
  group.add(fall);
  game.waterSurfaces.push(fall);

  // Layered side cascades and a reflective plunge pool.
  const fallLeft = ms(new THREE.PlaneGeometry(1.35, 6.8), createFlowingWaterMaterial({ flowSpeed: 1.05, repeat: [0.6, 2.4] }), false, false);
  fallLeft.position.set(-11.1, 3.4, -15.72);
  const fallRight = ms(new THREE.PlaneGeometry(1.15, 7.4), createFlowingWaterMaterial({ flowSpeed: 0.95, repeat: [0.5, 2.6] }), false, false);
  fallRight.position.set(-4.9, 3.7, -15.72);
  const pool = createReflectiveWater(new THREE.CircleGeometry(6.2, 32), {
    waterColor: 0x27606f,
    distortionScale: 2.2,
    size: 5,
  });
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(-8, 0.14, -13.1);
  group.add(fallLeft, fallRight, pool);
  game.waterSurfaces.push(fallLeft, fallRight, pool);

  // A smaller garden waterfall feeds the river near the far terrace.
  const gardenRock = ms(new THREE.BoxGeometry(5, 4.4, 2.5), rock);
  gardenRock.position.set(-18, 2.2, 11);
  const gardenFall = ms(new THREE.PlaneGeometry(2.1, 4), createFlowingWaterMaterial({ flowSpeed: 0.8, repeat: [0.8, 2] }), false, false);
  gardenFall.position.set(-18, 2, 9.72);
  const gardenPool = ms(new THREE.CircleGeometry(3.6, 28), createFlowingWaterMaterial({ flowSpeed: 0.12, repeat: [3, 3] }), false, true);
  gardenPool.rotation.x = -Math.PI / 2;
  gardenPool.position.set(-18, 0.07, 7.8);
  group.add(gardenRock, gardenFall, gardenPool);
  game.waterSurfaces.push(gardenFall, gardenPool);
  addCollider(game, -20.5, -15.5, 0, 4.4, 9.7, 12.3);

  // Mist spray — small, faint, clustered at the plunge pool
  for (let i = 0; i < 12; i += 1) {
    const puff = ms(
      new THREE.SphereGeometry(0.16 + Math.random() * 0.14, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
        roughness: 1,
        depthWrite: false,
      }),
      false,
      false
    );
    puff.position.set(-8 + (Math.random() - 0.5) * 3, 0.5 + Math.random() * 1.4, -14.2 + Math.random());
    group.add(puff);
  }

  // Bridges
  const bridge = ms(new THREE.BoxGeometry(3.2, 0.25, 10), wood);
  bridge.position.set(-8, 0.9, -6);
  group.add(bridge);
  game.groundHeights.push({
    minX: RIVENDELL_ORIGIN.x - 9.6,
    maxX: RIVENDELL_ORIGIN.x - 6.4,
    minZ: RIVENDELL_ORIGIN.z - 11,
    maxZ: RIVENDELL_ORIGIN.z - 1,
    height: 1.0,
    level: "rivendell",
  });
  const railL = ms(new THREE.BoxGeometry(0.12, 0.55, 10), wood);
  railL.position.set(-9.5, 1.2, -6);
  const railR = railL.clone();
  railR.position.x = -6.5;
  group.add(railL, railR);

  // Terraced house massing (Last Homely House)
  const terrace = ms(new THREE.BoxGeometry(28, 1.2, 18), rock);
  terrace.position.set(6, 0.6, 4);
  group.add(terrace);
  game.groundHeights.push({
    minX: RIVENDELL_ORIGIN.x - 8,
    maxX: RIVENDELL_ORIGIN.x + 20,
    minZ: RIVENDELL_ORIGIN.z - 5,
    maxZ: RIVENDELL_ORIGIN.z + 13,
    height: 1.2,
    level: "rivendell",
  });

  // Main hall shell with a real, walkable front doorway.
  const hallBack = ms(new THREE.BoxGeometry(16, 6, 0.5), wood);
  hallBack.position.set(8, 4.2, 10.75);
  const hallLeft = ms(new THREE.BoxGeometry(0.5, 6, 9.5), wood);
  hallLeft.position.set(0.25, 4.2, 6);
  const hallRight = hallLeft.clone();
  hallRight.position.x = 15.75;
  const frontLeft = ms(new THREE.BoxGeometry(6.5, 6, 0.5), wood);
  frontLeft.position.set(3.25, 4.2, 1.25);
  const frontRight = frontLeft.clone();
  frontRight.position.x = 12.75;
  const doorHeader = ms(new THREE.BoxGeometry(3, 1.5, 0.5), wood);
  doorHeader.position.set(8, 6.45, 1.25);
  const hallRoof = ms(new THREE.BoxGeometry(16.6, 0.45, 10.6), stone(0xb0a090));
  hallRoof.position.set(8, 7.35, 6);
  const interiorFloor = ms(new THREE.BoxGeometry(15.4, 0.12, 9.2), stone(0xd7cbb7), false, true);
  interiorFloor.position.set(8, 1.25, 6);
  group.add(hallBack, hallLeft, hallRight, frontLeft, frontRight, doorHeader, hallRoof, interiorFloor);

  // Tall roofs and slender towers give the hall Rivendell's vertical,
  // castle-like silhouette while retaining its open Elven terraces.
  const grandRoof = ms(new THREE.ConeGeometry(9, 4.2, 4), stone(0x7b8982));
  grandRoof.rotation.y = Math.PI / 4;
  grandRoof.scale.z = 0.68;
  grandRoof.position.set(8, 9.25, 6);
  group.add(grandRoof);
  addElvenTower(group, 0.9, 2.2, 9.5, 1.35);
  addElvenTower(group, 15.1, 2.2, 9.5, 1.35);
  addElvenTower(group, 8, 10.1, 12, 1.75);

  const doorway = ms(new THREE.TorusGeometry(1.5, 0.18, 10, 28, Math.PI), stone(0xe8e0d0));
  doorway.rotation.z = Math.PI;
  doorway.position.set(8, 5.65, 0.96);
  group.add(doorway);
  [2.2, 4.7, 11.3, 13.8].forEach((x) => addArchedWindow(group, x, 4.1, 0.96, 0.9));

  addCollider(game, 0, 16, 1.2, 7.2, 10.5, 11);
  addCollider(game, 0, 0.5, 1.2, 7.2, 1, 11);
  addCollider(game, 15.5, 16, 1.2, 7.2, 1, 11);
  addCollider(game, 0, 6.5, 1.2, 7.2, 1, 1.5);
  addCollider(game, 9.5, 16, 1.2, 7.2, 1, 1.5);

  // Pale arches along front
  for (let i = 0; i < 5; i += 1) {
    const col = ms(new THREE.CylinderGeometry(0.22, 0.28, 3.2, 12), stone(0xe8e0d0));
    col.position.set(2 + i * 3.2, 2.8, -0.2);
    group.add(col);
    const arch = ms(new THREE.TorusGeometry(1.1, 0.14, 10, 24, Math.PI), stone(0xe8e0d0));
    arch.rotation.z = Math.PI;
    arch.position.set(2 + i * 3.2 + 1.6, 4.2, -0.2);
    if (i < 4) {
      group.add(arch);
    }
  }

  // Balcony
  const balcony = ms(new THREE.BoxGeometry(12, 0.25, 3), wood);
  balcony.position.set(8, 5.5, 0.5);
  group.add(balcony);
  const balRail = ms(new THREE.BoxGeometry(12, 0.45, 0.12), wood);
  balRail.position.set(8, 5.85, -0.9);
  group.add(balRail);

  // Side pavilion
  const pavilion = ms(new THREE.CylinderGeometry(3.2, 3.5, 0.3, 16), wood, false, true);
  pavilion.position.set(18, 1.35, 8);
  group.add(pavilion);
  const pavilionRoof = ms(new THREE.ConeGeometry(4, 2.2, 16), stone(0xb0a090));
  pavilionRoof.position.set(18, 3.2, 8);
  group.add(pavilionRoof);
  game.groundHeights.push({
    minX: RIVENDELL_ORIGIN.x + 14.5,
    maxX: RIVENDELL_ORIGIN.x + 21.5,
    minZ: RIVENDELL_ORIGIN.z + 4.5,
    maxZ: RIVENDELL_ORIGIN.z + 11.5,
    height: 1.5,
    level: "rivendell",
  });

  // Courtyard ring (council terrace)
  const court = ms(
    new THREE.CircleGeometry(5.5, 32),
    new THREE.MeshStandardMaterial({ color: 0xd4c4a8, roughness: 0.9 }),
    false,
    true
  );
  court.rotation.x = -Math.PI / 2;
  court.position.set(6, 1.22, 2);
  group.add(court);

  // Trees + lanterns
  [
    [-18, 8],
    [-16, -4],
    [22, -6],
    [24, 12],
    [-2, 16],
    [14, -10],
  ].forEach(([x, z], i) => addAutumnTree(group, x, z, 0.9 + (i % 3) * 0.15));

  [
    [-12, -12], [-5, -13], [-13, -2], [-12, 5], [-15, 7], [-21, 6],
    [-21, 12], [-15, 13], [-3, 12], [1, 14], [17, -5], [20, 1],
    [21, 14], [11, 15], [4, -5], [13, -7], [-1, -7], [-6, 15],
  ].forEach(([x, z], i) => addGreenery(group, x, z, 0.75 + (i % 4) * 0.14));

  addLantern(group, 1, 2.8, 0);
  addLantern(group, 12, 2.8, 0);
  addLantern(group, 6, 2.8, 8);
  addLantern(group, -4, 1.8, -2);

  // Soft valley light
  const warm = new THREE.PointLight(0xffd8a8, 1.1, 40, 2);
  warm.position.set(8, 8, 4);
  group.add(warm);
  const cool = new THREE.PointLight(0xa8d4ff, 0.55, 35, 2);
  cool.position.set(-10, 6, -10);
  group.add(cool);

  // Decorative banners
  for (let i = 0; i < 3; i += 1) {
    const banner = ms(
      new THREE.BoxGeometry(0.8, 1.6, 0.05),
      new THREE.MeshStandardMaterial({ color: [0x558b2f, 0xc9a227, 0x5c6bc0][i], roughness: 0.7 })
    );
    banner.position.set(4 + i * 4, 3.5, -0.5);
    group.add(banner);
  }

  group.position.copy(RIVENDELL_ORIGIN);
  return group;
}

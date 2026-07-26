import * as THREE from "three";
import { createWindGrass } from "./vegetation.js";
import { fitModel } from "./assets.js";

function loadTex(loader, path, { color = true, repeat = 2 } = {}) {
  return loader.loadAsync(path).then((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 8;
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return t;
  });
}

export async function loadNatureTextures() {
  const loader = new THREE.TextureLoader();
  const [barkMap, barkNor, leavesMap, grassMap, grassNor] = await Promise.all([
    loadTex(loader, "assets/textures/bark_diff.jpg", { repeat: 2 }),
    loadTex(loader, "assets/textures/bark_nor.jpg", { color: false, repeat: 2 }),
    loadTex(loader, "assets/textures/leaves_diff.jpg", { repeat: 1 }),
    loadTex(loader, "assets/textures/grass_diff.jpg", { repeat: 8 }),
    loadTex(loader, "assets/textures/grass_nor.jpg", { color: false, repeat: 8 }),
  ]);
  return { barkMap, barkNor, leavesMap, grassMap, grassNor };
}

function barkMat(tex) {
  return new THREE.MeshStandardMaterial({
    map: tex.barkMap,
    normalMap: tex.barkNor,
    roughness: 0.9,
    metalness: 0.02,
    envMapIntensity: 0.4,
  });
}

function leafMat(tex, tint = 0xffffff) {
  return new THREE.MeshStandardMaterial({
    map: tex.leavesMap,
    color: tint,
    roughness: 0.85,
    metalness: 0,
    envMapIntensity: 0.35,
  });
}

export function createTexturedTree(tex, rng = Math.random) {
  const root = new THREE.Group();
  const height = 2.2 + rng() * 1.8;
  const trunkR = 0.12 + rng() * 0.08;

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(trunkR * 0.7, trunkR, height * 0.55, 10),
    barkMat(tex)
  );
  trunk.position.y = height * 0.275;
  trunk.castShadow = true;
  trunk.receiveShadow = true;

  const canopy = new THREE.Group();
  const leaf = leafMat(tex, new THREE.Color().setHSL(0.28 + rng() * 0.08, 0.45, 0.35 + rng() * 0.1));
  const layers = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < layers; i += 1) {
    const r = (0.7 + rng() * 0.35) * (1 - i * 0.12);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), leaf);
    sphere.position.set(
      (rng() - 0.5) * 0.35,
      height * 0.55 + i * 0.35,
      (rng() - 0.5) * 0.35
    );
    sphere.scale.y = 0.75 + rng() * 0.2;
    sphere.castShadow = true;
    canopy.add(sphere);
  }

  root.add(trunk, canopy);
  return { root, collideRadius: trunkR + 0.15 };
}

export function decorateRealisticWorld(game, tex) {
  const rng = (() => {
    let s = 99;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  })();

  const addTree = (x, z) => {
    if (Math.abs(x) < 2.4 && z > -1 && z < 20) {
      return;
    }
    const { root, collideRadius } = createTexturedTree(tex, rng);
    root.position.set(x, 0, z);
    root.rotation.y = rng() * Math.PI * 2;
    game.scene.add(root);
    game.colliders.push({
      minX: x - collideRadius,
      maxX: x + collideRadius,
      minY: 0,
      maxY: 3,
      minZ: z - collideRadius,
      maxZ: z + collideRadius,
      active: true,
    });
  };

  for (let i = 0; i < 70; i += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = 11 + rng() * 15;
    addTree(Math.cos(angle) * radius, 6 + Math.sin(angle) * radius * 0.75);
  }
  for (let i = 0; i < 35; i += 1) {
    addTree((rng() > 0.5 ? 1 : -1) * (13 + rng() * 8), -2 + rng() * 24);
  }

  // Short Shire lawn — dense low blades, not chest-high meadow weeds
  const meadow = createWindGrass({
    count: 9800,
    bladeWidth: 0.035,
    bladeHeight: 0.13,
    color: 0x3f8a32,
    tipColor: 0x8fc45a,
    windStrength: 0.1,
    scaleMin: 0.75,
    scaleMax: 1.1,
    heightJitter: 0.28,
    placer: () => {
      const x = -24 + rng() * 48;
      const z = -16 + rng() * 42;
      if (Math.abs(x) < 1.6 && z > 0 && z < 18) return null; // main path
      // Soft clear around the round door so it stays readable
      if (Math.abs(x) < 1.4 && z > -6.2 && z < -3.2) return null;
      if (Math.hypot(x - 14, z - 16) < 3.4) return null; // pond
      return { x, y: 0, z };
    },
  });
  meadow.userData.level = "shire";
  game.scene.add(meadow);
  game.windGrasses.push(meadow);

  // Scatter bundled Kenney (CC0) nature models for close-up detail
  if (game.assets?.has?.("rock_largeA")) {
    scatterKenneyProps(game, rng);
    scatterBagEndGarden(game, rng);
  }
}

const KENNEY_SCATTER = [
  { keys: ["rock_largeA", "rock_largeB"], count: 5, height: 1.05, collide: 0.55 },
  { keys: ["rock_smallA", "rock_smallB", "rock_smallE", "stone_smallA", "stone_smallB"], count: 14, height: 0.38, collide: 0 },
  { keys: ["mushroom_red", "mushroom_redGroup", "mushroom_tan"], count: 10, height: 0.28, collide: 0 },
  { keys: ["flower_purpleA", "flower_redA", "flower_yellowA", "flower_purpleB", "flower_redB", "flower_yellowB"], count: 48, height: 0.28, collide: 0 },
  { keys: ["plant_bush", "plant_bushDetailed", "plant_bushLarge", "plant_bushSmall"], count: 22, height: 0.7, collide: 0.32 },
  { keys: ["grass", "grass_leafs", "grass_large", "grass_leafsLarge"], count: 55, height: 0.2, collide: 0 },
];

function scatterKenneyProps(game, rng) {
  const isBlocked = (x, z) =>
    (Math.abs(x) < 2.4 && z > -1 && z < 20) ||
    Math.hypot(x - 14, z - 16) < 3.8;

  for (const spec of KENNEY_SCATTER) {
    for (let i = 0; i < spec.count; i += 1) {
      let x = 0;
      let z = 0;
      let tries = 0;
      do {
        x = -23 + rng() * 46;
        z = -15 + rng() * 40;
        tries += 1;
      } while (isBlocked(x, z) && tries < 12);
      if (isBlocked(x, z)) continue;

      const available = spec.keys.filter((k) => game.assets.has(k));
      if (!available.length) continue;
      const key = available[Math.floor(rng() * available.length)];
      const model = game.assets.clone(key);
      fitModel(model, spec.height * (0.8 + rng() * 0.45));
      model.position.x = x;
      model.position.z = z;
      model.rotation.y = rng() * Math.PI * 2;
      game.scene.add(model);
      if (spec.collide > 0) {
        game.colliders.push({
          minX: x - spec.collide,
          maxX: x + spec.collide,
          minY: 0,
          maxY: 1.6,
          minZ: z - spec.collide,
          maxZ: z + spec.collide,
          active: true,
          level: "shire",
        });
      }
    }
  }
}

/** Garden beds flanking Bag End — bushes + flowers like the movie reference. */
function scatterBagEndGarden(game, rng) {
  const bushes = ["plant_bush", "plant_bushDetailed", "plant_bushLarge", "plant_bushSmall"];
  const flowers = [
    "flower_purpleA",
    "flower_redA",
    "flower_yellowA",
    "flower_purpleB",
    "flower_redB",
    "flower_yellowB",
  ];

  const place = (key, x, z, height, collide = 0) => {
    if (!game.assets.has(key)) return;
    const model = game.assets.clone(key);
    fitModel(model, height);
    model.position.set(x, 0, z);
    model.rotation.y = rng() * Math.PI * 2;
    game.scene.add(model);
    if (collide > 0) {
      game.colliders.push({
        minX: x - collide,
        maxX: x + collide,
        minY: 0,
        maxY: 1.4,
        minZ: z - collide,
        maxZ: z + collide,
        active: true,
        level: "shire",
      });
    }
  };

  // Dense shrubs either side of the green door
  const bushBeds = [
    { x: -3.4, z: -4.6, h: 0.78 },
    { x: -4.6, z: -5.8, h: 0.95 },
    { x: -2.6, z: -6.8, h: 0.62 },
    { x: 3.5, z: -4.5, h: 0.82 },
    { x: 4.8, z: -5.9, h: 1.05 },
    { x: 2.8, z: -7.0, h: 0.68 },
    { x: -5.2, z: -3.8, h: 0.72 },
    { x: 5.4, z: -3.9, h: 0.7 },
    { x: -1.9, z: -8.4, h: 0.55 },
    { x: 2.0, z: -8.5, h: 0.58 },
  ];
  for (const bed of bushBeds) {
    const key = bushes[Math.floor(rng() * bushes.length)];
    place(key, bed.x, bed.z, bed.h * (0.9 + rng() * 0.2), 0.28);
  }

  // Flower pots / clumps along the front path to the door
  for (let i = 0; i < 28; i += 1) {
    const side = rng() < 0.5 ? -1 : 1;
    const x = side * (1.6 + rng() * 3.2);
    const z = -3.2 - rng() * 4.5;
    if (Math.abs(x) < 1.1 && z > -5.5) continue;
    const key = flowers[Math.floor(rng() * flowers.length)];
    place(key, x, z, 0.22 + rng() * 0.14);
  }
}

/**
 * Dense bank foliage for Anduin — mirrors Shire detail density using the same
 * textures + Kenney props, parented into the level group with world offsets.
 */
export function decorateAnduinLandscape(game, group, origin) {
  const tex = game.natureTextures;
  const rng = (() => {
    let s = 314;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  })();

  const ox = origin?.x ?? 0;
  const oz = origin?.z ?? 0;

  if (tex) {
    for (let i = 0; i < 55; i += 1) {
      const side = rng() < 0.5 ? -1 : 1;
      const x = side * (13 + rng() * 18);
      const z = -70 + rng() * 175;
      if (Math.abs(x) < 11.5) continue;
      // Keep Argonath plaza and dock clear
      if (Math.abs(x) > 16 && Math.abs(x) < 28 && z > 6 && z < 22) continue;
      if (x < -8 && x > -18 && z > 78 && z < 98) continue;
      const { root, collideRadius } = createTexturedTree(tex, rng);
      root.position.set(x, 1.15, z);
      root.rotation.y = rng() * Math.PI * 2;
      root.scale.multiplyScalar(1.15 + rng() * 0.55);
      group.add(root);
      game.colliders.push({
        minX: ox + x - collideRadius,
        maxX: ox + x + collideRadius,
        minY: 0,
        maxY: 4,
        minZ: oz + z - collideRadius,
        maxZ: oz + z + collideRadius,
        active: false,
        level: "anduin",
      });
    }
  }

  const denserGrass = createWindGrass({
    count: 5200,
    bladeWidth: 0.04,
    bladeHeight: 0.16,
    color: 0x4f8a38,
    tipColor: 0xa8cc5e,
    windStrength: 0.14,
    scaleMin: 0.75,
    scaleMax: 1.15,
    placer: () => {
      const side = rng() < 0.5 ? -1 : 1;
      const x = side * (11.5 + rng() * 24);
      const z = -75 + rng() * 185;
      if (Math.abs(x) < 11) return null;
      return { x, y: 1.15, z };
    },
  });
  denserGrass.userData.level = "anduin";
  group.add(denserGrass);
  game.windGrasses.push(denserGrass);

  if (!game.assets?.has?.("plant_bush")) return;

  const scatter = [
    { keys: ["plant_bush", "plant_bushDetailed", "plant_bushLarge", "plant_bushSmall"], count: 28, height: 0.85 },
    { keys: ["flower_purpleA", "flower_redA", "flower_yellowA", "flower_purpleB", "flower_redB", "flower_yellowB"], count: 40, height: 0.34 },
    { keys: ["rock_smallA", "rock_smallB", "rock_smallE", "stone_smallA", "stone_smallB"], count: 22, height: 0.4 },
    { keys: ["mushroom_red", "mushroom_tan"], count: 10, height: 0.28 },
    { keys: ["grass_large", "grass_leafsLarge", "plant_flatTall"], count: 18, height: 0.55 },
  ];

  for (const spec of scatter) {
    for (let i = 0; i < spec.count; i += 1) {
      const side = rng() < 0.5 ? -1 : 1;
      const x = side * (12 + rng() * 20);
      const z = -70 + rng() * 175;
      if (Math.abs(x) < 11.2) continue;
      if (x < -8 && x > -18 && z > 78 && z < 96) continue;
      const available = spec.keys.filter((k) => game.assets.has(k));
      if (!available.length) continue;
      const key = available[Math.floor(rng() * available.length)];
      const model = game.assets.clone(key);
      fitModel(model, spec.height * (0.75 + rng() * 0.55));
      model.position.set(x, 1.15, z);
      model.rotation.y = rng() * Math.PI * 2;
      group.add(model);
    }
  }
}

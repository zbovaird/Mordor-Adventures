import * as THREE from "three";
import { fitModel } from "./assets.js";

function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) {
    s += 2147483646;
  }
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function placeClearOfPath(x, z) {
  return Math.abs(x) > 2.2 || z < -1 || z > 22;
}

export function decorateWorld(game, assets) {
  const rand = seeded(42);
  const trees = [
    "tree_oak",
    "tree_oak_dark",
    "tree_detailed",
    "tree_tall",
    "tree_tall_dark",
    "tree_pineTallA_detailed",
    "tree_pineRoundC",
    "tree_simple",
    "tree_fat",
    "tree_default",
    "tree_thin",
    "tree_small",
  ];
  const bushes = ["plant_bush", "plant_bushDetailed", "plant_bushLarge", "plant_bushSmall", "plant_flatTall"];
  const flowers = [
    "flower_purpleA",
    "flower_purpleB",
    "flower_redA",
    "flower_redB",
    "flower_yellowA",
    "flower_yellowB",
  ];
  const grasses = ["grass", "grass_large", "grass_leafs", "grass_leafsLarge"];
  const rocks = ["rock_largeA", "rock_largeB", "rock_smallA", "rock_smallB", "rock_smallE", "rock_tallA"];
  const mushrooms = ["mushroom_red", "mushroom_redGroup", "mushroom_tan"];

  const addProp = (key, x, z, options = {}) => {
    if (!assets.has(key)) {
      return null;
    }
    const model = assets.clone(key);
    const height = options.height ?? 1;
    fitModel(model, height);
    model.position.set(x, 0, z);
    model.rotation.y = options.rotY ?? rand() * Math.PI * 2;
    if (options.uniformScale) {
      model.scale.multiplyScalar(options.uniformScale);
    }
    game.scene.add(model);

    if (options.collide) {
      const box = new THREE.Box3().setFromObject(model);
      const pad = options.pad ?? 0.05;
      game.colliders.push({
        minX: box.min.x - pad,
        maxX: box.max.x + pad,
        minY: box.min.y,
        maxY: box.max.y,
        minZ: box.min.z - pad,
        maxZ: box.max.z + pad,
        active: true,
      });
    }
    return model;
  };

  // Dense tree ring / forest pockets
  for (let i = 0; i < 85; i += 1) {
    const angle = rand() * Math.PI * 2;
    const radius = 12 + rand() * 14;
    const x = Math.cos(angle) * radius;
    const z = 6 + Math.sin(angle) * radius * 0.7;
    if (!placeClearOfPath(x, z) || Math.abs(x) > 22 || z < -8 || z > 26) {
      continue;
    }
    const key = trees[Math.floor(rand() * trees.length)];
    addProp(key, x, z, { height: 2.4 + rand() * 2.2, collide: true, pad: -0.15 });
  }

  // Extra trees near edges
  for (let i = 0; i < 45; i += 1) {
    const x = (rand() > 0.5 ? 1 : -1) * (14 + rand() * 7);
    const z = -2 + rand() * 24;
    const key = trees[Math.floor(rand() * trees.length)];
    addProp(key, x, z, { height: 2.2 + rand() * 1.8, collide: true, pad: -0.1 });
  }

  // Bushes
  for (let i = 0; i < 60; i += 1) {
    const x = -18 + rand() * 36;
    const z = -2 + rand() * 24;
    if (!placeClearOfPath(x, z)) {
      continue;
    }
    addProp(bushes[Math.floor(rand() * bushes.length)], x, z, {
      height: 0.6 + rand() * 0.7,
      collide: true,
      pad: -0.2,
    });
  }

  // Flowers + grass clumps
  for (let i = 0; i < 140; i += 1) {
    const x = -17 + rand() * 34;
    const z = rand() * 23;
    if (Math.abs(x) < 1.4 && z > 0 && z < 18) {
      continue;
    }
    addProp(flowers[Math.floor(rand() * flowers.length)], x, z, { height: 0.25 + rand() * 0.2 });
  }
  for (let i = 0; i < 180; i += 1) {
    const x = -18 + rand() * 36;
    const z = -1 + rand() * 24;
    if (Math.abs(x) < 1.6 && z > 0 && z < 18) {
      continue;
    }
    addProp(grasses[Math.floor(rand() * grasses.length)], x, z, { height: 0.35 + rand() * 0.35 });
  }

  // Rocks & mushrooms
  for (let i = 0; i < 28; i += 1) {
    const x = -16 + rand() * 32;
    const z = rand() * 22;
    if (!placeClearOfPath(x, z)) {
      continue;
    }
    addProp(rocks[Math.floor(rand() * rocks.length)], x, z, {
      height: 0.35 + rand() * 0.9,
      collide: true,
      pad: -0.05,
    });
  }
  for (let i = 0; i < 18; i += 1) {
    const x = -14 + rand() * 28;
    const z = 2 + rand() * 18;
    if (!placeClearOfPath(x, z)) {
      continue;
    }
    addProp(mushrooms[Math.floor(rand() * mushrooms.length)], x, z, { height: 0.25 + rand() * 0.25 });
  }

  // Path tiles toward hobbit hole
  for (let z = 15; z >= -1; z -= 1.05) {
    addProp("ground_pathStraight", 0, z, { height: 0.08, rotY: 0 });
  }
  addProp("ground_pathEnd", 0, -2.1, { height: 0.08, rotY: Math.PI });
  addProp("ground_pathRocks", -1.4, 8, { height: 0.1, rotY: 0.2 });
  addProp("ground_pathTile", 1.5, 11, { height: 0.08 });

  // Fence line near exit
  for (let x = -16; x <= 16; x += 2.2) {
    if (Math.abs(x) < 2.4) {
      continue;
    }
    addProp("fence_simple", x, 24.6, { height: 1.1, rotY: 0 });
  }
  addProp("fence_gate", 0, 24.6, { height: 1.35, rotY: 0 });
  for (let z = 8; z <= 22; z += 2.4) {
    addProp("fence_planks", -19.5, z, { height: 1.1, rotY: Math.PI / 2 });
    addProp("fence_planks", 19.5, z, { height: 1.1, rotY: Math.PI / 2 });
  }

  addProp("campfire_logs", 8.5, 12.5, { height: 0.55, collide: true });

  // Soft fill lights for denser look
  const fillA = new THREE.PointLight(0xffe0b0, 0.55, 18, 2);
  fillA.position.set(-8, 3.5, 10);
  const fillB = new THREE.PointLight(0xc8e6ff, 0.4, 16, 2);
  fillB.position.set(10, 3.2, 6);
  game.scene.add(fillA, fillB);
}

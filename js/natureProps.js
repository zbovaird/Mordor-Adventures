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

  // Dense instanced grass with wind sway — one draw call for the whole meadow
  const meadow = createWindGrass({
    count: 5200,
    color: 0x5f9a3e,
    tipColor: 0xa4c860,
    windStrength: 0.22,
    placer: () => {
      const x = -24 + rng() * 48;
      const z = -16 + rng() * 42;
      if (Math.abs(x) < 1.8 && z > 0 && z < 18) return null; // main path
      if (Math.abs(x) < 7 && z > -12 && z < -3) return null; // Bag End yard
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
  }
}

const KENNEY_SCATTER = [
  { keys: ["rock_largeA", "rock_largeB"], count: 6, height: 1.1, collide: 0.55 },
  { keys: ["rock_smallA", "rock_smallB", "rock_smallE", "stone_smallA", "stone_smallB"], count: 16, height: 0.42, collide: 0 },
  { keys: ["mushroom_red", "mushroom_redGroup", "mushroom_tan"], count: 12, height: 0.3, collide: 0 },
  { keys: ["flower_purpleA", "flower_redA", "flower_yellowA", "flower_purpleB", "flower_redB", "flower_yellowB"], count: 26, height: 0.36, collide: 0 },
  { keys: ["plant_bush", "plant_bushDetailed", "plant_bushLarge"], count: 10, height: 0.75, collide: 0.35 },
];

function scatterKenneyProps(game, rng) {
  const isBlocked = (x, z) =>
    (Math.abs(x) < 2.6 && z > -1 && z < 20) ||
    (Math.abs(x) < 8 && z > -13 && z < -2) ||
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

      const key = spec.keys[Math.floor(rng() * spec.keys.length)];
      if (!game.assets.has(key)) continue;
      const model = game.assets.clone(key);
      fitModel(model, spec.height * (0.8 + rng() * 0.5));
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

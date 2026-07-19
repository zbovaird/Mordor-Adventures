import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

const NATURE_FILES = [
  "tree_oak.glb",
  "tree_oak_dark.glb",
  "tree_detailed.glb",
  "tree_tall.glb",
  "tree_tall_dark.glb",
  "tree_pineTallA_detailed.glb",
  "tree_pineRoundC.glb",
  "tree_pineSmallB.glb",
  "tree_simple.glb",
  "tree_fat.glb",
  "tree_default.glb",
  "tree_thin.glb",
  "tree_small.glb",
  "grass.glb",
  "grass_large.glb",
  "grass_leafs.glb",
  "grass_leafsLarge.glb",
  "flower_purpleA.glb",
  "flower_purpleB.glb",
  "flower_redA.glb",
  "flower_redB.glb",
  "flower_yellowA.glb",
  "flower_yellowB.glb",
  "plant_bush.glb",
  "plant_bushDetailed.glb",
  "plant_bushLarge.glb",
  "plant_bushSmall.glb",
  "plant_flatTall.glb",
  "rock_largeA.glb",
  "rock_largeB.glb",
  "rock_smallA.glb",
  "rock_smallB.glb",
  "rock_smallE.glb",
  "rock_tallA.glb",
  "stone_smallA.glb",
  "stone_smallB.glb",
  "stone_smallFlatA.glb",
  "mushroom_red.glb",
  "mushroom_redGroup.glb",
  "mushroom_tan.glb",
  "fence_simple.glb",
  "fence_gate.glb",
  "fence_planks.glb",
  "ground_pathStraight.glb",
  "ground_pathEnd.glb",
  "ground_pathTile.glb",
  "ground_pathRocks.glb",
  "campfire_logs.glb",
];

function prepareModel(root, { castShadow = true, receiveShadow = true } = {}) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = castShadow;
      child.receiveShadow = receiveShadow;
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          material.envMapIntensity = material.envMapIntensity ?? 0.9;
          material.needsUpdate = true;
        });
      }
    }
  });
  return root;
}

export class AssetLibrary {
  constructor() {
    this.gltf = new GLTFLoader();
    this.rgbe = new RGBELoader();
    this.templates = new Map();
    this.envMap = null;
    this.onProgress = null;
  }

  async loadEnv() {
    if (this.onProgress) {
      this.onProgress(0.2);
    }
    this.envMap = await this.rgbe.loadAsync("assets/env/meadow.hdr");
    this.envMap.mapping = THREE.EquirectangularReflectionMapping;
    if (this.onProgress) {
      this.onProgress(1);
    }
    return this;
  }

  async loadAll() {
    return this.loadEnv();
  }

  clone(key) {
    const template = this.templates.get(key);
    if (!template) {
      throw new Error(`Missing asset template: ${key}`);
    }
    return prepareModel(template.clone(true));
  }

  has(key) {
    return this.templates.has(key);
  }

  pick(keys) {
    const available = keys.filter((key) => this.has(key));
    return available[Math.floor(Math.random() * available.length)];
  }
}

export function fitModel(object, targetHeight = 1) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  if (size.y < 0.001) {
    return object;
  }
  const scale = targetHeight / size.y;
  object.scale.multiplyScalar(scale);
  box.setFromObject(object);
  object.position.y -= box.min.y;
  return object;
}

import * as THREE from "three";

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

  // Soft grass tufts (simple crossed planes)
  const grassMat = new THREE.MeshStandardMaterial({
    map: tex.leavesMap,
    color: 0x6faa4f,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: 0.35,
  });
  for (let i = 0; i < 160; i += 1) {
    const x = -18 + rng() * 36;
    const z = -1 + rng() * 24;
    if (Math.abs(x) < 1.8 && z > 0 && z < 18) {
      continue;
    }
    const tuft = new THREE.Group();
    for (let p = 0; p < 2; p += 1) {
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.45), grassMat);
      blade.rotation.y = p * Math.PI / 2;
      blade.position.y = 0.22;
      blade.castShadow = true;
      tuft.add(blade);
    }
    tuft.position.set(x, 0, z);
    tuft.rotation.y = rng() * Math.PI;
    game.scene.add(tuft);
  }
}

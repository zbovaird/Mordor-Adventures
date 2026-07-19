import * as THREE from "three";
import { Water } from "three/addons/objects/Water.js";

let normalsTexture = null;

export function loadWaterNormals() {
  if (normalsTexture) return normalsTexture;
  normalsTexture = new THREE.TextureLoader().load("assets/textures/waternormals.jpg", (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  });
  return normalsTexture;
}

/**
 * Real planar-reflection water (three.js Water addon). Use sparingly — each
 * surface costs an extra render pass. Geometry should be flat (XY plane);
 * caller rotates/positions it like any mesh.
 */
export function createReflectiveWater(geometry, {
  sunDirection = new THREE.Vector3(0.4, 0.9, 0.2),
  sunColor = 0xffffff,
  waterColor = 0x2e6f5e,
  distortionScale = 1.6,
  size = 3,
  alpha = 1,
} = {}) {
  const water = new Water(geometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: loadWaterNormals(),
    sunDirection: sunDirection.clone().normalize(),
    sunColor,
    waterColor,
    distortionScale,
    fog: true,
    alpha,
  });
  water.material.uniforms.size.value = size;
  water.material.transparent = alpha < 1;
  return water;
}

/**
 * Cheap flowing water for waterfall sheets and streams: a standard material
 * with scrolling normal/color maps. No reflection pass, so use freely.
 */
export function createFlowingWaterMaterial({
  color = 0x9ad8ff,
  opacity = 0.75,
  flowSpeed = 0.55,
  repeat = [1, 2],
} = {}) {
  // Each surface needs its own texture instance so offsets/repeats differ
  // (cloning a still-loading texture would stay blank forever).
  const normalMap = new THREE.TextureLoader().load("assets/textures/waternormals.jpg");
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(repeat[0], repeat[1]);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.12,
    metalness: 0.3,
    transparent: true,
    opacity,
    normalMap,
    normalScale: new THREE.Vector2(0.9, 0.9),
    envMapIntensity: 1.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  material.userData.flow = { speed: flowSpeed, map: normalMap };
  return material;
}

export function updateWaterSurfaces(surfaces, delta) {
  for (const surface of surfaces) {
    if (surface.isWater) {
      surface.material.uniforms.time.value += delta * 0.7;
    } else if (surface.material?.userData?.flow) {
      surface.material.userData.flow.map.offset.y -= surface.material.userData.flow.speed * delta;
    }
  }
}

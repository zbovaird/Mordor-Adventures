import * as THREE from "three";

/**
 * GPU-instanced grass with per-blade wind sway injected into the standard
 * material, so it still receives scene lighting/shadows. One draw call for
 * thousands of blades.
 */
export function createWindGrass({
  count = 3000,
  placer,
  bladeWidth = 0.09,
  bladeHeight = 0.55,
  color = 0x5f9a3e,
  tipColor = 0x9cc25e,
  windStrength = 0.24,
} = {}) {
  const geometry = new THREE.PlaneGeometry(bladeWidth, bladeHeight, 1, 3);
  geometry.translate(0, bladeHeight / 2, 0);

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.88,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.3,
  });

  const uniforms = { uTime: { value: 0 }, uWind: { value: windStrength } };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uWind = uniforms.uWind;
    shader.vertexShader = `
      uniform float uTime;
      uniform float uWind;
      attribute float aPhase;
      varying float vHeight;
      ${shader.vertexShader}
    `.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vHeight = position.y / ${bladeHeight.toFixed(3)};
      float bendFactor = vHeight * vHeight;
      float sway = sin(uTime * 1.6 + aPhase) + sin(uTime * 2.7 + aPhase * 1.7) * 0.5;
      transformed.x += sway * uWind * bendFactor;
      transformed.z += cos(uTime * 1.3 + aPhase) * uWind * 0.6 * bendFactor;
      `
    );
    shader.fragmentShader = `
      varying float vHeight;
      ${shader.fragmentShader}
    `.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${new THREE.Color(tipColor).toArray().map((v) => v.toFixed(3)).join(",")}), vHeight * 0.55);
      `
    );
  };

  const instanced = new THREE.InstancedMesh(geometry, material, count);
  instanced.castShadow = false;
  instanced.receiveShadow = true;

  const phases = new Float32Array(count);
  const dummy = new THREE.Object3D();
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < count * 6) {
    attempts += 1;
    const spot = placer();
    if (!spot) continue;
    dummy.position.set(spot.x, spot.y ?? 0, spot.z);
    dummy.rotation.y = Math.random() * Math.PI;
    const s = 0.6 + Math.random() * 0.85;
    dummy.scale.set(s, s * (0.75 + Math.random() * 0.5), s);
    dummy.updateMatrix();
    instanced.setMatrixAt(placed, dummy.matrix);
    phases[placed] = Math.random() * Math.PI * 2;
    placed += 1;
  }
  instanced.count = placed;
  geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
  instanced.userData.windUniforms = uniforms;
  return instanced;
}

/**
 * Slow-drifting particle field rendered as THREE.Points — dust motes in Moria
 * torchlight, or golden mallorn leaves falling through Lothlórien.
 */
export function createDriftField({
  count = 260,
  bounds,
  color = 0xd8cba0,
  size = 0.09,
  opacity = 0.55,
  fallSpeed = 0.12,
  driftSpeed = 0.25,
} = {}) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
    positions[i * 3 + 1] = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
    positions[i * 3 + 2] = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
    seeds[i] = Math.random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.userData.drift = { bounds, seeds, fallSpeed, driftSpeed };
  return points;
}

export function updateDriftField(points, delta, time) {
  const { bounds, seeds, fallSpeed, driftSpeed } = points.userData.drift;
  const positions = points.geometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    let y = positions.getY(i) - fallSpeed * delta * (0.6 + Math.sin(seeds[i]) * 0.4);
    let x = positions.getX(i) + Math.sin(time * 0.7 + seeds[i]) * driftSpeed * delta;
    let z = positions.getZ(i) + Math.cos(time * 0.55 + seeds[i] * 1.3) * driftSpeed * delta;
    if (y < bounds.minY) {
      y = bounds.maxY;
      x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      z = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
    }
    positions.setXYZ(i, x, y, z);
  }
  positions.needsUpdate = true;
}

/**
 * Volumetric-looking light shaft: an additive cone that fades toward the
 * bottom. Cheap trick used for Moria's high windows.
 */
export function createLightShaft({ radiusTop = 0.6, radiusBottom = 3.2, height = 20, color = 0xbfd4ff, opacity = 0.05 }) {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 16, 4, true);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying float vY;
      void main() {
        vY = (position.y / ${height.toFixed(1)}) + 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vY;
      void main() {
        gl_FragColor = vec4(uColor, uOpacity * vY * vY);
      }
    `,
  });
  const shaft = new THREE.Mesh(geometry, material);
  shaft.frustumCulled = false;
  return shaft;
}

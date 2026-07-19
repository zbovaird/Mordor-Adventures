import * as THREE from "three";

export function makeNoiseTexture(size = 256, options = {}) {
  const {
    base = [90, 140, 70],
    variance = 35,
    scale = 1,
    dirt = [110, 90, 55],
    dirtChance = 0.12,
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(size, size);
  const data = image.data;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const n =
        (Math.sin(x * 0.11 * scale) * Math.cos(y * 0.09 * scale) +
          Math.sin((x + y) * 0.07 * scale) * 0.5 +
          Math.random()) *
        0.35;
      const useDirt = Math.random() < dirtChance;
      const src = useDirt ? dirt : base;
      data[i] = Math.min(255, Math.max(0, src[0] + n * variance));
      data[i + 1] = Math.min(255, Math.max(0, src[1] + n * variance));
      data[i + 2] = Math.min(255, Math.max(0, src[2] + n * variance * 0.8));
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function makeWoodTexture(size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(size, size);
  const data = image.data;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const grain = Math.sin(x * 0.35 + Math.sin(y * 0.05) * 2) * 18;
      data[i] = 120 + grain;
      data[i + 1] = 78 + grain * 0.7;
      data[i + 2] = 42 + grain * 0.4;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createSkyDome() {
  const geometry = new THREE.SphereGeometry(80, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x5eb7ff) },
      midColor: { value: new THREE.Color(0xb8e2ff) },
      bottomColor: { value: new THREE.Color(0xe8f4d8) },
      offset: { value: 0.12 },
      exponent: { value: 0.7 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        float t = max(pow(max(h, 0.0), exponent), 0.0);
        vec3 color = mix(bottomColor, midColor, smoothstep(-0.15, 0.25, h));
        color = mix(color, topColor, t);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geometry, material);
}

export function createEnvMap(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.add(new THREE.HemisphereLight(0xb1e1ff, 0x6a8f4e, 1.0));
  const sun = new THREE.DirectionalLight(0xfff1c8, 1.4);
  sun.position.set(5, 10, 3);
  envScene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.SphereGeometry(8, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshBasicMaterial({ color: 0x6faa4f })
  );
  ground.rotation.x = Math.PI;
  envScene.add(ground);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(10, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x87c8ff, side: THREE.BackSide })
  );
  envScene.add(sky);

  const envMap = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  envScene.clear();
  return envMap;
}

export function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.75,
    metalness: options.metalness ?? 0.05,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 1,
    map: options.map ?? null,
    envMapIntensity: options.envMapIntensity ?? 0.85,
    flatShading: options.flatShading ?? false,
  });
}

export function mesh(geometry, material, cast = true, receive = true) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

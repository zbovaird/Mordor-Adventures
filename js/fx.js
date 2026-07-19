import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 0.42 },
    softness: { value: 0.62 },
    damage: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float strength;
    uniform float softness;
    uniform float damage;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float dist = distance(vUv, vec2(0.5));
      float vig = smoothstep(0.8, 0.8 - softness, dist * (1.0 + strength));
      color.rgb *= mix(0.72, 1.0, vig);
      // Red damage pulse creeping in from the edges
      float edge = smoothstep(0.32, 0.72, dist);
      color.rgb = mix(color.rgb, vec3(0.55, 0.02, 0.02), edge * damage);
      gl_FragColor = color;
    }
  `,
};

export class FxPipeline {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.38, 0.5, 0.86);
    this.composer.addPass(this.bloomPass);

    this.vignettePass = new ShaderPass(VignetteShader);
    this.composer.addPass(this.vignettePass);

    this.composer.addPass(new OutputPass());

    this.fxaaPass = new ShaderPass(FXAAShader);
    this.composer.addPass(this.fxaaPass);

    // Screen shake state: trauma decays over time, shake = trauma^2
    this.trauma = 0;
    this.shakeOffset = new THREE.Vector3();
    this.shakeRoll = 0;
    this.damageFlash = 0;
    this.lowHealthLevel = 0;
  }

  setSize(width, height, pixelRatio) {
    this.composer.setSize(width, height);
    this.fxaaPass.material.uniforms.resolution.value.set(
      1 / (width * pixelRatio),
      1 / (height * pixelRatio)
    );
  }

  setBloom(strength, radius = 0.5, threshold = 0.86) {
    this.bloomPass.strength = strength;
    this.bloomPass.radius = radius;
    this.bloomPass.threshold = threshold;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  flashDamage(amount = 0.85) {
    this.damageFlash = Math.min(1, amount);
  }

  setLowHealth(level) {
    this.lowHealthLevel = THREE.MathUtils.clamp(level, 0, 1);
  }

  update(delta, time) {
    this.trauma = Math.max(0, this.trauma - delta * 1.7);
    const shake = this.trauma * this.trauma;
    if (shake > 0.0001) {
      this.shakeOffset.set(
        (Math.sin(time * 47.3) + Math.sin(time * 23.1)) * 0.055 * shake,
        (Math.sin(time * 51.7) + Math.sin(time * 29.3)) * 0.045 * shake,
        0
      );
      this.shakeRoll = Math.sin(time * 39.7) * 0.02 * shake;
    } else {
      this.shakeOffset.set(0, 0, 0);
      this.shakeRoll = 0;
    }

    this.damageFlash = Math.max(0, this.damageFlash - delta * 2.4);
    const damageAmount = Math.max(
      this.damageFlash * 0.8,
      this.lowHealthLevel * (0.3 + Math.sin(time * 2.6) * 0.1)
    );
    this.vignettePass.uniforms.damage.value = damageAmount;
  }

  render() {
    this.composer.render();
  }
}

/**
 * Fading ribbon that follows the sword tip during a swing.
 */
export class SwordTrail {
  constructor(scene, maxPoints = 24) {
    this.scene = scene;
    this.maxPoints = maxPoints;
    this.points = [];
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(maxPoints * 2 * 3);
    this.alphas = new Float32Array(maxPoints * 2);
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("alpha", new THREE.BufferAttribute(this.alphas, 1));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { color: { value: new THREE.Color(0xcfe4ff) } },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(color, vAlpha * 0.55);
        }
      `,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  push(base, tip) {
    this.points.push({ base: base.clone(), tip: tip.clone(), life: 1 });
    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }
  }

  clear() {
    this.points.length = 0;
    this.mesh.visible = false;
  }

  update(delta) {
    if (!this.points.length) {
      this.mesh.visible = false;
      return;
    }
    for (const point of this.points) {
      point.life -= delta * 4.2;
    }
    this.points = this.points.filter((point) => point.life > 0);
    if (this.points.length < 2) {
      this.mesh.visible = false;
      return;
    }

    const count = this.points.length;
    for (let i = 0; i < this.maxPoints; i += 1) {
      const point = this.points[Math.min(i, count - 1)];
      const o = i * 6;
      this.positions[o] = point.base.x;
      this.positions[o + 1] = point.base.y;
      this.positions[o + 2] = point.base.z;
      this.positions[o + 3] = point.tip.x;
      this.positions[o + 4] = point.tip.y;
      this.positions[o + 5] = point.tip.z;
      this.alphas[i * 2] = point.life * 0.4;
      this.alphas[i * 2 + 1] = point.life;
    }

    // Triangle strip built as indexed triangles across the quad ladder
    if (!this.geometry.index) {
      const indices = [];
      for (let i = 0; i < this.maxPoints - 1; i += 1) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      this.geometry.setIndex(indices);
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.alpha.needsUpdate = true;
    this.geometry.computeBoundingSphere();
    this.mesh.visible = true;
  }
}

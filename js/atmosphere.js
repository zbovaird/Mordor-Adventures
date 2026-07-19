import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";

/**
 * Physically-based sky (three.js Sky addon) with per-level atmosphere presets:
 * sun position, turbidity, fog, exposure, and light tuning in one place.
 */
const PRESETS = {
  shire: {
    sky: true,
    elevation: 32,
    azimuth: 145,
    turbidity: 6,
    rayleigh: 1.6,
    mieCoefficient: 0.006,
    mieDirectionalG: 0.75,
    fog: { color: 0xcfe3c2, density: 0.011 },
    exposure: 0.62,
    sunIntensity: 2.6,
    sunColor: 0xfff1d6,
    hemi: 0.75,
  },
  rivendell: {
    sky: true,
    elevation: 18,
    azimuth: 210,
    turbidity: 8,
    rayleigh: 2.4,
    mieCoefficient: 0.008,
    mieDirectionalG: 0.8,
    fog: { color: 0xc3d6cf, density: 0.008 },
    exposure: 0.52,
    sunIntensity: 1.7,
    sunColor: 0xffe6c4,
    hemi: 0.55,
  },
  moria: {
    sky: false,
    background: 0x07080a,
    fog: { color: 0x0e1114, density: 0.02 },
    exposure: 0.72,
    sunIntensity: 0.16,
    sunColor: 0x8898b8,
    hemi: 0.12,
  },
  lothlorien: {
    sky: true,
    elevation: 20,
    azimuth: 60,
    turbidity: 4,
    rayleigh: 2.2,
    mieCoefficient: 0.008,
    mieDirectionalG: 0.8,
    fog: { color: 0xc8d3a0, density: 0.0055 },
    exposure: 0.52,
    sunIntensity: 1.9,
    sunColor: 0xffe9b0,
    hemi: 0.5,
  },
};

export class Atmosphere {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.sky = new Sky();
    // Must fit inside the camera far plane; follow() re-centres it each frame.
    this.sky.scale.setScalar(430);
    this.sky.visible = false;
    scene.add(this.sky);
    this.sunDirection = new THREE.Vector3(0, 1, 0);
  }

  follow(camera) {
    if (this.sky.visible) {
      this.sky.position.copy(camera.position);
    }
  }

  apply(levelId, { sun, hemi } = {}) {
    const preset = PRESETS[levelId] || PRESETS.shire;

    if (preset.sky) {
      this.sky.visible = true;
      const uniforms = this.sky.material.uniforms;
      uniforms.turbidity.value = preset.turbidity;
      uniforms.rayleigh.value = preset.rayleigh;
      uniforms.mieCoefficient.value = preset.mieCoefficient;
      uniforms.mieDirectionalG.value = preset.mieDirectionalG;

      const phi = THREE.MathUtils.degToRad(90 - preset.elevation);
      const theta = THREE.MathUtils.degToRad(preset.azimuth);
      this.sunDirection.setFromSphericalCoords(1, phi, theta);
      uniforms.sunPosition.value.copy(this.sunDirection);
      this.scene.background = null;
    } else {
      this.sky.visible = false;
      this.scene.background = new THREE.Color(preset.background ?? 0x000000);
      this.sunDirection.set(0.2, 1, 0.3).normalize();
    }

    this.scene.fog = new THREE.FogExp2(preset.fog.color, preset.fog.density);
    this.renderer.toneMappingExposure = preset.exposure;

    if (sun) {
      sun.intensity = preset.sunIntensity;
      sun.color.setHex(preset.sunColor);
      sun.position.copy(this.sunDirection).multiplyScalar(60);
    }
    if (hemi) {
      hemi.intensity = preset.hemi;
    }
    return preset;
  }
}

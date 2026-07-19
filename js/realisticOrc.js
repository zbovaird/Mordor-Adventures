import * as THREE from "three";

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.7,
    metalness: opts.metalness ?? 0.05,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    envMapIntensity: opts.envMapIntensity ?? 0.75,
  });
}

function mesh(geometry, material) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Kid-friendly but more realistic orc (not blocky Roblox style). */
export function createRealisticOrc() {
  const root = new THREE.Group();
  const model = new THREE.Group();

  const skin = mat(0x5a8f4a, { roughness: 0.68, envMapIntensity: 0.55 });
  const darkSkin = mat(0x3f6b3a, { roughness: 0.75 });
  const leather = mat(0x3e2723, { roughness: 0.85 });
  const iron = mat(0x6d7278, { roughness: 0.4, metalness: 0.75, envMapIntensity: 1.2 });

  const pelvis = mesh(new THREE.CapsuleGeometry(0.22, 0.12, 6, 14), leather);
  pelvis.position.y = 0.55;

  const torso = mesh(new THREE.CapsuleGeometry(0.3, 0.35, 8, 16), skin);
  torso.position.y = 0.95;

  const chestPlate = mesh(new THREE.BoxGeometry(0.55, 0.32, 0.42), iron);
  chestPlate.position.y = 1.05;

  const head = mesh(new THREE.SphereGeometry(0.24, 18, 18), skin);
  head.position.y = 1.48;
  head.scale.set(1.05, 1.1, 0.95);

  const brow = mesh(new THREE.CapsuleGeometry(0.16, 0.04, 4, 10), darkSkin);
  brow.rotation.z = Math.PI / 2;
  brow.position.set(0, 1.58, 0.16);

  const eyeGeo = new THREE.SphereGeometry(0.045, 10, 10);
  const eyeMat = mat(0xff1744, { roughness: 0.25, metalness: 0.2, emissive: 0x551100, emissiveIntensity: 0.55 });
  const eyeL = mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.09, 1.5, 0.2);
  const eyeR = mesh(eyeGeo, eyeMat.clone());
  eyeR.position.set(0.09, 1.5, 0.2);

  const tuskMat = mat(0xf5f0e6, { roughness: 0.35, metalness: 0.1 });
  const tuskL = mesh(new THREE.ConeGeometry(0.03, 0.14, 8), tuskMat);
  tuskL.position.set(-0.08, 1.34, 0.22);
  tuskL.rotation.x = Math.PI;
  const tuskR = tuskL.clone();
  tuskR.position.x = 0.08;

  const legL = mesh(new THREE.CapsuleGeometry(0.1, 0.28, 6, 12), darkSkin);
  legL.position.set(-0.14, 0.28, 0);
  const legR = legL.clone();
  legR.position.x = 0.14;

  const bootL = mesh(new THREE.CapsuleGeometry(0.09, 0.12, 4, 10), leather);
  bootL.rotation.x = Math.PI / 2;
  bootL.position.set(-0.14, 0.08, 0.06);
  const bootR = bootL.clone();
  bootR.position.x = 0.14;

  const armL = mesh(new THREE.CapsuleGeometry(0.08, 0.32, 6, 12), skin);
  armL.position.set(-0.42, 1.0, 0);
  const armR = armL.clone();
  armR.position.x = 0.42;

  const club = new THREE.Group();
  club.position.set(0.52, 0.75, 0.1);
  const handle = mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 10), leather);
  handle.rotation.z = -0.65;
  const headClub = mesh(new THREE.SphereGeometry(0.16, 12, 12), mat(0x5d4037, { roughness: 0.9 }));
  headClub.position.set(0.28, -0.22, 0);
  club.add(handle, headClub);

  model.add(
    pelvis, torso, chestPlate, head, brow, eyeL, eyeR, tuskL, tuskR,
    legL, legR, bootL, bootR, armL, armR, club
  );

  // Feet on ground, ~1.55 tall
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = 1.55 / size.y;
  model.scale.setScalar(scale);
  box.setFromObject(model);
  model.position.y -= box.min.y;

  root.add(model);
  root.position.set(-7, 0, 9);

  return {
    root,
    model,
    patrolA: new THREE.Vector3(-7, 0, 9),
    patrolB: new THREE.Vector3(7, 0, 9),
    target: new THREE.Vector3(7, 0, 9),
    speed: 2.2,
    stunned: false,
    stunTimer: 0,
    fleeTimer: 0,
    wobble: 0,
  };
}

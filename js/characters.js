import * as THREE from "three";
import { mat, mesh } from "./materials.js";

function skin(color = 0xe8b896) {
  return mat(color, { roughness: 0.58, metalness: 0.04, envMapIntensity: 0.65 });
}

function cloth(color, roughness = 0.82) {
  return mat(color, { roughness, metalness: 0.0, envMapIntensity: 0.45 });
}

export function createSword() {
  const sword = new THREE.Group();

  const grip = mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 0.22, 12),
    mat(0x3e2723, { roughness: 0.65, metalness: 0.2 })
  );
  grip.position.y = -0.02;

  const wrap = mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.1, 12),
    mat(0x5d4037, { roughness: 0.8, metalness: 0.1 })
  );
  wrap.position.y = -0.02;

  const guard = mesh(
    new THREE.BoxGeometry(0.28, 0.04, 0.06),
    mat(0xc9a227, { roughness: 0.28, metalness: 0.9, envMapIntensity: 1.5 })
  );
  guard.position.y = 0.1;

  const blade = mesh(
    new THREE.BoxGeometry(0.055, 0.85, 0.016),
    mat(0xe8eef5, { roughness: 0.18, metalness: 0.98, envMapIntensity: 1.8 })
  );
  blade.position.y = 0.54;

  const fuller = mesh(
    new THREE.BoxGeometry(0.012, 0.7, 0.018),
    mat(0xb0bec5, { roughness: 0.25, metalness: 0.95, envMapIntensity: 1.4 })
  );
  fuller.position.y = 0.5;

  const tip = mesh(
    new THREE.ConeGeometry(0.034, 0.12, 8),
    mat(0xe8eef5, { roughness: 0.16, metalness: 0.98, envMapIntensity: 1.8 })
  );
  tip.position.y = 1.0;

  const pommel = mesh(
    new THREE.SphereGeometry(0.045, 12, 12),
    mat(0xc9a227, { roughness: 0.3, metalness: 0.9, envMapIntensity: 1.4 })
  );
  pommel.position.y = -0.15;

  sword.add(grip, wrap, guard, blade, fuller, tip, pommel);
  sword.scale.setScalar(0.85);
  return sword;
}

export function createFrodoModel() {
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.48;

  const legL = new THREE.Group();
  legL.position.set(-0.12, 0.5, 0);
  const thighL = mesh(new THREE.CapsuleGeometry(0.08, 0.16, 4, 10), cloth(0x4a311c, 0.88));
  thighL.position.y = -0.14;
  const shinL = mesh(new THREE.CapsuleGeometry(0.07, 0.14, 4, 10), cloth(0x3d2817, 0.9));
  shinL.position.y = -0.38;
  const footL = mesh(new THREE.CapsuleGeometry(0.06, 0.1, 4, 10), skin(0xd4a574));
  footL.rotation.x = Math.PI / 2;
  footL.position.set(0, -0.5, 0.08);
  legL.add(thighL, shinL, footL);

  const legR = legL.clone();
  legR.position.x = 0.12;

  const torso = mesh(new THREE.CapsuleGeometry(0.22, 0.26, 6, 14), cloth(0x6b4226, 0.78));
  torso.position.y = 0.2;
  const vest = mesh(new THREE.CapsuleGeometry(0.24, 0.1, 4, 14), cloth(0x2f6b3f, 0.85));
  vest.position.y = 0.28;
  const belt = mesh(
    new THREE.TorusGeometry(0.22, 0.035, 8, 20),
    mat(0x5d4037, { roughness: 0.7, metalness: 0.2 })
  );
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.02;
  const cloak = mesh(
    new THREE.ConeGeometry(0.38, 0.62, 14, 1, true),
    cloth(0x8b6914, 0.9)
  );
  cloak.position.set(0, 0.02, -0.05);
  cloak.rotation.x = 0.18;

  const head = mesh(new THREE.SphereGeometry(0.19, 20, 20), skin());
  head.position.y = 0.58;
  const hair = mesh(
    new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    cloth(0x5a3a1e, 0.92)
  );
  hair.position.y = 0.66;
  const earL = mesh(new THREE.SphereGeometry(0.05, 10, 10), skin());
  earL.scale.set(0.65, 1.35, 0.45);
  earL.position.set(-0.19, 0.58, 0);
  const earR = earL.clone();
  earR.position.x = 0.19;

  const shoulderL = new THREE.Group();
  shoulderL.position.set(-0.28, 0.36, 0);
  const armL = mesh(new THREE.CapsuleGeometry(0.06, 0.26, 4, 10), skin());
  armL.position.y = -0.18;
  shoulderL.add(armL);

  const shoulderR = new THREE.Group();
  shoulderR.position.set(0.28, 0.36, 0);
  shoulderR.rotation.set(0.15, 0, -0.15);
  const armR = mesh(new THREE.CapsuleGeometry(0.06, 0.26, 4, 10), skin());
  armR.position.y = -0.18;
  const handR = new THREE.Group();
  handR.position.set(0.02, -0.34, 0.04);
  const sword = createSword();
  sword.rotation.set(-0.35, 0.1, 0.35);
  sword.position.set(0.04, -0.02, 0.06);
  handR.add(sword);
  shoulderR.add(armR, handR);

  hips.add(torso, vest, belt, cloak, head, hair, earL, earR, shoulderL, shoulderR);
  root.add(hips, legL, legR);
  root.position.set(0, 0, 16);

  return {
    root,
    hips,
    legL,
    legR,
    shoulderL,
    shoulderR,
    armL,
    armR,
    handR,
    sword,
    head,
  };
}

export function createOrcModel() {
  const root = new THREE.Group();

  const legL = mesh(new THREE.CapsuleGeometry(0.11, 0.32, 4, 10), mat(0x3f6b3a, { roughness: 0.8 }));
  legL.position.set(-0.17, 0.3, 0);
  const legR = legL.clone();
  legR.position.x = 0.17;

  const body = mesh(new THREE.CapsuleGeometry(0.34, 0.42, 6, 14), mat(0x4caf50, { roughness: 0.72 }));
  body.position.y = 0.9;
  const armor = mesh(
    new THREE.BoxGeometry(0.72, 0.38, 0.58),
    mat(0x2e4a24, { roughness: 0.45, metalness: 0.45, envMapIntensity: 1.1 })
  );
  armor.position.y = 1.0;

  const head = mesh(new THREE.SphereGeometry(0.28, 18, 18), mat(0x66bb6a, { roughness: 0.65 }));
  head.position.y = 1.52;
  head.scale.set(1, 1.08, 0.95);

  const brow = mesh(new THREE.BoxGeometry(0.4, 0.09, 0.14), mat(0x2e4a24, { roughness: 0.85 }));
  brow.position.set(0, 1.62, 0.2);

  const eyeL = mesh(
    new THREE.SphereGeometry(0.05, 10, 10),
    mat(0xff1744, { roughness: 0.25, metalness: 0.25, emissive: 0x661100, emissiveIntensity: 0.7 })
  );
  eyeL.position.set(-0.1, 1.52, 0.24);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;

  const tuskL = mesh(new THREE.ConeGeometry(0.035, 0.16, 8), mat(0xf5f5f5, { roughness: 0.35, metalness: 0.1 }));
  tuskL.position.set(-0.09, 1.34, 0.26);
  tuskL.rotation.x = Math.PI;
  const tuskR = tuskL.clone();
  tuskR.position.x = 0.09;

  const armL = mesh(new THREE.CapsuleGeometry(0.09, 0.38, 4, 10), mat(0x4caf50, { roughness: 0.75 }));
  armL.position.set(-0.48, 0.95, 0);
  const armR = armL.clone();
  armR.position.x = 0.48;

  const club = new THREE.Group();
  club.position.set(0.58, 0.72, 0.12);
  const handle = mesh(
    new THREE.CylinderGeometry(0.045, 0.055, 0.75, 10),
    mat(0x5d4037, { roughness: 0.85 })
  );
  handle.rotation.z = -0.7;
  const headClub = mesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    mat(0x6d4c41, { roughness: 0.9 })
  );
  headClub.position.set(0.3, -0.24, 0);
  club.add(handle, headClub);

  root.add(legL, legR, body, armor, head, brow, eyeL, eyeR, tuskL, tuskR, armL, armR, club);
  root.position.set(-7, 0, 9);

  return { root, armL, armR, club };
}

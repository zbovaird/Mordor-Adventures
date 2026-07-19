import * as THREE from "three";

function skinMat(color = 0xe8b896, roughness = 0.55) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.04,
    envMapIntensity: 0.7,
  });
  return m;
}

function clothMat(color, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.0,
    envMapIntensity: 0.45,
  });
}

function metalMat(color, roughness = 0.25, metalness = 0.92) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    envMapIntensity: 1.6,
  });
}

function m(geometry, material) {
  const obj = new THREE.Mesh(geometry, material);
  obj.castShadow = true;
  obj.receiveShadow = true;
  return obj;
}

function buildSword() {
  const group = new THREE.Group();

  const grip = m(
    new THREE.CylinderGeometry(0.025, 0.032, 0.18, 12),
    new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.65, metalness: 0.2 })
  );
  grip.position.y = -0.02;

  const wrap = m(
    new THREE.CylinderGeometry(0.028, 0.028, 0.08, 12),
    new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8, metalness: 0.1 })
  );
  wrap.position.y = -0.02;

  const guard = m(
    new THREE.BoxGeometry(0.22, 0.035, 0.05),
    metalMat(0xc9a227, 0.28, 0.9)
  );
  guard.position.y = 0.08;

  const blade = m(
    new THREE.BoxGeometry(0.042, 0.7, 0.013),
    metalMat(0xe8eef5, 0.15, 0.98)
  );
  blade.position.y = 0.45;

  const tip = m(
    new THREE.ConeGeometry(0.026, 0.1, 8),
    metalMat(0xe8eef5, 0.14, 0.98)
  );
  tip.position.y = 0.84;

  const pommel = m(
    new THREE.SphereGeometry(0.035, 12, 12),
    metalMat(0xc9a227, 0.3, 0.9)
  );
  pommel.position.y = -0.12;

  group.add(grip, wrap, guard, blade, tip, pommel);
  group.scale.setScalar(0.8);
  return group;
}

function addHairCurls(parent, headRadius, yBase) {
  const curlMat = clothMat(0x5a3a1e, 0.92);
  const positions = [];

  for (let ring = 0; ring < 3; ring++) {
    const y = yBase + ring * 0.04;
    const r = headRadius + 0.01 - ring * 0.015;
    const count = ring === 0 ? 10 : ring === 1 ? 8 : 6;
    const startAngle = -Math.PI * 0.75;
    const endAngle = Math.PI * 0.75;
    for (let i = 0; i < count; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / (count - 1));
      positions.push({
        x: Math.sin(angle) * r,
        y,
        z: Math.cos(angle) * r * 0.85,
        size: 0.035 + Math.random() * 0.015,
      });
    }
  }

  for (const p of positions) {
    const curl = m(new THREE.SphereGeometry(p.size, 8, 8), curlMat);
    curl.position.set(p.x, p.y, p.z);
    parent.add(curl);
  }
}

export function createRealisticFrodo() {
  const root = new THREE.Group();
  const model = new THREE.Group();

  const SKIN = 0xe8b896;
  const SKIN_DARK = 0xd4a574;
  const VEST_GREEN = 0x3d6b3f;
  const JACKET_BROWN = 0x6b4226;
  const TROUSER_BROWN = 0x4a311c;
  const BELT_BROWN = 0x5d4037;
  const CLOAK_BROWN = 0x8b6914;

  // --- Hips pivot ---
  const hips = new THREE.Group();
  hips.position.y = 0.38;

  // --- Legs ---
  const legL = new THREE.Group();
  legL.position.set(-0.1, 0.4, 0);

  const thighL = m(
    new THREE.CapsuleGeometry(0.065, 0.14, 6, 14),
    clothMat(TROUSER_BROWN, 0.88)
  );
  thighL.position.y = -0.11;

  const shinL = m(
    new THREE.CapsuleGeometry(0.055, 0.12, 6, 14),
    clothMat(0x3d2817, 0.9)
  );
  shinL.position.y = -0.3;

  const footL = m(
    new THREE.CapsuleGeometry(0.055, 0.1, 6, 12),
    skinMat(SKIN_DARK)
  );
  footL.rotation.x = Math.PI / 2.2;
  footL.position.set(0, -0.42, 0.06);

  const toeL = m(
    new THREE.SphereGeometry(0.052, 10, 10),
    skinMat(SKIN_DARK)
  );
  toeL.scale.set(1.2, 0.7, 1.4);
  toeL.position.set(0, -0.44, 0.12);

  legL.add(thighL, shinL, footL, toeL);

  const legR = legL.clone();
  legR.position.x = 0.1;

  // --- Torso ---
  const torso = m(
    new THREE.CapsuleGeometry(0.17, 0.22, 8, 16),
    clothMat(JACKET_BROWN, 0.78)
  );
  torso.position.y = 0.16;

  const vest = m(
    new THREE.CapsuleGeometry(0.185, 0.1, 6, 16),
    clothMat(VEST_GREEN, 0.82)
  );
  vest.position.y = 0.22;

  const vestButtons = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const btn = m(
      new THREE.SphereGeometry(0.012, 8, 8),
      metalMat(0xc9a227, 0.4, 0.7)
    );
    btn.position.set(0, 0.14 + i * 0.06, 0.17);
    vestButtons.add(btn);
  }

  const belt = m(
    new THREE.TorusGeometry(0.175, 0.025, 8, 20),
    new THREE.MeshStandardMaterial({ color: BELT_BROWN, roughness: 0.7, metalness: 0.2 })
  );
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.02;

  const buckle = m(
    new THREE.BoxGeometry(0.05, 0.04, 0.03),
    metalMat(0xc9a227, 0.3, 0.85)
  );
  buckle.position.set(0, 0.02, 0.175);

  const cloak = m(
    new THREE.ConeGeometry(0.3, 0.5, 16, 1, true),
    clothMat(CLOAK_BROWN, 0.9)
  );
  cloak.position.set(0, 0.0, -0.04);
  cloak.rotation.x = 0.15;

  // --- Head ---
  const head = m(
    new THREE.SphereGeometry(0.15, 20, 20),
    skinMat(SKIN)
  );
  head.position.y = 0.48;

  const noseGeo = new THREE.SphereGeometry(0.03, 10, 10);
  const nose = m(noseGeo, skinMat(0xdba882));
  nose.scale.set(0.8, 1, 1.2);
  nose.position.set(0, 0.47, 0.14);

  const eyeWhiteGeo = new THREE.SphereGeometry(0.025, 10, 10);
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3 });
  const eyeL = m(eyeWhiteGeo, eyeWhiteMat);
  eyeL.position.set(-0.055, 0.5, 0.12);
  const eyeR = m(eyeWhiteGeo.clone(), eyeWhiteMat.clone());
  eyeR.position.set(0.055, 0.5, 0.12);

  const pupilGeo = new THREE.SphereGeometry(0.013, 8, 8);
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x2d5016, roughness: 0.4 });
  const pupilL = m(pupilGeo, pupilMat);
  pupilL.position.set(-0.055, 0.5, 0.14);
  const pupilR = m(pupilGeo.clone(), pupilMat.clone());
  pupilR.position.set(0.055, 0.5, 0.14);

  const browGeo = new THREE.CapsuleGeometry(0.015, 0.04, 4, 8);
  const browMat = clothMat(0x5a3a1e, 0.9);
  const browL = m(browGeo, browMat);
  browL.rotation.z = 0.2;
  browL.position.set(-0.055, 0.535, 0.12);
  const browR = m(browGeo.clone(), browMat.clone());
  browR.rotation.z = -0.2;
  browR.position.set(0.055, 0.535, 0.12);

  const mouthGeo = new THREE.CapsuleGeometry(0.008, 0.035, 4, 8);
  const mouth = m(mouthGeo, new THREE.MeshStandardMaterial({ color: 0xc47a5a, roughness: 0.6 }));
  mouth.rotation.z = Math.PI / 2;
  mouth.position.set(0, 0.435, 0.13);

  // --- Hair ---
  const hairCap = m(
    new THREE.SphereGeometry(0.16, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    clothMat(0x5a3a1e, 0.92)
  );
  hairCap.position.y = 0.55;

  const hairGroup = new THREE.Group();
  addHairCurls(hairGroup, 0.16, 0.52);

  // --- Ears (pointed) ---
  const earGeo = new THREE.ConeGeometry(0.035, 0.07, 8);
  const earMat = skinMat(SKIN);
  const earL = m(earGeo, earMat);
  earL.rotation.z = Math.PI / 2.5;
  earL.position.set(-0.16, 0.49, 0);

  const earR = m(earGeo.clone(), earMat.clone());
  earR.rotation.z = -Math.PI / 2.5;
  earR.position.set(0.16, 0.49, 0);

  // --- Arms ---
  const shoulderL = new THREE.Group();
  shoulderL.position.set(-0.22, 0.28, 0);
  const upperArmL = m(
    new THREE.CapsuleGeometry(0.048, 0.14, 6, 12),
    clothMat(JACKET_BROWN, 0.82)
  );
  upperArmL.position.y = -0.08;
  const forearmL = m(
    new THREE.CapsuleGeometry(0.038, 0.12, 6, 12),
    skinMat(SKIN)
  );
  forearmL.position.y = -0.24;
  const handL = m(
    new THREE.SphereGeometry(0.032, 10, 10),
    skinMat(SKIN)
  );
  handL.position.y = -0.32;
  shoulderL.add(upperArmL, forearmL, handL);

  const shoulderR = new THREE.Group();
  shoulderR.position.set(0.22, 0.28, 0);
  shoulderR.rotation.set(0.12, 0, -0.12);
  const upperArmR = m(
    new THREE.CapsuleGeometry(0.048, 0.14, 6, 12),
    clothMat(JACKET_BROWN, 0.82)
  );
  upperArmR.position.y = -0.08;
  const forearmR = m(
    new THREE.CapsuleGeometry(0.038, 0.12, 6, 12),
    skinMat(SKIN)
  );
  forearmR.position.y = -0.24;

  const handR = new THREE.Group();
  handR.position.set(0.01, -0.32, 0.03);
  const handMesh = m(
    new THREE.SphereGeometry(0.032, 10, 10),
    skinMat(SKIN)
  );
  handR.add(handMesh);
  shoulderR.add(upperArmR, forearmR, handR);

  // --- Sword pivot ---
  const swordPivot = new THREE.Group();
  swordPivot.position.set(0.18, 0.12, 0.08);
  const sword = buildSword();
  sword.rotation.set(-0.3, 0.1, 0.35);
  sword.position.set(0.04, -0.02, 0.06);
  swordPivot.add(sword);

  // --- Assemble ---
  hips.add(
    torso, vest, vestButtons, belt, buckle, cloak,
    head, nose,
    eyeL, eyeR, pupilL, pupilR,
    browL, browR, mouth,
    hairCap, hairGroup,
    earL, earR,
    shoulderL, shoulderR,
  );

  model.add(hips, legL, legR);
  model.add(swordPivot);

  // Fit so feet sit at y=0 and total height ~1.2
  const bbox = new THREE.Box3().setFromObject(model);
  const currentHeight = bbox.max.y - bbox.min.y;
  const scale = 1.2 / currentHeight;
  model.scale.setScalar(scale);

  bbox.setFromObject(model);
  model.position.y = -bbox.min.y;

  root.add(model);

  return {
    root,
    model,
    swordPivot,
    sword,
    hips,
    legL,
    legR,
    shoulderL,
    shoulderR,
    handR,
  };
}

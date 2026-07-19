import * as THREE from "three";

function m(geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function skin(color = 0xe8b896) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.04 });
}

function cloth(color, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

/**
 * Kid-friendly stylized fellowship member (not film likenesses).
 */
export function createFellow(opts = {}) {
  const {
    height = 1.55,
    skinColor = 0xe8b896,
    tunic = 0x5d7a4a,
    pants = 0x3e3a35,
    hair = 0x3e2723,
    hat = null,
    cloak = null,
    beard = false,
    scaleExtra = 1,
  } = opts;

  const root = new THREE.Group();
  const model = new THREE.Group();

  const hips = m(new THREE.SphereGeometry(0.12, 12, 12), cloth(pants));
  hips.position.y = 0.55;
  const torso = m(new THREE.CapsuleGeometry(0.16, 0.28, 6, 12), cloth(tunic));
  torso.position.y = 0.85;
  const head = m(new THREE.SphereGeometry(0.14, 14, 14), skin(skinColor));
  head.position.y = 1.22;
  const hairCap = m(new THREE.SphereGeometry(0.145, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), cloth(hair, 0.9));
  hairCap.position.y = 1.28;

  const legL = m(new THREE.CapsuleGeometry(0.055, 0.28, 4, 10), cloth(pants));
  legL.position.set(-0.08, 0.28, 0);
  const legR = m(new THREE.CapsuleGeometry(0.055, 0.28, 4, 10), cloth(pants));
  legR.position.set(0.08, 0.28, 0);

  model.add(hips, torso, head, hairCap, legL, legR);

  if (beard) {
    const b = m(new THREE.SphereGeometry(0.08, 10, 8), cloth(hair, 0.92));
    b.scale.set(1.1, 0.7, 0.7);
    b.position.set(0, 1.1, 0.1);
    model.add(b);
  }

  if (cloak) {
    const c = m(new THREE.BoxGeometry(0.42, 0.55, 0.08), cloth(cloak, 0.88));
    c.position.set(0, 0.85, -0.12);
    model.add(c);
  }

  if (hat === "point") {
    const h = m(new THREE.ConeGeometry(0.16, 0.45, 10), cloth(0x4a5d3a, 0.85));
    h.position.y = 1.5;
    model.add(h);
  } else if (hat === "circlet") {
    const h = m(
      new THREE.TorusGeometry(0.12, 0.018, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.8, roughness: 0.3 })
    );
    h.rotation.x = Math.PI / 2;
    h.position.y = 1.34;
    model.add(h);
  }

  const target = height * scaleExtra;
  const box = new THREE.Box3().setFromObject(model);
  const h = box.max.y - box.min.y || 1;
  model.scale.setScalar(target / h);
  box.setFromObject(model);
  model.position.y = -box.min.y;
  root.add(model);

  return { root, model };
}

export function createFellowshipCast() {
  return {
    elrond: createFellow({
      height: 1.75,
      tunic: 0xc5d5c0,
      pants: 0x5c6b5a,
      hair: 0xd7d2c8,
      hat: "circlet",
      cloak: 0x8fa898,
    }),
    gandalf: createFellow({
      height: 1.8,
      tunic: 0xd9d3c5,
      pants: 0x6d685e,
      hair: 0xeceff1,
      beard: true,
      hat: "point",
      cloak: 0xb0a898,
    }),
    aragorn: createFellow({
      height: 1.78,
      tunic: 0x3d5c4a,
      pants: 0x2c2a28,
      hair: 0x3e2723,
      cloak: 0x4e342e,
    }),
    legolas: createFellow({
      height: 1.72,
      tunic: 0x6b8e4e,
      pants: 0x3e4a32,
      hair: 0xf5e6c8,
      cloak: 0x558b2f,
    }),
    gimli: createFellow({
      height: 1.15,
      tunic: 0x6d4c41,
      pants: 0x3e2723,
      hair: 0xc62828,
      beard: true,
    }),
    boromir: createFellow({
      height: 1.76,
      tunic: 0xb71c1c,
      pants: 0x37474f,
      hair: 0x5d4037,
      cloak: 0x880e4f,
    }),
    sam: createFellow({
      height: 1.15,
      tunic: 0x8d6e63,
      pants: 0x5d4037,
      hair: 0x4e342e,
      scaleExtra: 0.95,
    }),
    merry: createFellow({
      height: 1.12,
      tunic: 0x6d4c41,
      pants: 0x455a64,
      hair: 0x3e2723,
      scaleExtra: 0.92,
    }),
    pippin: createFellow({
      height: 1.1,
      tunic: 0x7cb342,
      pants: 0x5d4037,
      hair: 0x6d4c41,
      scaleExtra: 0.9,
    }),
  };
}

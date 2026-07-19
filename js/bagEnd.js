import * as THREE from "three";

function ms(geometry, material, cast = true, receive = true) {
  const obj = new THREE.Mesh(geometry, material);
  obj.castShadow = cast;
  obj.receiveShadow = receive;
  return obj;
}

function createCollider(minX, maxX, minY, maxY, minZ, maxZ) {
  return { minX, maxX, minY, maxY, minZ, maxZ, active: true };
}

function colliderFromMesh(mesh, padding = 0) {
  const box = new THREE.Box3().setFromObject(mesh);
  return createCollider(
    box.min.x - padding,
    box.max.x + padding,
    box.min.y,
    box.max.y,
    box.min.z - padding,
    box.max.z + padding
  );
}

function woodMat(tex, rx = 2, ry = 2) {
  const m = tex.woodMap.clone();
  m.repeat.set(rx, ry);
  const n = tex.woodNor.clone();
  n.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({
    map: m,
    normalMap: n,
    roughness: 0.82,
    metalness: 0.05,
    envMapIntensity: 0.55,
  });
}

function plasterMat(tex) {
  const m = tex.plasterMap.clone();
  m.repeat.set(3, 2);
  return new THREE.MeshStandardMaterial({
    map: m,
    color: 0xf3e6d0,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.35,
  });
}

function stoneMat(tex, rx = 2, ry = 2) {
  const m = tex.stoneMap.clone();
  m.repeat.set(rx, ry);
  const n = tex.stoneNor.clone();
  n.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({
    map: m,
    normalMap: n,
    roughness: 0.88,
    metalness: 0.05,
    envMapIntensity: 0.5,
  });
}

/** Bag End sits far from the outdoor Shire so zones don't overlap. */
export const BAG_END_ORIGIN = new THREE.Vector3(0, 0, -90);

function W(x, y, z) {
  return new THREE.Vector3(BAG_END_ORIGIN.x + x, BAG_END_ORIGIN.y + y, BAG_END_ORIGIN.z + z);
}

function addWall(game, group, w, h, d, x, y, z, material) {
  const wall = ms(new THREE.BoxGeometry(w, h, d), material);
  wall.position.set(x, y + h / 2, z);
  group.add(wall);
  const c = colliderFromMesh(wall);
  c.zone = "inside";
  game.colliders.push(c);
  return wall;
}

function buildGreenDoor(game, group, tex, x, y, z) {
  const frame = ms(new THREE.TorusGeometry(1.05, 0.14, 12, 36), stoneMat(tex, 3, 1));
  frame.position.set(x, y + 1.15, z);
  group.add(frame);

  const pivot = new THREE.Group();
  pivot.position.set(x + 0.85, y + 1.15, z);

  const door = ms(new THREE.CylinderGeometry(0.92, 0.92, 0.1, 36), woodMat(tex, 1, 1));
  door.material = door.material.clone();
  door.material.color.set(0x3d6b2f);
  door.rotation.x = Math.PI / 2;
  door.position.set(-0.85, 0, 0);

  const plankH = ms(new THREE.BoxGeometry(1.5, 0.05, 0.04), woodMat(tex, 2, 0.5));
  plankH.position.set(-0.85, 0.12, 0.06);
  const plankV = ms(new THREE.BoxGeometry(0.05, 1.5, 0.04), woodMat(tex, 0.5, 2));
  plankV.position.set(-0.85, 0, 0.06);

  const ring = ms(
    new THREE.TorusGeometry(0.09, 0.018, 10, 16),
    new THREE.MeshStandardMaterial({
      color: 0xd4a017,
      roughness: 0.3,
      metalness: 0.9,
      envMapIntensity: 1.5,
    })
  );
  ring.position.set(-0.5, 0, 0.08);
  pivot.add(door, plankH, plankV, ring);
  group.add(pivot);

  const collider = colliderFromMesh(door, 0.04);
  collider.mesh = door;
  collider.zone = "inside";

  return {
    pivot,
    mesh: door,
    collider,
    label: "Front door",
    role: "exit",
    open: false,
    openAmount: 0,
    targetOpen: 0,
    hingeSide: 1,
    interactPoint: W(x, y + 1, z),
    zone: "inside",
  };
}

/**
 * Frodo's Bag End–inspired home: green round door, warm parlor, hearth, pantry.
 */
export function buildBagEnd(game, tex) {
  const group = new THREE.Group();
  group.position.copy(BAG_END_ORIGIN);
  group.name = "bagEnd";

  const plaster = plasterMat(tex);
  const wood = woodMat(tex, 5, 5);
  const beamMat = woodMat(tex, 1, 1);
  beamMat.color.set(0x5d4037);

  // Floor
  const floor = ms(new THREE.BoxGeometry(14, 0.25, 18), wood, false, true);
  floor.position.set(0, -0.12, -6);
  group.add(floor);
  game.groundHeights.push({
    minX: BAG_END_ORIGIN.x - 7,
    maxX: BAG_END_ORIGIN.x + 7,
    minZ: BAG_END_ORIGIN.z - 15,
    maxZ: BAG_END_ORIGIN.z + 2.5,
    height: 0,
    zone: "inside",
  });

  // Walls with doorway gap in front
  addWall(game, group, 5.2, 3.2, 0.35, -4.3, 0, 1.3, plaster.clone());
  addWall(game, group, 5.2, 3.2, 0.35, 4.3, 0, 1.3, plaster.clone());
  addWall(game, group, 14, 0.85, 0.35, 0, 2.35, 1.3, plaster.clone());
  addWall(game, group, 0.35, 3.2, 16.5, -6.9, 0, -6, plaster.clone());
  addWall(game, group, 0.35, 3.2, 16.5, 6.9, 0, -6, plaster.clone());
  addWall(game, group, 14, 3.2, 0.35, 0, 0, -14.6, plaster.clone());

  // Ceiling + beams
  const ceiling = ms(new THREE.BoxGeometry(14.2, 0.22, 18.2), plaster.clone(), false, true);
  ceiling.position.set(0, 3.2, -6);
  group.add(ceiling);
  for (let i = 0; i < 6; i += 1) {
    const beam = ms(new THREE.BoxGeometry(13.6, 0.16, 0.22), beamMat.clone());
    beam.position.set(0, 3.05, -1.2 - i * 2.3);
    group.add(beam);
  }

  // Round side windows + glow
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffe0a0,
    emissive: 0xffb060,
    emissiveIntensity: 0.6,
    roughness: 0.25,
    transparent: true,
    opacity: 0.82,
  });
  const windowZs = [-3, -7, -11];
  for (const z of windowZs) {
    for (const side of [-6.7, 6.7]) {
      const ring = ms(new THREE.TorusGeometry(0.52, 0.07, 10, 24), woodMat(tex, 1, 1));
      ring.rotation.y = Math.PI / 2;
      ring.position.set(side, 1.65, z);
      const glass = ms(new THREE.CircleGeometry(0.48, 24), glassMat, false, false);
      glass.rotation.y = Math.PI / 2;
      glass.position.set(side + (side > 0 ? -0.04 : 0.04), 1.65, z);
      group.add(ring, glass);
      const glow = new THREE.PointLight(0xffcc80, 0.3, 5.5, 2);
      glow.position.set(side * 0.55, 1.65, z);
      group.add(glow);
    }
  }

  // Fireplace
  const hearth = ms(new THREE.BoxGeometry(2.8, 2.5, 0.85), stoneMat(tex, 2, 2));
  hearth.position.set(-4.7, 1.25, -8.2);
  group.add(hearth);
  const firebox = ms(
    new THREE.BoxGeometry(1.45, 1.15, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 1 })
  );
  firebox.position.set(-4.7, 0.75, -7.85);
  group.add(firebox);
  const flame = ms(
    new THREE.ConeGeometry(0.28, 0.6, 8),
    new THREE.MeshStandardMaterial({
      color: 0xff6d00,
      emissive: 0xff3d00,
      emissiveIntensity: 1.3,
      roughness: 0.55,
    })
  );
  flame.position.set(-4.7, 0.6, -7.7);
  group.add(flame);
  const fireLight = new THREE.PointLight(0xff8a3d, 1.7, 11, 2);
  fireLight.position.set(-4.3, 1.25, -7.3);
  fireLight.castShadow = true;
  group.add(fireLight);
  game.colliders.push(Object.assign(colliderFromMesh(hearth), { zone: "inside" }));

  const mantel = ms(new THREE.BoxGeometry(2.7, 0.12, 0.48), woodMat(tex, 2, 1));
  mantel.position.set(-4.7, 1.95, -7.85);
  group.add(mantel);

  // Dining table + chairs
  const table = ms(new THREE.BoxGeometry(3.4, 0.14, 1.35), woodMat(tex, 2, 1));
  table.position.set(1.8, 0.72, -6.2);
  group.add(table);
  [[-1.4, -0.5], [1.4, -0.5], [-1.4, 0.5], [1.4, 0.5]].forEach(([dx, dz]) => {
    const leg = ms(new THREE.BoxGeometry(0.12, 0.7, 0.12), beamMat.clone());
    leg.position.set(1.8 + dx, 0.35, -6.2 + dz);
    group.add(leg);
  });
  game.colliders.push(Object.assign(colliderFromMesh(table), { zone: "inside" }));

  for (let i = 0; i < 4; i += 1) {
    const cx = 0.4 + (i % 2) * 2.6;
    const cz = -5.4 - Math.floor(i / 2) * 1.7;
    const seat = ms(new THREE.BoxGeometry(0.5, 0.12, 0.5), woodMat(tex, 1, 1));
    seat.position.set(cx, 0.42, cz);
    const back = ms(new THREE.BoxGeometry(0.5, 0.7, 0.1), woodMat(tex, 1, 1));
    back.position.set(cx, 0.8, cz - 0.2);
    group.add(seat, back);
  }

  const rug = ms(
    new THREE.CircleGeometry(2.3, 28),
    new THREE.MeshStandardMaterial({ color: 0x8b1e1e, roughness: 0.95 }),
    false,
    true
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.4, 0.02, -5.8);
  group.add(rug);

  // Bookshelf
  const shelf = ms(new THREE.BoxGeometry(2.5, 2.3, 0.42), woodMat(tex, 2, 2));
  shelf.position.set(5.3, 1.2, -10.5);
  group.add(shelf);
  for (let r = 0; r < 4; r += 1) {
    for (let b = 0; b < 6; b += 1) {
      const book = ms(
        new THREE.BoxGeometry(0.14, 0.32, 0.22),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.04 + b * 0.07, 0.5, 0.38),
          roughness: 0.85,
        })
      );
      book.position.set(4.35 + b * 0.3, 0.48 + r * 0.52, -10.35);
      group.add(book);
    }
  }
  game.colliders.push(Object.assign(colliderFromMesh(shelf), { zone: "inside" }));

  // Pantry alcove
  addWall(game, group, 0.3, 2.9, 5.2, -2.0, 0, -12.2, plaster.clone());
  addWall(game, group, 4.6, 2.9, 0.3, -4.3, 0, -11.4, plaster.clone());

  for (let s = 0; s < 3; s += 1) {
    const board = ms(new THREE.BoxGeometry(2.9, 0.08, 0.45), woodMat(tex, 2, 1));
    board.position.set(-4.9, 0.75 + s * 0.7, -13.3);
    group.add(board);
    for (let j = 0; j < 4; j += 1) {
      const jar = ms(
        new THREE.CylinderGeometry(0.12, 0.14, 0.28, 10),
        new THREE.MeshStandardMaterial({
          color: [0x81d4fa, 0xffab91, 0xc5e1a5, 0xffe082][j],
          roughness: 0.35,
        })
      );
      jar.position.set(-5.7 + j * 0.55, 0.97 + s * 0.7, -13.3);
      group.add(jar);
    }
  }

  // Acorn on pedestal in pantry
  const pedestal = ms(new THREE.CylinderGeometry(0.35, 0.42, 0.18, 14), woodMat(tex, 1, 1));
  pedestal.position.set(-4.6, 0.12, -13.9);
  group.add(pedestal);

  const acorn = new THREE.Group();
  const body = ms(
    new THREE.SphereGeometry(0.13, 14, 14),
    new THREE.MeshStandardMaterial({
      color: 0xd4a017,
      emissive: 0x664400,
      emissiveIntensity: 0.55,
      metalness: 0.4,
      roughness: 0.35,
    })
  );
  body.scale.set(1, 1.25, 1);
  const cap = ms(
    new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45),
    new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.8 })
  );
  cap.position.y = 0.09;
  acorn.add(body, cap);
  acorn.position.set(-4.6, 0.42, -13.9);
  acorn.add(new THREE.PointLight(0xffd54f, 0.95, 4));
  group.add(acorn);
  game.acorn = { mesh: acorn, collected: false, spin: 0, zone: "inside" };

  // Lights
  const hallLight = new THREE.PointLight(0xffd2a0, 1.15, 18, 2);
  hallLight.position.set(0, 2.7, -4);
  hallLight.castShadow = true;
  group.add(hallLight);
  const pantryLight = new THREE.PointLight(0xffe082, 0.85, 8, 2);
  pantryLight.position.set(-4.5, 2.2, -13);
  group.add(pantryLight);

  // Green round exit door
  const exitDoor = buildGreenDoor(game, group, tex, 0, 0.05, 1.25);
  game.doors.push(exitDoor);
  game.colliders.push(exitDoor.collider);

  const matInside = ms(
    new THREE.BoxGeometry(1.7, 0.04, 0.95),
    new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.95 }),
    false,
    true
  );
  matInside.position.set(0, 0.03, 0.15);
  group.add(matInside);

  // Triggers (world space)
  game.zoneTriggers = {
    enterInside: createCollider(-1.0, 1.0, 0, 2.3, -3.7, -2.85),
    exitOutside: createCollider(
      BAG_END_ORIGIN.x - 1.0,
      BAG_END_ORIGIN.x + 1.0,
      0,
      2.3,
      BAG_END_ORIGIN.z + 0.7,
      BAG_END_ORIGIN.z + 1.55
    ),
    spawnInside: W(0, 0, -0.2),
    spawnOutside: new THREE.Vector3(0, 0, -1.6),
  };

  game.bagEndGroup = group;
  game.scene.add(group);
  return group;
}

export function applyZone(game, zone) {
  game.location = zone;
  for (const c of game.colliders) {
    if (!c.zone) {
      // Untagged = outdoor world props
      c.active = zone === "outside";
      continue;
    }
    if (c.zone === "inside") {
      c.active = zone === "inside";
    } else if (c.zone === "outside") {
      c.active = zone === "outside";
    }
  }
  for (const door of game.doors) {
    const doorZone = door.zone || "outside";
    if (doorZone !== zone) {
      door.collider.active = false;
    } else {
      door.collider.active = !door.open;
    }
  }
}

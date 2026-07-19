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

function addFloorPatch(game, group, wood, x, z, w, d) {
  const floor = ms(new THREE.BoxGeometry(w, 0.25, d), wood, false, true);
  floor.position.set(x, -0.12, z);
  group.add(floor);
  game.groundHeights.push({
    minX: BAG_END_ORIGIN.x + x - w / 2,
    maxX: BAG_END_ORIGIN.x + x + w / 2,
    minZ: BAG_END_ORIGIN.z + z - d / 2,
    maxZ: BAG_END_ORIGIN.z + z + d / 2,
    height: 0,
    zone: "inside",
  });
}

function addCeiling(group, plaster, beamMat, x, z, w, d) {
  const ceiling = ms(new THREE.BoxGeometry(w, 0.22, d), plaster.clone(), false, true);
  ceiling.position.set(x, 3.2, z);
  group.add(ceiling);
  const count = Math.max(2, Math.floor(d / 2.4));
  for (let i = 0; i < count; i += 1) {
    const beam = ms(new THREE.BoxGeometry(w - 0.4, 0.14, 0.2), beamMat.clone());
    beam.position.set(x, 3.05, z - d / 2 + 1.1 + i * (d / count));
    group.add(beam);
  }
}

/**
 * Movie-style open round doorway: curved hobbit arch, no door leaf.
 * facing "z" = opening through a wall in the XY plane (separates rooms along Z)
 * facing "x" = opening through a wall in the ZY plane (separates rooms along X)
 */
function addRoundDoorway(game, group, plaster, frameMat, opts) {
  const {
    x,
    z,
    facing = "z",
    radius = 1.08,
    wallHeight = 3.2,
    thickness = 0.38,
    leftExtent = 3,
    rightExtent = 3,
  } = opts;
  const cy = radius;

  const frame = ms(new THREE.TorusGeometry(radius, 0.13, 12, 40), frameMat);
  if (facing === "z") {
    frame.position.set(x, cy, z);
  } else {
    frame.rotation.y = Math.PI / 2;
    frame.position.set(x, cy, z);
  }
  group.add(frame);

  // Inner wood trim ring
  const trim = ms(
    new THREE.TorusGeometry(radius - 0.08, 0.05, 10, 36),
    frameMat.clone()
  );
  trim.material.color?.set?.(0x6d4c41);
  if (facing === "x") {
    trim.rotation.y = Math.PI / 2;
  }
  trim.position.copy(frame.position);
  group.add(trim);

  const open = radius + 0.05;
  if (facing === "z") {
    if (leftExtent > open) {
      const w = leftExtent - open;
      addWall(game, group, w, wallHeight, thickness, x - open - w / 2, 0, z, plaster.clone());
    }
    if (rightExtent > open) {
      const w = rightExtent - open;
      addWall(game, group, w, wallHeight, thickness, x + open + w / 2, 0, z, plaster.clone());
    }
    const topH = Math.max(0.25, wallHeight - (cy + open));
    if (topH > 0.2) {
      addWall(
        game,
        group,
        leftExtent + rightExtent,
        topH,
        thickness,
        x + (rightExtent - leftExtent) / 2,
        cy + open,
        z,
        plaster.clone()
      );
    }
  } else {
    if (leftExtent > open) {
      const d = leftExtent - open;
      addWall(game, group, thickness, wallHeight, d, x, 0, z - open - d / 2, plaster.clone());
    }
    if (rightExtent > open) {
      const d = rightExtent - open;
      addWall(game, group, thickness, wallHeight, d, x, 0, z + open + d / 2, plaster.clone());
    }
    const topH = Math.max(0.25, wallHeight - (cy + open));
    if (topH > 0.2) {
      addWall(
        game,
        group,
        thickness,
        topH,
        leftExtent + rightExtent,
        x,
        cy + open,
        z + (rightExtent - leftExtent) / 2,
        plaster.clone()
      );
    }
  }

  // Soft sill mat under the arch
  const sill =
    facing === "z"
      ? ms(
          new THREE.BoxGeometry(radius * 1.6, 0.04, thickness + 0.35),
          new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.95 }),
          false,
          true
        )
      : ms(
          new THREE.BoxGeometry(thickness + 0.35, 0.04, radius * 1.6),
          new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.95 }),
          false,
          true
        );
  sill.position.set(x, 0.03, z);
  group.add(sill);
}

function addWallShelfRun(game, group, tex, beamMat, opts) {
  const {
    x,
    z,
    rows = 3,
    cols = 4,
    width = 2.2,
    startY = 0.85,
    rowGap = 0.62,
    facing = "x",
    style = "mixed",
  } = opts;
  const depth = 0.36;
  for (let r = 0; r < rows; r += 1) {
    const board =
      facing === "x"
        ? ms(new THREE.BoxGeometry(width, 0.07, depth), woodMat(tex, 2, 1))
        : ms(new THREE.BoxGeometry(depth, 0.07, width), woodMat(tex, 1, 2));
    board.position.set(x, startY + r * rowGap, z);
    group.add(board);

    for (let c = 0; c < cols; c += 1) {
      const t = cols <= 1 ? 0.5 : c / (cols - 1);
      const along = (t - 0.5) * (width - 0.35);
      const px = facing === "x" ? x + along : x;
      const pz = facing === "z" ? z + along : z;
      const py = startY + r * rowGap + 0.12;
      const kind = style === "books" ? "book" : ["plate", "mug", "jar", "book"][(r + c) % 4];
      if (kind === "book") {
        const book = ms(
          new THREE.BoxGeometry(0.1, 0.26, 0.18),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.05 + ((r * cols + c) % 8) * 0.08, 0.45, 0.4),
            roughness: 0.85,
          })
        );
        book.position.set(px, py + 0.05, pz);
        if (facing === "z") {
          book.rotation.y = Math.PI / 2;
        }
        group.add(book);
      } else if (kind === "plate") {
        const plate = ms(
          new THREE.CylinderGeometry(0.14, 0.14, 0.035, 14),
          new THREE.MeshStandardMaterial({ color: 0xf3e2c0, roughness: 0.4 })
        );
        plate.position.set(px, py, pz);
        group.add(plate);
      } else if (kind === "mug") {
        const mug = ms(
          new THREE.CylinderGeometry(0.07, 0.08, 0.15, 10),
          new THREE.MeshStandardMaterial({
            color: [0x8d6e63, 0x5d4037, 0xa1887f, 0x795548][c % 4],
            roughness: 0.7,
          })
        );
        mug.position.set(px, py + 0.02, pz);
        group.add(mug);
      } else {
        const jar = ms(
          new THREE.CylinderGeometry(0.09, 0.1, 0.22, 10),
          new THREE.MeshStandardMaterial({
            color: [0x81d4fa, 0xffab91, 0xc5e1a5, 0xffe082][c % 4],
            roughness: 0.35,
          })
        );
        jar.position.set(px, py + 0.05, pz);
        group.add(jar);
      }
    }
  }
  const brace = ms(new THREE.BoxGeometry(0.1, rows * rowGap + 0.35, 0.1), beamMat.clone());
  if (facing === "x") {
    brace.position.set(x + width * 0.45, startY + (rows - 1) * rowGap * 0.5, z);
  } else {
    brace.position.set(x, startY + (rows - 1) * rowGap * 0.5, z + width * 0.45);
  }
  group.add(brace);

  if (facing === "x") {
    game.colliders.push(
      Object.assign(
        createCollider(
          BAG_END_ORIGIN.x + x - width / 2,
          BAG_END_ORIGIN.x + x + width / 2,
          0,
          2.5,
          BAG_END_ORIGIN.z + z - 0.35,
          BAG_END_ORIGIN.z + z + 0.35
        ),
        { zone: "inside" }
      )
    );
  } else {
    game.colliders.push(
      Object.assign(
        createCollider(
          BAG_END_ORIGIN.x + x - 0.35,
          BAG_END_ORIGIN.x + x + 0.35,
          0,
          2.5,
          BAG_END_ORIGIN.z + z - width / 2,
          BAG_END_ORIGIN.z + z + width / 2
        ),
        { zone: "inside" }
      )
    );
  }
}

function addRoundWindow(group, tex, glassMat, x, y, z, facing = "x") {
  const ring = ms(new THREE.TorusGeometry(0.52, 0.07, 10, 24), woodMat(tex, 1, 1));
  const glass = ms(new THREE.CircleGeometry(0.48, 24), glassMat, false, false);
  if (facing === "x") {
    ring.rotation.y = Math.PI / 2;
    glass.rotation.y = Math.PI / 2;
    glass.position.set(x + (x > 0 ? -0.04 : 0.04), y, z);
  } else {
    glass.position.set(x, y, z + (z > -15 ? 0.04 : -0.04));
  }
  ring.position.set(x, y, z);
  group.add(ring, glass);
  const glow = new THREE.PointLight(0xffcc80, 0.28, 5.5, 2);
  glow.position.set(x * 0.55, y, z);
  group.add(glow);
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
 * Frodo's Bag End: parlor, hallway, kitchen, study, and bedroom
 * linked by open round hobbit doorways (no interior doors).
 */
export function buildBagEnd(game, tex) {
  const group = new THREE.Group();
  group.position.copy(BAG_END_ORIGIN);
  group.name = "bagEnd";

  const plaster = plasterMat(tex);
  const wood = woodMat(tex, 5, 5);
  const beamMat = woodMat(tex, 1, 1);
  beamMat.color.set(0x5d4037);
  const frameWood = woodMat(tex, 1, 1);
  frameWood.color.set(0x5d4037);

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffe0a0,
    emissive: 0xffb060,
    emissiveIntensity: 0.6,
    roughness: 0.25,
    transparent: true,
    opacity: 0.82,
  });

  // --- Floors ---
  addFloorPatch(game, group, wood, 0, -4.5, 16, 13); // parlor
  addFloorPatch(game, group, wood, 0, -15.5, 4.2, 10); // hallway
  addFloorPatch(game, group, wood, -5.5, -15.5, 7.5, 9); // kitchen
  addFloorPatch(game, group, wood, 5.5, -15.5, 7.5, 9); // study
  addFloorPatch(game, group, wood, 0, -25.5, 12, 9); // bedroom

  // --- Ceilings ---
  addCeiling(group, plaster, beamMat, 0, -4.5, 16.2, 13);
  addCeiling(group, plaster, beamMat, 0, -15.5, 4.4, 10);
  addCeiling(group, plaster, beamMat, -5.5, -15.5, 7.7, 9);
  addCeiling(group, plaster, beamMat, 5.5, -15.5, 7.7, 9);
  addCeiling(group, plaster, beamMat, 0, -25.5, 12.2, 9);

  // --- Outer parlor walls + front ---
  addWall(game, group, 6.2, 3.2, 0.35, -4.9, 0, 1.8, plaster.clone());
  addWall(game, group, 6.2, 3.2, 0.35, 4.9, 0, 1.8, plaster.clone());
  addWall(game, group, 16, 0.85, 0.35, 0, 2.35, 1.8, plaster.clone());
  addWall(game, group, 0.35, 3.2, 13, -7.9, 0, -4.5, plaster.clone());
  addWall(game, group, 0.35, 3.2, 13, 7.9, 0, -4.5, plaster.clone());

  // Parlor → hallway round doorway wall
  addRoundDoorway(game, group, plaster, frameWood, {
    x: 0,
    z: -10.8,
    facing: "z",
    radius: 1.12,
    leftExtent: 8,
    rightExtent: 8,
  });

  // Hallway side walls (gaps for kitchen / study arches)
  addWall(game, group, 0.35, 3.2, 3.2, -2.0, 0, -12.5, plaster.clone());
  addWall(game, group, 0.35, 3.2, 3.2, 2.0, 0, -12.5, plaster.clone());
  addWall(game, group, 0.35, 3.2, 3.2, -2.0, 0, -18.5, plaster.clone());
  addWall(game, group, 0.35, 3.2, 3.2, 2.0, 0, -18.5, plaster.clone());

  // Hallway → kitchen (left) open round doorway
  addRoundDoorway(game, group, plaster, frameWood, {
    x: -2.0,
    z: -15.5,
    facing: "x",
    radius: 1.05,
    leftExtent: 3.2,
    rightExtent: 3.2,
  });

  // Hallway → study (right) open round doorway
  addRoundDoorway(game, group, plaster, frameWood, {
    x: 2.0,
    z: -15.5,
    facing: "x",
    radius: 1.05,
    leftExtent: 3.2,
    rightExtent: 3.2,
  });

  // Kitchen outer walls
  addWall(game, group, 0.35, 3.2, 9, -9.1, 0, -15.5, plaster.clone());
  addWall(game, group, 7.5, 3.2, 0.35, -5.5, 0, -20.0, plaster.clone());
  addWall(game, group, 7.5, 3.2, 0.35, -5.5, 0, -11.0, plaster.clone());

  // Study outer walls
  addWall(game, group, 0.35, 3.2, 9, 9.1, 0, -15.5, plaster.clone());
  addWall(game, group, 7.5, 3.2, 0.35, 5.5, 0, -20.0, plaster.clone());
  addWall(game, group, 7.5, 3.2, 0.35, 5.5, 0, -11.0, plaster.clone());

  // Hallway → bedroom round doorway
  addRoundDoorway(game, group, plaster, frameWood, {
    x: 0,
    z: -21.0,
    facing: "z",
    radius: 1.12,
    leftExtent: 2.1,
    rightExtent: 2.1,
  });

  // Bedroom walls
  addWall(game, group, 0.35, 3.2, 9, -6.0, 0, -25.5, plaster.clone());
  addWall(game, group, 0.35, 3.2, 9, 6.0, 0, -25.5, plaster.clone());
  addWall(game, group, 12.2, 3.2, 0.35, 0, 0, -29.9, plaster.clone());
  // Fill beside bedroom doorway from hallway corridor width to bedroom width
  addWall(game, group, 3.8, 3.2, 0.35, -4.0, 0, -21.0, plaster.clone());
  addWall(game, group, 3.8, 3.2, 0.35, 4.0, 0, -21.0, plaster.clone());

  // Windows
  [
    [-7.7, -3, "x"],
    [-7.7, -7, "x"],
    [7.7, -3, "x"],
    [7.7, -7, "x"],
    [-9.0, -15.5, "x"],
    [9.0, -15.5, "x"],
    [-3.5, -29.7, "z"],
    [3.5, -29.7, "z"],
  ].forEach(([x, z, facing]) => {
    addRoundWindow(group, tex, glassMat, x, 1.65, z, facing);
  });

  // --- Parlor fireplace ---
  const hearth = ms(new THREE.BoxGeometry(2.8, 2.5, 0.85), stoneMat(tex, 2, 2));
  hearth.position.set(-5.2, 1.25, -6.5);
  group.add(hearth);
  const firebox = ms(
    new THREE.BoxGeometry(1.45, 1.15, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 1 })
  );
  firebox.position.set(-5.2, 0.75, -6.15);
  group.add(firebox);

  const logMat = woodMat(tex, 1, 1);
  logMat.color.set(0x3e2723);
  for (let i = 0; i < 3; i += 1) {
    const log = ms(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8), logMat.clone());
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i - 1) * 0.35;
    log.position.set(-5.2 + (i - 1) * 0.12, 0.28, -6.05);
    group.add(log);
  }

  const flameGroup = new THREE.Group();
  flameGroup.position.set(-5.2, 0.45, -6.0);
  const flameMats = [
    new THREE.MeshStandardMaterial({
      color: 0xff6d00,
      emissive: 0xff3d00,
      emissiveIntensity: 1.4,
      roughness: 0.55,
    }),
    new THREE.MeshStandardMaterial({
      color: 0xffc107,
      emissive: 0xff9100,
      emissiveIntensity: 1.1,
      roughness: 0.5,
    }),
  ];
  const flames = [];
  for (let i = 0; i < 3; i += 1) {
    const flame = ms(new THREE.ConeGeometry(0.18 + i * 0.04, 0.45 + i * 0.12, 8), flameMats[i % 2]);
    flame.position.set((i - 1) * 0.16, 0.2 + i * 0.05, i * 0.02);
    flameGroup.add(flame);
    flames.push(flame);
  }
  const ember = ms(
    new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0xff5722,
      emissive: 0xff3d00,
      emissiveIntensity: 0.9,
      roughness: 0.8,
    })
  );
  ember.scale.set(1.4, 0.35, 1);
  ember.position.set(0, 0.02, 0);
  flameGroup.add(ember);
  group.add(flameGroup);

  const fireLight = new THREE.PointLight(0xff8a3d, 1.7, 11, 2);
  fireLight.position.set(-4.8, 1.25, -5.6);
  fireLight.castShadow = true;
  group.add(fireLight);
  game.colliders.push(Object.assign(colliderFromMesh(hearth), { zone: "inside" }));

  const mantel = ms(new THREE.BoxGeometry(2.7, 0.12, 0.48), woodMat(tex, 2, 1));
  mantel.position.set(-5.2, 1.95, -6.15);
  group.add(mantel);

  const buttonBase = ms(
    new THREE.CylinderGeometry(0.1, 0.12, 0.06, 16),
    new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.55, metalness: 0.35 })
  );
  buttonBase.position.set(-4.05, 2.05, -6.0);
  const buttonKnob = ms(
    new THREE.CylinderGeometry(0.07, 0.08, 0.08, 16),
    new THREE.MeshStandardMaterial({
      color: 0xd4a017,
      emissive: 0x664400,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.85,
    })
  );
  buttonKnob.position.set(-4.05, 2.12, -6.0);
  group.add(buttonBase, buttonKnob);

  game.fireplace = {
    lit: true,
    flameGroup,
    flames,
    ember,
    light: fireLight,
    button: buttonKnob,
    interactPoint: W(-4.05, 1.4, -5.5),
    flicker: 0,
  };
  applyFireplaceState(game.fireplace);

  // Dining table
  const table = ms(new THREE.BoxGeometry(3.4, 0.14, 1.35), woodMat(tex, 2, 1));
  table.position.set(2.4, 0.72, -5.5);
  group.add(table);
  [[-1.4, -0.5], [1.4, -0.5], [-1.4, 0.5], [1.4, 0.5]].forEach(([dx, dz]) => {
    const leg = ms(new THREE.BoxGeometry(0.12, 0.7, 0.12), beamMat.clone());
    leg.position.set(2.4 + dx, 0.35, -5.5 + dz);
    group.add(leg);
  });
  game.colliders.push(Object.assign(colliderFromMesh(table), { zone: "inside" }));

  for (let i = 0; i < 4; i += 1) {
    const cx = 1.0 + (i % 2) * 2.6;
    const cz = -4.7 - Math.floor(i / 2) * 1.7;
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
  rug.position.set(0.2, 0.02, -4.8);
  group.add(rug);

  // Parlor shelves
  addWallShelfRun(game, group, tex, beamMat, {
    x: 6.4,
    z: -3.2,
    width: 2.4,
    cols: 4,
    facing: "x",
    style: "mixed",
  });
  addWallShelfRun(game, group, tex, beamMat, {
    x: 6.4,
    z: -7.5,
    width: 2.2,
    cols: 4,
    facing: "x",
    style: "books",
  });
  addWallShelfRun(game, group, tex, beamMat, {
    x: -6.4,
    z: -3.5,
    width: 2.2,
    cols: 4,
    facing: "x",
    style: "mixed",
  });

  // --- Kitchen ---
  for (let s = 0; s < 3; s += 1) {
    const board = ms(new THREE.BoxGeometry(3.4, 0.08, 0.45), woodMat(tex, 2, 1));
    board.position.set(-6.2, 0.75 + s * 0.7, -18.8);
    group.add(board);
    for (let j = 0; j < 5; j += 1) {
      const jar = ms(
        new THREE.CylinderGeometry(0.12, 0.14, 0.28, 10),
        new THREE.MeshStandardMaterial({
          color: [0x81d4fa, 0xffab91, 0xc5e1a5, 0xffe082, 0xf8bbd0][j],
          roughness: 0.35,
        })
      );
      jar.position.set(-7.4 + j * 0.55, 0.97 + s * 0.7, -18.8);
      group.add(jar);
    }
  }
  const counter = ms(new THREE.BoxGeometry(3.6, 0.7, 1.1), woodMat(tex, 2, 1));
  counter.position.set(-5.8, 0.4, -13.2);
  group.add(counter);
  game.colliders.push(Object.assign(colliderFromMesh(counter), { zone: "inside" }));
  const bowl = ms(
    new THREE.CylinderGeometry(0.28, 0.22, 0.16, 14),
    new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.4 })
  );
  bowl.position.set(-5.5, 0.85, -13.2);
  group.add(bowl);

  const pedestal = ms(new THREE.CylinderGeometry(0.35, 0.42, 0.18, 14), woodMat(tex, 1, 1));
  pedestal.position.set(-6.8, 0.12, -16.2);
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
  acorn.position.set(-6.8, 0.42, -16.2);
  acorn.add(new THREE.PointLight(0xffd54f, 0.95, 4));
  group.add(acorn);
  game.acorn = { mesh: acorn, collected: false, spin: 0, zone: "inside" };

  // --- Study ---
  const desk = ms(new THREE.BoxGeometry(2.4, 0.12, 1.1), woodMat(tex, 2, 1));
  desk.position.set(5.8, 0.72, -14.5);
  group.add(desk);
  [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]].forEach(([dx, dz]) => {
    const leg = ms(new THREE.BoxGeometry(0.1, 0.7, 0.1), beamMat.clone());
    leg.position.set(5.8 + dx, 0.35, -14.5 + dz);
    group.add(leg);
  });
  game.colliders.push(Object.assign(colliderFromMesh(desk), { zone: "inside" }));
  const chair = ms(new THREE.BoxGeometry(0.55, 0.45, 0.55), woodMat(tex, 1, 1));
  chair.position.set(5.8, 0.35, -13.4);
  group.add(chair);

  const bookcase = ms(new THREE.BoxGeometry(3.2, 2.4, 0.42), woodMat(tex, 2, 2));
  bookcase.position.set(6.5, 1.25, -18.5);
  group.add(bookcase);
  for (let r = 0; r < 4; r += 1) {
    for (let b = 0; b < 8; b += 1) {
      const book = ms(
        new THREE.BoxGeometry(0.12, 0.3, 0.22),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.08 + b * 0.06, 0.45, 0.38),
          roughness: 0.85,
        })
      );
      book.position.set(5.2 + b * 0.32, 0.45 + r * 0.52, -18.35);
      group.add(book);
    }
  }
  game.colliders.push(Object.assign(colliderFromMesh(bookcase), { zone: "inside" }));
  addWallShelfRun(game, group, tex, beamMat, {
    x: 8.5,
    z: -13.5,
    width: 2.4,
    cols: 4,
    facing: "z",
    style: "books",
  });

  // --- Bedroom ---
  const bedFrame = ms(new THREE.BoxGeometry(2.2, 0.28, 3.2), woodMat(tex, 2, 2));
  bedFrame.position.set(0, 0.28, -26.2);
  group.add(bedFrame);
  const mattress = ms(
    new THREE.BoxGeometry(2.0, 0.22, 2.9),
    new THREE.MeshStandardMaterial({ color: 0xf5e6c8, roughness: 0.92 })
  );
  mattress.position.set(0, 0.5, -26.15);
  group.add(mattress);
  const blanket = ms(
    new THREE.BoxGeometry(1.95, 0.1, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x6b8e4e, roughness: 0.9 })
  );
  blanket.position.set(0, 0.62, -25.8);
  group.add(blanket);
  const pillow = ms(
    new THREE.BoxGeometry(0.85, 0.16, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xfff8e7, roughness: 0.95 })
  );
  pillow.position.set(0, 0.66, -27.35);
  group.add(pillow);
  const headboard = ms(new THREE.BoxGeometry(2.2, 0.9, 0.14), woodMat(tex, 1, 1));
  headboard.position.set(0, 0.85, -27.7);
  group.add(headboard);
  [[-0.95, -1.4], [0.95, -1.4], [-0.95, 1.4], [0.95, 1.4]].forEach(([dx, dz]) => {
    const post = ms(new THREE.CylinderGeometry(0.06, 0.07, 0.45, 8), beamMat.clone());
    post.position.set(dx, 0.22, -26.2 + dz);
    group.add(post);
  });
  game.colliders.push(
    Object.assign(
      createCollider(
        BAG_END_ORIGIN.x - 1.2,
        BAG_END_ORIGIN.x + 1.2,
        0,
        0.85,
        BAG_END_ORIGIN.z - 27.8,
        BAG_END_ORIGIN.z - 24.9
      ),
      { zone: "inside" }
    )
  );

  game.bed = {
    lying: false,
    interactPoint: W(0, 0.4, -24.2),
    liePosition: W(0, 0.58, -26.15),
    standPosition: W(0, 0, -24.0),
    lieYaw: Math.PI,
  };

  addWallShelfRun(game, group, tex, beamMat, {
    x: -4.5,
    z: -29.4,
    width: 2.6,
    cols: 4,
    rows: 2,
    facing: "x",
    style: "mixed",
  });
  const nightstand = ms(new THREE.BoxGeometry(0.7, 0.55, 0.55), woodMat(tex, 1, 1));
  nightstand.position.set(1.8, 0.3, -27.2);
  group.add(nightstand);
  game.colliders.push(Object.assign(colliderFromMesh(nightstand), { zone: "inside" }));

  // Lights
  [
    [0xffd2a0, 1.15, 16, 0, 2.7, -4],
    [0xffe082, 0.9, 10, 0, 2.5, -15.5],
    [0xffcc80, 0.85, 9, -5.5, 2.4, -15.5],
    [0xd7e3ff, 0.75, 9, 5.5, 2.4, -15.5],
    [0xffe0b2, 0.9, 10, 0, 2.5, -25.5],
  ].forEach(([color, intensity, distance, x, y, z]) => {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.position.set(x, y, z);
    group.add(light);
  });

  // Green round exit door (only real door)
  const exitDoor = buildGreenDoor(game, group, tex, 0, 0.05, 1.75);
  game.doors.push(exitDoor);
  game.colliders.push(exitDoor.collider);

  const matInside = ms(
    new THREE.BoxGeometry(1.7, 0.04, 0.95),
    new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.95 }),
    false,
    true
  );
  matInside.position.set(0, 0.03, 0.4);
  group.add(matInside);

  game.zoneTriggers = {
    enterInside: createCollider(-1.0, 1.0, 0, 2.3, -3.7, -2.85),
    exitOutside: createCollider(
      BAG_END_ORIGIN.x - 1.0,
      BAG_END_ORIGIN.x + 1.0,
      0,
      2.3,
      BAG_END_ORIGIN.z + 1.1,
      BAG_END_ORIGIN.z + 2.0
    ),
    spawnInside: W(0, 0, 0.2),
    spawnOutside: new THREE.Vector3(0, 0, -1.6),
  };

  game.bagEndGroup = group;
  game.scene.add(group);
  return group;
}

export function applyFireplaceState(fireplace) {
  if (!fireplace) {
    return;
  }
  const on = fireplace.lit;
  fireplace.flameGroup.visible = on;
  fireplace.ember.visible = on;
  fireplace.light.intensity = on ? 1.7 : 0;
  if (fireplace.button?.material) {
    fireplace.button.material.emissiveIntensity = on ? 0.55 : 0.12;
    fireplace.button.material.color.set(on ? 0xffc107 : 0x8d6e63);
  }
}

export function toggleFireplace(fireplace) {
  if (!fireplace) {
    return false;
  }
  fireplace.lit = !fireplace.lit;
  applyFireplaceState(fireplace);
  return fireplace.lit;
}

export function applyZone(game, zone) {
  game.location = zone;
  for (const c of game.colliders) {
    if (!c.zone) {
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

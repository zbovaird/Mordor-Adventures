import * as THREE from "three";
import { createFellowshipCast } from "../fellowship.js";
import { createNpc, nearestNpc, resetNpcs, updateNpcIdle, TALK_RANGE } from "../npcs.js";
import {
  buildAnduinWorld,
  A,
  ANDUIN_ORIGIN,
  ANDUIN_WATER_Y,
} from "../anduinProps.js";

export { ANDUIN_ORIGIN, ANDUIN_WATER_Y };

const BOAT_MAX_SPEED = 7.2;
const BOAT_ACCEL = 9;
const BOAT_DRAG = 1.35;
const BOAT_YAW_RATE = 2.4;
const RIVER_CURRENT = 1.35;
const LANDING_Z = 78; // local z — dock approach zone
const LANDING_X_MAX = -2;
const DOCK_LAND_X = -6;
const DOCK_LAND_Z = 82;
const AI_LANE_LIMIT = 4.5; // keep AI boats in the clear center channel

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.72,
    metalness: options.metalness ?? 0.08,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 1,
  });
}

function mesh(geometry, material) {
  const object = new THREE.Mesh(geometry, material);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function createElvenBoat() {
  const root = new THREE.Group();
  const hullMat = mat(0xd4c4a0, { roughness: 0.68 });
  const hull = mesh(new THREE.BoxGeometry(1.35, 0.38, 4.2), hullMat);
  hull.position.y = 0.12;
  const bow = mesh(new THREE.ConeGeometry(0.55, 1.4, 8), hullMat);
  bow.rotation.x = Math.PI / 2;
  bow.position.set(0, 0.14, 2.45);
  const stern = mesh(new THREE.ConeGeometry(0.5, 1.1, 8), hullMat);
  stern.rotation.x = -Math.PI / 2;
  stern.position.set(0, 0.14, -2.2);
  const railL = mesh(new THREE.BoxGeometry(0.08, 0.28, 3.6), mat(0xc9b68c));
  railL.position.set(-0.62, 0.32, 0);
  const railR = railL.clone();
  railR.position.x = 0.62;
  root.add(hull, bow, stern, railL, railR);
  return root;
}

function createNameLabel(name) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 72;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(28, 48, 58, 0.62)";
  ctx.beginPath();
  ctx.roundRect(14, 9, 292, 52, 20);
  ctx.fill();
  ctx.fillStyle = "rgba(236, 246, 250, 0.96)";
  ctx.font = "600 29px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 160, 35);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
  );
  label.scale.set(2.0, 0.45, 1);
  label.position.y = 2.05;
  return label;
}

function localOf(worldPos) {
  return {
    x: worldPos.x - ANDUIN_ORIGIN.x,
    y: worldPos.y - ANDUIN_ORIGIN.y,
    z: worldPos.z - ANDUIN_ORIGIN.z,
  };
}

function seatBoat(boat, passengers) {
  const offsets = [
    { x: 0, y: 0.35, z: 0.55 },
    { x: 0, y: 0.35, z: -0.35 },
    { x: 0, y: 0.35, z: -1.15 },
  ];
  passengers.forEach((p, i) => {
    const o = offsets[i] || offsets[offsets.length - 1];
    boat.add(p.root);
    p.root.position.set(o.x, o.y, o.z);
    p.root.rotation.set(0, 0, 0);
    if (p.model) p.model.rotation.set(0.08, 0, 0);
  });
}

export function buildAnduinLevel(game) {
  if (game.anduinGroup) return game.anduinGroup;

  const group = new THREE.Group();
  group.name = "anduin";
  buildAnduinWorld(game, group);
  game.scene.add(group);
  game.anduinGroup = group;

  const cast = createFellowshipCast();
  // Post-Moria: no Gandalf. Frodo is the player.
  const boats = [];

  const playerBoat = createElvenBoat();
  // Boats live in world space (not under the origin-shifted group) so collision
  // math matches the world-space collider list used everywhere else.
  playerBoat.position.copy(game.anduinBoatSpawn);
  game.scene.add(playerBoat);
  seatBoat(playerBoat, [{ root: cast.sam.root, model: cast.sam.model }]);
  cast.sam.root.add(createNameLabel("Sam"));
  boats.push({
    root: playerBoat,
    yaw: 0,
    speed: 0,
    isPlayer: true,
    followOffset: new THREE.Vector3(0, 0, 0),
  });

  const merryBoat = createElvenBoat();
  merryBoat.position.copy(A(-3.2, ANDUIN_WATER_Y, -74));
  game.scene.add(merryBoat);
  seatBoat(merryBoat, [
    { root: cast.merry.root, model: cast.merry.model },
    { root: cast.pippin.root, model: cast.pippin.model },
    { root: cast.boromir.root, model: cast.boromir.model },
  ]);
  cast.merry.root.add(createNameLabel("Merry"));
  cast.pippin.root.add(createNameLabel("Pippin"));
  cast.boromir.root.add(createNameLabel("Boromir"));
  boats.push({
    root: merryBoat,
    yaw: 0,
    speed: 0,
    isPlayer: false,
    followOffset: new THREE.Vector3(-2.4, 0, -5),
  });

  const aragornBoat = createElvenBoat();
  aragornBoat.position.copy(A(3.4, ANDUIN_WATER_Y, -76));
  game.scene.add(aragornBoat);
  seatBoat(aragornBoat, [
    { root: cast.aragorn.root, model: cast.aragorn.model },
    { root: cast.legolas.root, model: cast.legolas.model },
    { root: cast.gimli.root, model: cast.gimli.model },
  ]);
  cast.aragorn.root.add(createNameLabel("Aragorn"));
  cast.legolas.root.add(createNameLabel("Legolas"));
  cast.gimli.root.add(createNameLabel("Gimli"));
  boats.push({
    root: aragornBoat,
    yaw: 0,
    speed: 0,
    isPlayer: false,
    followOffset: new THREE.Vector3(2.4, 0, -7),
  });

  // Hide unused cast members (Gandalf, Elrond)
  cast.gandalf.root.visible = false;
  cast.elrond.root.visible = false;

  game.anduinBoats = boats;
  game.anduinPlayerBoat = boats[0];
  game.anduinCompanions = [
    cast.sam, cast.merry, cast.pippin, cast.boromir,
    cast.aragorn, cast.legolas, cast.gimli,
  ];

  // Seat of Seeing as talkable interactable (local to the origin-shifted group)
  const seatNpcRoot = new THREE.Group();
  seatNpcRoot.position.set(-34, 12.4, 107.5);
  group.add(seatNpcRoot);
  const seatNpc = createNpc({
    id: "seat-of-seeing",
    name: "Seat of Seeing",
    role: "seat",
    root: seatNpcRoot,
    dialogue: [
      "Visions swirl over the wide lands… the Eye seeks you.",
      "You rise from the Seat. The next road awaits.",
    ],
    required: true,
  });
  seatNpc.baseY = 12.4;
  seatNpc.phase = 1.2;
  game.anduinNpcs = [seatNpc];
  game.anduinQuest = {
    landed: false,
    seatSeen: false,
    boromirActive: false,
    boromirEscaped: false,
    boromirWarned: false,
  };
  game.anduinBoromir = cast.boromir;
  game.vehicleMode = null;

  return group;
}

export function resetAnduinQuest(game) {
  game.anduinQuest = {
    landed: false,
    seatSeen: false,
    boromirActive: false,
    boromirEscaped: false,
    boromirWarned: false,
  };
  game.vehicleMode = "boat";
  resetNpcs(game.anduinNpcs || []);

  // Reseat Boromir in Merry's boat if he was pulled ashore
  const boromir = game.anduinBoromir;
  const merryBoat = (game.anduinBoats || []).find((b) => !b.isPlayer && b.followOffset.x < 0);
  if (boromir && merryBoat && boromir.root.parent !== merryBoat.root) {
    merryBoat.root.add(boromir.root);
    boromir.root.position.set(0, 0.35, -1.15);
    boromir.root.rotation.set(0, 0, 0);
    if (boromir.model) boromir.model.rotation.set(0.08, 0, 0);
  }

  const spawn = game.anduinBoatSpawn || A(0, ANDUIN_WATER_Y, -70);
  for (const boat of game.anduinBoats || []) {
    boat.speed = 0;
    boat.yaw = 0;
    boat.root.rotation.y = 0;
    if (boat.isPlayer) {
      boat.root.position.copy(spawn);
    } else {
      boat.root.position.set(
        spawn.x + boat.followOffset.x,
        spawn.y,
        spawn.z + boat.followOffset.z
      );
    }
  }

  if (game.player) {
    game.player.root.visible = true;
    const pb = game.anduinPlayerBoat?.root;
    if (pb) {
      game.player.root.position.set(
        pb.position.x + 0.35,
        pb.position.y + 0.35,
        pb.position.z + 0.2
      );
      game.player.root.rotation.set(0, 0, 0);
      game.player.model.rotation.set(0.08, 0, 0);
      game.player.model.position.set(0, 0, 0);
      game.player.velocity.set(0, 0, 0);
      game.player.swordPivot.visible = false;
    }
  }

  for (const c of game.anduinCompanions || []) {
    if (c.model) c.model.rotation.set(0.08, 0, 0);
  }
}

export function anduinSpawn() {
  return A(0, ANDUIN_WATER_Y + 0.35, -70);
}

export function nearestAnduinNpc(game) {
  if (game.vehicleMode === "boat") return null;
  return nearestNpc(game.anduinNpcs || [], game.player.root.position, TALK_RANGE + 0.6);
}

export function trySeatOfSeeing(game) {
  const npc = nearestAnduinNpc(game);
  if (!npc || !game.anduinQuest?.landed || game.anduinQuest.seatSeen) return false;
  if (!game.anduinQuest.boromirEscaped) {
    game.showGameMessage?.("Boromir still bars the way — use the Ring (Q) and slip past him first.", 2800);
    return false;
  }

  game.anduinQuest.seatSeen = true;
  npc.spoken = true;
  game.showGameMessage?.(
    "From the Seat of Seeing, the wide world unfolds… then the Eye turns toward you.",
    4200
  );
  game.setAnduinQuestStage?.(4);
  window.setTimeout(() => {
    if (game.levelId === "anduin" && game.anduinQuest?.seatSeen) {
      game.completeAnduin?.();
    }
  }, 3400);
  return true;
}

function resolveBoatCollisions(game, boat, dx, dz) {
  const pos = boat.root.position;
  const radius = boat.isPlayer ? 1.1 : 0.95;
  const nextX = pos.x + dx;
  const nextZ = pos.z + dz;
  let hit = false;
  let outDx = dx;
  let outDz = dz;

  for (const c of game.colliders) {
    if (!c.active || c.level !== "anduin") continue;
    if (c.minY > 3.5) continue; // ignore tall Argonath tops for hull
    // AI boats skip river-rock hazards and only bounce off banks / solid walls
    if (!boat.isPlayer && c.hazard) continue;
    const overlapsX = nextX + radius > c.minX && nextX - radius < c.maxX;
    const overlapsZ = nextZ + radius > c.minZ && nextZ - radius < c.maxZ;
    if (!overlapsX || !overlapsZ) continue;
    const overlapsNowX = pos.x + radius > c.minX && pos.x - radius < c.maxX;
    const overlapsNowZ = pos.z + radius > c.minZ && pos.z - radius < c.maxZ;
    if (!overlapsNowX && overlapsX) outDx = 0;
    if (!overlapsNowZ && overlapsZ) outDz = 0;
    if (overlapsNowX && overlapsNowZ) {
      const midX = (c.minX + c.maxX) / 2;
      outDx += pos.x < midX ? -0.06 : 0.06;
    }
    hit = true;
  }

  pos.x += outDx;
  pos.z += outDz;
  pos.y = ANDUIN_ORIGIN.y + ANDUIN_WATER_Y;

  if (hit) {
    boat.speed *= boat.isPlayer ? 0.45 : 0.75;
    if (boat.isPlayer && game.anduinHitCooldown <= 0) {
      game.anduinHitCooldown = 0.7;
      game.fx?.addTrauma?.(0.28);
      game.sfx?.swordHit?.();
      game.showGameMessage?.("The boat scrapes rock — steer for deeper water!", 1400);
    }
  }
  return hit;
}

function landAtParthGalen(game) {
  if (!game.anduinQuest || game.anduinQuest.landed) return;
  game.anduinQuest.landed = true;
  game.anduinCanLand = false;
  game.vehicleMode = null;

  const dock = game.anduinDockPoint || A(-10, ANDUIN_WATER_Y, 86);
  const shore = game.anduinShoreSpawn || A(-14, 0.6, 86);

  // Ease boats into the dock, then step Frodo onto the wooden pier
  const pb = game.anduinPlayerBoat;
  if (pb) {
    pb.speed = 0;
    pb.root.position.set(dock.x, ANDUIN_ORIGIN.y + ANDUIN_WATER_Y, dock.z);
    pb.root.rotation.y = -Math.PI / 2;
    pb.yaw = -Math.PI / 2;
  }
  let i = 0;
  for (const boat of game.anduinBoats || []) {
    if (boat.isPlayer) continue;
    boat.speed = 0;
    boat.root.position.set(
      dock.x + 2.2 + i * 2.4,
      ANDUIN_ORIGIN.y + ANDUIN_WATER_Y,
      dock.z - 3 - i * 2.2
    );
    boat.root.rotation.y = -Math.PI / 2;
    i += 1;
  }

  game.player.root.position.copy(shore);
  game.player.root.rotation.set(0, -Math.PI / 2, 0);
  game.player.model.rotation.set(0, 0, 0);
  game.player.model.position.set(0, 0, 0);
  game.player.velocity.set(0, 0, 0);
  game.player.swordPivot.visible = true;
  game.player.onGround = true;

  // Boromir comes ashore and waits on the path to Amon Hen
  releaseBoromirAshore(game);

  game.setAnduinQuestStage?.(1);
  game.showGameMessage?.(
    "You step onto the dock at Parth Galen. Climb the walkway — but beware Boromir's desire for the Ring.",
    4000
  );
}

function releaseBoromirAshore(game) {
  const boromir = game.anduinBoromir;
  if (!boromir?.root) return;
  const spot = A(-20, 0.6, 90);
  // Detach from boat into the world
  if (boromir.root.parent) {
    boromir.root.parent.remove(boromir.root);
  }
  game.scene.add(boromir.root);
  boromir.root.position.copy(spot);
  boromir.root.rotation.set(0, Math.PI, 0);
  if (boromir.model) boromir.model.rotation.set(0, 0, 0);
  boromir.baseY = spot.y;
  game.anduinQuest.boromirActive = false;
  game.anduinQuest.boromirEscaped = false;
  game.anduinQuest.boromirWarned = false;
  game.anduinBoromirChase = 0;
}

export function nearAnduinDock(game) {
  if (game.vehicleMode !== "boat" || !game.anduinPlayerBoat) return false;
  const local = localOf(game.anduinPlayerBoat.root.position);
  return local.z >= LANDING_Z && local.x <= LANDING_X_MAX;
}

export function tryLandBoat(game) {
  if (!nearAnduinDock(game)) return false;
  landAtParthGalen(game);
  return true;
}

export function updateAnduinBoat(game, delta) {
  if (game.vehicleMode !== "boat" || !game.anduinPlayerBoat) return;

  game.anduinHitCooldown = Math.max(0, (game.anduinHitCooldown || 0) - delta);
  const boat = game.anduinPlayerBoat;
  const input = game.input.getMoveInput();

  // W/S or Up/Down paddle; A/D or Left/Right point the boat's nose
  boat.yaw += input.right * BOAT_YAW_RATE * delta;
  const thrust = input.forward * BOAT_ACCEL * (input.run ? 1.25 : 1);
  boat.speed += thrust * delta;
  boat.speed -= boat.speed * BOAT_DRAG * delta;
  boat.speed = THREE.MathUtils.clamp(boat.speed, -BOAT_MAX_SPEED * 0.35, BOAT_MAX_SPEED);

  const facingX = Math.sin(boat.yaw);
  const facingZ = Math.cos(boat.yaw);
  const dx = facingX * boat.speed * delta;
  const dz = facingZ * boat.speed * delta + RIVER_CURRENT * delta;

  resolveBoatCollisions(game, boat, dx, dz);
  boat.root.rotation.y = boat.yaw;
  // Gentle bob
  boat.root.position.y =
    ANDUIN_ORIGIN.y + ANDUIN_WATER_Y + Math.sin(game.gameTime * 2.2) * 0.04;

  // Keep Frodo seated in the lead boat
  game.player.root.position.set(
    boat.root.position.x + Math.cos(boat.yaw) * 0.35,
    boat.root.position.y + 0.35,
    boat.root.position.z + Math.sin(boat.yaw) * 0.2
  );
  game.player.root.rotation.y = boat.yaw;
  game.player.model.rotation.set(0.08, 0, 0);
  game.player.velocity.set(facingX * boat.speed, 0, facingZ * boat.speed + RIVER_CURRENT);
  game.player.onGround = true;
  game.player.swordPivot.visible = false;

  // AI boats trail in clear center lanes (narrower offsets, ignore rock hazards)
  for (const ai of game.anduinBoats || []) {
    if (ai.isPlayer) continue;
    const laneX = THREE.MathUtils.clamp(
      boat.root.position.x + Math.sign(ai.followOffset.x || 1) * Math.min(Math.abs(ai.followOffset.x), 2.6),
      -AI_LANE_LIMIT,
      AI_LANE_LIMIT
    );
    const targetX = laneX;
    const targetZ = boat.root.position.z + ai.followOffset.z;
    const ax = targetX - ai.root.position.x;
    const az = targetZ - ai.root.position.z;
    const dist = Math.hypot(ax, az);
    const followSpeed = Math.min(BOAT_MAX_SPEED * 0.95, 3.2 + dist * 0.9);
    if (dist > 0.05) {
      const step = Math.min(followSpeed * delta, dist);
      const mx = (ax / dist) * step;
      const mz = (az / dist) * step + RIVER_CURRENT * 0.45 * delta;
      resolveBoatCollisions(game, ai, mx, mz);
      ai.yaw = Math.atan2(ax, Math.max(az, 0.2));
      ai.root.rotation.y = ai.yaw;
    } else {
      ai.root.position.z += RIVER_CURRENT * 0.45 * delta;
      ai.yaw = boat.yaw * 0.85;
      ai.root.rotation.y = ai.yaw;
    }
    // Soft clamp into the clear channel if a bounce pushed them wide
    ai.root.position.x = THREE.MathUtils.clamp(
      ai.root.position.x,
      ANDUIN_ORIGIN.x - AI_LANE_LIMIT,
      ANDUIN_ORIGIN.x + AI_LANE_LIMIT
    );
    ai.root.position.y =
      ANDUIN_ORIGIN.y + ANDUIN_WATER_Y + Math.sin(game.gameTime * 2 + ai.followOffset.x) * 0.04;
  }

  // Soft pull toward the dock once you're in the landing bay, then allow E / auto-step ashore
  const local = localOf(boat.root.position);
  game.anduinCanLand = local.z >= LANDING_Z && local.x <= LANDING_X_MAX;
  if (game.anduinCanLand) {
    const dock = game.anduinDockPoint || A(-10, ANDUIN_WATER_Y, 86);
    const pullX = dock.x - boat.root.position.x;
    const pullZ = dock.z - boat.root.position.z;
    boat.root.position.x += pullX * Math.min(1, 1.8 * delta);
    boat.root.position.z += pullZ * Math.min(1, 1.4 * delta);
    boat.speed *= 0.85;
    const distDock = Math.hypot(pullX, pullZ);
    // Close enough to the pier: step ashore (E still works via Actions too)
    if (distDock < 2.8 || (local.x <= DOCK_LAND_X && local.z >= DOCK_LAND_Z)) {
      landAtParthGalen(game);
    }
  }
}

export function updateAnduinLevel(game, time, delta = 1 / 60) {
  updateNpcIdle(game.anduinNpcs || [], time);
  for (const c of game.anduinCompanions || []) {
    if (!c.root?.parent || c === game.anduinBoromir) continue;
    const base = c.baseY ?? c.root.position.y;
    c.baseY = base;
    c.root.position.y = base + Math.sin(time * 1.6 + (c.phase || 0)) * 0.02;
  }
  updateBoromirConfrontation(game, delta);
}

function updateBoromirConfrontation(game, delta) {
  const quest = game.anduinQuest;
  const boromir = game.anduinBoromir;
  if (!quest?.landed || quest.boromirEscaped || !boromir?.root || game.vehicleMode === "boat") {
    return;
  }

  const playerPos = game.player.root.position;
  const bPos = boromir.root.position;
  const dist = Math.hypot(playerPos.x - bPos.x, playerPos.z - bPos.z);

  // Trigger when Frodo nears him on the path
  if (!quest.boromirActive && dist < 7.5) {
    quest.boromirActive = true;
    game.setAnduinQuestStage?.(2);
    game.showGameMessage?.(
      "Boromir: \"It should be mine! Give me the Ring!\" — Press Q to vanish and escape!",
      4200
    );
  }
  if (!quest.boromirActive) return;

  // Chase Frodo unless he is invisible
  if (!game.ringInvisible) {
    const dx = playerPos.x - bPos.x;
    const dz = playerPos.z - bPos.z;
    if (dist > 0.35) {
      const step = Math.min(3.4 * delta, dist);
      bPos.x += (dx / dist) * step;
      bPos.z += (dz / dist) * step;
      boromir.root.rotation.y = Math.atan2(dx, dz);
    }
    bPos.y = game.getGroundHeight?.(bPos.x, bPos.z) ?? bPos.y;

    if (dist < 1.55) {
      // Reach for the Ring — shove Frodo back
      const push = 2.2;
      playerPos.x -= (dx / Math.max(dist, 0.1)) * push * delta * 8;
      playerPos.z -= (dz / Math.max(dist, 0.1)) * push * delta * 8;
      if (!quest.boromirWarned || (game.anduinBoromirChase || 0) <= 0) {
        quest.boromirWarned = true;
        game.anduinBoromirChase = 1.6;
        game.fx?.addTrauma?.(0.45);
        game.showGameMessage?.("Boromir almost seizes the Ring — use Q to turn invisible!", 2200);
      }
    }
    game.anduinBoromirChase = Math.max(0, (game.anduinBoromirChase || 0) - delta);
  } else {
    // Invisible: Boromir searches, confused — escape when far enough
    boromir.root.rotation.y += delta * 1.8;
    game.anduinBoromirChase = (game.anduinBoromirChase || 0) + delta;
    if (dist > 9 || game.anduinBoromirChase > 3.5) {
      quest.boromirActive = false;
      quest.boromirEscaped = true;
      game.anduinBoromirChase = 0;
      // Boromir collapses in shame away from the path
      bPos.set(
        ANDUIN_ORIGIN.x - 26,
        game.getGroundHeight?.(ANDUIN_ORIGIN.x - 26, ANDUIN_ORIGIN.z + 92) ?? 0.6,
        ANDUIN_ORIGIN.z + 92
      );
      game.setAnduinQuestStage?.(3);
      game.showGameMessage?.(
        "Boromir: \"What have I done?\" — You slip away. Climb to the Seat of Seeing.",
        4000
      );
    }
  }
}

import * as THREE from "three";
import { createFellow, createFellowshipCast } from "../fellowship.js";
import { createNpc, nearestNpc, resetNpcs, updateNpcIdle, TALK_RANGE } from "../npcs.js";
import {
  buildLothlorienWorld,
  animateLothlorienWorld,
  L,
  LOTHLORIEN_ORIGIN,
} from "../lothlorienProps.js";

export { LOTHLORIEN_ORIGIN, animateLothlorienWorld };

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.6,
    metalness: options.metalness ?? 0.05,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 1,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
}

function mesh(geometry, material) {
  const object = new THREE.Mesh(geometry, material);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function createNameLabel(name) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 72;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(37, 54, 36, 0.62)";
  ctx.beginPath();
  ctx.roundRect(14, 9, 292, 52, 20);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 250, 221, 0.96)";
  ctx.font = "600 29px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 160, 35);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  }));
  label.scale.set(2.2, 0.5, 1);
  return label;
}

function makeElvenSword(length = 1) {
  const group = new THREE.Group();
  const grip = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.22, 8), mat(0x4d3a2b, { roughness: 0.78 }));
  const guard = mesh(new THREE.TorusGeometry(0.15, 0.018, 7, 16, Math.PI), mat(0xd9bd62, { metalness: 0.8, roughness: 0.24 }));
  guard.rotation.z = Math.PI / 2;
  guard.position.y = 0.12;
  const blade = mesh(new THREE.BoxGeometry(0.065, length, 0.02), mat(0xe9f2f2, { metalness: 0.9, roughness: 0.16 }));
  blade.position.y = 0.15 + length / 2;
  group.add(grip, guard, blade);
  return group;
}

function makeGaladhrimBow() {
  const group = new THREE.Group();
  const bow = mesh(new THREE.TorusGeometry(0.58, 0.025, 8, 28, Math.PI * 1.6), mat(0xe0bd63, { roughness: 0.6 }));
  bow.rotation.z = -Math.PI * 0.8;
  const string = mesh(new THREE.BoxGeometry(0.01, 1.08, 0.01), mat(0xf0ead5, { roughness: 0.9 }));
  group.add(bow, string);
  return group;
}

function makeGiftGroup(id) {
  const gift = new THREE.Group();
  const silver = mat(0xdce6e2, { metalness: 0.72, roughness: 0.22 });
  const gold = mat(0xd6b456, { metalness: 0.76, roughness: 0.25 });
  const green = mat(0x718b57, { roughness: 0.86 });

  const cloak = mesh(new THREE.ConeGeometry(0.28, 0.75, 10, 1, true), green);
  cloak.position.set(0, 0.82, -0.15);
  cloak.rotation.x = Math.PI;
  const brooch = mesh(new THREE.SphereGeometry(0.055, 9, 7), silver);
  brooch.scale.set(0.7, 1.25, 0.4);
  brooch.position.set(0, 1.08, 0.19);
  gift.add(cloak, brooch);

  let equipment;
  if (id === "legolas") {
    equipment = makeGaladhrimBow();
  } else if (id === "gimli") {
    equipment = new THREE.Group();
    const haft = mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.05, 8), mat(0x694426, { roughness: 0.84 }));
    const axe = mesh(new THREE.BoxGeometry(0.62, 0.28, 0.1), silver);
    axe.position.set(0.2, 0.48, 0);
    equipment.add(haft, axe);
  } else if (id === "sam") {
    equipment = mesh(new THREE.TorusGeometry(0.24, 0.035, 8, 22), mat(0xc7b07a, { roughness: 0.9 }));
  } else if (id === "gandalf") {
    equipment = new THREE.Group();
    const staff = mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.7, 8), mat(0xd5d0c2, { roughness: 0.74 }));
    staff.position.y = 0.72;
    const light = mesh(new THREE.OctahedronGeometry(0.13, 0), mat(0xf4fbff, { emissive: 0xa8d8ff, emissiveIntensity: 1.8 }));
    light.position.y = 1.6;
    equipment.add(staff, light);
  } else {
    equipment = makeElvenSword(id === "merry" || id === "pippin" ? 0.65 : 1.05);
  }
  equipment.position.set(0.38, 0.62, 0.05);
  equipment.rotation.z = -0.42;
  gift.add(equipment);

  if (id === "aragorn" || id === "boromir") {
    const belt = mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 20), gold);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.62;
    gift.add(belt);
  }
  gift.visible = false;
  return gift;
}

function createGaladriel() {
  const body = createFellow({
    height: 1.88,
    skinColor: 0xf1d4ba,
    tunic: 0xf2eee2,
    pants: 0xd9e0dc,
    hair: 0xf3df9d,
    cloak: 0xe7e5da,
  });
  const gown = mesh(
    new THREE.ConeGeometry(0.42, 1.35, 18, 1, true),
    mat(0xf5f2e8, { roughness: 0.58 })
  );
  gown.position.y = 0.68;
  const crown = mesh(
    new THREE.TorusGeometry(0.16, 0.018, 8, 24),
    mat(0xe7d58b, { metalness: 0.75, roughness: 0.22 })
  );
  crown.rotation.x = Math.PI / 2;
  crown.position.y = 1.78;
  const aura = new THREE.PointLight(0xfff2c2, 1.5, 10, 2);
  aura.position.y = 1.35;
  body.root.add(gown, crown, aura);
  return body;
}

function grantFrodoPhial(game) {
  if (game.frodoPhial) {
    game.frodoPhial.visible = true;
    return;
  }
  const phial = new THREE.Group();
  const glass = mesh(
    new THREE.OctahedronGeometry(0.09, 0),
    mat(0xeafaff, {
      emissive: 0xa8dcff,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.9,
    })
  );
  const light = new THREE.PointLight(0xd5f1ff, 1.3, 7, 2);
  phial.position.set(-0.2, 0.72, 0.18);
  phial.add(glass, light);
  game.player.root.add(phial);
  game.frodoPhial = phial;
}

export function buildLothlorienLevel(game) {
  if (game.lothlorienGroup) return game.lothlorienGroup;

  const group = new THREE.Group();
  group.name = "lothlorien";
  buildLothlorienWorld(game, group);
  game.scene.add(group);
  game.lothlorienGroup = group;

  const galadrielBody = createGaladriel();
  galadrielBody.root.position.set(0, 8, 45);
  galadrielBody.root.rotation.y = Math.PI;
  const label = createNameLabel("Galadriel");
  label.position.y = 2.25;
  galadrielBody.root.add(label);
  group.add(galadrielBody.root);
  const galadriel = createNpc({
    id: "galadriel",
    name: "Galadriel",
    role: "galadriel",
    root: galadrielBody.root,
    dialogue: "Welcome, bearers of great hope. Rest beneath the mallorn leaves, and receive gifts for the road ahead.",
    required: true,
  });
  galadriel.baseY = 8;
  galadriel.phase = 0;
  game.lothlorienNpcs = [galadriel];

  const cast = createFellowshipCast();
  const placements = [
    ["gandalf", -4.8, 39.5], ["aragorn", 4.8, 39.5],
    ["legolas", -5.4, 42.5], ["gimli", 5.4, 42.5],
    ["boromir", -4.2, 45], ["sam", 4.2, 45],
    ["merry", -1.8, 42], ["pippin", 1.8, 42],
  ];
  game.lothlorienCompanions = [];
  game.lothlorienGiftGroups = [];
  for (const [id, x, z] of placements) {
    const body = cast[id];
    body.root.position.set(x, 8, z);
    body.root.rotation.y = Math.PI;
    const gift = makeGiftGroup(id);
    body.root.add(gift);
    group.add(body.root);
    game.lothlorienCompanions.push({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      root: body.root,
      baseY: 8,
      phase: Math.random() * Math.PI * 2,
    });
    game.lothlorienGiftGroups.push(gift);
  }

  game.lothlorienQuest = { stage: 0, giftsGiven: false };
  return group;
}

export function resetLothlorienQuest(game) {
  if (game.lothlorienCompleteTimer) {
    window.clearTimeout(game.lothlorienCompleteTimer);
    game.lothlorienCompleteTimer = null;
  }
  resetNpcs(game.lothlorienNpcs || []);
  if (game.lothlorienQuest) {
    game.lothlorienQuest.stage = 0;
    game.lothlorienQuest.giftsGiven = false;
  }
  for (const gift of game.lothlorienGiftGroups || []) {
    gift.visible = false;
  }
  if (game.frodoPhial) game.frodoPhial.visible = false;
}

export function nearestLothlorienNpc(game) {
  return nearestNpc(game.lothlorienNpcs || [], game.player.root.position, TALK_RANGE);
}

export function tryGaladrielInteraction(game) {
  const npc = nearestLothlorienNpc(game);
  if (!npc || !game.lothlorienQuest) {
    game.showGameMessage?.("Move closer to Galadriel.", 1200);
    return;
  }
  if (game.lothlorienQuest.stage === 0) {
    npc.spoken = true;
    game.lothlorienQuest.stage = 1;
    game.setLothlorienQuestStage?.(1);
    game.showGameMessage?.(`Galadriel: "${npc.dialogue}"`, 4200);
    return;
  }
  if (game.lothlorienQuest.stage === 1) {
    game.lothlorienQuest.stage = 2;
    game.lothlorienQuest.giftsGiven = true;
    for (const gift of game.lothlorienGiftGroups || []) gift.visible = true;
    grantFrodoPhial(game);
    game.setLothlorienQuestStage?.(2);
    game.showGameMessage?.(
      "Elven cloaks, blades, bow, rope, belts, and the Phial of Galadriel are given to the Fellowship.",
      4200
    );
    game.lothlorienCompleteTimer = window.setTimeout(() => {
      if (game.levelId === "lothlorien" && game.lothlorienQuest?.giftsGiven) {
        game.completeLothlorien?.();
      }
    }, 3200);
  }
}

export function updateLothlorienLevel(game, time) {
  updateNpcIdle(game.lothlorienNpcs || [], time);
  updateNpcIdle(game.lothlorienCompanions || [], time);
  animateLothlorienWorld(game, time);
}

export function lothlorienSpawn() {
  return L(0, 0, -47);
}

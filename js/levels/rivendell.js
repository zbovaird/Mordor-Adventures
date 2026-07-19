import * as THREE from "three";
import { createFellowshipCast } from "../fellowship.js";
import { createNpc, resetNpcs } from "../npcs.js";
import { buildRivendellWorld, RIVENDELL_ORIGIN, W } from "../rivendellProps.js";

export { RIVENDELL_ORIGIN };

function createNameLabel(name) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(28, 38, 31, 0.58)";
  ctx.beginPath();
  ctx.roundRect(12, 9, 232, 46, 18);
  ctx.fill();
  ctx.font = "600 27px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255, 249, 224, 0.92)";
  ctx.fillText(name, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    })
  );
  label.scale.set(1.7, 0.43, 1);
  label.renderOrder = 2;
  return label;
}

/**
 * Build Rivendell once and register Fellowship NPCs + quest state on the game.
 */
export function buildRivendellLevel(game) {
  if (game.rivendellGroup) {
    return game.rivendellGroup;
  }

  const group = new THREE.Group();
  group.name = "rivendell";
  buildRivendellWorld(game, group);
  game.scene.add(group);
  game.rivendellGroup = group;

  const cast = createFellowshipCast();
  const placements = [
    { id: "elrond", key: "elrond", x: 8, z: 3.4, yaw: Math.PI, dialogue: "Welcome, Frodo of the Shire. Gather your friends — the Council awaits." },
    { id: "gandalf", key: "gandalf", x: 4.5, z: 4.2, yaw: 0.4, dialogue: "A wizard is never late. Come — courage will find you." },
    { id: "aragorn", key: "aragorn", x: 11.5, z: 4.2, yaw: -0.5, dialogue: "If by my life or death I can protect you, I will." },
    { id: "legolas", key: "legolas", x: 13, z: 7.1, yaw: -1, dialogue: "The air is sweet here. Your quest has friends." },
    { id: "gimli", key: "gimli", x: 3, z: 7.1, yaw: 0.8, dialogue: "And my axe! …er, for later. For now, hello!" },
    { id: "boromir", key: "boromir", x: 10.5, z: 7.2, yaw: Math.PI, dialogue: "Gondor stands with you, little hobbit." },
    { id: "sam", key: "sam", x: 5.5, z: 7.2, yaw: 0.2, dialogue: "I'm coming with you, Mr. Frodo. Don't you leave me!" },
    { id: "merry", key: "merry", x: 7, z: 9.2, yaw: -0.3, dialogue: "You can trust us to stick with you — through thick and thin!" },
    { id: "pippin", key: "pippin", x: 9.5, z: 9.2, yaw: Math.PI * 0.7, dialogue: "This is Rivendell? Brilliant! …What do we do now?" },
  ];

  game.npcs = [];
  for (const place of placements) {
    const body = cast[place.key];
    body.root.position.set(place.x, 1.2, place.z);
    body.root.rotation.y = place.yaw;
    group.add(body.root);
    const label = createNameLabel(place.id.charAt(0).toUpperCase() + place.id.slice(1));
    const bounds = new THREE.Box3().setFromObject(body.root);
    label.position.y = bounds.max.y - body.root.position.y + 0.3;
    body.root.add(label);
    const npc = createNpc({
      id: place.id,
      name: place.id.charAt(0).toUpperCase() + place.id.slice(1),
      role: place.id === "elrond" ? "elrond" : "fellow",
      root: body.root,
      dialogue: place.dialogue,
      required: place.id === "elrond",
    });
    npc.baseY = body.root.position.y;
    npc.phase = Math.random() * Math.PI * 2;
    game.npcs.push(npc);
  }

  game.rivendellQuest = {
    spokenToElrond: false,
    gathered: 0,
    needed: 8,
  };

  game.rivendellSpawn = W(-8, 1.0, -10);
  return group;
}

export function resetRivendellQuest(game) {
  if (!game.npcs) {
    return;
  }
  resetNpcs(game.npcs);
  if (game.rivendellQuest) {
    game.rivendellQuest.spokenToElrond = false;
    game.rivendellQuest.gathered = 0;
  }
}

export function animateRivendellWater(game, time) {
  if (!game.rivendellWater) {
    return;
  }
  for (const mesh of game.rivendellWater) {
    if (!mesh.material) {
      continue;
    }
    mesh.material.opacity = 0.65 + Math.sin(time * 2) * 0.08;
    if (mesh.material.map) {
      mesh.material.map.offset.y = (time * 0.35) % 1;
      mesh.material.map.needsUpdate = true;
    }
  }
}

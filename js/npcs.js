import * as THREE from "three";

const TALK_RANGE = 2.6;

/**
 * Simple talkable NPC registry for Rivendell.
 */
export function createNpc(opts) {
  return {
    id: opts.id,
    name: opts.name,
    role: opts.role || "fellow",
    root: opts.root,
    dialogue: opts.dialogue,
    spoken: false,
    required: Boolean(opts.required),
  };
}

export function nearestNpc(npcs, playerPos, maxRange = TALK_RANGE) {
  let best = null;
  let bestDist = maxRange;
  const npcWorldPos = new THREE.Vector3();
  for (const npc of npcs) {
    if (!npc.root?.position) {
      continue;
    }
    // Ignore height so terrace/hall floor differences do not block talking.
    npc.root.getWorldPosition(npcWorldPos);
    const dx = playerPos.x - npcWorldPos.x;
    const dz = playerPos.z - npcWorldPos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < bestDist) {
      best = npc;
      bestDist = dist;
    }
  }
  return best;
}

export function countSpoken(npcs, predicate = () => true) {
  return npcs.filter((n) => predicate(n) && n.spoken).length;
}

export function resetNpcs(npcs) {
  for (const npc of npcs) {
    npc.spoken = false;
  }
}

/** Soft bob so NPCs feel alive. */
export function updateNpcIdle(npcs, time) {
  for (const npc of npcs) {
    if (!npc.root) {
      continue;
    }
    const base = npc.baseY ?? 0;
    npc.root.position.y = base + Math.sin(time * 2 + (npc.phase || 0)) * 0.02;
  }
}

export { TALK_RANGE };

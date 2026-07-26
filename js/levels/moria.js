import * as THREE from "three";
import { createRealisticOrc } from "../realisticOrc.js";
import { createFellowshipCast } from "../fellowship.js";
import { buildMoriaWorld, animateMoriaWorld, M, MORIA_ORIGIN } from "../moriaProps.js";

export { MORIA_ORIGIN, animateMoriaWorld };

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.65,
    metalness: opts.metalness ?? 0.05,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
}

function mesh(geometry, material) {
  const object = new THREE.Mesh(geometry, material);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function makeSword(length = 1.05) {
  const weapon = new THREE.Group();
  const grip = mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.22, 8), mat(0x4a2f23, { roughness: 0.8 }));
  const guard = mesh(new THREE.BoxGeometry(0.34, 0.045, 0.06), mat(0xc5a24a, { metalness: 0.75, roughness: 0.28 }));
  guard.position.y = 0.13;
  const blade = mesh(new THREE.BoxGeometry(0.075, length, 0.025), mat(0xd9e1e7, { metalness: 0.92, roughness: 0.2 }));
  blade.position.y = 0.13 + length / 2;
  const tip = mesh(new THREE.ConeGeometry(0.045, 0.16, 6), blade.material);
  tip.position.y = 0.21 + length;
  weapon.add(grip, guard, blade, tip);
  return weapon;
}

function makeAxe() {
  const weapon = new THREE.Group();
  const haft = mesh(new THREE.CylinderGeometry(0.035, 0.045, 1, 8), mat(0x5b3824, { roughness: 0.85 }));
  haft.position.y = 0.4;
  const head = mesh(new THREE.BoxGeometry(0.55, 0.3, 0.12), mat(0x858b90, { metalness: 0.8, roughness: 0.3 }));
  head.position.set(0.15, 0.88, 0);
  const edge = mesh(new THREE.ConeGeometry(0.24, 0.38, 4), head.material);
  edge.rotation.z = -Math.PI / 2;
  edge.position.set(0.48, 0.88, 0);
  weapon.add(haft, head, edge);
  return weapon;
}

function makeBow() {
  const weapon = new THREE.Group();
  const bow = mesh(
    new THREE.TorusGeometry(0.48, 0.025, 7, 24, Math.PI * 1.55),
    mat(0x8b5a2b, { roughness: 0.78 })
  );
  bow.rotation.z = -Math.PI * 0.78;
  const string = mesh(new THREE.BoxGeometry(0.012, 0.92, 0.012), mat(0xd8d1bd, { roughness: 0.9 }));
  weapon.add(bow, string);
  return weapon;
}

function makeStaff() {
  const weapon = new THREE.Group();
  const staff = mesh(new THREE.CylinderGeometry(0.035, 0.055, 1.65, 9), mat(0x6d5a3c, { roughness: 0.9 }));
  staff.position.y = 0.72;
  const crystal = mesh(new THREE.OctahedronGeometry(0.13, 0), mat(0xe7f5ff, { emissive: 0x8ccfff, emissiveIntensity: 1.4 }));
  crystal.position.y = 1.6;
  const light = new THREE.PointLight(0xcbe9ff, 1, 7, 2);
  light.position.y = 1.6;
  weapon.add(staff, crystal, light);
  return weapon;
}

function equipAlly(body, id) {
  let weapon;
  let range = 2.1;
  let damage = 12;
  if (id === "gimli") {
    weapon = makeAxe();
    damage = 18;
  } else if (id === "legolas") {
    weapon = makeBow();
    range = 10;
    damage = 13;
  } else if (id === "gandalf") {
    weapon = makeStaff();
    range = 4.5;
    damage = 17;
  } else {
    weapon = makeSword(id === "sam" || id === "merry" || id === "pippin" ? 0.65 : 1.05);
    damage = id === "aragorn" || id === "boromir" ? 16 : 10;
  }
  weapon.position.set(0.34, 0.62, 0.08);
  weapon.rotation.z = -0.45;
  body.root.add(weapon);
  return { weapon, range, damage };
}

function createBalrog() {
  const root = new THREE.Group();
  const model = new THREE.Group();
  const shadow = mat(0x171012, { roughness: 0.86, emissive: 0x2a0800, emissiveIntensity: 0.65 });
  const armor = mat(0x2b2424, { roughness: 0.7, metalness: 0.25, emissive: 0x250700, emissiveIntensity: 0.45 });
  const fire = mat(0xff5a18, { roughness: 0.28, emissive: 0xff2400, emissiveIntensity: 2.4 });
  const ember = mat(0xffb02e, { roughness: 0.2, emissive: 0xff4a00, emissiveIntensity: 2.8 });

  const pelvis = mesh(new THREE.CapsuleGeometry(1.05, 0.65, 8, 15), armor);
  pelvis.position.y = 2.25;
  const body = mesh(new THREE.CapsuleGeometry(1.5, 2.5, 10, 18), shadow);
  body.position.y = 4.15;
  body.scale.set(1.05, 1, 0.82);
  const chestPlate = mesh(new THREE.DodecahedronGeometry(1.45, 0), armor);
  chestPlate.position.set(0, 4.75, 0.25);
  chestPlate.scale.set(1.25, 1.05, 0.72);
  const neck = mesh(new THREE.CylinderGeometry(0.62, 0.85, 1.05, 10), shadow);
  neck.position.y = 6.15;
  const head = mesh(new THREE.SphereGeometry(1.08, 18, 15), shadow);
  head.position.y = 7;
  head.scale.set(1.08, 0.92, 1.15);
  const muzzle = mesh(new THREE.BoxGeometry(1.3, 0.48, 0.72), armor);
  muzzle.position.set(0, 6.65, 0.92);
  const eyeL = mesh(new THREE.SphereGeometry(0.14, 10, 8), fire);
  eyeL.position.set(-0.38, 7.12, 1.02);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.38;
  const hornL = mesh(new THREE.ConeGeometry(0.32, 2.8, 10), armor);
  hornL.position.set(-1.12, 7.85, -0.05);
  hornL.rotation.z = -0.78;
  hornL.rotation.x = -0.18;
  const hornR = hornL.clone();
  hornR.position.x = 1;
  hornR.position.x = 1.12;
  hornR.rotation.z = 0.78;

  const legL = new THREE.Group();
  const legR = new THREE.Group();
  legL.position.set(-0.72, 2.75, 0);
  legR.position.set(0.72, 2.75, 0);
  for (const [leg, side] of [[legL, -1], [legR, 1]]) {
    const thigh = mesh(new THREE.CapsuleGeometry(0.48, 1.2, 7, 12), shadow);
    thigh.position.y = -0.65;
    const shin = mesh(new THREE.CapsuleGeometry(0.36, 1.05, 7, 12), armor);
    shin.position.set(0, -1.85, 0.16);
    const foot = mesh(new THREE.BoxGeometry(0.75, 0.38, 1.25), armor);
    foot.position.set(0, -2.55, 0.36);
    const claw = mesh(new THREE.ConeGeometry(0.12, 0.5, 7), ember);
    claw.rotation.x = Math.PI / 2;
    claw.position.set(side * 0.18, -2.55, 1.05);
    leg.add(thigh, shin, foot, claw);
  }

  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-1.5, 5.25, 0);
  armR.position.set(1.5, 5.25, 0);
  for (const [arm, side] of [[armL, -1], [armR, 1]]) {
    const upper = mesh(new THREE.CapsuleGeometry(0.38, 1.4, 7, 12), shadow);
    upper.position.set(side * 0.58, -0.4, 0);
    upper.rotation.z = side * -0.62;
    const forearm = mesh(new THREE.CapsuleGeometry(0.3, 1.25, 7, 12), armor);
    forearm.position.set(side * 1.25, -1.25, 0.2);
    forearm.rotation.z = side * -0.45;
    const hand = mesh(new THREE.SphereGeometry(0.38, 11, 9), shadow);
    hand.position.set(side * 1.65, -1.85, 0.38);
    arm.add(upper, forearm, hand);
  }

  const wingMat = mat(0x120d10, {
    roughness: 1,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });
  const wingL = mesh(new THREE.ConeGeometry(3.5, 6.5, 3), wingMat);
  wingL.position.set(-3.1, 4.1, -0.8);
  wingL.rotation.set(0.2, 0, -0.85);
  const wingR = wingL.clone();
  wingR.position.x = 3.1;
  wingR.rotation.z = 0.85;

  const fireParts = [];
  for (let i = 0; i < 18; i += 1) {
    const flame = mesh(new THREE.ConeGeometry(0.22 + (i % 3) * 0.08, 1.4 + (i % 4) * 0.3, 8), fire);
    const angle = (i / 18) * Math.PI * 2;
    flame.position.set(Math.cos(angle) * 1.3, 2.2 + (i % 6) * 0.82, Math.sin(angle) * 0.78);
    flame.rotation.z = Math.cos(angle) * 0.35;
    fireParts.push(flame);
  }

  const whip = new THREE.Group();
  whip.position.set(2.95, 3.35, 0.65);
  const whipSegments = [];
  for (let i = 0; i < 18; i += 1) {
    const segment = mesh(new THREE.SphereGeometry(0.16 - i * 0.004, 8, 7), i % 3 === 0 ? ember : fire);
    const t = i / 17;
    segment.position.set(0.15 + t * 6.4, -t * 2.4, Math.sin(t * Math.PI * 2) * (0.35 + t));
    whip.add(segment);
    whipSegments.push(segment);
  }

  const crackMat = mat(0xff6d22, { emissive: 0xff2600, emissiveIntensity: 2.6, roughness: 0.25 });
  for (let i = 0; i < 5; i += 1) {
    const crack = mesh(new THREE.TorusGeometry(0.55 + i * 0.12, 0.035, 6, 14, Math.PI * 0.72), crackMat);
    crack.position.set((i % 2 ? -1 : 1) * 0.25, 3.7 + i * 0.43, 1.02);
    crack.rotation.z = i % 2 ? 0.5 : -0.5;
    model.add(crack);
  }

  const glow = new THREE.PointLight(0xff3d00, 7, 38, 2);
  glow.position.set(0, 4.5, 1);
  model.add(
    pelvis, body, chestPlate, neck, head, muzzle, eyeL, eyeR, hornL, hornR,
    legL, legR, armL, armR, wingL, wingR, whip, glow, ...fireParts
  );
  root.add(model);
  return { root, model, fireParts, whip, whipSegments, legL, legR, armL, armR, wingL, wingR };
}

function worldPosition(object, target = new THREE.Vector3()) {
  return object.getWorldPosition(target);
}

function collectMaterials(model) {
  const unique = new Set();
  model.traverse((object) => {
    if (object.isMesh && object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => unique.add(material));
    }
  });
  return [...unique];
}

function applyHurtFlash(enemy) {
  if (!enemy.materials) return;
  const flashing = enemy.hurtTimer > 0;
  if (flashing === enemy._flashing) return;
  enemy._flashing = flashing;
  for (const material of enemy.materials) {
    if (material.userData.baseEmissive === undefined) {
      material.userData.baseEmissive = material.emissive.getHex();
      material.userData.baseEmissiveIntensity = material.emissiveIntensity;
    }
    if (flashing) {
      material.emissive.setHex(0xff3020);
      material.emissiveIntensity = 0.9;
    } else {
      material.emissive.setHex(material.userData.baseEmissive);
      material.emissiveIntensity = material.userData.baseEmissiveIntensity;
    }
  }
}

function nearestLiving(enemies, from, maxDistance = Infinity) {
  let nearest = null;
  let nearestDistance = maxDistance;
  const candidatePos = new THREE.Vector3();
  for (const enemy of enemies) {
    if (!enemy.alive || !enemy.root.visible) continue;
    worldPosition(enemy.root, candidatePos);
    const distance = from.distanceTo(candidatePos);
    if (distance < nearestDistance) {
      nearest = enemy;
      nearestDistance = distance;
    }
  }
  return { enemy: nearest, distance: nearestDistance };
}

export function buildMoriaLevel(game) {
  if (game.moriaGroup) return game.moriaGroup;

  const group = new THREE.Group();
  group.name = "moria";
  buildMoriaWorld(game, group);
  game.scene.add(group);
  game.moriaGroup = group;

  const orcSpawns = [
    [-4, -38], [4, -32], [-13, -18], [13, -16],
    [-4, -10], [5, -4], [-15, 3], [15, 8],
    [-5, 13], [6, 18], [-14, 26], [14, 29],
    [-6, 36], [7, 39], [-10, 47], [11, 50],
  ];
  game.moriaOrcs = orcSpawns.map(([x, z], index) => {
    const orc = createRealisticOrc();
    orc.root.position.set(x, 0, z);
    orc.root.rotation.y = index % 2 ? Math.PI : 0;
    group.add(orc.root);
    return {
      ...orc,
      id: `moria-orc-${index}`,
      name: "Moria Orc",
      kind: "orc",
      spawn: new THREE.Vector3(x, 0, z),
      hp: 42,
      maxHp: 42,
      alive: true,
      attackCooldown: 0.5 + Math.random(),
      hurtTimer: 0,
      speed: 1.65 + (index % 3) * 0.15,
      materials: collectMaterials(orc.model),
      knockback: null,
      dying: 0,
    };
  });

  const cast = createFellowshipCast();
  const allyDefs = [
    ["gandalf", -3.4, -51], ["aragorn", 3.4, -51],
    ["legolas", -5.4, -47.5], ["gimli", 5.4, -47.5],
    ["boromir", -3.2, -44.5], ["sam", 3.2, -44.5],
    ["merry", -1.3, -47], ["pippin", 1.3, -47],
  ];
  game.moriaAllies = allyDefs.map(([id, x, z], index) => {
    const body = cast[id];
    body.root.position.set(x, 0, z);
    group.add(body.root);
    const equipment = equipAlly(body, id);
    return {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      root: body.root,
      model: body.model,
      weapon: equipment.weapon,
      spawn: new THREE.Vector3(x, 0, z),
      range: equipment.range,
      damage: equipment.damage,
      formationAngle: (index / allyDefs.length) * Math.PI * 2,
      attackCooldown: Math.random() * 0.5,
      attackFlash: 0,
    };
  });

  const balrogBody = createBalrog();
  balrogBody.root.position.set(0, 0, 104);
  group.add(balrogBody.root);
  game.balrog = {
    ...balrogBody,
    id: "durins-bane",
    name: "Durin's Bane",
    kind: "balrog",
    hp: 320,
    maxHp: 320,
    alive: true,
    active: false,
    marching: false,
    moving: false,
    attackCooldown: 1.5,
    hurtTimer: 0,
    speed: 2.6,
    materials: collectMaterials(balrogBody.model),
    knockback: null,
    dying: 0,
  };
  game.moriaEnemies = [...game.moriaOrcs, game.balrog];
  return group;
}

export function resetMoriaLevel(game) {
  for (const orc of game.moriaOrcs || []) {
    orc.root.position.copy(orc.spawn);
    orc.root.rotation.set(0, 0, 0);
    orc.model.rotation.set(0, 0, 0);
    orc.root.visible = true;
    orc.hp = orc.maxHp;
    orc.alive = true;
    orc.attackCooldown = 0.5 + Math.random();
    orc.hurtTimer = 0;
    orc.knockback = null;
    orc.dying = 0;
    orc._flashing = undefined;
    applyHurtFlash(orc);
  }
  if (game.balrog) {
    game.balrog.root.position.set(0, 0, 104);
    game.balrog.root.rotation.set(0, 0, 0);
    game.balrog.model.rotation.set(0, 0, 0);
    game.balrog.root.visible = true;
    game.balrog.hp = game.balrog.maxHp;
    game.balrog.alive = true;
    game.balrog.active = false;
    game.balrog.marching = false;
    game.balrog.moving = false;
    game.balrog.attackCooldown = 1.5;
    game.balrog.knockback = null;
    game.balrog.dying = 0;
    game.balrog._flashing = undefined;
    applyHurtFlash(game.balrog);
  }
  for (const ally of game.moriaAllies || []) {
    ally.root.position.copy(ally.spawn);
    ally.root.rotation.set(0, 0, 0);
    ally.attackCooldown = Math.random() * 0.5;
    ally.attackFlash = 0;
  }
}

export function damageMoriaEnemy(game, enemy, damage) {
  if (!enemy?.alive) return false;
  enemy.hp = Math.max(0, enemy.hp - damage);
  enemy.hurtTimer = 0.18;
  if (enemy.hp <= 0) {
    enemy.alive = false;
    // Play out a fall + sink death instead of vanishing instantly
    enemy.dying = enemy.kind === "balrog" ? 2.6 : 1.35;
    game.sfx?.enemyDeath?.();
    if (enemy.kind === "balrog") {
      game.sfx?.balrogRoar?.();
      game.fx?.addTrauma?.(0.85);
      window.setTimeout(() => game.completeMoria?.(), 1900);
    }
  }
  game.refreshMoriaHud?.();
  return true;
}

function updateDyingEnemies(game, delta) {
  const all = [...(game.moriaOrcs || []), game.balrog].filter(Boolean);
  for (const enemy of all) {
    if (enemy.alive || !enemy.dying || !enemy.root.visible) continue;
    enemy.dying -= delta;
    const total = enemy.kind === "balrog" ? 2.6 : 1.35;
    const t = 1 - enemy.dying / total;
    const fallPhase = Math.min(t / 0.35, 1);
    enemy.model.rotation.x = -Math.PI / 2 * fallPhase * fallPhase;
    if (t > 0.5) {
      const sink = (t - 0.5) / 0.5;
      enemy.root.position.y -= delta * (enemy.kind === "balrog" ? 2.6 : 1.1) * sink;
    }
    if (enemy.dying <= 0) {
      enemy.root.visible = false;
      enemy.model.rotation.x = 0;
      enemy.dying = 0;
    }
  }
}

export function updateMoriaActors(game, delta, time) {
  const playerPos = game.player.root.position;
  updateDyingEnemies(game, delta);
  const allOrcsDefeated = (game.moriaOrcs || []).every((orc) => !orc.alive);
  if (allOrcsDefeated && game.balrog?.alive && !game.balrog.active) {
    game.balrog.active = true;
    game.balrog.marching = true;
    game.sfx?.balrogEntrance?.();
    game.fx?.addTrauma?.(0.7);
    game.showGameMessage?.("Durin's Bane strides across the bridge into the great hall!", 3600);
    game.refreshMoriaHud?.();
  }

  const activeEnemies = (game.moriaOrcs || []).filter((orc) => orc.alive);
  if (game.balrog?.alive && game.balrog.active) activeEnemies.push(game.balrog);

  const enemyPos = new THREE.Vector3();
  for (const enemy of activeEnemies) {
    worldPosition(enemy.root, enemyPos);
    enemy.attackCooldown -= delta;
    enemy.hurtTimer = Math.max(0, enemy.hurtTimer - delta);
    enemy.model.rotation.z = enemy.hurtTimer > 0 ? Math.sin(time * 45) * 0.12 : 0;
    applyHurtFlash(enemy);

    // Sword knockback impulse, decaying quickly
    if (enemy.knockback) {
      enemy.root.position.addScaledVector(enemy.knockback, delta);
      enemy.knockback.multiplyScalar(Math.exp(-7 * delta));
      if (enemy.knockback.lengthSq() < 0.04) {
        enemy.knockback = null;
      }
    }

    const toPlayer = playerPos.clone().sub(enemyPos);
    toPlayer.y = 0;
    const distance = toPlayer.length();
    const wakeRange = enemy.kind === "balrog" ? 24 : 16;
    const attackRange = enemy.kind === "balrog" ? 3.8 : 1.35;
    enemy.moving = false;
    if (enemy.kind === "balrog" && enemy.marching && distance > attackRange) {
      const marchDirection = new THREE.Vector3(-enemy.root.position.x, 0, 44 - enemy.root.position.z);
      if (marchDirection.length() > 1.5) {
        marchDirection.normalize();
        enemy.root.position.addScaledVector(marchDirection, enemy.speed * delta);
        enemy.root.rotation.y = Math.atan2(marchDirection.x, marchDirection.z);
        enemy.moving = true;
      } else {
        enemy.marching = false;
      }
    } else if (distance < wakeRange && distance > attackRange) {
      toPlayer.normalize();
      enemy.root.position.addScaledVector(toPlayer, enemy.speed * delta);
      enemy.root.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
      enemy.moving = true;
    } else if (distance <= attackRange && enemy.attackCooldown <= 0) {
      game.takePlayerDamage?.(enemy.kind === "balrog" ? 24 : 8, enemy.name || "Orc");
      if (enemy.kind === "balrog") {
        game.sfx?.whipCrack?.();
      }
      enemy.attackCooldown = enemy.kind === "balrog" ? 2.2 : 1.25 + Math.random() * 0.5;
    }
    enemy.root.position.y = game.getGroundHeight(
      MORIA_ORIGIN.x + enemy.root.position.x,
      MORIA_ORIGIN.z + enemy.root.position.z
    );
  }

  const playerLocal = playerPos.clone().sub(MORIA_ORIGIN);
  for (const ally of game.moriaAllies || []) {
    ally.attackCooldown -= delta;
    ally.attackFlash = Math.max(0, ally.attackFlash - delta);
    const allyWorld = worldPosition(ally.root);
    const { enemy, distance } = nearestLiving(activeEnemies, allyWorld, ally.range + 7);

    if (enemy) {
      const targetWorld = worldPosition(enemy.root);
      const direction = targetWorld.sub(allyWorld);
      direction.y = 0;
      if (distance > ally.range * 0.82) {
        direction.normalize();
        ally.root.position.addScaledVector(direction, (ally.id === "gimli" ? 2.2 : 2.7) * delta);
      } else if (ally.attackCooldown <= 0) {
        damageMoriaEnemy(game, enemy, enemy.kind === "balrog" ? ally.damage * 0.25 : ally.damage);
        ally.attackCooldown = ally.id === "legolas" ? 0.85 : 1.05;
        ally.attackFlash = 0.28;
      }
      ally.root.rotation.y = Math.atan2(direction.x, direction.z);
    } else {
      const radius = 3.2 + (ally.id === "legolas" ? 1.4 : 0);
      const desired = new THREE.Vector3(
        playerLocal.x + Math.sin(ally.formationAngle) * radius,
        0,
        playerLocal.z + Math.cos(ally.formationAngle) * radius - 1.5
      );
      const follow = desired.sub(ally.root.position);
      follow.y = 0;
      if (follow.length() > 1.4) {
        follow.normalize();
        ally.root.position.addScaledVector(follow, 3.1 * delta);
        ally.root.rotation.y = Math.atan2(follow.x, follow.z);
      }
    }
    const swing = ally.attackFlash > 0 ? Math.sin((ally.attackFlash / 0.28) * Math.PI) : 0;
    ally.weapon.rotation.x = -swing * 1.7;
    ally.weapon.rotation.z = -0.45 + swing * 0.6;
    ally.root.position.y = game.getGroundHeight(
      MORIA_ORIGIN.x + ally.root.position.x,
      MORIA_ORIGIN.z + ally.root.position.z
    );
  }

  if (game.balrog?.alive) {
    for (let i = 0; i < game.balrog.fireParts.length; i += 1) {
      const flame = game.balrog.fireParts[i];
      const pulse = 0.82 + Math.sin(time * 7 + i) * 0.22;
      flame.scale.set(pulse, 0.9 + pulse * 0.3, pulse);
    }
    const stride = game.balrog.moving ? Math.sin(time * 4.2) : 0;
    game.balrog.legL.rotation.x = stride * 0.48;
    game.balrog.legR.rotation.x = -stride * 0.48;
    game.balrog.armL.rotation.x = -stride * 0.28;
    game.balrog.armR.rotation.x = stride * 0.34;
    game.balrog.wingL.rotation.y = Math.sin(time * 1.8) * 0.1;
    game.balrog.wingR.rotation.y = -Math.sin(time * 1.8) * 0.1;
    game.balrog.whip.rotation.y = Math.sin(time * 2.6) * 0.38;
    game.balrog.whip.rotation.z = -0.35 + Math.sin(time * 3.2) * 0.2;
    for (let i = 0; i < game.balrog.whipSegments.length; i += 1) {
      const segment = game.balrog.whipSegments[i];
      const t = i / Math.max(1, game.balrog.whipSegments.length - 1);
      segment.position.set(
        0.15 + t * 6.4,
        -t * 2.4 + Math.sin(time * 5.5 + i * 0.42) * t * 0.3,
        Math.sin(t * Math.PI * 2 + time * 4.5) * (0.35 + t * 1.15)
      );
    }
  }
}

import * as THREE from "three";
import { Sfx } from "./audio.js";
import { Input } from "./input.js";
import { AssetLibrary } from "./assets.js";
import { createRealisticFrodo } from "./realisticHobbit.js";
import { createRealisticOrc } from "./realisticOrc.js";
import { loadHoleTextures } from "./detailedHole.js";
import { loadNatureTextures } from "./natureProps.js";
import { applyZone, toggleFireplace, applyFireplaceState } from "./bagEnd.js";
import { buildShireLevel } from "./levels/shire.js";
import {
  buildRivendellLevel,
  resetRivendellQuest,
  animateRivendellWater,
} from "./levels/rivendell.js";
import {
  buildMoriaLevel,
  resetMoriaLevel,
  updateMoriaActors,
  damageMoriaEnemy,
  animateMoriaWorld,
} from "./levels/moria.js";
import {
  buildLothlorienLevel,
  resetLothlorienQuest,
  nearestLothlorienNpc,
  tryGaladrielInteraction,
  updateLothlorienLevel,
  lothlorienSpawn,
} from "./levels/lothlorien.js";
import { nearestNpc, updateNpcIdle, TALK_RANGE } from "./npcs.js";
import {
  loadProgress,
  saveProgress,
  markLevel1Complete,
  markLevel3Complete,
  markLevel4Complete,
} from "./progress.js";
import {
  createEnvMap,
  createSkyDome,
  makeNoiseTexture,
  makeWoodTexture,
  mat,
  mesh,
} from "./materials.js";

const WALK_SPEED = 3.6;
const RUN_SPEED = 5.8;
const JUMP_VELOCITY = 7;
const GRAVITY = -22;
const GROUND_ACCEL = 18;
const AIR_ACCEL = 9;
const GROUND_FRICTION = 11;
const AIR_FRICTION = 1.2;
const TURN_SPEED = 8;
const MOUSE_SENSITIVITY = 0.0022;
const PLAYER_RADIUS = 0.34;
const PLAYER_HEIGHT = 1.05;
const ATTACK_RANGE = 2.05;
const ATTACK_COOLDOWN = 0.48;
const ATTACK_DURATION = 0.66;
const HIT_FRAME = 0.23;
const HIT_WINDOW_END = 0.43;
const ATTACK_ARC_DOT = 0.52;
const FIREPLACE_RANGE = 2.6;
const BED_RANGE = 2.4;
const RING_INVIS_DURATION = 10;
const RING_COOLDOWN = 5;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
const INTERACT_RANGE = 2.4;
const COYOTE_TIME = 0.14;
const JUMP_BUFFER = 0.14;

const ui = {
  objective: document.getElementById("objective"),
  status: document.getElementById("status"),
  message: document.getElementById("message"),
  startBtn: document.getElementById("start-btn"),
  winScreen: document.getElementById("win-screen"),
  winTitle: document.getElementById("win-title"),
  winText: document.getElementById("win-text"),
  restartBtn: document.getElementById("restart-btn"),
  resetBtn: document.getElementById("reset-btn"),
  controlsHelp: document.getElementById("controls-help"),
  actionsMenu: document.getElementById("actions-menu"),
  actionBtn: document.getElementById("action-btn"),
  actionLabel: document.getElementById("action-label"),
  ringBtn: document.getElementById("ring-btn"),
  ringLabel: document.getElementById("ring-label"),
  combatHud: document.getElementById("combat-hud"),
  healthText: document.getElementById("health-text"),
  healthFill: document.getElementById("health-fill"),
  bossHealth: document.getElementById("boss-health"),
  bossHealthText: document.getElementById("boss-health-text"),
  bossHealthFill: document.getElementById("boss-health-fill"),
  levelSelect: document.getElementById("level-select"),
  levelShireBtn: document.getElementById("level-shire-btn"),
  levelRivendellBtn: document.getElementById("level-rivendell-btn"),
  levelMoriaBtn: document.getElementById("level-moria-btn"),
  levelLothlorienBtn: document.getElementById("level-lothlorien-btn"),
  quickMoriaBtn: document.getElementById("quick-moria-btn"),
  levelSubtitle: document.getElementById("level-subtitle"),
  loading: document.getElementById("loading"),
  loadingBar: document.getElementById("loading-bar"),
  loadingPct: document.getElementById("loading-pct"),
  fade: document.getElementById("fade"),
};

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _probePos = new THREE.Vector3();
const _zero = new THREE.Vector3();
const _moveNorm = new THREE.Vector3();

let messageTimer = null;

function showMessage(text, duration = 2200) {
  ui.message.textContent = text;
  ui.message.classList.remove("hidden");
  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    ui.message.classList.add("hidden");
  }, duration);
}

function createBox(w, h, d, color, emissive = 0x000000, roughness = 0.78, metalness = 0.08) {
  return mesh(
    new THREE.BoxGeometry(w, h, d),
    mat(color, { roughness, metalness, emissive, envMapIntensity: 0.9 })
  );
}

function createCylinder(rt, rb, h, seg, color, roughness = 0.8, metalness = 0.05) {
  return mesh(
    new THREE.CylinderGeometry(rt, rb, h, seg),
    mat(color, { roughness, metalness, envMapIntensity: 0.85 })
  );
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

function overlaps(a, b) {
  if (!a.active || !b.active) {
    return false;
  }
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY &&
    a.minZ < b.maxZ &&
    a.maxZ > b.minZ
  );
}

function playerBox(position) {
  return createCollider(
    position.x - PLAYER_RADIUS,
    position.x + PLAYER_RADIUS,
    position.y,
    position.y + PLAYER_HEIGHT,
    position.z - PLAYER_RADIUS,
    position.z + PLAYER_RADIUS
  );
}

function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

function dampAngle(current, target, lambda, dt) {
  let diff = target - current;
  while (diff > Math.PI) {
    diff -= Math.PI * 2;
  }
  while (diff < -Math.PI) {
    diff += Math.PI * 2;
  }
  return current + diff * (1 - Math.exp(-lambda * dt));
}

function resolveOverlaps(position, colliders, axis) {
  const axisKey = axis.toUpperCase();
  let blocked = false;
  for (const collider of colliders) {
    if (!collider.active) {
      continue;
    }
    const probe = playerBox(position);
    if (!overlaps(probe, collider)) {
      continue;
    }
    blocked = true;
    const center = (probe[`min${axisKey}`] + probe[`max${axisKey}`]) * 0.5;
    const colliderCenter = (collider[`min${axisKey}`] + collider[`max${axisKey}`]) * 0.5;
    if (center < colliderCenter) {
      position[axis] = collider[`min${axisKey}`] - PLAYER_RADIUS;
    } else {
      position[axis] = collider[`max${axisKey}`] + PLAYER_RADIUS;
    }
  }
  return blocked;
}

function moveWithCollisions(position, velocity, colliders, dx, dz) {
  if (dx !== 0) {
    position.x += dx;
    if (resolveOverlaps(position, colliders, "x")) {
      velocity.x = 0;
    }
  }
  if (dz !== 0) {
    position.z += dz;
    if (resolveOverlaps(position, colliders, "z")) {
      velocity.z = 0;
    }
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.tabIndex = 0;
    this.input = new Input();
    this.sfx = new Sfx();
    this.assets = new AssetLibrary();
    this.clock = new THREE.Clock();
    this.state = "loading";
    this.hasRing = false;
    this.won = false;
    this.levelId = "shire";
    this.ringInvisible = false;
    this.ringInvisTimer = 0;
    this.ringCooldownTimer = 0;
    this.progress = loadProgress();
    this.npcs = [];
    this.rivendellBuilt = false;
    this.moriaBuilt = false;
    this.moriaOrcs = [];
    this.moriaAllies = [];
    this.moriaEnemies = [];
    this.balrog = null;
    this.lothlorienBuilt = false;
    this.lothlorienNpcs = [];
    this.lothlorienCompanions = [];
    this.lothlorienGiftGroups = [];
    this.lothlorienQuest = null;
    this.playerMaxHealth = 100;
    this.playerHealth = 100;
    this.playerDamageCooldown = 0;
    this.gameTime = 0;
    this.footstepTimer = 0;
    this.attackCooldown = 0;
    this.attackTimer = 0;
    this.attackActive = false;
    this.attackHit = false;
    this.attackDirection = 1;
    this.attackHitTargets = new Set();
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.cameraYaw = Math.PI;
    this.cameraPitch = 0.32;
    this.moveBlend = new THREE.Vector3();
    this.hitSparks = [];
    this.smokeParticles = [];

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xc5dcc0, 0.014);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 280);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.grassMap = makeNoiseTexture(256, {
      base: [82, 132, 62],
      variance: 28,
      dirt: [120, 96, 58],
      dirtChance: 0.16,
    });
    this.grassMap.repeat.set(10, 10);
    this.woodMap = makeWoodTexture(128);
    this.woodMap.repeat.set(2, 2);

    this.colliders = [];
    this.doors = [];
    this.groundHeights = [];
    this.decorations = [];
    this.orc = null;
    this.ring = null;
    this.exitGate = null;
    this.location = "outside";
    this.zoneCooldown = 0;
    this.transitioning = false;
    this.lyingDown = false;

    this.sky = createSkyDome();
    this.scene.add(this.sky);

    this.setupLights();
    this.bindEvents();
    this.onResize();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  async init() {
    this.assets.onProgress = (t) => {
      const pct = Math.round(t * 100);
      ui.loadingBar.style.width = `${pct}%`;
      ui.loadingPct.textContent = `${pct}%`;
    };

    try {
      ui.loadingPct.textContent = "Lighting…";
      await this.assets.loadEnv();
      ui.loadingBar.style.width = "35%";

      ui.loadingPct.textContent = "Textures…";
      this.holeTextures = await loadHoleTextures();
      this.natureTextures = await loadNatureTextures();
      ui.loadingBar.style.width = "70%";
      ui.loadingPct.textContent = "Building world…";
    } catch (error) {
      console.error(error);
      ui.loadingPct.textContent = "Could not load assets. Check the console.";
      return;
    }

    if (this.assets.envMap) {
      this.scene.environment = this.assets.envMap;
      this.scene.background = this.assets.envMap;
      this.renderer.toneMappingExposure = 0.95;
      if (this.sky) {
        this.sky.visible = false;
      }
    } else {
      this.scene.environment = createEnvMap(this.renderer);
    }
    this.defaultBackground = this.scene.background;
    this.defaultExposure = this.renderer.toneMappingExposure;
    this.defaultSkyVisible = this.sky?.visible ?? false;

    // Apply grass PBR to ground texture helper
    if (this.natureTextures?.grassMap) {
      this.grassMap = this.natureTextures.grassMap;
      this.grassNor = this.natureTextures.grassNor;
    }
    if (this.holeTextures?.woodMap) {
      this.woodMap = this.holeTextures.woodMap;
    }

    this.player = this.createFrodo();
    this.scene.add(this.player.root);
    this.buildLevel();
    ui.loadingBar.style.width = "100%";
    this.updateCamera(1 / 60);
    this.refreshLevelSelectUi();

    this.state = "menu";
    ui.loading.classList.add("hidden");
    ui.startBtn.classList.remove("hidden");
    ui.quickMoriaBtn.classList.remove("hidden");
  }

  createFrodo() {
    const frodo = createRealisticFrodo();
    frodo.root.position.set(0, 0, 16);
    return {
      ...frodo,
      velocity: new THREE.Vector3(),
      onGround: true,
      facing: new THREE.Vector3(0, 0, -1),
      walkPhase: 0,
    };
  }

  setupLights() {
    this.scene.add(new THREE.AmbientLight(0xddeeff, 0.22));
    this.scene.add(new THREE.HemisphereLight(0xe7f3ff, 0x5f7a3a, 0.65));

    this.sun = new THREE.DirectionalLight(0xfff2d0, 2.4);
    this.sun.position.set(18, 28, 14);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.camera.left = -32;
    this.sun.shadow.camera.right = 32;
    this.sun.shadow.camera.top = 32;
    this.sun.shadow.camera.bottom = -32;
    this.sun.shadow.camera.near = 2;
    this.sun.shadow.camera.far = 75;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    const fill = new THREE.DirectionalLight(0xb7d4ff, 0.55);
    fill.position.set(-14, 12, -10);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffd8a8, 0.35);
    rim.position.set(0, 8, -16);
    this.scene.add(rim);

    this.holeLight = new THREE.PointLight(0xffb074, 1.8, 16, 2);
    this.holeLight.position.set(0, 2.2, -11);
    this.holeLight.castShadow = true;
    this.scene.add(this.holeLight);

    this.pantryLight = new THREE.PointLight(0xffe082, 1.3, 9, 2);
    this.pantryLight.position.set(0, 2.0, -14.2);
    this.scene.add(this.pantryLight);
  }

  addGround(width, depth, x, z, color = 0x6faa4f, height = 0) {
    const isGrass = color === 0x6faa4f || color === 0x74b856;
    let material;
    if (isGrass) {
      const map = this.grassMap?.clone?.() ?? this.grassMap;
      if (map?.repeat) {
        map.repeat.set(14, 14);
      }
      const normalMap = this.grassNor?.clone?.() ?? this.grassNor;
      if (normalMap?.repeat) {
        normalMap.repeat.set(14, 14);
      }
      material = new THREE.MeshStandardMaterial({
        map,
        normalMap: normalMap || null,
        color: 0xffffff,
        roughness: 0.92,
        metalness: 0,
        envMapIntensity: 0.5,
      });
    } else {
      material = mat(color, { map: this.woodMap, roughness: 0.88, metalness: 0.05, envMapIntensity: 0.5 });
    }

    const ground = mesh(new THREE.BoxGeometry(width, 0.35, depth), material, false, true);
    ground.position.set(x, height - 0.18, z);
    this.scene.add(ground);
    this.groundHeights.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
      height,
    });
  }

  addWall(w, h, d, x, y, z, color = 0x8b5a2b) {
    const wall = createBox(w, h, d, color);
    wall.position.set(x, y + h / 2, z);
    this.scene.add(wall);
    const collider = colliderFromMesh(wall);
    this.colliders.push(collider);
    return wall;
  }

  addHill(w, h, d, x, z) {
    const hillMat = mat(0xffffff, {
      map: this.grassMap,
      roughness: 0.93,
      metalness: 0,
      envMapIntensity: 0.4,
    });
    const hill = mesh(new THREE.BoxGeometry(w, h, d), hillMat);
    hill.position.set(x, h / 2 - 0.05, z);
    this.scene.add(hill);
    this.groundHeights.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      height: h - 0.05,
    });
  }

  addDoor(x, y, z, label, hingeSide = 1) {
    const frame = createBox(2.1, 2.25, 0.22, 0x5d3a1a);
    frame.position.set(x, y + 1.12, z);
    this.scene.add(frame);

    const pivot = new THREE.Group();
    pivot.position.set(x + hingeSide * 0.85, y + 1.0, z);

    const door = createBox(1.65, 1.95, 0.16, 0x7a4f24);
    door.position.set(-hingeSide * 0.82, 0, 0);
    const knob = createCylinder(0.05, 0.05, 0.06, 8, 0xf4d03f);
    knob.rotation.z = Math.PI / 2;
    knob.position.set(-hingeSide * 0.35, 0, 0.1);
    pivot.add(door, knob);
    this.scene.add(pivot);

    const collider = colliderFromMesh(door, 0.04);
    collider.mesh = door;
    this.colliders.push(collider);

    const doorData = {
      pivot,
      mesh: door,
      collider,
      label,
      open: false,
      openAmount: 0,
      targetOpen: 0,
      hingeSide,
      interactPoint: new THREE.Vector3(x, y + 1, z),
    };
    this.doors.push(doorData);
    return doorData;
  }

  addPathStone(x, z, w = 1.2, d = 1.0) {
    const stone = createBox(w, 0.08, d, 0x9e9e9e, 0x000000, 0.95);
    stone.position.set(x, 0.02, z);
    stone.receiveShadow = true;
    stone.castShadow = false;
    this.scene.add(stone);
  }

  addFlower(x, z, petalColor) {
    const stem = createCylinder(0.02, 0.025, 0.35, 6, 0x4caf50);
    stem.position.set(x, 0.18, z);
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.6 })
    );
    petal.position.set(x, 0.38, z);
    this.scene.add(stem, petal);
  }

  addBush(x, z) {
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x3d8b37, roughness: 0.9 })
    );
    bush.position.set(x, 0.45, z);
    bush.scale.set(1.2, 0.8, 1.1);
    bush.castShadow = true;
    this.scene.add(bush);
    this.colliders.push(colliderFromMesh(bush, -0.15));
  }

  addTree(x, z, scale = 1) {
    const trunk = mesh(
      new THREE.CylinderGeometry(0.16 * scale, 0.24 * scale, 1.7 * scale, 10),
      mat(0x6b4226, { map: this.woodMap, roughness: 0.9, metalness: 0.05 })
    );
    trunk.position.set(x, 0.85 * scale, z);
    const canopyMat = mat(0x3d8b37, { roughness: 0.88, metalness: 0, envMapIntensity: 0.35 });
    const leavesA = mesh(new THREE.SphereGeometry(1.05 * scale, 14, 12), canopyMat);
    leavesA.position.set(x, 2.15 * scale, z);
    leavesA.scale.set(1.15, 0.85, 1.1);
    const leavesB = mesh(new THREE.SphereGeometry(0.75 * scale, 12, 10), mat(0x4caf50, { roughness: 0.9 }));
    leavesB.position.set(x + 0.25 * scale, 2.55 * scale, z - 0.15 * scale);
    this.scene.add(trunk, leavesA, leavesB);
    this.colliders.push(colliderFromMesh(trunk, 0.05));
  }

  addLampPost(x, z) {
    const post = createCylinder(0.07, 0.09, 2.2, 8, 0x4e342e);
    post.position.set(x, 1.1, z);
    const lamp = createBox(0.35, 0.25, 0.35, 0xfff59d, 0x665500);
    lamp.position.set(x, 2.3, z);
    const light = new THREE.PointLight(0xffe082, 0.35, 6);
    light.position.set(x, 2.35, z);
    this.scene.add(post, lamp, light);
  }

  addMailbox(x, z) {
    const post = createBox(0.12, 0.9, 0.12, 0x6d4c41);
    post.position.set(x, 0.45, z);
    const box = createBox(0.45, 0.32, 0.32, 0x00897b);
    box.position.set(x, 0.95, z);
    this.scene.add(post, box);
  }

  addBench(x, z, rotY = 0) {
    const bench = new THREE.Group();
    const seat = createBox(1.4, 0.1, 0.5, 0x8d6e63);
    seat.position.y = 0.45;
    const legA = createBox(0.1, 0.45, 0.45, 0x6d4c41);
    legA.position.set(-0.55, 0.22, 0);
    const legB = legA.clone();
    legB.position.x = 0.55;
    bench.add(seat, legA, legB);
    bench.position.set(x, 0, z);
    bench.rotation.y = rotY;
    this.scene.add(bench);
    bench.updateWorldMatrix(true, true);
    this.colliders.push(colliderFromMesh(bench, 0.02));
  }

  addPond(x, z) {
    const water = mesh(
      new THREE.CircleGeometry(2.4, 32),
      mat(0x4fa8c8, {
        roughness: 0.08,
        metalness: 0.65,
        envMapIntensity: 1.8,
        emissive: 0x113344,
        emissiveIntensity: 0.15,
      }),
      false,
      true
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, 0.02, z);
    const rim = mesh(
      new THREE.RingGeometry(2.35, 2.7, 32),
      mat(0x8d6e63, { roughness: 0.9, map: this.woodMap }),
      false,
      true
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(x, 0.03, z);
    this.scene.add(rim, water);
  }

  addSign(x, z, rotY, color = 0xfff8dc) {
    const post = createBox(0.12, 1.2, 0.12, 0x6d4c41);
    post.position.set(x, 0.6, z);
    const board = createBox(1.6, 0.7, 0.1, color);
    board.position.set(x, 1.2, z);
    const group = new THREE.Group();
    group.add(post, board);
    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    post.position.set(0, 0.6, 0);
    board.position.set(0, 1.2, 0);
    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  buildLevel() {
    buildShireLevel(this);
  }

  addClouds() {
    for (let i = 0; i < 7; i += 1) {
      const cloud = new THREE.Group();
      for (let p = 0; p < 4; p += 1) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(1.2 + Math.random(), 10, 10),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92 })
        );
        puff.position.set(p * 1.3 - 2, Math.random() * 0.3, Math.random() * 0.8);
        cloud.add(puff);
      }
      cloud.position.set(-20 + i * 7, 14 + (i % 3), -10 + (i % 4) * 6);
      this.scene.add(cloud);
      this.decorations.push({ mesh: cloud, spin: 0.02 + i * 0.004 });
    }
  }

  addFence() {
    for (let x = -20; x <= 20; x += 3.5) {
      this.addWall(0.22, 1.05, 0.22, x, 0, 25, 0x9c6b3c);
      if (x % 7 === 0) {
        const cap = createBox(0.32, 0.12, 0.32, 0xbf8040);
        cap.position.set(x, 1.12, 25);
        this.scene.add(cap);
      }
    }
    this.addWall(0.22, 1.05, 20, -20, 0, 15, 0x9c6b3c);
    this.addWall(0.22, 1.05, 20, 20, 0, 15, 0x9c6b3c);

    const gateL = createBox(0.22, 1.4, 0.22, 0x8d6e63);
    gateL.position.set(-1.2, 0.7, 25);
    const gateR = gateL.clone();
    gateR.position.x = 1.2;
    this.scene.add(gateL, gateR);
  }

  buildHobbitHole() {
    const moundMat = mat(0xffffff, {
      map: this.grassMap,
      roughness: 0.93,
      metalness: 0,
      envMapIntensity: 0.4,
    });
    const mound = mesh(new THREE.BoxGeometry(11, 2.4, 7), moundMat);
    mound.position.set(0, 1.0, -6.5);
    this.scene.add(mound);

    const grassCap = mesh(new THREE.BoxGeometry(11.2, 0.35, 7.2), moundMat.clone());
    grassCap.position.set(0, 2.15, -6.5);
    this.scene.add(grassCap);

    const roundDoorFrame = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.14, 12, 28),
      new THREE.MeshStandardMaterial({ color: 0xf4d03f, roughness: 0.65, metalness: 0.15 })
    );
    roundDoorFrame.rotation.x = Math.PI / 2;
    roundDoorFrame.position.set(0, 1.2, -2.95);
    this.scene.add(roundDoorFrame);

    const welcomeMat = createBox(1.4, 0.05, 0.9, 0xbf360c);
    welcomeMat.position.set(0, 0.03, -3.4);
    this.scene.add(welcomeMat);

    const windowL = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.08, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0xf4d03f, emissive: 0x332200 })
    );
    windowL.rotation.x = Math.PI / 2;
    windowL.position.set(-2.8, 1.35, -4.8);
    const windowR = windowL.clone();
    windowR.position.x = 2.8;
    this.scene.add(windowL, windowR);

    const chimney = createBox(0.55, 1.2, 0.55, 0x8d6e63);
    chimney.position.set(3.2, 2.5, -7.5);
    this.scene.add(chimney);
    this.smokeOrigin = new THREE.Vector3(3.2, 3.2, -7.5);
    this.smokeParticles = [];

    this.addDoor(0, 0.15, -3.05, "Hobbit hole", 1);

    this.addWall(8.5, 2.6, 0.3, 0, 0.2, -8.8);
    this.addWall(0.3, 2.6, 8.5, -4.2, 0.2, -12.5);
    this.addWall(0.3, 2.6, 8.5, 4.2, 0.2, -12.5);
    this.addWall(8.5, 2.6, 0.3, 0, 0.2, -16.2);

    this.addGround(8, 8, 0, -12.5, 0x8d6e63);
    this.addWall(0.3, 2.3, 6.5, -3.6, 0.2, -10.8);
    this.addWall(0.3, 2.3, 6.5, 3.6, 0.2, -10.8);

    this.addDoor(0, 0.2, -10.55, "Pantry", 1);

    this.addWall(0.3, 2.3, 4.2, 0, 0.2, -13.5);
    this.addWall(3.8, 2.3, 0.3, -1.9, 0.2, -15.2);
    this.addWall(3.8, 2.3, 0.3, 1.9, 0.2, -15.2);

    this.addFurniture(0, -12);
    this.addFurniture(-2.5, -14, true);
  }

  addFurniture(x, z, isPantry = false) {
    const rug = createBox(isPantry ? 2.2 : 3, 0.04, isPantry ? 2 : 2.5, 0xc62828);
    rug.position.set(x, 0.03, z);
    this.scene.add(rug);

    if (!isPantry) {
      const table = createBox(1.6, 0.12, 1.0, 0x8d6e63);
      table.position.set(x, 0.55, z);
      const leg1 = createBox(0.12, 0.55, 0.12, 0x6d4c41);
      leg1.position.set(x - 0.65, 0.27, z - 0.35);
      const leg2 = leg1.clone();
      leg2.position.set(x + 0.65, 0.27, z - 0.35);
      const leg3 = leg1.clone();
      leg3.position.set(x - 0.65, 0.27, z + 0.35);
      const leg4 = leg1.clone();
      leg4.position.set(x + 0.65, 0.27, z + 0.35);
      const bowl = createCylinder(0.18, 0.22, 0.12, 10, 0xffcc80);
      bowl.position.set(x, 0.68, z);
      this.scene.add(table, leg1, leg2, leg3, leg4, bowl);
      this.colliders.push(colliderFromMesh(table, 0.02));

      const chairL = createBox(0.45, 0.45, 0.45, 0x795548);
      chairL.position.set(x - 1.3, 0.22, z);
      const chairR = chairL.clone();
      chairR.position.x = x + 1.3;
      this.scene.add(chairL, chairR);
      this.colliders.push(colliderFromMesh(chairL, -0.05), colliderFromMesh(chairR, -0.05));
    } else {
      const shelf = createBox(2.2, 1.8, 0.35, 0x6d4c41);
      shelf.position.set(x, 1.0, z - 1.2);
      const jarA = createCylinder(0.12, 0.12, 0.25, 8, 0x81d4fa);
      jarA.position.set(x - 0.5, 1.4, z - 1.0);
      const jarB = jarA.clone();
      jarB.position.set(x + 0.4, 1.2, z - 1.0);
      jarB.material = jarB.material.clone();
      jarB.material.color.setHex(0xffab91);
      this.scene.add(shelf, jarA, jarB);
      this.colliders.push(colliderFromMesh(shelf, 0.02));
    }
  }

  buildExitGate() {
    const postL = createBox(0.55, 2.6, 0.55, 0x7a5230);
    postL.position.set(-2.4, 1.3, 24);
    const postR = postL.clone();
    postR.position.x = 2.4;
    const arch = createBox(5.2, 0.5, 0.5, 0xf4d03f, 0x665500);
    arch.position.set(0, 2.55, 24);
    const sign = createBox(3.4, 0.9, 0.15, 0xfff8dc);
    sign.position.set(0, 3.25, 24);
    const banner = createBox(2.8, 0.5, 0.08, 0x558b2f);
    banner.position.set(0, 2.05, 24.2);
    this.scene.add(postL, postR, arch, sign, banner);

    const trigger = createBox(3.8, 2.6, 1.4, 0x00ff00);
    trigger.visible = false;
    trigger.position.set(0, 1.1, 24);
    this.scene.add(trigger);
    this.exitGate = { bounds: colliderFromMesh(trigger) };
  }

  spawnRing() {
    const ringMesh = new THREE.Group();
    const band = mesh(
      new THREE.TorusGeometry(0.13, 0.032, 16, 36),
      mat(0xd4a017, { emissive: 0x664400, metalness: 0.95, roughness: 0.22, envMapIntensity: 1.4 })
    );
    band.rotation.x = Math.PI / 2;
    ringMesh.add(band);
    ringMesh.position.set(1.8, 0.45, -15.2);
    this.scene.add(ringMesh);
    const glow = new THREE.PointLight(0xffd54f, 1.0, 5);
    glow.position.set(0, 0.1, 0);
    ringMesh.add(glow);
    const pedestal = createCylinder(0.35, 0.45, 0.15, 12, 0x8d6e63);
    pedestal.position.set(1.8, 0.06, -15.2);
    this.scene.add(pedestal);
    this.ring = { mesh: ringMesh, collected: false, spin: 0, level: "shire" };
  }

  spawnOrc() {
    this.orc = createRealisticOrc();
    this.scene.add(this.orc.root);
  }

  spawnHitSparks(position) {
    for (let i = 0; i < 10; i += 1) {
      const spark = mesh(
        new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 6, 6),
        mat(0xffe082, {
          roughness: 0.2,
          metalness: 0.8,
          emissive: 0xffc107,
          emissiveIntensity: 1.4,
        }),
        false,
        false
      );
      spark.position.copy(position);
      spark.position.y += 0.9;
      this.scene.add(spark);
      this.hitSparks.push({
        mesh: spark,
        life: 0.45 + Math.random() * 0.25,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 3.5,
          1.5 + Math.random() * 2.5,
          (Math.random() - 0.5) * 3.5
        ),
      });
    }
  }

  updateHitSparks(delta) {
    this.hitSparks = this.hitSparks.filter((spark) => {
      spark.life -= delta;
      spark.vel.y -= 8 * delta;
      spark.mesh.position.addScaledVector(spark.vel, delta);
      spark.mesh.material.emissiveIntensity = Math.max(0, spark.life * 2.5);
      spark.mesh.scale.setScalar(Math.max(0.1, spark.life * 2));
      if (spark.life <= 0) {
        this.scene.remove(spark.mesh);
        return false;
      }
      return true;
    });
  }

  bindEvents() {
    this.input.bind(this.canvas);
    window.addEventListener("resize", () => this.onResize());
    this.canvas.addEventListener("click", () => {
      if (this.state === "playing") {
        this.canvas.focus();
        this.input.requestPointerLock(this.canvas);
      }
    });

    ui.startBtn.addEventListener("click", () => this.start());
    ui.resetBtn.addEventListener("click", () => this.reset());
    ui.actionBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.tryInteract();
    });
    ui.ringBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.tryUseRing();
    });
    ui.restartBtn.addEventListener("click", () => this.onWinContinue());
    ui.levelShireBtn.addEventListener("click", () => this.selectLevel("shire"));
    ui.levelRivendellBtn.addEventListener("click", () => this.selectLevel("rivendell"));
    ui.levelMoriaBtn.addEventListener("click", () => this.selectLevel("moria"));
    ui.levelLothlorienBtn.addEventListener("click", () => this.selectLevel("lothlorien"));
    ui.quickMoriaBtn.addEventListener("click", () => this.selectLevel("moria"));
  }

  focusGame() {
    this.canvas.focus({ preventScroll: true });
  }

  start() {
    this.sfx.init();
    this.sfx.resume();
    this.state = "playing";
    this.input.enable();
    this.focusGame();
    this.input.requestPointerLock(this.canvas);
    ui.startBtn.classList.add("hidden");
    ui.quickMoriaBtn.classList.add("hidden");
    ui.controlsHelp.classList.remove("hidden");
    ui.resetBtn.classList.remove("hidden");
    ui.actionsMenu.classList.remove("hidden");
    this.syncRingButton();
    showMessage("Welcome, Frodo! Find the One Ring in Bag End.", 2600);
  }

  reset() {
    this.hasRing = false;
    this.won = false;
    this.clearInvisibility(true);
    this.ringCooldownTimer = 0;
    this.state = "playing";
    if (this.levelId === "lothlorien") {
      resetLothlorienQuest(this);
      this.player.root.position.copy(this.lothlorienSpawn || lothlorienSpawn());
      this.player.root.rotation.set(0, 0, 0);
      this.player.velocity.set(0, 0, 0);
      this.player.model.rotation.set(0, 0, 0);
      this.player.model.position.set(0, 0, 0);
      this.setLothlorienQuestStage(0);
      ui.winScreen.classList.add("hidden");
      ui.levelSelect.classList.add("hidden");
      ui.controlsHelp.classList.remove("hidden");
      ui.resetBtn.classList.remove("hidden");
      this.input.enable();
      this.focusGame();
      this.input.requestPointerLock(this.canvas);
      showMessage("Lothlórien quest reset. Climb safely to Galadriel's high talan.", 2200);
      this.snapCamera();
      return;
    }
    if (this.levelId === "moria") {
      resetMoriaLevel(this);
      this.playerHealth = this.playerMaxHealth;
      this.playerDamageCooldown = 0;
      this.attackActive = false;
      this.attackTimer = 0;
      this.attackHitTargets.clear();
      this.player.root.position.copy(this.moriaSpawn || this.player.root.position);
      this.player.root.rotation.set(0, 0, 0);
      this.player.velocity.set(0, 0, 0);
      this.player.model.rotation.set(0, 0, 0);
      this.player.model.position.set(0, 0, 0);
      this.player.swordPivot.visible = true;
      ui.objective.textContent = "Fight through the Dwarrowdelf and reach the Bridge of Khazad-dûm.";
      ui.status.textContent = "Orcs remaining: 16";
      ui.combatHud.classList.remove("hidden");
      ui.winScreen.classList.add("hidden");
      ui.levelSelect.classList.add("hidden");
      ui.controlsHelp.classList.remove("hidden");
      ui.resetBtn.classList.remove("hidden");
      this.input.enable();
      this.focusGame();
      this.input.requestPointerLock(this.canvas);
      this.refreshMoriaHud();
      showMessage("Moria encounter reset. The Fellowship is with you.", 1800);
      this.snapCamera();
      return;
    }
    if (this.levelId === "rivendell") {
      resetRivendellQuest(this);
      ui.objective.textContent = "Enter the hall, approach Elrond, then press E.";
      ui.status.textContent = "Fellowship: speak with Elrond first";
      this.player.root.position.copy(this.rivendellSpawn || this.player.root.position);
      this.input.enable();
      this.focusGame();
      this.input.requestPointerLock(this.canvas);
      ui.winScreen.classList.add("hidden");
      ui.levelSelect.classList.add("hidden");
      ui.controlsHelp.classList.remove("hidden");
      ui.resetBtn.classList.remove("hidden");
      showMessage("Rivendell quest reset.", 1600);
      this.snapCamera();
      return;
    }
    this.input.enable();
    this.focusGame();
    this.footstepTimer = 0;
    this.attackCooldown = 0;
    this.zoneCooldown = 0;
    this.transitioning = false;
    this.lyingDown = false;
    this.location = "outside";
    this.attackTimer = 0;
    this.attackActive = false;
    this.attackHit = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.cameraYaw = Math.PI;
    this.cameraPitch = 0.32;
    this.moveBlend.set(0, 0, 0);

    this.player.root.position.set(0, 0, 16);
    this.player.root.rotation.set(0, 0, 0);
    this.player.velocity.set(0, 0, 0);
    this.player.onGround = true;
    this.player.walkPhase = 0;
    this.player.model.position.set(0, 0, 0);
    this.player.model.rotation.set(0, 0, 0);
    this.player.swordPivot.rotation.set(0, 0, 0);
    this.player.swordPivot.visible = true;
    this.player.facing.set(0, 0, -1);

    this.hitSparks.forEach((spark) => this.scene.remove(spark.mesh));
    this.hitSparks = [];

    if (this.ring) {
      this.ring.collected = false;
      this.ring.spin = 0;
      this.ring.mesh.visible = true;
      this.ring.mesh.rotation.y = 0;
      if (this.ring.zone === "inside") {
        this.ring.mesh.position.set(-6.8, 0.42, -16.2);
      } else {
        this.ring.mesh.position.set(1.8, 0.05, -15.2);
      }
    }

    this.doors.forEach((door) => {
      door.open = false;
      door.openAmount = 0;
      door.targetOpen = 0;
      door.pivot.rotation.y = 0;
      door.collider.active = true;
      this.syncDoorCollider(door);
    });
    if (this.zoneTriggers) {
      applyZone(this, "outside");
    }
    if (this.fireplace) {
      this.fireplace.lit = true;
      applyFireplaceState(this.fireplace);
    }
    this.syncFireButtonLabel();
    this.syncBedButtonLabel();
    if (this.bed) {
      this.bed.lying = false;
    }

    if (this.orc) {
      this.orc.root.position.copy(this.orc.patrolA);
      this.orc.target.copy(this.orc.patrolB);
      this.orc.stunned = false;
      this.orc.stunTimer = 0;
      this.orc.fleeTimer = 0;
      this.orc.wobble = 0;
      this.orc.root.rotation.set(0, 0, 0);
    }

    this.smokeParticles.forEach((particle) => {
      this.scene.remove(particle.mesh);
    });
    this.smokeParticles = [];

    ui.message.classList.add("hidden");
    window.clearTimeout(messageTimer);
    ui.status.textContent = "Ring: not found";
    ui.objective.textContent = "Open Bag End, find the One Ring, then reach the exit gate.";
    ui.winScreen.classList.add("hidden");
    ui.startBtn.classList.add("hidden");
    ui.controlsHelp.classList.remove("hidden");
    ui.resetBtn.classList.remove("hidden");
    ui.fade.classList.add("hidden");
    ui.fade.classList.remove("show");
    this.snapCamera();
    this.input.requestPointerLock(this.canvas);
    showMessage("Game reset. Good luck, Frodo!", 1800);
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  getGroundHeight(x, z) {
    let height = 0;
    let found = false;
    for (const patch of this.groundHeights) {
      const lvl = patch.level || "shire";
      if (lvl !== this.levelId) continue;
      if (patch.zone && patch.zone !== this.location) {
        continue;
      }
      if (x >= patch.minX && x <= patch.maxX && z >= patch.minZ && z <= patch.maxZ) {
        height = Math.max(height, patch.height);
        found = true;
      }
    }
    return found ? height : (this.levelId === "rivendell" ? 0 : 0);
  }

  overlapsTrigger(trigger) {
    const p = this.player.root.position;
    return (
      p.x >= trigger.minX &&
      p.x <= trigger.maxX &&
      p.y >= trigger.minY &&
      p.y <= trigger.maxY &&
      p.z >= trigger.minZ &&
      p.z <= trigger.maxZ
    );
  }

  fadeToBlack() {
    return new Promise((resolve) => {
      ui.fade.classList.remove("hidden");
      requestAnimationFrame(() => {
        ui.fade.classList.add("show");
        window.setTimeout(resolve, 480);
      });
    });
  }

  fadeFromBlack() {
    return new Promise((resolve) => {
      ui.fade.classList.remove("show");
      window.setTimeout(() => {
        ui.fade.classList.add("hidden");
        resolve();
      }, 480);
    });
  }

  async enterBagEnd() {
    if (this.transitioning || !this.zoneTriggers) {
      return;
    }
    this.transitioning = true;
    await this.fadeToBlack();
    applyZone(this, "inside");
    this.player.root.position.copy(this.zoneTriggers.spawnInside);
    this.player.velocity.set(0, 0, 0);
    this.player.root.rotation.y = Math.PI;
    this.cameraYaw = Math.PI;
    this.cameraPitch = 0.12;
    this.zoneCooldown = 1.2;
    this.snapCamera();
    ui.objective.textContent = this.hasRing
      ? "Bring the One Ring outside to the exit gate."
      : "Explore Bag End's rooms and find the One Ring in the kitchen.";
    showMessage("Welcome to Bag End! Wander the round doorways.", 2200);
    await this.fadeFromBlack();
    this.transitioning = false;
  }

  async exitBagEnd() {
    if (this.transitioning || !this.zoneTriggers) {
      return;
    }
    this.transitioning = true;
    await this.fadeToBlack();
    applyZone(this, "outside");
    this.player.root.position.copy(this.zoneTriggers.spawnOutside);
    this.player.velocity.set(0, 0, 0);
    this.player.root.rotation.y = 0;
    this.cameraYaw = 0;
    this.cameraPitch = 0.32;
    this.zoneCooldown = 1.2;
    this.snapCamera();
    ui.objective.textContent = this.hasRing
      ? "Bring the One Ring to the exit gate."
      : "Find the One Ring inside Bag End.";
    showMessage("Back in the Shire.", 1800);
    await this.fadeFromBlack();
    this.transitioning = false;
  }

  updateZoneTransitions(delta) {
    if (!this.zoneTriggers || this.transitioning || this.lyingDown) {
      return;
    }
    if (this.zoneCooldown > 0) {
      this.zoneCooldown -= delta;
      return;
    }

    const entranceDoor = this.doors.find((d) => d.role === "entrance");
    const exitDoor = this.doors.find((d) => d.role === "exit");

    if (
      this.location === "outside" &&
      entranceDoor?.open &&
      this.overlapsTrigger(this.zoneTriggers.enterInside)
    ) {
      this.enterBagEnd();
      return;
    }

    if (
      this.location === "inside" &&
      exitDoor?.open &&
      this.overlapsTrigger(this.zoneTriggers.exitOutside)
    ) {
      this.exitBagEnd();
    }
  }

  syncDoorCollider(door) {
    if (!door.collider.active) {
      return;
    }
    const box = new THREE.Box3().setFromObject(door.mesh);
    door.collider.minX = box.min.x;
    door.collider.maxX = box.max.x;
    door.collider.minY = box.min.y;
    door.collider.maxY = box.max.y;
    door.collider.minZ = box.min.z;
    door.collider.maxZ = box.max.z;
  }

  updateDoors(delta) {
    for (const door of this.doors) {
      door.openAmount = THREE.MathUtils.lerp(door.openAmount, door.targetOpen, delta * 8);
      door.pivot.rotation.y = door.openAmount * door.hingeSide * -Math.PI * 0.55;
      this.syncDoorCollider(door);
    }
  }

  nearFireplace() {
    if (!this.fireplace || this.location !== "inside" || this.lyingDown) {
      return false;
    }
    return this.player.root.position.distanceTo(this.fireplace.interactPoint) < FIREPLACE_RANGE;
  }

  nearBed() {
    if (!this.bed || this.location !== "inside") {
      return false;
    }
    if (this.lyingDown) {
      return true;
    }
    return this.player.root.position.distanceTo(this.bed.interactPoint) < BED_RANGE;
  }

  syncFireButtonLabel() {
    this.updateActionUi();
  }

  syncBedButtonLabel() {
    this.updateActionUi();
  }

  toggleBagEndFire() {
    if (!this.fireplace || this.location !== "inside" || this.lyingDown) {
      return;
    }
    const lit = toggleFireplace(this.fireplace);
    this.syncFireButtonLabel();
    showMessage(lit ? "The hearth crackles to life!" : "The fire goes out.", 1600);
  }

  lieDownInBed() {
    if (!this.bed || this.lyingDown || this.location !== "inside") {
      return;
    }
    const player = this.player;
    this.lyingDown = true;
    this.bed.lying = true;
    this.attackActive = false;
    this.attackTimer = 0;
    player.velocity.set(0, 0, 0);
    player.onGround = true;
    player.root.position.copy(this.bed.liePosition);
    player.root.rotation.set(0, this.bed.lieYaw, 0);
    player.model.rotation.set(Math.PI / 2, 0, 0);
    player.model.position.set(0, 0.12, 0);
    player.swordPivot.visible = false;
    player.facing.set(0, 0, -1);
    this.cameraYaw = this.bed.lieYaw + 0.55;
    this.cameraPitch = 0.18;
    this.snapCamera();
    this.syncBedButtonLabel();
    showMessage("Sweet dreams… press E when you are ready to get up.", 2200);
  }

  getUpFromBed(silent = false) {
    const player = this.player;
    if (!player) {
      return;
    }
    const wasLying = this.lyingDown;
    this.lyingDown = false;
    if (this.bed) {
      this.bed.lying = false;
      if (wasLying) {
        player.root.position.copy(this.bed.standPosition);
        player.root.rotation.set(0, 0, 0);
        this.cameraYaw = 0;
        this.cameraPitch = 0.12;
      }
    }
    player.model.rotation.set(0, 0, 0);
    player.model.position.set(0, 0, 0);
    player.swordPivot.visible = true;
    player.swordPivot.rotation.set(0, 0, 0);
    player.velocity.set(0, 0, 0);
    this.syncBedButtonLabel();
    if (wasLying) {
      this.snapCamera();
      if (!silent) {
        showMessage("Up you get, Frodo!", 1400);
      }
    }
  }

  toggleBed() {
    if (this.lyingDown) {
      this.getUpFromBed();
      return;
    }
    if (!this.nearBed()) {
      return;
    }
    this.lieDownInBed();
  }

  tryInteract() {
    const action = this.getContextAction();
    if (!action) {
      showMessage("Nothing to use nearby.", 1200);
      return;
    }

    if (action.type === "get-up") {
      this.getUpFromBed();
    } else if (action.type === "bed") {
      this.lieDownInBed();
    } else if (action.type === "fire") {
      this.toggleBagEndFire();
    } else if (action.type === "talk") {
      this.tryTalk();
    } else if (action.type === "galadriel") {
      tryGaladrielInteraction(this);
    } else if (action.type === "door") {
      const door = action.door;
      door.open = true;
      door.targetOpen = 1;
      door.collider.active = false;
      this.sfx.door();
      if (door.role === "entrance") {
        showMessage("Bag End is open — walk inside!", 2000);
      } else if (door.role === "exit") {
        showMessage("Door open — walk out to the Shire!", 2000);
      } else {
        showMessage(`${door.label} opened!`, 1500);
      }
    }
    this.updateActionUi();
  }

  getContextAction() {
    if (!this.player) return null;
    if (this.lyingDown) {
      return { type: "get-up", label: "Get up from bed" };
    }
    if (this.levelId === "lothlorien") {
      const npc = nearestLothlorienNpc(this);
      if (!npc || this.lothlorienQuest?.stage >= 2) return null;
      return {
        type: "galadriel",
        label: this.lothlorienQuest?.stage === 1
          ? "Receive Galadriel's gifts"
          : "Speak with Galadriel",
        npc,
      };
    }
    if (this.levelId === "rivendell") {
      const npc = nearestNpc(this.npcs || [], this.player.root.position, TALK_RANGE);
      return npc ? { type: "talk", label: `Speak with ${npc.name}`, npc } : null;
    }
    if (this.nearBed()) {
      return { type: "bed", label: "Lie down in bed" };
    }
    if (this.nearFireplace()) {
      return {
        type: "fire",
        label: this.fireplace?.lit ? "Turn fireplace off" : "Turn fireplace on",
      };
    }

    let nearestDoor = null;
    let nearestDist = INTERACT_RANGE;
    for (const door of this.doors) {
      if (door.open) continue;
      const dist = this.player.root.position.distanceTo(door.interactPoint);
      if (dist < nearestDist) {
        nearestDoor = door;
        nearestDist = dist;
      }
    }
    return nearestDoor ? { type: "door", label: "Open door", door: nearestDoor } : null;
  }

  updateActionUi() {
    if (!ui.actionsMenu || !ui.actionBtn || !ui.actionLabel) return;
    if (this.state !== "playing") {
      ui.actionsMenu.classList.add("hidden");
      return;
    }
    ui.actionsMenu.classList.remove("hidden");
    const action = this.getContextAction();
    ui.actionBtn.disabled = !action;
    ui.actionLabel.textContent = action?.label || "Nothing nearby";
  }

  showGameMessage(text, duration = 1800) {
    showMessage(text, duration);
  }

  refreshMoriaHud() {
    if (this.levelId !== "moria") return;
    const healthPct = Math.max(0, this.playerHealth / this.playerMaxHealth) * 100;
    ui.healthText.textContent = `${Math.ceil(this.playerHealth)} / ${this.playerMaxHealth}`;
    ui.healthFill.style.width = `${healthPct}%`;

    const remaining = (this.moriaOrcs || []).filter((orc) => orc.alive).length;
    if (remaining > 0) {
      ui.status.textContent = `Orcs remaining: ${remaining}`;
      ui.objective.textContent = "Fight through the Dwarrowdelf. The Fellowship will protect your flanks.";
      ui.bossHealth.classList.add("hidden");
    } else if (this.balrog?.alive) {
      ui.status.textContent = this.balrog.active
        ? "Boss: Durin's Bane is entering the great hall"
        : "The bridge lies ahead";
      ui.objective.textContent = "Hold the great hall with the Fellowship and defeat the Balrog!";
      ui.bossHealth.classList.toggle("hidden", !this.balrog.active);
      const bossPct = Math.max(0, this.balrog.hp / this.balrog.maxHp) * 100;
      ui.bossHealthText.textContent = `${Math.ceil(this.balrog.hp)} / ${this.balrog.maxHp}`;
      ui.bossHealthFill.style.width = `${bossPct}%`;
    }
  }

  takePlayerDamage(amount, attacker = "Orc") {
    if (this.levelId !== "moria" || this.playerDamageCooldown > 0 || this.state !== "playing") return;
    this.playerHealth = Math.max(0, this.playerHealth - amount);
    this.playerDamageCooldown = 0.7;
    this.player.model.rotation.z = 0.16;
    this.refreshMoriaHud();
    showMessage(`${attacker} hits Frodo!`, 850);
    if (this.playerHealth <= 0) {
      this.state = "won";
      this.input.disable();
      ui.winTitle.textContent = "The Fellowship regroups";
      ui.winText.textContent = "Moria proved dangerous. Rest, then try the battle again.";
      ui.restartBtn.textContent = "Choose Level";
      ui.winScreen.classList.remove("hidden");
      ui.controlsHelp.classList.add("hidden");
      ui.actionsMenu.classList.add("hidden");
      ui.combatHud.classList.add("hidden");
    }
  }

  completeMoria() {
    if (this.won) return;
    this.won = true;
    this.state = "won";
    this.input.disable();
    markLevel3Complete();
    this.refreshLevelSelectUi();
    ui.winTitle.textContent = "The Bridge is won!";
    ui.winText.textContent = "Durin's Bane is defeated. The golden woods of Lothlórien are now unlocked.";
    ui.restartBtn.textContent = "Choose Level";
    ui.winScreen.classList.remove("hidden");
    ui.controlsHelp.classList.add("hidden");
    ui.actionsMenu.classList.add("hidden");
    ui.combatHud.classList.add("hidden");
    ui.bossHealth.classList.add("hidden");
    this.sfx.win();
  }

  setLothlorienQuestStage(stage) {
    if (stage === 0) {
      ui.objective.textContent = "Climb the protected walkways to Galadriel's high talan.";
      ui.status.textContent = "Gifts of Lórien: not yet received";
    } else if (stage === 1) {
      ui.objective.textContent = "Speak with Galadriel again to receive gifts for the Fellowship.";
      ui.status.textContent = "Gifts of Lórien: ready";
    } else {
      ui.objective.textContent = "The Fellowship is equipped for the road ahead.";
      ui.status.textContent = "Gifts of Lórien: received";
    }
    this.updateActionUi();
  }

  completeLothlorien() {
    if (this.won) return;
    this.won = true;
    this.state = "won";
    this.input.disable();
    markLevel4Complete();
    this.refreshLevelSelectUi();
    ui.winTitle.textContent = "The Gifts of Lórien";
    ui.winText.textContent = "Galadriel has armed and equipped the Fellowship for the next stage of the journey.";
    ui.restartBtn.textContent = "Choose Level";
    ui.winScreen.classList.remove("hidden");
    ui.controlsHelp.classList.add("hidden");
    ui.actionsMenu.classList.add("hidden");
    this.sfx.win();
  }

  tryAttack() {
    if (this.attackCooldown > 0 || this.attackActive) {
      return;
    }

    this.attackActive = true;
    this.attackTimer = 0;
    this.attackHit = false;
    this.attackHitTargets.clear();
    this.attackDirection *= -1;
    this.attackCooldown = ATTACK_COOLDOWN;
    if (this.input.pointerLocked) {
      this.player.facing.set(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw));
      this.player.root.rotation.y = this.cameraYaw;
    }
    this.sfx.swordSwing();
  }

  landSwordHit() {
    const playerPos = this.player.root.position;
    const targets = this.levelId === "moria"
      ? (this.moriaEnemies || []).filter((enemy) => enemy.alive && enemy.root.visible)
      : this.orc && !this.orc.stunned
        ? [this.orc]
        : [];
    let best = null;
    let bestDistance = Infinity;
    const targetPosition = new THREE.Vector3();
    for (const target of targets) {
      if (this.attackHitTargets.has(target)) continue;
      target.root.getWorldPosition(targetPosition);
      const direction = targetPosition.clone().sub(playerPos);
      direction.y = 0;
      const distance = direction.length();
      const range = target.kind === "balrog" ? 3.2 : ATTACK_RANGE;
      if (distance > range || distance <= 0.001) continue;
      direction.normalize();
      if (this.player.facing.dot(direction) < ATTACK_ARC_DOT) continue;
      if (distance < bestDistance) {
        best = target;
        bestDistance = distance;
      }
    }
    if (!best) return;

    this.attackHitTargets.add(best);
    this.attackHit = true;
    const hitPosition = new THREE.Vector3();
    best.root.getWorldPosition(hitPosition);
    this.spawnHitSparks(hitPosition);
    this.sfx.swordHit();
    if (this.levelId === "moria") {
      damageMoriaEnemy(this, best, best.kind === "balrog" ? 16 : 24);
    } else {
      best.stunned = true;
      best.stunTimer = 2.6;
      best.fleeTimer = 1.5;
      best.root.rotation.z = Math.PI / 2;
      showMessage("Clang! Your sword stuns the orc!", 1600);
    }
  }

  updateAttack(delta) {
    const player = this.player;
    const pivot = player.swordPivot;
    if (!this.attackActive) {
      pivot.rotation.x = damp(pivot.rotation.x, 0, 12, delta);
      pivot.rotation.y = damp(pivot.rotation.y, 0, 12, delta);
      pivot.rotation.z = damp(pivot.rotation.z, 0, 12, delta);
      pivot.position.x = damp(pivot.position.x, 0.18, 12, delta);
      pivot.position.y = damp(pivot.position.y, 0.12, 12, delta);
      pivot.position.z = damp(pivot.position.z, 0.08, 12, delta);
      return;
    }

    this.attackTimer += delta;
    const t = Math.min(this.attackTimer / ATTACK_DURATION, 1);

    // Wind-up over the shoulder, fast diagonal slash, follow-through, recover
    if (t < 0.28) {
      const u = easeOutCubic(t / 0.28);
      pivot.rotation.set(
        THREE.MathUtils.lerp(0, -1.55, u),
        THREE.MathUtils.lerp(0, 1.05, u),
        THREE.MathUtils.lerp(0, -0.85, u)
      );
      pivot.position.set(
        THREE.MathUtils.lerp(0.18, 0.28, u),
        THREE.MathUtils.lerp(0.12, 0.32, u),
        THREE.MathUtils.lerp(0.08, 0.02, u)
      );
    } else if (t < 0.48) {
      const u = easeInOutCubic((t - 0.28) / 0.2);
      pivot.rotation.set(
        THREE.MathUtils.lerp(-1.55, 1.15, u),
        THREE.MathUtils.lerp(1.05, -0.95, u),
        THREE.MathUtils.lerp(-0.85, 1.1, u)
      );
      pivot.position.set(
        THREE.MathUtils.lerp(0.28, 0.05, u),
        THREE.MathUtils.lerp(0.32, 0.08, u),
        THREE.MathUtils.lerp(0.02, 0.22, u)
      );
    } else if (t < 0.68) {
      const u = (t - 0.48) / 0.2;
      pivot.rotation.set(
        THREE.MathUtils.lerp(1.15, 0.55, u),
        THREE.MathUtils.lerp(-0.95, -0.35, u),
        THREE.MathUtils.lerp(1.1, 0.45, u)
      );
      pivot.position.set(
        THREE.MathUtils.lerp(0.05, 0.12, u),
        THREE.MathUtils.lerp(0.08, 0.1, u),
        THREE.MathUtils.lerp(0.22, 0.14, u)
      );
    } else {
      const u = easeInOutCubic((t - 0.68) / 0.32);
      pivot.rotation.set(
        THREE.MathUtils.lerp(0.55, 0, u),
        THREE.MathUtils.lerp(-0.35, 0, u),
        THREE.MathUtils.lerp(0.45, 0, u)
      );
      pivot.position.set(
        THREE.MathUtils.lerp(0.12, 0.18, u),
        THREE.MathUtils.lerp(0.1, 0.12, u),
        THREE.MathUtils.lerp(0.14, 0.08, u)
      );
    }

    // Alternate the slash side and keep collision active only while the blade
    // is moving through the forward arc.
    pivot.rotation.y *= this.attackDirection;
    pivot.rotation.z *= this.attackDirection;
    if (this.attackTimer >= HIT_FRAME && this.attackTimer <= HIT_WINDOW_END) {
      this.landSwordHit();
    }

    if (t >= 1) {
      this.attackActive = false;
      this.attackTimer = 0;
    }
  }

  updateFireplace(delta) {
    const fire = this.fireplace;
    if (!fire) {
      return;
    }
    if (!fire.lit || this.location !== "inside") {
      return;
    }
    fire.flicker += delta * 10;
    fire.flames.forEach((flame, i) => {
      const wobble = Math.sin(fire.flicker * 1.7 + i * 1.3);
      flame.scale.set(
        0.85 + wobble * 0.12,
        0.9 + Math.sin(fire.flicker * 2.4 + i) * 0.2,
        0.85 + wobble * 0.1
      );
      flame.rotation.z = wobble * 0.15;
    });
    fire.light.intensity = 1.45 + Math.sin(fire.flicker * 3.1) * 0.35;
  }

  updateBedUi() {
    this.updateActionUi();
  }

  updateOrc(delta) {
    const orc = this.orc;
    if (!orc || this.levelId !== "shire" || this.ringInvisible) {
      return;
    }

    if (orc.stunned) {
      orc.stunTimer -= delta;
      orc.wobble += delta * 18;
      orc.root.position.y = this.getGroundHeight(orc.root.position.x, orc.root.position.z) +
        Math.abs(Math.sin(orc.wobble)) * 0.05;
      if (orc.stunTimer <= 0) {
        orc.stunned = false;
        orc.root.rotation.z = 0;
        showMessage("The orc gets up and runs away!", 1800);
      }
      return;
    }

    if (orc.fleeTimer > 0) {
      orc.fleeTimer -= delta;
      const away = orc.root.position.clone().sub(this.player.root.position);
      away.y = 0;
      if (away.lengthSq() > 0.001) {
        away.normalize();
        orc.root.position.addScaledVector(away, 5 * delta);
        orc.root.lookAt(
          orc.root.position.x + away.x,
          orc.root.position.y,
          orc.root.position.z + away.z
        );
      }
      orc.root.position.y = this.getGroundHeight(orc.root.position.x, orc.root.position.z);
      return;
    }

    const toTarget = orc.target.clone().sub(orc.root.position);
    toTarget.y = 0;
    const dist = toTarget.length();
    if (dist < 0.25) {
      orc.target.copy(orc.target.equals(orc.patrolA) ? orc.patrolB : orc.patrolA);
      return;
    }
    toTarget.normalize();
    orc.root.position.addScaledVector(toTarget, orc.speed * delta);
    orc.root.lookAt(
      orc.root.position.x + toTarget.x,
      orc.root.position.y,
      orc.root.position.z + toTarget.z
    );
    orc.root.position.y = this.getGroundHeight(orc.root.position.x, orc.root.position.z);
  }

  getCameraRelativeMove(forwardAmount, rightAmount) {
    // Camera-forward on XZ; right = forward × up so D/Right strafe correctly
    _forward.set(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw));
    _right.set(-Math.cos(this.cameraYaw), 0, Math.sin(this.cameraYaw));
    _moveDir.set(0, 0, 0);
    _moveDir.addScaledVector(_forward, forwardAmount);
    _moveDir.addScaledVector(_right, rightAmount);
    return _moveDir;
  }

  applyMouseLook() {
    const { dx, dy } = this.input.consumeMouseLook();
    if (dx === 0 && dy === 0) {
      return;
    }
    this.cameraYaw -= dx * MOUSE_SENSITIVITY;
    this.cameraPitch -= dy * MOUSE_SENSITIVITY;
    const maxPitch = this.location === "inside" ? 0.28 : 0.72;
    const minPitch = this.location === "inside" ? -0.08 : -0.12;
    this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch, minPitch, maxPitch);
  }

  updatePlayer(delta) {
    const player = this.player;

    if (this.lyingDown) {
      this.applyMouseLook();
      player.velocity.set(0, 0, 0);
      player.root.position.copy(this.bed.liePosition);
      player.root.rotation.set(0, this.bed.lieYaw, 0);
      player.model.rotation.set(Math.PI / 2, 0, 0);
      player.model.position.set(0, 0.12, 0);
      if (this.input.wasPressed("KeyE") || this.input.wasPressed("Space")) {
        this.getUpFromBed();
      }
      if (this.input.wasPressed("KeyR")) {
        this.reset();
      }
      return;
    }

    this.applyMouseLook();
    const { forward, right, run } = this.input.getMoveInput();
    const desired = this.getCameraRelativeMove(forward, right);
    const maxSpeed = run ? RUN_SPEED : WALK_SPEED;
    const attackSlow = this.attackActive ? 0.45 : 1;

    if (desired.lengthSq() > 0) {
      desired.normalize();
      this.moveBlend.lerp(desired, 1 - Math.exp(-14 * delta));
    } else {
      this.moveBlend.lerp(_zero, 1 - Math.exp(-10 * delta));
    }

    const hasMove = this.moveBlend.lengthSq() > 0.01;
    if (hasMove) {
      _moveNorm.copy(this.moveBlend).normalize();
      player.facing.copy(_moveNorm);
      const targetYaw = Math.atan2(_moveNorm.x, _moveNorm.z);
      player.root.rotation.y = dampAngle(player.root.rotation.y, targetYaw, TURN_SPEED, delta);

      const accel = (player.onGround ? GROUND_ACCEL : AIR_ACCEL) * attackSlow;
      player.velocity.x += _moveNorm.x * accel * delta;
      player.velocity.z += _moveNorm.z * accel * delta;
    } else {
      // Point Frodo the way the camera / mouse is looking when standing still
      if (this.input.pointerLocked && !this.attackActive) {
        player.root.rotation.y = dampAngle(
          player.root.rotation.y,
          this.cameraYaw,
          TURN_SPEED * 1.2,
          delta
        );
        player.facing.set(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw));
      }
      const friction = player.onGround ? GROUND_FRICTION : AIR_FRICTION;
      const drag = Math.exp(-friction * delta);
      player.velocity.x *= drag;
      player.velocity.z *= drag;
      if (player.velocity.x * player.velocity.x + player.velocity.z * player.velocity.z < 0.0025) {
        player.velocity.x = 0;
        player.velocity.z = 0;
      }
    }

    const horizontalSpeed = Math.hypot(player.velocity.x, player.velocity.z);
    const capped = maxSpeed * attackSlow;
    if (horizontalSpeed > capped) {
      const scale = capped / horizontalSpeed;
      player.velocity.x *= scale;
      player.velocity.z *= scale;
    }

    moveWithCollisions(
      player.root.position,
      player.velocity,
      this.colliders,
      player.velocity.x * delta,
      player.velocity.z * delta
    );

    if (player.onGround) {
      this.coyoteTimer = COYOTE_TIME;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - delta);
    }

    if (this.input.wasPressed("Space") && !this.attackActive) {
      this.jumpBufferTimer = JUMP_BUFFER;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - delta);
    }

    if (this.jumpBufferTimer > 0 && (player.onGround || this.coyoteTimer > 0)) {
      player.velocity.y = JUMP_VELOCITY;
      player.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.sfx.jump();
    }

    player.velocity.y += GRAVITY * delta;
    player.root.position.y += player.velocity.y * delta;

    const ground = this.getGroundHeight(player.root.position.x, player.root.position.z);
    if (player.root.position.y <= ground) {
      player.root.position.y = ground;
      player.velocity.y = 0;
      player.onGround = true;
    } else {
      player.onGround = false;
    }

    const speedNow = Math.hypot(player.velocity.x, player.velocity.z);
    const moving = speedNow > 0.3 && !this.attackActive;
    if (player.onGround && moving) {
      const gait = Math.min(speedNow / WALK_SPEED, 1.5);
      player.walkPhase += delta * (5.5 + gait * 3.5);
      const bob = Math.abs(Math.sin(player.walkPhase * 2)) * 0.035 * gait;
      const sway = Math.sin(player.walkPhase) * 0.04 * gait;
      player.model.position.y = bob;
      player.model.rotation.z = sway;
      player.model.rotation.x = Math.sin(player.walkPhase * 2) * 0.03 * gait;
    } else {
      player.model.position.y = damp(player.model.position.y, 0, 10, delta);
      player.model.rotation.z = damp(player.model.rotation.z, 0, 10, delta);
      player.model.rotation.x = damp(player.model.rotation.x, 0, 10, delta);
    }

    if (this.input.wasPressed("KeyE")) {
      this.tryInteract();
    }

    if (this.input.wasPressed("KeyQ")) {
      this.tryUseRing();
    }

    if (this.input.wasPressed("KeyF") || this.input.wasAttackClicked()) {
      this.tryAttack();
    }

    if (this.input.wasPressed("KeyR")) {
      this.reset();
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
  }

  updateRing(delta) {
    if (!this.ring || this.ring.collected) {
      return;
    }
    if (this.ring.zone === "inside" && this.location !== "inside") {
      return;
    }
    this.ring.spin += delta;
    this.ring.mesh.rotation.y = this.ring.spin * 2;
    const baseY = this.ring.zone === "inside" ? 0.42 : 0.05;
    this.ring.mesh.position.y = baseY + Math.sin(this.ring.spin * 3) * 0.08;

    const acornWorld = new THREE.Vector3();
    this.ring.mesh.getWorldPosition(acornWorld);
    if (this.player.root.position.distanceTo(acornWorld) < 1.35) {
      this.ring.collected = true;
      this.ring.mesh.visible = false;
      this.hasRing = true;
      ui.status.textContent = "Ring: found!";
      ui.objective.textContent = "Go outside and bring the One Ring to the exit gate.";
      this.sfx.pickup();
      this.syncRingButton();
      showMessage("You found the One Ring! Press Q to turn invisible.", 2600);
    }
  }

  updateSmoke(delta) {
    if (!this.smokeOrigin) {
      return;
    }
    if (Math.random() < delta * 3) {
      const puff = createBox(0.18, 0.18, 0.18, 0xeeeeee, 0x000000, 1);
      puff.material.transparent = true;
      puff.material.opacity = 0.55;
      puff.position.copy(this.smokeOrigin);
      this.scene.add(puff);
      this.smokeParticles.push({ mesh: puff, life: 1.6, rise: 0.6 + Math.random() * 0.3 });
    }
    this.smokeParticles = this.smokeParticles.filter((particle) => {
      particle.life -= delta;
      particle.mesh.position.y += particle.rise * delta;
      particle.mesh.material.opacity = Math.max(0, particle.life / 1.6) * 0.55;
      particle.mesh.scale.multiplyScalar(1 + delta * 0.4);
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        return false;
      }
      return true;
    });
  }

  updateDecorations(delta) {
    for (const item of this.decorations) {
      item.mesh.position.x += item.spin * delta;
    }
  }

  refreshLevelSelectUi() {
    this.progress = loadProgress();
    const unlocked = this.progress.level1Complete;
    ui.levelRivendellBtn.disabled = !unlocked;
    ui.levelRivendellBtn.textContent = unlocked
      ? "Level 2 — Rivendell"
      : "Level 2 — Rivendell (locked)";
    ui.levelLothlorienBtn.disabled = false;
    ui.levelLothlorienBtn.textContent = this.progress.level3Complete
      ? "Level 4 — Lothlórien"
      : "Level 4 — Lothlórien (test)";
  }

  showLevelSelect() {
    this.refreshLevelSelectUi();
    ui.winScreen.classList.add("hidden");
    ui.levelSelect.classList.remove("hidden");
    ui.controlsHelp.classList.add("hidden");
    ui.actionsMenu.classList.add("hidden");
    ui.combatHud.classList.add("hidden");
    ui.resetBtn.classList.add("hidden");
    this.input.disable();
    this.state = "levelSelect";
  }

  onWinContinue() {
    this.showLevelSelect();
  }

  async selectLevel(levelId) {
    if (levelId === "rivendell" && !loadProgress().level1Complete) {
      showMessage("Complete the Shire quest first!", 2000);
      return;
    }
    ui.startBtn.classList.add("hidden");
    ui.quickMoriaBtn.classList.add("hidden");
    ui.levelSelect.classList.add("hidden");
    ui.fade.classList.remove("hidden");
    ui.fade.classList.add("show");
    await new Promise((r) => setTimeout(r, 400));
    await this.goToLevel(levelId);
    ui.fade.classList.remove("show");
    setTimeout(() => ui.fade.classList.add("hidden"), 450);
    this.state = "playing";
    this.input.enable();
    this.focusGame();
    this.input.requestPointerLock(this.canvas);
    ui.controlsHelp.classList.remove("hidden");
    ui.resetBtn.classList.remove("hidden");
  }

  async goToLevel(levelId) {
    this.levelId = levelId;
    saveProgress({ currentLevel: levelId });
    this.won = false;
    this.lyingDown = false;
    this.clearInvisibility(true);
    this.hasRing = false;
    ui.restartBtn.textContent = "Continue";
    ui.actionsMenu.classList.add("hidden");
    ui.combatHud.classList.add("hidden");
    ui.winScreen.classList.add("hidden");

    if (levelId === "lothlorien") {
      buildLothlorienLevel(this);
      this.lothlorienBuilt = true;
      resetLothlorienQuest(this);
      this.lothlorienSpawn = this.lothlorienSpawn || lothlorienSpawn();
      this.applyLevelActivation("lothlorien");
      this.player.root.position.copy(this.lothlorienSpawn);
      this.player.root.rotation.set(0, 0, 0);
      this.player.velocity.set(0, 0, 0);
      this.cameraYaw = 0;
      this.cameraPitch = 0.28;
      this.location = "lothlorien";
      this.scene.background = new THREE.Color(0x293c27);
      this.scene.fog = new THREE.FogExp2(0xd7dda6, 0.012);
      this.renderer.toneMappingExposure = 0.9;
      if (this.sky) this.sky.visible = false;
      if (this.sun) this.sun.intensity = 1.45;
      ui.levelSubtitle.textContent = "Level 4 — Lothlórien";
      ui.ringBtn.classList.add("hidden");
      this.setLothlorienQuestStage(0);
      showMessage("Welcome to Caras Galadhon. Follow the guarded white stairs to Galadriel.", 3600);
    } else if (levelId === "moria") {
      buildMoriaLevel(this);
      this.moriaBuilt = true;
      resetMoriaLevel(this);
      this.playerHealth = this.playerMaxHealth;
      this.playerDamageCooldown = 0;
      this.applyLevelActivation("moria");
      this.player.root.position.copy(this.moriaSpawn);
      this.player.root.rotation.set(0, 0, 0);
      this.player.velocity.set(0, 0, 0);
      this.cameraYaw = 0;
      this.cameraPitch = 0.2;
      this.location = "moria";
      this.scene.background = new THREE.Color(0x08090b);
      this.scene.fog = new THREE.FogExp2(0x111418, 0.022);
      this.renderer.toneMappingExposure = 0.66;
      if (this.sky) this.sky.visible = false;
      if (this.sun) this.sun.intensity = 0.28;
      ui.levelSubtitle.textContent = "Level 3 — The Mines of Moria";
      ui.objective.textContent = "Fight through the Dwarrowdelf and reach the Bridge of Khazad-dûm.";
      ui.status.textContent = "Orcs remaining: 16";
      ui.ringBtn.classList.add("hidden");
      ui.combatHud.classList.remove("hidden");
      ui.bossHealth.classList.add("hidden");
      this.refreshMoriaHud();
      showMessage("The Fellowship enters Moria. Stay together and fight toward the bridge!", 3600);
    } else if (levelId === "rivendell") {
      buildRivendellLevel(this);
      this.rivendellBuilt = true;
      resetRivendellQuest(this);
      this.applyLevelActivation("rivendell");
      this.player.root.position.copy(this.rivendellSpawn);
      this.player.root.rotation.set(0, 0, 0);
      this.player.velocity.set(0, 0, 0);
      this.cameraYaw = 0;
      this.cameraPitch = 0.28;
      this.location = "outside";
      this.scene.background = this.defaultBackground;
      this.scene.fog = new THREE.FogExp2(0xb8d4c8, 0.012);
      this.renderer.toneMappingExposure = this.defaultExposure;
      if (this.sky) this.sky.visible = this.defaultSkyVisible;
      if (this.sun) this.sun.intensity = 2.4;
      ui.combatHud.classList.add("hidden");
      ui.levelSubtitle.textContent = "Rivendell — The Last Homely House";
      ui.objective.textContent = "Enter the hall, approach Elrond, then press E.";
      ui.status.textContent = "Fellowship: speak with Elrond first";
      ui.ringBtn.classList.add("hidden");
      showMessage("Find Elrond inside the hall. Press E when Speak appears.", 3200);
    } else {
      this.hasRing = false;
      this.ringCooldownTimer = 0;
      if (this.ring) {
        this.ring.collected = false;
        this.ring.spin = 0;
        this.ring.mesh.visible = true;
        if (this.ring.zone === "inside") {
          this.ring.mesh.position.set(-6.8, 0.42, -16.2);
        }
      }
      this.applyLevelActivation("shire");
      this.player.root.position.set(0, 0, 16);
      this.player.root.rotation.set(0, 0, 0);
      this.player.velocity.set(0, 0, 0);
      this.cameraYaw = Math.PI;
      this.cameraPitch = 0.32;
      this.location = "outside";
      this.scene.background = this.defaultBackground;
      this.scene.fog = new THREE.FogExp2(0xc5dcc0, 0.014);
      this.renderer.toneMappingExposure = this.defaultExposure;
      if (this.sky) this.sky.visible = this.defaultSkyVisible;
      if (this.sun) this.sun.intensity = 2.4;
      ui.combatHud.classList.add("hidden");
      ui.levelSubtitle.textContent = "Frodo's Shire Quest";
      ui.objective.textContent = "Open Bag End, find the One Ring, then reach the exit gate.";
      ui.status.textContent = "Ring: not found";
      this.syncRingButton();
      showMessage("Back in the Shire.", 1800);
    }
    this.player.model.rotation.set(0, 0, 0);
    this.player.model.position.set(0, 0, 0);
    this.player.swordPivot.visible = true;
    this.snapCamera();
  }

  applyLevelActivation(levelId) {
    this.levelId = levelId;
    for (const c of this.colliders) {
      const lvl = c.level || "shire";
      if (lvl !== levelId) {
        c.active = false;
        continue;
      }
      c.active = true;
    }
    if (levelId === "shire") {
      applyZone(this, this.location || "outside");
      for (const c of this.colliders) {
        if ((c.level || "shire") !== "shire") c.active = false;
      }
    }
    if (this.bagEndGroup) this.bagEndGroup.visible = levelId === "shire";
    if (this.rivendellGroup) this.rivendellGroup.visible = levelId === "rivendell";
    if (this.moriaGroup) this.moriaGroup.visible = levelId === "moria";
    if (this.lothlorienGroup) this.lothlorienGroup.visible = levelId === "lothlorien";
    if (this.orc && this.orc.root) this.orc.root.visible = levelId === "shire";
  }

  setPlayerOpacity(opacity) {
    this.player.model.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        m.transparent = opacity < 0.99;
        m.opacity = opacity;
        m.depthWrite = opacity > 0.9;
      }
    });
  }

  clearInvisibility(silent = false) {
    this.ringInvisible = false;
    this.ringInvisTimer = 0;
    this.setPlayerOpacity(1);
    if (!silent) this.syncRingButton();
  }

  syncRingButton() {
    if (!ui.ringBtn) return;
    if (this.levelId !== "shire" || !this.hasRing) {
      ui.ringBtn.classList.add("hidden");
      return;
    }
    ui.ringBtn.classList.remove("hidden");
    if (this.ringInvisible) {
      ui.ringLabel.textContent = "Invisible: " + Math.ceil(this.ringInvisTimer) + "s";
      ui.ringBtn.disabled = true;
    } else if (this.ringCooldownTimer > 0) {
      ui.ringLabel.textContent = "Ring cooldown: " + Math.ceil(this.ringCooldownTimer) + "s";
      ui.ringBtn.disabled = true;
    } else {
      ui.ringLabel.textContent = "Use Ring";
      ui.ringBtn.disabled = false;
    }
  }

  tryUseRing() {
    if (this.levelId !== "shire" || !this.hasRing || this.ringInvisible || this.ringCooldownTimer > 0 || this.lyingDown) {
      return;
    }
    this.ringInvisible = true;
    this.ringInvisTimer = RING_INVIS_DURATION;
    this.setPlayerOpacity(0.28);
    this.syncRingButton();
    showMessage("The Ring hides you!", 1600);
  }

  updateRingPower(delta) {
    if (this.ringInvisible) {
      this.ringInvisTimer -= delta;
      this.syncRingButton();
      if (this.ringInvisTimer <= 0) {
        this.clearInvisibility();
        this.ringCooldownTimer = RING_COOLDOWN;
        showMessage("You are visible again.", 1400);
      }
    } else if (this.ringCooldownTimer > 0) {
      this.ringCooldownTimer -= delta;
      this.syncRingButton();
    }
  }

  tryTalk() {
    if (this.levelId !== "rivendell" || !this.npcs || !this.npcs.length) return;
    const npc = nearestNpc(this.npcs, this.player.root.position, TALK_RANGE);
    if (!npc) {
      showMessage("No one close enough to talk.", 1200);
      return;
    }
    if (npc.role !== "elrond" && !(this.rivendellQuest && this.rivendellQuest.spokenToElrond)) {
      showMessage("Speak with Elrond first.", 1800);
      return;
    }
    if (npc.spoken) {
      showMessage(npc.name + ': "We already spoke, Frodo."', 1600);
      return;
    }
    npc.spoken = true;
    showMessage(npc.name + ': "' + npc.dialogue + '"', 3200);
    if (npc.role === "elrond") {
      this.rivendellQuest.spokenToElrond = true;
      ui.objective.textContent = "Gather the Fellowship (0/8).";
      ui.status.textContent = "Fellowship: 0/8 gathered";
    } else {
      this.rivendellQuest.gathered += 1;
      const g = this.rivendellQuest.gathered;
      const n = this.rivendellQuest.needed;
      ui.status.textContent = "Fellowship: " + g + "/" + n + " gathered";
      ui.objective.textContent = g >= n ? "The Council is ready!" : "Gather the Fellowship (" + g + "/" + n + ").";
      if (g >= n) this.completeRivendell();
    }
  }

  updateTalkUi() {
    this.updateActionUi();
  }

  completeRivendell() {
    if (this.won) return;
    this.won = true;
    this.state = "won";
    this.input.disable();
    ui.winTitle.textContent = "The Council is gathered!";
    ui.winText.textContent = "You spoke with Elrond and united the Fellowship in Rivendell.";
    ui.winScreen.classList.remove("hidden");
    ui.controlsHelp.classList.add("hidden");
    ui.actionsMenu.classList.add("hidden");
    this.sfx.win();
  }


  checkWin() {
    if (this.levelId !== "shire" || this.won) {
      return;
    }
    if (!this.hasRing || !this.exitGate || this.location !== "outside") {
      return;
    }
    if (overlaps(playerBox(this.player.root.position), this.exitGate.bounds)) {
      this.won = true;
      this.state = "won";
      this.input.disable();
      markLevel1Complete();
      this.refreshLevelSelectUi();
      ui.winTitle.textContent = "You did it, Frodo!";
      ui.winText.textContent = "You found the One Ring and reached the Shire gate. Rivendell awaits!";
      ui.winScreen.classList.remove("hidden");
      ui.controlsHelp.classList.add("hidden");
      ui.ringBtn.classList.add("hidden");
      ui.actionsMenu.classList.add("hidden");
      this.sfx.win();
    }
  }

  getCameraRig(target, speed = 0) {
    const inside = this.location === "inside";
    const lying = this.lyingDown;
    const distance = lying ? 2.4 : inside ? 2.85 : 6.8 + Math.min(speed * 0.12, 0.8);
    const lookHeight = lying ? 0.7 : inside ? 0.95 : 1.15;
    const bob =
      this.player.onGround && !inside
        ? Math.sin(this.player.walkPhase * 2) * Math.min(speed, 3) * 0.015
        : 0;
    const cosPitch = Math.cos(this.cameraPitch);
    const sinPitch = Math.sin(this.cameraPitch);
    const horizontal = distance * cosPitch;
    const desiredX = target.x - Math.sin(this.cameraYaw) * horizontal;
    const desiredZ = target.z - Math.cos(this.cameraYaw) * horizontal;
    const desiredY = target.y + lookHeight + distance * sinPitch + bob;
    // Keep the camera under Bag End's ceiling (~3.2)
    const maxY = inside ? target.y + 2.35 : Infinity;
    return {
      x: desiredX,
      y: Math.min(desiredY, maxY),
      z: desiredZ,
      lookY: target.y + lookHeight + bob * 0.5,
    };
  }

  snapCamera() {
    const target = this.player.root.position;
    const rig = this.getCameraRig(target, 0);
    this.camera.position.set(rig.x, rig.y, rig.z);
    this.camera.lookAt(target.x, rig.lookY, target.z);
  }

  updateCamera(delta) {
    const target = this.player.root.position;
    const speed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    const rig = this.getCameraRig(target, speed);
    _probePos.set(rig.x, rig.y, rig.z);

    const follow = 1 - Math.exp((this.location === "inside" ? -9 : -5.5) * delta);
    this.camera.position.lerp(_probePos, follow);
    this.camera.lookAt(target.x, rig.lookY, target.z);

    if (this.sky) {
      this.sky.position.copy(this.camera.position);
    }
    if (this.sun) {
      this.sun.target.position.copy(target);
      this.sun.target.updateMatrixWorld();
    }
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.gameTime += delta;
    if (this.state === "playing") {
      this.playerDamageCooldown = Math.max(0, this.playerDamageCooldown - delta);
      this.updatePlayer(delta);
      this.updateAttack(delta);
      if (this.levelId === "shire") {
        this.updateDoors(delta);
        this.updateZoneTransitions(delta);
        if (this.location === "outside") {
          this.updateOrc(delta);
          this.updateSmoke(delta);
        }
        this.updateRing(delta);
        this.updateFireplace(delta);
        this.updateBedUi();
        this.updateRingPower(delta);
      } else if (this.levelId === "rivendell") {
        updateNpcIdle(this.npcs || [], this.gameTime);
        animateRivendellWater(this, this.gameTime);
      } else if (this.levelId === "moria") {
        updateMoriaActors(this, delta, this.gameTime);
        animateMoriaWorld(this, this.gameTime);
      } else if (this.levelId === "lothlorien") {
        updateLothlorienLevel(this, this.gameTime);
      }
      this.updateActionUi();
      this.updateHitSparks(delta);
      this.checkWin();
    } else {
      this.updateAttack(delta);
      this.updateHitSparks(delta);
    }

    this.updateDecorations(delta);
    this.updateCamera(delta);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }
}

const game = new Game(document.getElementById("game"));
game.init();

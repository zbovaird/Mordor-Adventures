import { buildDetailedHobbitHole } from "../detailedHole.js";
import { buildBagEnd, applyZone } from "../bagEnd.js";
import { decorateRealisticWorld } from "../natureProps.js";

/**
 * Build (or rebuild wiring for) the Shire / Bag End level on the game instance.
 * Expects game helper methods from main (addGround, spawnOrc, etc.).
 */
export function buildShireLevel(game) {
  game.addGround(52, 52, 0, 8, 0x74b856);
  game.addHill(5, 0.9, 3.2, -11, 5);
  game.addHill(3.5, 0.6, 2.8, 10, 7);
  game.addHill(2.5, 0.4, 2, -6, 12);
  game.addPond(14, 16);
  game.addLampPost(-3, 10);
  game.addLampPost(4, 2);
  game.addMailbox(-2, 6);
  game.addBench(6, 10, Math.PI / 2);
  game.addSign(-5, 13, 0.4);
  if (game.holeTextures) {
    buildDetailedHobbitHole(game, game.holeTextures);
    buildBagEnd(game, game.holeTextures);
    applyZone(game, "outside");
  } else {
    game.buildHobbitHole();
    game.spawnRing();
  }
  game.buildExitGate();
  game.spawnOrc();
  game.addClouds();
  if (game.natureTextures) {
    decorateRealisticWorld(game, game.natureTextures);
  }
  for (const c of game.colliders) {
    if (!c.level) {
      c.level = "shire";
    }
  }
  for (const patch of game.groundHeights) {
    if (!patch.level && patch.zone !== "inside") {
      patch.level = "shire";
    }
    if (patch.zone === "inside") {
      patch.level = "shire";
    }
  }
}

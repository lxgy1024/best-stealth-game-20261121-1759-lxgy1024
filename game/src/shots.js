// Screenshot staging: ?shot=<name>&seed=1 freezes the game in one of four
// fixed, real states and renders it with the real renderer, so the maker's
// screenshots are deterministic renders of the game itself.

import { TILE } from './config.js';

function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function placeGuard(guard, tx, ty, facing) {
  const at = tileCenter(tx, ty);
  guard.x = at.x;
  guard.y = at.y;
  guard.facing = facing;
  guard.state = 'patrol';
  guard.suspicion = 0;
  guard.lastSeen = null;
  guard.lookTarget = null;
  guard.waypointIndex = 0;
}

export function shotFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shot');
}

// Arrange the world for one of the four shots, then freeze it: the render
// loop keeps drawing, but the update step is skipped while staging.
export function applyShot(world, name) {
  const { level, player, guards } = world;
  world.phase = 'playing';
  world.staged = true;
  const [gallery, west, east, vault] = guards;
  if (name === 'level') {
    // The whole museum at a glance: Wren at the door, guards mid-patrol,
    // all three relics glowing.
    player.x = level.playerStart.x;
    player.y = level.playerStart.y;
    player.facing = 0;
    placeGuard(gallery, 12, 7, 0);
    placeGuard(west, 3, 2, Math.PI / 2);
    placeGuard(east, 19, 2, -Math.PI / 2);
    placeGuard(vault, 10, 12, Math.PI);
  } else if (name === 'cone') {
    // A near miss: Wren slips across the gallery corridor just inside the
    // Gallery guard's cone, suspicion climbing, the guard turning wary.
    const at = tileCenter(12, 7);
    gallery.x = at.x;
    gallery.y = at.y;
    gallery.facing = Math.PI;
    gallery.state = 'investigate';
    gallery.suspicion = 0.72;
    gallery.lastSeen = { x: tileCenter(9, 7).x, y: tileCenter(9, 7).y };
    player.x = tileCenter(9, 7).x;
    player.y = tileCenter(9, 7).y;
    player.facing = Math.PI;
    placeGuard(west, 4, 4, 0);
    placeGuard(east, 18, 3, Math.PI / 2);
    placeGuard(vault, 11, 12, 0);
  } else if (name === 'cover') {
    // Hidden in the ferns: the Vault guard's cone sweeps right over Wren,
    // who is crouched in the west-wing fern while the guard looks away.
    const fern = tileCenter(2, 12);
    player.x = fern.x;
    player.y = fern.y;
    player.facing = Math.PI / 2;
    player.hidden = true;
    placeGuard(vault, 11, 12, Math.PI);
    vault.suspicion = 0.2;
    placeGuard(gallery, 15, 7, Math.PI);
    placeGuard(west, 3, 3, -Math.PI / 2);
    placeGuard(east, 19, 2, Math.PI);
  } else if (name === 'exit') {
    // The getaway: all three relics lifted, Wren one step from the green
    // exit while the Gallery guard patrols the corridor behind.
    for (const relic of level.relics) relic.taken = true;
    const at = tileCenter(17, 8);
    player.x = at.x;
    player.y = at.y;
    player.facing = 0;
    placeGuard(gallery, 10, 7, Math.PI);
    placeGuard(west, 4, 2, 0);
    placeGuard(east, 20, 3, -Math.PI / 2);
    placeGuard(vault, 9, 12, Math.PI / 2);
  }
  world.elapsed = name === 'exit' ? 187 : 42;
}

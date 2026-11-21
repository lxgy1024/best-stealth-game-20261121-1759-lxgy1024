// The player: Wren the cat burglar. Walks, sneaks, runs (loudly), and
// tosses coins to pull a guard away from a patrol route.

import { TILE, TUNING } from './config.js';
import { moveCircle, isFern, isDim, distance } from './level.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: TUNING.playerRadius,
    facing: 0, // radians; the direction Wren last moved in
    moving: false,
    sneaking: false,
    running: false,
    hidden: false, // crouched in a fern right now
    inDim: false, // standing on dim floor right now
    stepTimer: 0,
    stepLoud: false,
    coins: TUNING.coinCount,
    coin: null, // the coin in flight, or null
    noisePulse: 0, // seconds left on the running-noise pulse
  };
}

// keys is a Set of currently held key codes (lowercase). Returns an object
// describing what happened this tick, so main.js can play sounds and alert
// guards without the player module knowing about them.
export function updatePlayer(player, keys, level, dt) {
  let ix = 0;
  let iy = 0;
  // keys holds lowercased event.code values: 'keya', 'arrowleft', …
  if (keys.has('arrowleft') || keys.has('keya')) ix -= 1;
  if (keys.has('arrowright') || keys.has('keyd')) ix += 1;
  if (keys.has('arrowup') || keys.has('keyw')) iy -= 1;
  if (keys.has('arrowdown') || keys.has('keys')) iy += 1;

  player.sneaking = keys.has('shiftleft') || keys.has('shiftright');
  const speed = player.sneaking ? TUNING.sneakSpeed : TUNING.walkSpeed;
  player.moving = ix !== 0 || iy !== 0;
  player.running = player.moving && !player.sneaking;

  const events = { stepped: false, noise: null };
  if (player.moving) {
    const len = Math.hypot(ix, iy);
    const nx = (ix / len) * speed * dt;
    const ny = (iy / len) * speed * dt;
    player.facing = Math.atan2(iy, ix);
    const moved = moveCircle(level, player, nx, ny, player.radius);
    player.x = moved.x;
    player.y = moved.y;

    // Footsteps: a soft tick each stride, and a noise pulse guards can hear
    // while running.
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = player.sneaking ? 0.55 : 0.34;
      events.stepped = true;
      player.stepLoud = player.running;
      if (player.running) {
        player.noisePulse = 0.25;
        events.noise = { x: player.x, y: player.y, radius: TUNING.noiseRadius };
      }
    }
  }
  if (player.noisePulse > 0) player.noisePulse -= dt;

  player.hidden = isFern(level, player.x, player.y);
  player.inDim = isDim(level, player.x, player.y);

  // A coin already in flight keeps arcing toward its landing spot.
  if (player.coin) {
    const coin = player.coin;
    coin.t += dt / coin.duration;
    if (coin.t >= 1) {
      coin.x = coin.targetX;
      coin.y = coin.targetY;
      coin.landed = true;
      events.coinLanded = { x: coin.x, y: coin.y, radius: TUNING.coinLureRadius };
      player.coin = null;
    } else {
      coin.x = coin.fromX + (coin.targetX - coin.fromX) * coin.t;
      coin.y = coin.fromY + (coin.targetY - coin.fromY) * coin.t;
    }
  }
  return events;
}

// Aim a coin at a world point (the mouse click). Returns false when there
// is no coin left or one is already in the air.
export function tossCoin(player, targetX, targetY) {
  if (player.coins <= 0 || player.coin) return false;
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const dist = Math.hypot(dx, dy);
  const reach = Math.min(dist, TUNING.coinThrowRange);
  const ux = dist > 0 ? dx / dist : 1;
  const uy = dist > 0 ? dy / dist : 0;
  player.coins -= 1;
  player.coin = {
    fromX: player.x,
    fromY: player.y,
    targetX: player.x + ux * reach,
    targetY: player.y + uy * reach,
    x: player.x,
    y: player.y,
    t: 0,
    duration: Math.max(0.25, reach / 620),
    landed: false,
  };
  return true;
}

export function playerAtExit(player, level) {
  return distance(player.x, player.y, level.exit.x, level.exit.y) < TILE * 0.55;
}

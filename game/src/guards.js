// Guards: patrol routes, vision cones, suspicion, and the states a guard
// moves through — patrol, suspicious, investigate, chase, and back again.
// A guard never sees through walls or crates, and a player crouched in a
// fern is invisible unless the guard is nearly on top of them.

import { TILE, TUNING } from './config.js';
import { moveCircle, hasLineOfSight, distance } from './level.js';

export function createGuards(defs) {
  return defs.map((def) => {
    const start = { x: def.waypoints[0][0] * TILE + TILE / 2, y: def.waypoints[0][1] * TILE + TILE / 2 };
    return {
      name: def.name,
      x: start.x,
      y: start.y,
      facing: 0,
      speed: def.speed,
      waypoints: def.waypoints.map(([tx, ty]) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 })),
      waypointIndex: 1,
      state: 'patrol', // patrol | suspicious | investigate | chase
      suspicion: 0,
      lastSeen: null, // {x, y} where the player was last spotted
      lookTarget: null, // {x, y} a noise or coin sent the guard to check
      lookTimer: 0,
      calmTimer: 0,
      pauseTimer: 0,
      stepTimer: 0,
    };
  });
}

// How clearly this guard can see the player right now, 0 (not at all) to 1
// (dead centre of the cone, up close). Ferns, distance, angle and walls all
// count; sneaking and dim floor slow the suspicion that follows.
export function guardSeesPlayer(guard, player, level) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > TUNING.coneRange) return 0;
  let angle = Math.atan2(dy, dx) - guard.facing;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  if (Math.abs(angle) > TUNING.coneHalfAngle) return 0;
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return 0;
  if (player.hidden && dist > TUNING.fernHideDistance) return 0;
  const closeness = 1 - dist / TUNING.coneRange;
  const centred = 1 - Math.abs(angle) / TUNING.coneHalfAngle;
  return Math.min(1, 0.25 + 0.75 * closeness * (0.4 + 0.6 * centred));
}

function steerToward(guard, level, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  guard.facing = Math.atan2(dy, dx);
  const step = Math.min(dist, speed * dt);
  const moved = moveCircle(level, guard, (dx / dist) * step, (dy / dist) * step, 14);
  guard.x = moved.x;
  guard.y = moved.y;
  return dist - step < 4;
}

// Advance every guard one tick. Returns events main.js reacts to: a guard
// growing suspicious, raising the alarm, calming down, or catching the
// player. The player argument is the live player object.
export function updateGuards(guards, player, level, dt) {
  const events = { becameSuspicious: [], alarmRaised: [], calmed: [], caught: null };
  for (const guard of guards) {
    const seen = guardSeesPlayer(guard, player, level);
    const wasSuspicious = guard.suspicion >= TUNING.suspiciousAt;

    if (seen > 0) {
      // Spotted: suspicion climbs faster up close, slower when the player
      // sneaks or stands in the dark. A fern hides the player outright.
      let rate = TUNING.spotBaseRate * (0.35 + 0.65 * seen);
      if (player.sneaking) rate *= TUNING.spotSneakFactor;
      if (player.inDim) rate *= TUNING.spotDimFactor;
      if (player.running) rate *= TUNING.spotRunFactor;
      guard.suspicion = Math.min(1, guard.suspicion + rate * dt);
      guard.lastSeen = { x: player.x, y: player.y };
      guard.calmTimer = 0;
    } else {
      guard.suspicion = Math.max(0, guard.suspicion - TUNING.suspicionDecay * dt);
      if (guard.state === 'chase') {
        guard.calmTimer += dt;
        if (guard.calmTimer >= TUNING.calmAfterSeconds) {
          guard.state = 'investigate';
          guard.lookTarget = guard.lastSeen;
          guard.lookTimer = 2.5;
          guard.calmTimer = 0;
          events.calmed.push(guard.name);
        }
      }
    }

    if (!wasSuspicious && guard.suspicion >= TUNING.suspiciousAt && guard.suspicion < TUNING.alarmAt) {
      events.becameSuspicious.push(guard.name);
    }
    if (guard.suspicion >= TUNING.alarmAt && guard.state !== 'chase') {
      guard.state = 'chase';
      events.alarmRaised.push(guard.name);
    }

    // --- state behaviour ---
    if (guard.state === 'chase') {
      const target = guard.lastSeen || { x: player.x, y: player.y };
      steerToward(guard, level, target.x, target.y, guard.speed * 1.55, dt);
      if (distance(guard.x, guard.y, player.x, player.y) < TUNING.catchDistance && seen > 0) {
        events.caught = guard.name;
      }
    } else if (guard.state === 'investigate' && guard.lookTarget) {
      const arrived = steerToward(guard, level, guard.lookTarget.x, guard.lookTarget.y, guard.speed * 1.25, dt);
      if (arrived) {
        guard.lookTimer -= dt;
        guard.facing += dt * 1.6; // scan the room
        if (guard.lookTimer <= 0) {
          guard.state = 'patrol';
          guard.lookTarget = null;
        }
      }
    } else if (guard.suspicion >= TUNING.suspiciousAt && guard.lastSeen) {
      // Half-sure: walk over to where the player was glimpsed.
      guard.state = 'investigate';
      guard.lookTarget = guard.lastSeen;
      guard.lookTimer = 2.5;
    } else {
      // Patrol: walk the route, pausing a beat at each waypoint.
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
      } else {
        const target = guard.waypoints[guard.waypointIndex];
        const arrived = steerToward(guard, level, target.x, target.y, guard.speed, dt);
        if (arrived) {
          guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
          guard.pauseTimer = 0.7;
        }
      }
    }

    // Bootsteps other guards' ears — main.js turns these into sound by
    // distance, so footsteps tell the player where a guard is.
    guard.stepTimer -= dt * (guard.state === 'chase' ? 1.6 : 1);
    if (guard.stepTimer <= 0) {
      guard.stepTimer = 0.42;
      guard.stepped = true;
    } else {
      guard.stepped = false;
    }
  }
  return events;
}

// A noise (running feet) or a landed coin pulls every guard in range over
// to look at the spot — unless that guard is already chasing the player.
export function lureGuards(guards, point, radius, lookSeconds) {
  for (const guard of guards) {
    if (guard.state === 'chase') continue;
    if (distance(guard.x, guard.y, point.x, point.y) > radius) continue;
    guard.state = 'investigate';
    guard.lookTarget = { x: point.x, y: point.y };
    guard.lookTimer = lookSeconds;
    if (guard.suspicion < TUNING.suspiciousAt) guard.suspicion = TUNING.suspiciousAt;
  }
}

export function highestSuspicion(guards) {
  return guards.reduce((max, g) => Math.max(max, g.suspicion), 0);
}

export function anyAlarm(guards) {
  return guards.some((g) => g.state === 'chase');
}

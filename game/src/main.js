// Entry point: wires input, the game loop and the win/lose state machine
// together, and keeps a small read-only snapshot on window for play-testing.

import { VIEW_W, VIEW_H, GUARD_DEFS, TUNING } from './config.js';
import { parseLevel } from './level.js';
import { createPlayer, updatePlayer, tossCoin, playerAtExit } from './player.js';
import { createGuards, updateGuards, lureGuards, highestSuspicion } from './guards.js';
import { drawWorld } from './render.js';
import { SoundBank } from './audio.js';
import { shotFromUrl, applyShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');
const sounds = new SoundBank();

function newWorld() {
  const level = parseLevel();
  return {
    level,
    player: createPlayer(level.playerStart),
    guards: createGuards(GUARD_DEFS),
    phase: 'title', // title | playing | won | caught
    staged: false,
    elapsed: 0,
    winTime: '',
    caughtBy: '',
    alarmSounded: false,
  };
}

const world = newWorld();
const keys = new Set();
let lastTime = performance.now();
let time = 0;

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

function startGame() {
  if (world.phase !== 'title') return;
  sounds.unlock();
  world.phase = 'playing';
  announce('The heist is on. Steal three relics and reach the exit unseen.');
}

function restart() {
  const fresh = newWorld();
  world.level = fresh.level;
  world.player = fresh.player;
  world.guards = fresh.guards;
  world.phase = 'playing';
  world.elapsed = 0;
  world.winTime = '';
  world.caughtBy = '';
  world.alarmSounded = false;
  announce('A fresh night. Steal three relics and reach the exit unseen.');
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function tick(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  time += dt;

  if (world.phase === 'playing' && !world.staged) {
    world.elapsed += dt;
    const playerEvents = updatePlayer(world.player, keys, world.level, dt);
    if (playerEvents.stepped) sounds.footstep(world.player.stepLoud);
    if (playerEvents.noise) {
      lureGuards(world.guards, playerEvents.noise, playerEvents.noise.radius, 2.5);
    }
    if (playerEvents.coinLanded) {
      sounds.coinLand();
      lureGuards(world.guards, playerEvents.coinLanded, playerEvents.coinLanded.radius, TUNING.coinLookSeconds);
    }

    const guardEvents = updateGuards(world.guards, world.player, world.level, dt);
    if (guardEvents.becameSuspicious.length > 0) sounds.suspicious();
    if (guardEvents.alarmRaised.length > 0) {
      sounds.alarm();
      world.alarmSounded = true;
      announce('Spotted! A guard is chasing you — break line of sight!');
    }
    if (guardEvents.calmed.length > 0) announce('The alarm fades. The guards go back to their rounds.');
    if (guardEvents.caught) {
      world.phase = 'caught';
      world.caughtBy = guardEvents.caught;
      sounds.caught();
      announce('Caught by ' + guardEvents.caught + '. Press R to try again.');
    }

    // A guard's boots on marble, louder the nearer the guard: footsteps
    // that tell the player where the danger is.
    for (const guard of world.guards) {
      if (!guard.stepped) continue;
      const dist = Math.hypot(guard.x - world.player.x, guard.y - world.player.y);
      sounds.guardStep(Math.max(0, 1 - dist / 420));
    }

    // Pick up a relic by walking over its pedestal.
    for (const relic of world.level.relics) {
      if (relic.taken) continue;
      if (Math.hypot(world.player.x - relic.x, world.player.y - relic.y) < 26) {
        relic.taken = true;
        sounds.pickup();
        const taken = world.level.relics.filter((r) => r.taken).length;
        announce(`Lifted the ${relic.name} — ${taken} of 3. ${taken === 3 ? 'Now reach the exit!' : ''}`);
      }
    }

    // All relics lifted and the exit reached unseen: a clean getaway.
    if (world.level.relics.every((r) => r.taken) && playerAtExit(world.player, world.level)) {
      world.phase = 'won';
      world.winTime = formatTime(world.elapsed);
      sounds.win();
      announce('Clean getaway! All three relics lifted in ' + world.winTime + '.');
    }
  }

  drawWorld(ctx, world, time);
  requestAnimationFrame(tick);
}

window.addEventListener('keydown', (event) => {
  const code = event.code.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space'].includes(code)) event.preventDefault();
  sounds.unlock();
  if (code === 'enter' || code === 'space') startGame();
  if (code === 'keyr' && world.phase !== 'title') restart();
  if (code === 'keym') sounds.muted = !sounds.muted;
  keys.add(code);
});
window.addEventListener('keyup', (event) => keys.delete(event.code.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

canvas.addEventListener('mousedown', (event) => {
  sounds.unlock();
  if (world.phase === 'title') {
    startGame();
    return;
  }
  if (world.phase !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const wx = (event.clientX - rect.left) * (VIEW_W / rect.width);
  const wy = (event.clientY - rect.top) * (VIEW_H / rect.height);
  if (tossCoin(world.player, wx, wy)) sounds.coinToss();
});

// A small read-only snapshot for automated play-testing in a headless
// browser; the game itself never reads it.
window.__game = {
  world,
  suspicion: () => highestSuspicion(world.guards),
  phase: () => world.phase,
  player: () => ({ x: world.player.x, y: world.player.y, coins: world.player.coins, hidden: world.player.hidden }),
  guards: () => world.guards.map((g) => ({ name: g.name, x: g.x, y: g.y, state: g.state, suspicion: g.suspicion })),
  relics: () => world.level.relics.map((r) => ({ name: r.name, taken: r.taken })),
};

// Freeze a staged screenshot state, or start the live game.
const shot = shotFromUrl();
if (shot) {
  applyShot(world, shot);
} else {
  announce('The Amber Star Heist. Press Enter to begin.');
}
requestAnimationFrame(tick);

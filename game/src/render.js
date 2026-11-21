// Rendering: everything the player sees, drawn on one canvas — the museum
// floor, walls and crates, ferns to hide in, glowing relics, the green exit,
// each guard's vision cone, and the HUD and screens on top.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, TUNING, PALETTE } from './config.js';
import { highestSuspicion, anyAlarm } from './guards.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, level, time) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const key = tx + ',' + ty;
      const x = tx * TILE;
      const y = ty * TILE;
      if (level.walls.has(key)) continue;
      const dim = level.dimTiles.has(key);
      ctx.fillStyle = dim ? PALETTE.floorDim : (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      if (dim) {
        // Moonlight pooling on the dim floor: what is safe, lit softly.
        ctx.fillStyle = PALETTE.lampGlow;
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
      }
    }
  }
  // Thin grout lines so the floor reads as tiles, not a flat wash.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let tx = 1; tx < COLS; tx++) {
    ctx.moveTo(tx * TILE, 0);
    ctx.lineTo(tx * TILE, VIEW_H);
  }
  for (let ty = 1; ty < ROWS; ty++) {
    ctx.moveTo(0, ty * TILE);
    ctx.lineTo(VIEW_W, ty * TILE);
  }
  ctx.stroke();
  void time;
}

function drawWallsAndCrates(ctx, level) {
  for (const key of level.walls) {
    const [tx, ty] = key.split(',').map(Number);
    const x = tx * TILE;
    const y = ty * TILE;
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(x, y, TILE, 7);
  }
  for (const key of level.crates) {
    const [tx, ty] = key.split(',').map(Number);
    const x = tx * TILE + 4;
    const y = ty * TILE + 4;
    ctx.fillStyle = PALETTE.crate;
    ctx.fillRect(x, y, TILE - 8, TILE - 8);
    ctx.fillStyle = PALETTE.crateTop;
    ctx.fillRect(x, y, TILE - 8, 8);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + TILE - 8, y + TILE - 8);
    ctx.moveTo(x + TILE - 8, y);
    ctx.lineTo(x, y + TILE - 8);
    ctx.stroke();
  }
}

function drawFerns(ctx, level, time) {
  for (const key of level.ferns) {
    const [tx, ty] = key.split(',').map(Number);
    const cx = tx * TILE + TILE / 2;
    const cy = ty * TILE + TILE / 2;
    const sway = Math.sin(time * 1.4 + tx * 1.7 + ty) * 2;
    ctx.fillStyle = PALETTE.fern;
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.fernLight;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * 11 + sway, cy + Math.sin(a) * 11, 9, 6, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRelicsAndExit(ctx, level, time) {
  for (const relic of level.relics) {
    if (relic.taken) continue;
    const pulse = 0.55 + 0.45 * Math.sin(time * 2.4 + relic.tx);
    ctx.fillStyle = `rgba(255, 203, 61, ${0.14 + 0.14 * pulse})`;
    ctx.beginPath();
    ctx.arc(relic.x, relic.y, 26 + 4 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // Pedestal.
    ctx.fillStyle = '#4a4f5e';
    ctx.fillRect(relic.x - 13, relic.y - 9, 26, 18);
    ctx.fillStyle = '#6a7080';
    ctx.fillRect(relic.x - 13, relic.y - 12, 26, 5);
    // The gem itself: a cut diamond.
    ctx.fillStyle = PALETTE.relic;
    ctx.beginPath();
    ctx.moveTo(relic.x, relic.y - 15);
    ctx.lineTo(relic.x + 9, relic.y - 5);
    ctx.lineTo(relic.x, relic.y + 4);
    ctx.lineTo(relic.x - 9, relic.y - 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.moveTo(relic.x, relic.y - 15);
    ctx.lineTo(relic.x + 9, relic.y - 5);
    ctx.lineTo(relic.x, relic.y - 5);
    ctx.closePath();
    ctx.fill();
  }
  // The exit: a green door with a glowing frame, pulsing when all relics
  // are collected and the way out is open.
  const exit = level.exit;
  const open = level.relics.every((r) => r.taken);
  const glow = open ? 0.5 + 0.3 * Math.sin(time * 3) : 0.25;
  ctx.fillStyle = `rgba(58, 214, 127, ${glow})`;
  ctx.fillRect(exit.x - 24, exit.y - 24, 48, 48);
  ctx.fillStyle = open ? PALETTE.exit : PALETTE.exitDark;
  roundRect(ctx, exit.x - 17, exit.y - 20, 34, 40, 4);
  ctx.fill();
  ctx.fillStyle = '#0e2a1a';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', exit.x, exit.y + 1);
}

function drawCone(ctx, guard) {
  const hot = guard.state === 'chase' || guard.suspicion >= TUNING.suspiciousAt;
  const range = TUNING.coneRange;
  const half = TUNING.coneHalfAngle;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, range, guard.facing - half, guard.facing + half);
  ctx.closePath();
  ctx.fillStyle = hot ? PALETTE.coneHot : PALETTE.coneCalm;
  ctx.fill();
  ctx.strokeStyle = hot ? PALETTE.coneEdgeHot : PALETTE.coneEdgeCalm;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGuard(ctx, guard, time) {
  const hot = guard.state === 'chase';
  const wary = guard.state !== 'patrol' && !hot;
  // Body: a dark uniform with a red cap, readable against the floor.
  ctx.fillStyle = guard.state === 'chase' ? '#ff6a5e' : PALETTE.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, TUNING.guardRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guardDark;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, TUNING.guardRadius - 5, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick, so the patrol direction is obvious at a glance.
  ctx.strokeStyle = '#ffd65a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.facing) * 20, guard.y + Math.sin(guard.facing) * 20);
  ctx.stroke();
  // "?" when suspicious, "!" when the alarm is up.
  if (hot || wary) {
    const bob = Math.sin(time * 5) * 2;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hot ? PALETTE.danger : PALETTE.warn;
    ctx.fillText(hot ? '!' : '?', guard.x, guard.y - 26 + bob);
  }
}

function drawPlayer(ctx, player, time) {
  const bob = player.moving ? Math.sin(time * 12) * 1.5 : 0;
  // A soft shadow ring when hidden in a fern, so the player can tell.
  if (player.hidden) {
    ctx.fillStyle = 'rgba(44, 110, 64, 0.55)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, TUNING.playerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, TUNING.playerRadius - 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#eafffb';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y + bob);
  ctx.lineTo(player.x + Math.cos(player.facing) * 18, player.y + bob + Math.sin(player.facing) * 18);
  ctx.stroke();
}

function drawCoin(ctx, coin) {
  const arc = Math.sin(coin.t * Math.PI) * 14;
  ctx.fillStyle = '#ffd65a';
  ctx.beginPath();
  ctx.arc(coin.x, coin.y - arc, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a67c00';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawHud(ctx, world) {
  const { player, guards, level, elapsed } = world;
  const collected = level.relics.filter((r) => r.taken).length;
  // Top bar.
  ctx.fillStyle = 'rgba(8, 10, 16, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('THE AMBER STAR HEIST', 14, 18);
  // Relic pips.
  for (let i = 0; i < level.relics.length; i++) {
    const x = 250 + i * 26;
    ctx.fillStyle = i < collected ? PALETTE.relic : 'rgba(255, 203, 61, 0.25)';
    ctx.beginPath();
    ctx.moveTo(x, 10);
    ctx.lineTo(x + 7, 17);
    ctx.lineTo(x, 24);
    ctx.lineTo(x - 7, 17);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '14px sans-serif';
  ctx.fillText(`${collected} / ${level.relics.length} relics`, 335, 18);
  // Coins.
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`Coins: ${'●'.repeat(player.coins)}${'○'.repeat(Math.max(0, TUNING.coinCount - player.coins))}`, 450, 18);
  // Timer.
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60).toString().padStart(2, '0');
  ctx.fillText(`${mins}:${secs}`, 620, 18);
  // Suspicion meter: the highest suspicion of any guard.
  const suspicion = highestSuspicion(guards);
  const alarm = anyAlarm(guards);
  const barX = 700;
  const barW = 180;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  roundRect(ctx, barX, 10, barW, 14, 7);
  ctx.fill();
  ctx.fillStyle = alarm ? PALETTE.danger : suspicion >= TUNING.suspiciousAt ? PALETTE.warn : PALETTE.ok;
  if (suspicion > 0.01) {
    roundRect(ctx, barX, 10, barW * suspicion, 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = '13px sans-serif';
  ctx.fillText(alarm ? 'SPOTTED — RUN!' : suspicion >= TUNING.suspiciousAt ? 'Suspicious…' : player.hidden ? 'Hidden in the ferns' : 'Unseen', barX + barW + 10, 18);
  // Bottom hint line.
  ctx.fillStyle = 'rgba(8, 10, 16, 0.72)';
  ctx.fillRect(0, VIEW_H - 26, VIEW_W, 26);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD / arrows move · Shift sneak · Click toss a coin · R restart · Ferns hide you · Dim floor slows suspicion', VIEW_W / 2, VIEW_H - 13);
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6, 8, 14, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 90);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '18px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 - 30 + i * 30));
}

export function drawWorld(ctx, world, time) {
  const { level, player, guards } = world;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, level, time);
  drawRelicsAndExit(ctx, level, time);
  for (const guard of guards) drawCone(ctx, guard);
  drawFerns(ctx, level, time);
  drawWallsAndCrates(ctx, level);
  for (const guard of guards) drawGuard(ctx, guard, time);
  if (player.coin) drawCoin(ctx, player.coin);
  drawPlayer(ctx, player, time);
  drawHud(ctx, world);

  if (world.phase === 'title') {
    drawOverlay(ctx, 'THE AMBER STAR HEIST', [
      'A museum after closing. Three relics. Four guards. One way out.',
      'Steal the Amber Star, the Jade Serpent and the Moon Pearl,',
      'then reach the green EXIT unseen.',
      '',
      'WASD / arrows to move · Shift to sneak · Click to toss a coin',
      'Ferns hide you · Dim floor slows suspicion · Running is heard',
      '',
      'Press Enter or click to begin',
    ], PALETTE.relic);
  } else if (world.phase === 'won') {
    drawOverlay(ctx, 'CLEAN GETAWAY', [
      `All three relics lifted in ${world.winTime}. No alarms that mattered.`,
      'Wren melts into the night with the Amber Star.',
      '',
      'Press R to play again',
    ], PALETTE.ok);
  } else if (world.phase === 'caught') {
    drawOverlay(ctx, 'CAUGHT', [
      `A guard caught Wren ${world.caughtBy ? '— ' + world.caughtBy + ' — ' : ''}under the gallery lights.`,
      'The relics stay where they are. Tonight, at least.',
      '',
      'Press R to try again',
    ], PALETTE.danger);
  }
}

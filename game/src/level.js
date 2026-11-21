// Level parsing and geometry: turns the text map into tiles, and answers
// the two questions the rest of the game keeps asking — "can I walk here?"
// and "can this guard see that point?".

import { TILE, COLS, ROWS, LEVEL_MAP, RELIC_NAMES } from './config.js';

function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export function parseLevel() {
  const level = {
    walls: new Set(),
    crates: new Set(),
    ferns: new Set(),
    dimTiles: new Set(),
    relics: [],
    exit: null,
    playerStart: { x: TILE * 1.5, y: TILE * 1.5 },
  };
  let relicIndex = 0;
  for (let ty = 0; ty < ROWS; ty++) {
    const row = LEVEL_MAP[ty];
    for (let tx = 0; tx < COLS; tx++) {
      const ch = row[tx];
      const key = tx + ',' + ty;
      if (ch === '#') level.walls.add(key);
      else if (ch === 'C') level.crates.add(key);
      else if (ch === 'B') level.ferns.add(key);
      else if (ch === 'S') level.dimTiles.add(key);
      else if (ch === 'A') {
        const at = tileCenter(tx, ty);
        level.relics.push({ tx, ty, x: at.x, y: at.y, name: RELIC_NAMES[relicIndex % RELIC_NAMES.length], taken: false });
        relicIndex++;
      } else if (ch === 'E') {
        const at = tileCenter(tx, ty);
        level.exit = { tx, ty, x: at.x, y: at.y };
      } else if (ch === 'P') {
        const at = tileCenter(tx, ty);
        level.playerStart = { x: at.x, y: at.y };
      }
    }
  }
  return level;
}

export function tileAt(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return LEVEL_MAP[ty][tx];
}

export function isSolid(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const key = tx + ',' + ty;
  return level.walls.has(key) || level.crates.has(key);
}

export function blocksSight(level, tx, ty) {
  return isSolid(level, tx, ty);
}

export function isFern(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  return level.ferns.has(tx + ',' + ty);
}

export function isDim(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  return level.dimTiles.has(tx + ',' + ty);
}

// A circle (the player or a guard) sliding against solid tiles: move one
// axis at a time so it glides along walls instead of sticking to corners.
export function moveCircle(level, pos, dx, dy, radius) {
  let nx = pos.x + dx;
  if (circleHitsSolid(level, nx, pos.y, radius)) nx = pos.x;
  let ny = pos.y + dy;
  if (circleHitsSolid(level, nx, ny, radius)) ny = pos.y;
  return { x: nx, y: ny };
}

function circleHitsSolid(level, px, py, radius) {
  const minTx = Math.floor((px - radius) / TILE);
  const maxTx = Math.floor((px + radius) / TILE);
  const minTy = Math.floor((py - radius) / TILE);
  const maxTy = Math.floor((py + radius) / TILE);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isSolid(level, tx, ty)) continue;
      const nearestX = Math.max(tx * TILE, Math.min(px, tx * TILE + TILE));
      const nearestY = Math.max(ty * TILE, Math.min(py, ty * TILE + TILE));
      const ddx = px - nearestX;
      const ddy = py - nearestY;
      if (ddx * ddx + ddy * ddy < radius * radius) return true;
    }
  }
  return false;
}

// True when nothing solid stands between the two points. Sampled along the
// segment in small steps; walls and crates both block a guard's view.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (blocksSight(level, Math.floor((x0 + dx * t) / TILE), Math.floor((y0 + dy * t) / TILE))) return false;
  }
  return true;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

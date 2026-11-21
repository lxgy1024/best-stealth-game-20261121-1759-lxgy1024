// "The Amber Star Heist" — tuning, level layout and patrols.
// A top-down stealth game in a museum after closing time. The player is
// Wren, a cat burglar: lift three relics, then slip out the green exit
// without ever being caught in a guard's cone of light.

export const TILE = 48;
export const COLS = 24;
export const ROWS = 15;
export const VIEW_W = COLS * TILE; // 1152
export const VIEW_H = ROWS * TILE; // 720

// Map legend:
//   # wall (blocks movement and sight)   . polished floor
//   C crate (blocks movement and sight)  B fern (hides the player)
//   S dim floor (suspicion fills slower) A relic pedestal
//   E exit door                          P player start
export const LEVEL_MAP = [
  '########################',
  '#P....#......#.....A...#',
  '#.....#..B...#....C....#',
  '#.C...#......#.........#',
  '#.....#..S...#....S....#',
  '#.....#......#....A....#',
  '#.....###.####....#....#',
  '#......................#',
  '#.........C........E...#',
  '#......................#',
  '#.....###.####....#....#',
  '#.....#......#.........#',
  '#.B...#..A...#....C..B.#',
  '#.....#......#....S....#',
  '########################',
];

// Guard patrols: tile waypoints walked in a loop. Every leg is a straight,
// unobstructed corridor, so a guard never needs pathfinding.
export const GUARD_DEFS = [
  { name: 'Gallery', spawn: [2, 7], waypoints: [[2, 7], [21, 7]], speed: 74 },
  { name: 'West Wing', spawn: [3, 2], waypoints: [[3, 2], [5, 2], [5, 5], [3, 5]], speed: 58 },
  { name: 'East Wing', spawn: [16, 1], waypoints: [[16, 1], [21, 1], [21, 4], [16, 4]], speed: 58 },
  { name: 'Vault', spawn: [8, 11], waypoints: [[8, 11], [12, 11], [12, 13], [8, 13]], speed: 62 },
];

export const RELIC_NAMES = ['Amber Star', 'Jade Serpent', 'Moon Pearl'];

export const TUNING = {
  walkSpeed: 168, // px per second
  sneakSpeed: 96,
  playerRadius: 13,
  guardRadius: 14,
  coneRange: 192, // px
  coneHalfAngle: 0.62, // radians (~35.5 degrees)
  spotBaseRate: 1.2, // suspicion per second at point blank
  spotSneakFactor: 0.45,
  spotDimFactor: 0.5,
  spotRunFactor: 1.4,
  suspicionDecay: 0.5, // suspicion per second while unseen
  suspiciousAt: 0.55, // suspicion where a guard comes to look
  alarmAt: 1.0,
  calmAfterSeconds: 4, // unseen time before an alarm ends
  catchDistance: 22,
  fernHideDistance: 55, // guards closer than this still see a hidden player
  noiseRadius: 100, // running footsteps are heard this far
  coinCount: 3,
  coinThrowRange: 280,
  coinLureRadius: 250,
  coinLookSeconds: 3.5,
};

export const PALETTE = {
  floorA: '#252b3a',
  floorB: '#1f2431',
  floorDim: '#171c28',
  wall: '#3b4459',
  wallTop: '#525e7d',
  crate: '#6d4a2a',
  crateTop: '#8d633a',
  fern: '#1d4c2c',
  fernLight: '#2c6e40',
  relic: '#ffcb3d',
  exit: '#3ad67f',
  exitDark: '#1e7d47',
  player: '#5bd8cb',
  playerDark: '#2b8b81',
  guard: '#e05b4e',
  guardDark: '#8e2f26',
  coneCalm: 'rgba(255, 214, 90, 0.28)',
  coneEdgeCalm: 'rgba(255, 214, 90, 0.5)',
  coneHot: 'rgba(255, 90, 78, 0.34)',
  coneEdgeHot: 'rgba(255, 90, 78, 0.6)',
  lampGlow: 'rgba(255, 190, 90, 0.09)',
  text: '#ece7d9',
  muted: '#9aa3b5',
  danger: '#ff5a4e',
  warn: '#ffb02e',
  ok: '#3ad67f',
};

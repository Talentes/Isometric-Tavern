// Shared dimensions of the tavern (world units, 1 ≈ 0.6 m).
// Interior spans x ∈ [X0, X1], z ∈ [Z0, Z1]. The west (x = X0) and north
// (z = Z0) walls are kept; the east and south walls and the roof are cut away.

export const X0 = -7;
export const X1 = 7;
export const Z0 = -5.5;
export const Z1 = 5.5;
export const WALL_T = 0.5; // walls extend outward from the interior faces
export const WALL_H = 6.6;
export const STONE_H = 1.4; // stone lower course height
export const LOFT_Y = 3.65; // loft floor surface
export const LOFT_EDGE = -2.5; // loft spans z ∈ [Z0, LOFT_EDGE]
export const GROUND_Y = -0.55; // street level (top of the diorama slab)

export const SLAB = { x0: -12.5, x1: 12, z0: -11, z1: 11, y0: -3.0 };

// Hearth chimney breast on the west wall
export const HEARTH = { x0: X0, x1: -5.6, z0: -0.2, z1: 3.4, fire: [-6.15, 0.35, 1.6] };
export const CHIMNEY_TOP = [-6.6, 9.6, 1.6];

// Loft covers the north-west: x ∈ [X0, LOFT_X1], z ∈ [Z0, LOFT_EDGE].
// The north-east bay (bar) is open to the rafters so it stays visible.
export const LOFT_X1 = 1.6;

// Stairs rise northwards (towards -z) in front of the loft's east end.
export const STAIRS = { x0: 0.25, x1: 1.42, zBottom: 1.3, zTop: LOFT_EDGE, steps: 12 };

// Windows: wall 'west' uses u = z, wall 'north' uses u = x.
export const WINDOWS = [
  { wall: 'west', u0: 3.95, u1: 5.05, y0: 1.5, y1: 2.75 },
  { wall: 'west', u0: -4.5, u1: -3.5, y0: 4.6, y1: 5.75 },
  { wall: 'north', u0: -3.6, u1: -2.5, y0: 4.6, y1: 5.75 },
  { wall: 'north', u0: 3.6, u1: 4.7, y0: 4.45, y1: 5.7 },
];

// Furniture spots shared by furniture, tableware and lighting.
export const TABLES = {
  trestle: { x: 1.5, z: 3.4, len: 4.6, width: 1.1, h: 1.25 },
  rounds: [
    { x: 5.7, z: 1.4, r: 0.62, h: 1.2 },
    { x: 4.3, z: -1.3, r: 0.6, h: 1.2 },
    { x: -1.4, z: -0.7, r: 0.6, h: 1.2 },
  ],
  loft: { x: -1.2, z: -4.7, w: 1.0, d: 0.75, h: 1.2 },
};
export const BAR = { x0: 1.9, x1: 5.5, z0: -4.1, z1: -3.45, h: 1.75 };
export const CHANDELIER = [1.5, 4.35, 2.2];
export const LANTERNS = [
  { pos: [X0 + 0.32, 2.55, -1.6], wall: 'west' },
  { pos: [6.2, 3.3, Z0 + 0.32], wall: 'north' },
];

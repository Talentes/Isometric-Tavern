// Shared dimensions of the tavern (world units, 1 ≈ 0.5 m).
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

// Stairs rise eastwards in front of the loft edge
export const STAIRS = { x0: 3.0, x1: 6.0, z0: LOFT_EDGE, z1: -1.3, steps: 12 };

// Windows: wall 'west' uses u = z, wall 'north' uses u = x.
export const WINDOWS = [
  { wall: 'west', u0: 3.95, u1: 5.05, y0: 1.5, y1: 2.75 },
  { wall: 'west', u0: -4.5, u1: -3.5, y0: 4.6, y1: 5.75 },
  { wall: 'north', u0: -6.15, u1: -5.05, y0: 1.5, y1: 2.75 },
  { wall: 'north', u0: 1.25, u1: 2.35, y0: 4.6, y1: 5.75 },
];

/** Convert wall-local (u, y, depth) into world coordinates. depth 0 = interior face. */
export function wallPoint(wall, u, y, depth = 0) {
  return wall === 'west' ? [X0 - depth, y, u] : [u, y, Z0 - depth];
}

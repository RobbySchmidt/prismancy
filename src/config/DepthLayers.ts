export const DepthLayers = {
  Floor: 0,
  FloorDecoration: 10,
  Pickup: 20,
  Missile: 30,
  Enemy: 40,
  Player: 50,
  EnemyProjectile: 60,
  Wall: 70,
  Particle: 80,
  HUD: 1000,
} as const;

export type DepthLayer = (typeof DepthLayers)[keyof typeof DepthLayers];

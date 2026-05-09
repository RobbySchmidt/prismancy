export const DepthLayers = {
  Floor: 0,
  FloorDecoration: 10,
  Pickup: 20,
  Missile: 30,
  EnemyProjectile: 60,
  Wall: 70,
  // Enemies render ABOVE walls so larger sprites (bosses especially) don't
  // get visually sliced off when standing close to the top wall — same
  // body-vs-visual mismatch as the wizard. Sapphire / Onyx bosses are
  // 2.4× scaled and their sprite extends well past their physics body,
  // so without this they'd disappear from the chest up against the top
  // wall. Their bodies still collide with the wall normally; only the
  // visual rendering order changes.
  Enemy: 72,
  // Player renders ABOVE walls + enemies so the wizard's hat doesn't
  // clip into the wall texture when standing right against the top edge
  // of a room, and so the player is always visually on top in pile-ups.
  Player: 75,
  Particle: 80,
  HUD: 1000,
} as const;

export type DepthLayer = (typeof DepthLayers)[keyof typeof DepthLayers];

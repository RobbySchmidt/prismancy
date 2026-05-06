export const DepthLayers = {
  Floor: 0,
  FloorDecoration: 10,
  Pickup: 20,
  Missile: 30,
  Enemy: 40,
  EnemyProjectile: 60,
  Wall: 70,
  // Player renders ABOVE walls (was 50, below Wall) so the wizard's hat
  // doesn't clip into the wall texture when standing right against the
  // top edge of a room — body-vs-visual mismatch from the +12 px hitbox
  // offset (deliberate for fine collision squeezing) was punching the
  // hat into the wall pixels. Putting the player on top reads as "the
  // wizard is in front of the wall" rather than "the wizard's head is
  // sliced off". Enemies stay at their original layer below the wall
  // since their sprites are smaller and the user didn't flag any
  // similar clipping for them.
  Player: 75,
  Particle: 80,
  HUD: 1000,
} as const;

export type DepthLayer = (typeof DepthLayers)[keyof typeof DepthLayers];

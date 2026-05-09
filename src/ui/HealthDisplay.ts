import Phaser from 'phaser';
import { HP_PER_HEART, TextureKeys } from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { EventBus } from '../utils/EventBus';

/**
 * Renders the player's HP as a row of hearts, one heart per HP_PER_HEART
 * units. Listens to `player:healthChanged` and reshuffles the textures —
 * dynamically grows the heart row when max HP increases (e.g. via Heart
 * Container item) so HP-up items show up on the HUD.
 */
export class HealthDisplay {
  private readonly scene: Phaser.Scene;
  private readonly anchorX: number;
  private readonly anchorY: number;
  private readonly hearts: Phaser.GameObjects.Image[] = [];
  private readonly handler: (payload: { current: number; max: number }) => void;
  private static readonly HEART_SIZE = 18;
  private static readonly HEART_GAP = 4;

  /**
   * `currentHealth` defaults to `maxHealth` (full bar) which is correct for
   * a fresh run. On a floor transition the caller should pass the real
   * carry-over current HP — UIScene reads that off the registry-exposed
   * PlayerHealth — otherwise the HUD shows base hearts until the next
   * damage event resyncs.
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    maxHealth: number,
    currentHealth: number = maxHealth,
  ) {
    this.scene = scene;
    this.anchorX = x;
    this.anchorY = y;
    this.ensureHeartCount(Math.ceil(maxHealth / HP_PER_HEART));

    this.handler = ({ current, max }): void => this.refresh(current, max);
    EventBus.on('player:healthChanged', this.handler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('player:healthChanged', this.handler);
    });

    this.refresh(currentHealth, maxHealth);
  }

  /**
   * Lazily add new heart Image objects when the player's max HP grows beyond
   * the row's current capacity (Heart Container etc.). Never destroys old
   * hearts; surplus slots are hidden via `setVisible(false)` in `refresh`
   * so a max-shrink (e.g. Blood of Marquis cap = 2) actually removes the
   * extra hearts visually instead of leaving them as misleading empty slots.
   */
  private ensureHeartCount(needed: number): void {
    while (this.hearts.length < needed) {
      const i = this.hearts.length;
      const heart = this.scene.add
        .image(
          this.anchorX + i * (HealthDisplay.HEART_SIZE + HealthDisplay.HEART_GAP),
          this.anchorY,
          TextureKeys.HeartFull,
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DepthLayers.HUD);
      this.hearts.push(heart);
    }
  }

  private refresh(current: number, max: number): void {
    const heartCount = Math.ceil(max / HP_PER_HEART);
    this.ensureHeartCount(heartCount);
    let remaining = current;
    for (let i = 0; i < this.hearts.length; i++) {
      // Hearts beyond the current max are hidden (not just textured empty)
      // so a max-shrink — e.g. Blood of Marquis locking at 2 HP — actually
      // removes the surplus slots from the row. The previous "empty
      // texture" rendering left phantom slots that read as recoverable.
      if (i >= heartCount) {
        this.hearts[i]!.setVisible(false);
        continue;
      }
      this.hearts[i]!.setVisible(true);
      let key: string;
      if (remaining >= HP_PER_HEART) {
        key = TextureKeys.HeartFull;
        remaining -= HP_PER_HEART;
      } else if (remaining === 1) {
        key = TextureKeys.HeartHalf;
        remaining = 0;
      } else {
        key = TextureKeys.HeartEmpty;
      }
      this.hearts[i]!.setTexture(key);
    }
  }
}

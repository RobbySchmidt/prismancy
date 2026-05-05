import Phaser from 'phaser';
import { TextureKeys } from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { type Inventory } from '../systems/Inventory';
import { EventBus } from '../utils/EventBus';

/**
 * HUD widget showing coin and key counters as two stacked rows:
 *   [coin-icon] N
 *   [key-icon]  N
 * Listens to `inventory:changed` and refreshes the numbers — never recreates
 * the GameObjects, just rewrites the text so the HUD doesn't flicker.
 *
 * Picks up the initial coin/key counts from the `inventory` registry entry
 * on construction so the very first frame shows the correct number — the
 * Inventory itself can't emit `inventory:changed` from its constructor
 * because UIScene (and therefore this widget) hasn't been created yet at
 * that point.
 */
export class CurrencyDisplay {
  private readonly coinText: Phaser.GameObjects.Text;
  private readonly keyText: Phaser.GameObjects.Text;
  private readonly handler: (payload: { coins: number; keys: number }) => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const rowGap = 18;
    const iconTextGap = 6;

    const coinIcon = scene.add
      .image(x, y, TextureKeys.Coin)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD);
    this.coinText = scene.add
      .text(x + coinIcon.width + iconTextGap, y, '0', {
        fontSize: '14px',
        color: '#ffd84a',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD);

    const keyIcon = scene.add
      .image(x, y + rowGap, TextureKeys.Key)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD);
    this.keyText = scene.add
      .text(x + keyIcon.width + iconTextGap, y + rowGap, '0', {
        fontSize: '14px',
        color: '#ffd84a',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD);

    this.handler = ({ coins, keys }): void => this.refresh(coins, keys);
    EventBus.on('inventory:changed', this.handler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('inventory:changed', this.handler);
    });

    // Prime the display from the live Inventory so a non-zero starting
    // balance (STARTING_COINS) is visible on the first frame instead of
    // waiting for the next inventory:changed event.
    const inventory = scene.registry.get('inventory') as Inventory | undefined;
    if (inventory) {
      this.refresh(inventory.getCoins(), inventory.getKeys());
    }
  }

  private refresh(coins: number, keys: number): void {
    this.coinText.setText(String(coins));
    this.keyText.setText(String(keys));
  }
}

import Phaser from 'phaser';
import { DepthLayers } from '../config/DepthLayers';
import { GAME_HEIGHT, GAME_WIDTH, gemTextureKey } from '../config/GameConfig';
import { FLOORS, type FloorId } from '../data/floors';
import { ITEMS, type ItemId } from '../data/items';
import { type Inventory } from '../systems/Inventory';
import { type ItemSystem } from '../systems/ItemSystem';

const ANCHOR_X = GAME_WIDTH * 0.62;
const ANCHOR_Y = GAME_HEIGHT * 0.18;
const ROW_HEIGHT = 44;
const ICON_SCALE = 1.7;
/** Column where the text starts (right of the icon column). */
const TEXT_X_OFFSET = 36;
/** Approximate chars-per-line for description wrap. The fallback word-wrap
 *  width below in pixels handles fine-grained breaking. */
const DESC_WRAP_WIDTH = 280;

/**
 * Right-side panel shown together with the ExpandedMap while map-mode is
 * open. Lists every picked-up item (icon + name + short description) so the
 * player can see what their current build does without memorising toasts.
 *
 * State source: reads `(scene.registry.get('itemSystem') as ItemSystem).
 * getPickedIds()` on `show()` / `refresh()`. The list is rebuilt each time
 * map-mode opens so it always reflects the current run state.
 *
 * All GameObjects this widget owns are tracked in `rows` and destroyed on
 * scene SHUTDOWN to keep us from leaking detached UI.
 */
export class PickedItemsList {
  private readonly scene: Phaser.Scene;
  private readonly heading: Phaser.GameObjects.Text;
  private readonly emptyText: Phaser.GameObjects.Text;
  /** Currently displayed row objects (icon + 2 text lines per row). */
  private rows: Phaser.GameObjects.GameObject[] = [];
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.heading = scene.add
      .text(ANCHOR_X, ANCHOR_Y - 32, 'Items', {
        fontSize: '22px',
        color: '#ffd84a',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 4)
      .setVisible(false);

    this.emptyText = scene.add
      .text(ANCHOR_X, ANCHOR_Y, 'No items yet.', {
        fontSize: '14px',
        color: '#888888',
        fontStyle: 'italic',
      })
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 4)
      .setVisible(false);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearRows();
      this.heading.destroy();
      this.emptyText.destroy();
    });
  }

  show(): void {
    this.visible = true;
    this.refresh();
  }

  hide(): void {
    this.visible = false;
    this.heading.setVisible(false);
    this.emptyText.setVisible(false);
    this.clearRows();
  }

  /**
   * Tear down old rows and rebuild from the current ItemSystem state. Called
   * from `show()` so the list always opens fresh — also safe to call on its
   * own after a pickup if some future code wants live updates.
   */
  refresh(): void {
    this.clearRows();
    if (!this.visible) return;

    this.heading.setVisible(true);

    const itemSystem = this.scene.registry.get('itemSystem') as ItemSystem | undefined;
    const pickedIds = itemSystem?.getPickedIds();
    const ids = pickedIds ? Array.from(pickedIds) : [];

    if (ids.length === 0) {
      this.emptyText.setVisible(true);
      return;
    }
    this.emptyText.setVisible(false);

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i] as ItemId;
      const def = ITEMS[id];
      if (!def) continue;
      const rowY = ANCHOR_Y + i * ROW_HEIGHT;

      const icon = this.scene.add
        .image(ANCHOR_X, rowY + 12, def.textureKey)
        .setOrigin(0, 0.5)
        .setScale(ICON_SCALE)
        .setScrollFactor(0)
        .setDepth(DepthLayers.HUD + 4);
      this.rows.push(icon);

      const nameText = this.scene.add
        .text(ANCHOR_X + TEXT_X_OFFSET, rowY, def.displayName, {
          fontSize: '16px',
          color: '#ffd84a',
          fontStyle: 'bold',
        })
        .setScrollFactor(0)
        .setDepth(DepthLayers.HUD + 4);
      this.rows.push(nameText);

      const descText = this.scene.add
        .text(ANCHOR_X + TEXT_X_OFFSET, rowY + 18, def.description, {
          fontSize: '13px',
          color: '#c4a8e8',
          wordWrap: { width: DESC_WRAP_WIDTH, useAdvancedWrap: true },
        })
        .setScrollFactor(0)
        .setDepth(DepthLayers.HUD + 4);
      this.rows.push(descText);
    }

    // Gems section: divider line + one row per earned no-hit gem (icon +
    // floor display name). Skipped entirely when the player has no gems.
    const inventory = this.scene.registry.get('inventory') as Inventory | undefined;
    const gems = inventory?.getGems();
    if (!gems || gems.size === 0) return;

    const dividerY = ANCHOR_Y + ids.length * ROW_HEIGHT - 4;
    const divider = this.scene.add
      .rectangle(ANCHOR_X, dividerY, 320, 1, 0x6effa0, 0.45)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 4);
    this.rows.push(divider);

    const gemHeading = this.scene.add
      .text(ANCHOR_X, dividerY + 6, 'No-Hit Gems', {
        fontSize: '14px',
        color: '#6effa0',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 4);
    this.rows.push(gemHeading);

    let gemIdx = 0;
    for (const floorId of gems) {
      const rowY = dividerY + 28 + gemIdx * 24;
      const icon = this.scene.add
        .image(ANCHOR_X, rowY, gemTextureKey(floorId))
        .setOrigin(0, 0.5)
        .setScale(1.2)
        .setScrollFactor(0)
        .setDepth(DepthLayers.HUD + 4);
      this.rows.push(icon);

      const floorTheme = FLOORS[floorId as FloorId];
      const label = floorTheme?.displayName ?? floorId;
      const text = this.scene.add
        .text(ANCHOR_X + 24, rowY, label, {
          fontSize: '13px',
          color: '#c4a8e8',
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(DepthLayers.HUD + 4);
      this.rows.push(text);
      gemIdx++;
    }
  }

  private clearRows(): void {
    for (const obj of this.rows) obj.destroy();
    this.rows = [];
  }
}

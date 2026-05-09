import Phaser from 'phaser';
import { DepthLayers } from '../config/DepthLayers';
import { GAME_HEIGHT, GAME_WIDTH, gemTextureKey } from '../config/GameConfig';
import { FLOORS, type FloorId } from '../data/floors';
import { ITEMS, type ItemId } from '../data/items';
import { type Inventory } from '../systems/Inventory';
import { type ItemSystem } from '../systems/ItemSystem';

const ANCHOR_X = GAME_WIDTH * 0.62;
const ANCHOR_Y = GAME_HEIGHT * 0.18;
/** Bottom margin so the panel doesn't run into the HUD. Used by overflow
 *  detection — when the items + gems block would push past this, the layout
 *  collapses to compact mode (icon + name only, no description). */
const PANEL_BOTTOM_Y = GAME_HEIGHT - 24;
const ICON_SCALE = 1.7;
const COMPACT_ICON_SCALE = 1.2;
/** Column where the text starts (right of the icon column). */
const TEXT_X_OFFSET = 36;
const COMPACT_TEXT_X_OFFSET = 28;
/** Word-wrap width for description lines, in pixels. Phaser counts pixels not
 *  chars, so this also caps the column width. */
const DESC_WRAP_WIDTH = 280;
/** Vertical gap between the name baseline and the description top. */
const DESC_OFFSET_Y = 18;
/** Padding between rows so the description of one item doesn't visually
 *  collide with the next row's name. */
const ROW_GAP = 10;
const COMPACT_ROW_GAP = 4;
/** Height of the gems section overhead (divider + heading + flavor line). */
const GEM_HEADER_HEIGHT = 50;
/** Height of one gem row (icon + label, fixed). */
const GEM_ROW_HEIGHT = 24;
/** Flavor text shown under "No-Hit Gems" — pinned, not a tooltip. Earlier
 *  hover-tooltip implementation got clipped by the panel right-edge and was
 *  unreadable; the user asked for a fixed line under the heading instead. */
const GEM_FLAVOR_TEXT = 'Crystallized from a flawless victory';

/**
 * Right-side panel shown together with the ExpandedMap while map-mode is
 * open. Lists every picked-up item (icon + name + short description) so the
 * player can see what their current build does without memorising toasts.
 *
 * Layout strategy: rows are laid out top-down with dynamic Y advancement
 * based on the actual rendered description height, so multi-line descriptions
 * don't overrun the next row's name (the previous fixed `ROW_HEIGHT = 44`
 * caused the last item's description to clip into the gem-section divider).
 * If the full-detail layout would overflow `PANEL_BOTTOM_Y`, we re-render in
 * compact mode (icon + name only, smaller spacing) so a 12-item run still
 * fits.
 *
 * State source: reads `(scene.registry.get('itemSystem') as ItemSystem).
 * getPickedIds()` on `show()` / `refresh()`. The list is rebuilt each time
 * map-mode opens so it always reflects the current run state.
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
   *
   * Two-pass layout: paints in full detail first, then if the rendered
   * content runs past `PANEL_BOTTOM_Y` clears + re-paints in compact mode.
   * Compact mode drops descriptions and tightens spacing so 12+ items fit.
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

    const inventory = this.scene.registry.get('inventory') as Inventory | undefined;
    const gems = inventory?.getGems();
    const gemCount = gems?.size ?? 0;

    // First pass: detailed layout. If it overflows, retry compact.
    const overflowed = this.paintItems(ids, gemCount, false);
    if (overflowed) {
      this.clearRows();
      this.paintItems(ids, gemCount, true);
    }

    if (gemCount > 0 && gems) {
      this.paintGems(gems);
    }
  }

  /**
   * Paint the items rows and return whether the rendered content (items +
   * the projected gem-section block) would run past `PANEL_BOTTOM_Y`.
   * Caller uses the boolean to decide whether to redraw in compact mode.
   * In compact mode itself, always returns false (no further fallback).
   */
  private paintItems(ids: string[], gemCount: number, compact: boolean): boolean {
    const iconScale = compact ? COMPACT_ICON_SCALE : ICON_SCALE;
    const textXOffset = compact ? COMPACT_TEXT_X_OFFSET : TEXT_X_OFFSET;
    const rowGap = compact ? COMPACT_ROW_GAP : ROW_GAP;
    const nameSize = compact ? '14px' : '16px';

    let cursorY = ANCHOR_Y;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i] as ItemId;
      const def = ITEMS[id];
      if (!def) continue;

      const nameText = this.scene.add
        .text(ANCHOR_X + textXOffset, cursorY, def.displayName, {
          fontSize: nameSize,
          color: '#ffd84a',
          fontStyle: 'bold',
        })
        .setScrollFactor(0)
        .setDepth(DepthLayers.HUD + 4);
      this.rows.push(nameText);

      // Center the icon vertically against either the single name line
      // (compact) or the name + description block (full).
      const iconCenterY = compact ? cursorY + nameText.height / 2 : cursorY + 12;
      const icon = this.scene.add
        .image(ANCHOR_X, iconCenterY, def.textureKey)
        .setOrigin(0, 0.5)
        .setScale(iconScale)
        .setScrollFactor(0)
        .setDepth(DepthLayers.HUD + 4);
      this.rows.push(icon);

      let rowBottom = cursorY + nameText.height;
      if (!compact) {
        const descText = this.scene.add
          .text(ANCHOR_X + textXOffset, cursorY + DESC_OFFSET_Y, def.description, {
            fontSize: '13px',
            color: '#c4a8e8',
            wordWrap: { width: DESC_WRAP_WIDTH, useAdvancedWrap: true },
          })
          .setScrollFactor(0)
          .setDepth(DepthLayers.HUD + 4);
        this.rows.push(descText);
        rowBottom = cursorY + DESC_OFFSET_Y + descText.height;
      }

      cursorY = rowBottom + rowGap;
    }

    // Project the gem section's footprint so we can detect overflow before
    // painting it. Includes header overhead + N gem rows.
    if (gemCount > 0) {
      cursorY += GEM_HEADER_HEIGHT + gemCount * GEM_ROW_HEIGHT;
    }

    // Stash the cursor so paintGems can pick up where we stopped, plus an
    // overflow check for the caller. Compact mode never asks for a redraw —
    // it's the last-ditch layout, so swallow the overflow there.
    this.cursorAfterItems = cursorY - (gemCount > 0 ? GEM_HEADER_HEIGHT + gemCount * GEM_ROW_HEIGHT : 0);
    return !compact && cursorY > PANEL_BOTTOM_Y;
  }

  /** Y just below the last item row, set by `paintItems` so `paintGems` can
   *  paint the divider + gem rows immediately below without re-walking the
   *  list. */
  private cursorAfterItems = 0;

  private paintGems(gems: ReadonlySet<string>): void {
    const dividerY = this.cursorAfterItems;
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

    // Pinned flavor line below the heading. Replaces an earlier hover-tooltip
    // that got clipped by the panel right-edge ("Crystallized from a..." cut
    // off mid-sentence).
    const flavor = this.scene.add
      .text(ANCHOR_X, dividerY + 24, GEM_FLAVOR_TEXT, {
        fontSize: '12px',
        color: '#a8c8b8',
        fontStyle: 'italic',
      })
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 4);
    this.rows.push(flavor);

    let gemIdx = 0;
    for (const floorId of gems) {
      const rowY = dividerY + GEM_HEADER_HEIGHT + gemIdx * GEM_ROW_HEIGHT;
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

/**
 * Cosmetic-skin facade kept around so the existing call-sites in Player.ts,
 * MainMenuScene.ts, and the dev hooks don't all need to be migrated in one
 * pass. The actual storage moved to `MetaProgress.ts` (single-slot
 * versioned blob covering bosses defeated / items discovered / run
 * counters / best time / selected skin) — `Cosmetics` just re-exports the
 * skin-related entry points.
 *
 * New skin / cosmetic features should go directly through `MetaProgress`;
 * this shim is purely for backwards compatibility.
 */
import { MetaProgress, type SkinId } from './MetaProgress';

export type { SkinId };

export const Cosmetics = {
  hasPrismancySkin(): boolean {
    return MetaProgress.hasPrismancySkin();
  },
  unlockPrismancySkin(): void {
    MetaProgress.unlockPrismancySkin();
  },
  getSelectedSkin(): SkinId {
    return MetaProgress.getSelectedSkin();
  },
  setSelectedSkin(skin: SkinId): void {
    MetaProgress.setSelectedSkin(skin);
  },
  resetAll(): void {
    MetaProgress.resetAll();
  },
};

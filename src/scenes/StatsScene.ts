import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../config/GameConfig';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { MetaProgress } from '../systems/MetaProgress';

/**
 * Trophy/Collection overlay launched from the main menu via the `T` key.
 * Read-only display of meta-progress: bosses defeated count, items
 * discovered count, run counters (started / died / won full / won
 * incomplete), best Prismarch run time. Plus a `[R]` reset hint that
 * wipes the save (with a hold-confirmation to avoid accidental clicks).
 *
 * Identical 150 ms cool-off pattern as PauseScene so the same `T` key
 * that opened the overlay doesn't immediately close it.
 *
 * Reset uses a hold-mechanic (hold R for ~1 s) instead of a one-press
 * confirmation — losing all trophies on a stray keypress would feel
 * worse than the small UX cost of holding briefly.
 */
const HOLD_RESET_MS = 1000;

export class StatsScene extends Phaser.Scene {
  private exited = false;
  private ready = false;
  private resetHoldStartedAt: number | null = null;
  private resetFillBg: Phaser.GameObjects.Rectangle | null = null;
  private resetFill: Phaser.GameObjects.Rectangle | null = null;
  private rKey: Phaser.Input.Keyboard.Key | null = null;

  constructor() {
    super({ key: SceneKeys.Stats });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.exited = false;
    this.ready = false;
    this.resetHoldStartedAt = null;

    // Translucent black backdrop covering the viewport.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78).setOrigin(0, 0);

    // Title.
    this.add
      .text(cx, 60, 'PROGRESS', {
        fontFamily: 'monospace',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#ffd84a',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    // Stats body — drawn line-by-line so each line gets a label/value
    // pair with consistent column alignment.
    const save = MetaProgress.get();
    const totalBosses = Object.keys(ENEMIES).filter((id) => id.startsWith('boss-')).length;
    const totalItems = Object.keys(ITEMS).length;
    const lines: Array<[string, string]> = [
      ['Runs started', String(save.runs.started)],
      ['Runs died', String(save.runs.died)],
      ['Full victories', String(save.runs.wonFull)],
      ['Incomplete exits', String(save.runs.wonIncomplete)],
      [
        'Bosses defeated',
        `${save.bossesDefeated.length} / ${totalBosses}`,
      ],
      [
        'Items discovered',
        `${save.itemsDiscovered.length} / ${totalItems}`,
      ],
      [
        'Fastest full run',
        save.bestRunMs !== null ? formatDuration(save.bestRunMs) : '—',
      ],
      [
        'Prismancy skin',
        MetaProgress.hasPrismancySkin() ? 'unlocked' : 'locked',
      ],
    ];

    const startY = 130;
    const rowH = 32;
    const labelX = cx - 200;
    const valueX = cx + 200;
    for (let i = 0; i < lines.length; i++) {
      const [label, value] = lines[i]!;
      const y = startY + i * rowH;
      this.add
        .text(labelX, y, label, {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#e9d5ff',
        })
        .setOrigin(0, 0.5);
      this.add
        .text(valueX, y, value, {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#fff8c0',
          fontStyle: 'bold',
        })
        .setOrigin(1, 0.5);
    }

    // Footer: close hint left, reset hint right, hold-R fill bar below
    // sized to span the reset half so the player visually associates the
    // bar with the [R] action. The reset hint is bumped up in size +
    // colour so it reads as a real action rather than a fine-print line.
    this.add
      .text(cx - 140, GAME_HEIGHT - 80, '[T] / [ESC]  CLOSE', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#a8c0d8',
      })
      .setOrigin(0.5)
      .setAlpha(0.85);
    this.add
      .text(cx + 140, GAME_HEIGHT - 80, 'Hold [R]  RESET', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ff8a8a',
        fontStyle: 'bold',
        stroke: '#3a0810',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0.95);
    this.add
      .text(cx + 140, GAME_HEIGHT - 60, 'wipes all progress', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#c08080',
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    // Hold-R fill widget (hidden until the player starts holding).
    const barW = 220;
    const barH = 8;
    const barY = GAME_HEIGHT - 36;
    this.resetFillBg = this.add
      .rectangle(cx + 140, barY, barW, barH, 0x301020, 0.85)
      .setOrigin(0.5)
      .setVisible(false);
    this.resetFill = this.add
      .rectangle(cx + 140 - barW / 2, barY, 0, barH, 0xff8a8a, 1)
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.time.delayedCall(150, () => {
      this.ready = true;
    });

    const tryClose = (): void => {
      if (this.ready) this.close();
    };
    this.input.keyboard?.on('keydown-T', tryClose);
    this.input.keyboard?.on('keydown-ESC', tryClose);
    this.input.keyboard?.on('keydown-Q', tryClose);
    this.rKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R) ?? null;
  }

  override update(time: number): void {
    if (!this.ready) return;
    const isDown = this.rKey?.isDown ?? false;
    if (isDown && this.resetHoldStartedAt === null) {
      this.resetHoldStartedAt = time;
      this.resetFillBg?.setVisible(true);
      this.resetFill?.setVisible(true);
    } else if (!isDown && this.resetHoldStartedAt !== null) {
      this.resetHoldStartedAt = null;
      this.resetFillBg?.setVisible(false);
      this.resetFill?.setVisible(false);
      this.resetFill?.setSize(0, this.resetFill.height);
    }
    if (this.resetHoldStartedAt !== null && this.resetFill) {
      const elapsed = time - this.resetHoldStartedAt;
      const t = Math.min(1, elapsed / HOLD_RESET_MS);
      this.resetFill.setSize(220 * t, this.resetFill.height);
      if (t >= 1) this.performReset();
    }
  }

  private performReset(): void {
    MetaProgress.resetAll();
    this.resetHoldStartedAt = null;
    // Re-render by restarting the scene — fresh save shows zeros.
    this.scene.restart();
  }

  private close(): void {
    if (this.exited) return;
    this.exited = true;
    this.scene.stop(SceneKeys.Stats);
  }
}

/** Format an ms duration as `MM:SS` (or `H:MM:SS` if it crosses an hour).
 * Used by the "Fastest full run" stat. */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

import Phaser from 'phaser';
import { type Direction, type Vector2 } from '../types';

/**
 * Wraps Phaser keyboard input into a stateless query API: movement vector
 * (WASD) and current shooting direction (arrow keys). Avoids leaking raw
 * Phaser key objects into entity classes.
 */
export class InputManager {
  private readonly keyW: Phaser.Input.Keyboard.Key;
  private readonly keyA: Phaser.Input.Keyboard.Key;
  private readonly keyS: Phaser.Input.Keyboard.Key;
  private readonly keyD: Phaser.Input.Keyboard.Key;

  private readonly keyUp: Phaser.Input.Keyboard.Key;
  private readonly keyDown: Phaser.Input.Keyboard.Key;
  private readonly keyLeft: Phaser.Input.Keyboard.Key;
  private readonly keyRight: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('InputManager: keyboard plugin unavailable');

    const Keys = Phaser.Input.Keyboard.KeyCodes;
    this.keyW = kb.addKey(Keys.W);
    this.keyA = kb.addKey(Keys.A);
    this.keyS = kb.addKey(Keys.S);
    this.keyD = kb.addKey(Keys.D);
    this.keyUp = kb.addKey(Keys.UP);
    this.keyDown = kb.addKey(Keys.DOWN);
    this.keyLeft = kb.addKey(Keys.LEFT);
    this.keyRight = kb.addKey(Keys.RIGHT);
  }

  /** Returns a normalized movement vector based on WASD. */
  getMovement(): Vector2 {
    let x = 0;
    let y = 0;
    if (this.keyA.isDown) x -= 1;
    if (this.keyD.isDown) x += 1;
    if (this.keyW.isDown) y -= 1;
    if (this.keyS.isDown) y += 1;

    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  /**
   * Returns the current shooting direction based on arrow keys, or null if
   * none are held. When two perpendicular arrows are held we prefer the most
   * recently pressed; for simplicity at Phase 1 we pick horizontal first.
   */
  getShootDirection(): Direction | null {
    if (this.keyLeft.isDown) return 'left';
    if (this.keyRight.isDown) return 'right';
    if (this.keyUp.isDown) return 'up';
    if (this.keyDown.isDown) return 'down';
    return null;
  }
}

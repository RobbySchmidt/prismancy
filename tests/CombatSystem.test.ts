import { describe, it, expect } from 'vitest';
import { CombatSystem } from '../src/systems/CombatSystem';

describe('CombatSystem.knockbackVector', () => {
  it('points from source to target', () => {
    const v = CombatSystem.knockbackVector({ x: 0, y: 0 }, { x: 100, y: 0 }, 200);
    expect(v.x).toBeCloseTo(200);
    expect(v.y).toBeCloseTo(0);
  });

  it('has magnitude equal to the requested force', () => {
    const v = CombatSystem.knockbackVector({ x: 5, y: 5 }, { x: 8, y: 9 }, 100);
    const mag = Math.sqrt(v.x * v.x + v.y * v.y);
    expect(mag).toBeCloseTo(100);
  });

  it('returns a downward fallback when source and target coincide', () => {
    const v = CombatSystem.knockbackVector({ x: 50, y: 50 }, { x: 50, y: 50 }, 200);
    expect(v.x).toBe(0);
    expect(v.y).toBeCloseTo(200);
  });

  it('returns zero vector when force is 0', () => {
    const v = CombatSystem.knockbackVector({ x: 0, y: 0 }, { x: 100, y: 100 }, 0);
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it('returns zero vector when force is negative', () => {
    const v = CombatSystem.knockbackVector({ x: 0, y: 0 }, { x: 100, y: 100 }, -50);
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it('handles diagonal directions correctly', () => {
    const v = CombatSystem.knockbackVector({ x: 0, y: 0 }, { x: 3, y: 4 }, 50);
    // 3/5 of force in x, 4/5 in y
    expect(v.x).toBeCloseTo(30);
    expect(v.y).toBeCloseTo(40);
  });
});

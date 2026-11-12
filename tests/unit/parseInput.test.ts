import { describe, it, expect } from 'vitest';
import { parseInput } from '../../src/core/parseInput';

describe('parseInput', () => {
  it('parses empty string to null', () => {
    expect(parseInput('', 'xlsx')).toBeNull();
    expect(parseInput('', 'csv')).toBeNull();
  });

  it('keeps leading zeros as string', () => {
    expect(parseInput('0812', 'xlsx')).toBe('0812');
    expect(parseInput('0812', 'csv')).toBe('0812');
  });

  it('parses numbers correctly', () => {
    expect(parseInput('12.5', 'xlsx')).toBe(12.5);
    expect(parseInput('12.5', 'csv')).toBe(12.5);
    expect(parseInput('-100', 'xlsx')).toBe(-100);
    expect(parseInput('0', 'xlsx')).toBe(0);
  });

  it('parses formulas for xlsx', () => {
    expect(parseInput('=SUM(A1)', 'xlsx')).toEqual({ formula: 'SUM(A1)' });
    expect(parseInput('=SUM(A1)', 'csv')).toBe('=SUM(A1)');
  });

  it('parses booleans for xlsx but preserves strings for csv', () => {
    expect(parseInput('TRUE', 'xlsx')).toBe(true);
    expect(parseInput('false', 'xlsx')).toBe(false);
    expect(parseInput('TRUE', 'csv')).toBe('TRUE');
    expect(parseInput('FALSE', 'csv')).toBe('FALSE');
  });

  it('parses ISO date for xlsx', () => {
    const res = parseInput('2026-05-10', 'xlsx');
    expect(res).toBeInstanceOf(Date);
    expect((res as Date).toISOString()).toBe('2026-05-10T00:00:00.000Z');
  });
});

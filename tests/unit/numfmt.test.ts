import { describe, it, expect } from 'vitest';
import { formatValue } from '../../src/core/numfmt';

describe('numfmt', () => {
  it('formats numbers with commas and decimals', () => {
    expect(formatValue(1234.5, '#,##0.00')).toBe('1,234.50');
  });

  it('formats percentage', () => {
    expect(formatValue(0.256, '0.0%')).toBe('25.6%');
  });

  it('formats negative section', () => {
    expect(formatValue(-5, '#,##0;(#,##0)')).toBe('(5)');
  });

  it('formats serial date', () => {
    expect(formatValue(45000, 'yyyy-mm-dd')).toBe('2023-03-15');
  });

  it('formats Date object without format', () => {
    const d = new Date('2026-01-02T00:00:00.000Z');
    expect(formatValue(d)).toBe('2026-01-02');
  });

  it('formats 1/3 with General format', () => {
    expect(formatValue(1 / 3, 'General')).toBe('0.3333333333');
  });

  it('formats currency symbol', () => {
    expect(formatValue(1234, '"฿"#,##0')).toBe('฿1,234');
  });

  it('formats null and boolean', () => {
    expect(formatValue(null)).toBe('');
    expect(formatValue(true)).toBe('TRUE');
    expect(formatValue(false)).toBe('FALSE');
  });
});

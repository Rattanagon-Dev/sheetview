import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseXlsx, applyXlsxEdits, writeXlsx } from '../../src/core/xlsx';
import { key } from '../../src/core/keys';

describe('xlsx parser and writer', () => {
  const sampleBuf = readFileSync('tests/fixtures/sample.xlsx');
  const arrayBuffer = sampleBuf.buffer.slice(
    sampleBuf.byteOffset,
    sampleBuf.byteOffset + sampleBuf.byteLength
  );

  it('parses sample.xlsx accurately', async () => {
    const { sheets } = await parseXlsx(arrayBuffer);
    expect(sheets).toHaveLength(3);

    const sales = sheets[0];
    expect(sales.name).toBe('Sales');

    // A1:E1 merge
    expect(sales.merges).toEqual(
      expect.arrayContaining([{ r1: 0, c1: 0, r2: 0, c2: 4 }])
    );

    // Frozen rows: 2, cols: 0
    expect(sales.frozen).toEqual({ rows: 2, cols: 0 });

    // A1 style: bg #0E7C66 + bold
    const a1 = sales.cells.get(key(0, 0));
    expect(a1).toBeDefined();
    expect(a1?.text).toBe('Sales Report 2026');
    const a1Style = sales.styles[a1!.s!];
    expect(a1Style.bg).toBe('#0E7C66');
    expect(a1Style.bold).toBe(true);

    // E3 has a formula and numeric v (row index 2, col index 4)
    const e3 = sales.cells.get(key(2, 4));
    expect(e3).toBeDefined();
    expect(e3?.formula).toBe('SUM(B3:D3)');
    expect(typeof e3?.v).toBe('number');

    // Thai text in A3 (row 2, col 0)
    const a3 = sales.cells.get(key(2, 0));
    expect(a3?.text).toBe('ภาคเหนือ');

    // Formats sheet: hidden column width is 0
    const formats = sheets[1];
    expect(formats.colWidths[2]).toBe(0);
  });

  it('supports edit round-trip while preserving styles, merges, and numFmt', async () => {
    const { wb } = await parseXlsx(arrayBuffer);
    // B3 is row index 2, col index 1
    applyXlsxEdits(wb, [{ sheet: 0, r: 2, c: 1, input: '999' }]);

    const newBuf = await writeXlsx(wb);
    const reloaded = await parseXlsx(newBuf);

    const sales = reloaded.sheets[0];
    const b3 = sales.cells.get(key(2, 1));
    expect(b3).toBeDefined();
    expect(b3?.v).toBe(999);
    expect(b3?.text).toBe('999');

    const b3Style = sales.styles[b3!.s!];
    expect(b3Style.numFmt).toBe('#,##0');

    // Check A1 style and merge intact
    const a1 = sales.cells.get(key(0, 0));
    const a1Style = sales.styles[a1!.s!];
    expect(a1Style.bg).toBe('#0E7C66');
    expect(a1Style.bold).toBe(true);
    expect(sales.merges).toEqual(
      expect.arrayContaining([{ r1: 0, c1: 0, r2: 0, c2: 4 }])
    );
  });
});

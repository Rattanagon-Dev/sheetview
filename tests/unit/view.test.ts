import { describe, it, expect } from 'vitest';
import { SheetModel } from '../../src/core/types';
import { key } from '../../src/core/keys';
import { buildRowMap, uniqueValues, ViewSpec } from '../../src/core/view';

function makeTestSheet(): SheetModel {
  const cells = new Map();
  // Row 0: Header
  cells.set(key(0, 0), { v: 'Name', text: 'Name' });
  cells.set(key(0, 1), { v: 'Value', text: 'Value' });

  // Row 1: Thai
  cells.set(key(1, 0), { v: 'ขอนแก่น', text: 'ขอนแก่น' });
  cells.set(key(1, 1), { v: 50, text: '50' });

  // Row 2: English
  cells.set(key(2, 0), { v: 'Bangkok', text: 'Bangkok' });
  cells.set(key(2, 1), { v: 10, text: '10' });

  // Row 3: Thai
  cells.set(key(3, 0), { v: 'กระบี่', text: 'กระบี่' });
  cells.set(key(3, 1), { v: 100, text: '100' });

  // Row 4: Empty value cell
  cells.set(key(4, 0), { v: 'Chiang Mai', text: 'Chiang Mai' });

  // Row 5: Mixed text in value col
  cells.set(key(5, 0), { v: 'Phuket', text: 'Phuket' });
  cells.set(key(5, 1), { v: 'ABC', text: 'ABC' });

  return {
    name: 'Test',
    rowCount: 6,
    colCount: 2,
    cells,
    styles: [],
    colWidths: [100, 100],
    rowHeights: [22, 22, 22, 22, 22, 22],
    merges: [],
    frozen: { rows: 0, cols: 0 },
  };
}

describe('view: sort and filter', () => {
  it('keeps header row first and sorts ascending with empties last', () => {
    const sheet = makeTestSheet();
    const spec: ViewSpec = {
      headerRow: true,
      sort: { col: 1, dir: 'asc' },
      filters: {},
    };

    const rowMap = buildRowMap(sheet, spec);
    expect(rowMap[0]).toBe(0); // Header row 0 stays first

    // Numbers 10 (r2), 50 (r1), 100 (r3), then text 'ABC' (r5), then empty (r4)
    expect(Array.from(rowMap)).toEqual([0, 2, 1, 3, 5, 4]);
  });

  it('sorts descending with empties still last', () => {
    const sheet = makeTestSheet();
    const spec: ViewSpec = {
      headerRow: true,
      sort: { col: 1, dir: 'desc' },
      filters: {},
    };

    const rowMap = buildRowMap(sheet, spec);
    expect(rowMap[0]).toBe(0); // Header stays first
    // Descending: numbers 100 (r3), 50 (r1), 10 (r2), then text 'ABC' (r5), then empty (r4)
    // Wait: between string and number:
    // With 'desc', strings come before numbers or numbers before strings?
    // In our comparator: if typeOrder differs: diff = orderA - orderB; if desc: -diff
    // So 'ABC' (order 1) comes before numbers (order 0), while empty (r4) is still last!
    expect(rowMap[rowMap.length - 1]).toBe(4);
  });

  it('sorts Thai text correctly with Intl.Collator', () => {
    const sheet = makeTestSheet();
    const spec: ViewSpec = {
      headerRow: true,
      sort: { col: 0, dir: 'asc' },
      filters: {},
    };

    const rowMap = buildRowMap(sheet, spec);
    expect(rowMap[0]).toBe(0);
    // English 'Bangkok' and 'Chiang Mai' and 'Phuket', then Thai 'กระบี่' then 'ขอนแก่น'
    const sortedNames = Array.from(rowMap.slice(1)).map((r) => sheet.cells.get(key(r, 0))?.text);
    // 'กระบี่' should come before 'ขอนแก่น' in Thai alphabet
    const krabiIdx = sortedNames.indexOf('กระบี่');
    const khonKaenIdx = sortedNames.indexOf('ขอนแก่น');
    expect(krabiIdx).toBeLessThan(khonKaenIdx);
  });

  it('filters by value set and contains text', () => {
    const sheet = makeTestSheet();
    const spec: ViewSpec = {
      headerRow: true,
      sort: null,
      filters: {
        0: { contains: 'ang' }, // matches 'Bangkok' and 'Chiang Mai'
      },
    };

    const rowMap = buildRowMap(sheet, spec);
    expect(Array.from(rowMap)).toEqual([0, 2, 4]);

    // Add value set filter
    const spec2: ViewSpec = {
      headerRow: true,
      sort: null,
      filters: {
        0: { contains: 'ang', values: new Set(['Bangkok']) },
      },
    };
    const rowMap2 = buildRowMap(sheet, spec2);
    expect(Array.from(rowMap2)).toEqual([0, 2]);
  });

  it('computes uniqueValues with accurate counts', () => {
    const sheet = makeTestSheet();
    const uVals = uniqueValues(sheet, 0, true);
    expect(uVals).toEqual(
      expect.arrayContaining([
        { value: 'Bangkok', count: 1 },
        { value: 'Chiang Mai', count: 1 },
        { value: 'กระบี่', count: 1 },
        { value: 'ขอนแก่น', count: 1 },
        { value: 'Phuket', count: 1 },
      ])
    );
  });
});

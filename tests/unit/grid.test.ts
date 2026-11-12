import { describe, it, expect } from 'vitest';
import { SheetModel } from '../../src/core/types';
import { buildOffsets, findIndex, visibleRange } from '../../src/components/grid/layout';

describe('grid layout and virtualization', () => {
  it('correctly builds prefix sums and finds indices', () => {
    const sheet: SheetModel = {
      name: 'Sheet1',
      rowCount: 100,
      colCount: 5,
      cells: new Map(),
      styles: [],
      colWidths: [50, 100, 150, 200, 250],
      rowHeights: new Array(100).fill(20),
      merges: [],
      frozen: { rows: 0, cols: 0 },
    };
    const rowMap = new Int32Array(Array.from({ length: 100 }, (_, i) => i));

    const { colX, totalW, totalH } = buildOffsets(sheet, rowMap, 1);
    expect(colX[0]).toBe(0);
    expect(colX[1]).toBe(50);
    expect(colX[2]).toBe(150);
    expect(totalW).toBe(750);
    expect(totalH).toBe(2000);

    expect(findIndex(colX, 0)).toBe(0);
    expect(findIndex(colX, 49)).toBe(0);
    expect(findIndex(colX, 50)).toBe(1);
    expect(findIndex(colX, 149)).toBe(1);
    expect(findIndex(colX, 150)).toBe(2);
  });

  it('keeps mounted cell count under 600 for 20,000 rows', () => {
    const rowCount = 20000;
    const colCount = 10;
    const sheet: SheetModel = {
      name: 'Large',
      rowCount,
      colCount,
      cells: new Map(),
      styles: [],
      colWidths: new Array(colCount).fill(80),
      rowHeights: new Array(rowCount).fill(22),
      merges: [],
      frozen: { rows: 2, cols: 0 },
    };
    const rowMap = new Int32Array(Array.from({ length: rowCount }, (_, i) => i));
    const { colX, rowY } = buildOffsets(sheet, rowMap, 1);

    const range = visibleRange(5000, 0, 800, 600, colX, rowY, 2, 0);
    const rowCountVisible = range.rEnd - range.rStart + 1;
    const colCountVisible = range.cEnd - range.cStart + 1;
    const totalMountedCells = rowCountVisible * colCountVisible;

    // Must be well below 600 cells
    expect(totalMountedCells).toBeLessThan(600);
    expect(range.rStart).toBeGreaterThan(0);
    expect(range.rEnd).toBeLessThan(rowCount);
  });
});

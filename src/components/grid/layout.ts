import { SheetModel } from '../../core/types';

export function buildOffsets(
  sheet: SheetModel,
  rowMap: Int32Array,
  zoom: number
): { colX: Float64Array; rowY: Float64Array; totalW: number; totalH: number } {
  const colCount = sheet.colCount;
  const displayRows = rowMap.length;

  const colX = new Float64Array(colCount + 1);
  colX[0] = 0;
  for (let c = 0; c < colCount; c++) {
    const w = (sheet.colWidths[c] ?? 64) * zoom;
    colX[c + 1] = colX[c] + w;
  }

  const rowY = new Float64Array(displayRows + 1);
  rowY[0] = 0;
  for (let r = 0; r < displayRows; r++) {
    const srcRow = rowMap[r];
    const h = (sheet.rowHeights[srcRow] ?? 22) * zoom;
    rowY[r + 1] = rowY[r] + h;
  }

  return {
    colX,
    rowY,
    totalW: colX[colCount],
    totalH: rowY[displayRows],
  };
}

export function findIndex(offsets: Float64Array, pos: number): number {
  if (pos <= 0) return 0;
  const n = offsets.length - 1;
  if (pos >= offsets[n]) return Math.max(0, n - 1);

  let low = 0;
  let high = n - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (offsets[mid] <= pos) {
      if (pos < offsets[mid + 1]) return mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return 0;
}

export function visibleRange(
  scrollTop: number,
  scrollLeft: number,
  viewportW: number,
  viewportH: number,
  colX: Float64Array,
  rowY: Float64Array,
  frozenRows: number,
  frozenCols: number
): { rStart: number; rEnd: number; cStart: number; cEnd: number } {
  const colCount = colX.length - 1;
  const displayRows = rowY.length - 1;

  if (colCount <= 0 || displayRows <= 0) {
    return { rStart: 0, rEnd: 0, cStart: 0, cEnd: 0 };
  }

  const frozenW = colX[frozenCols] ?? 0;
  const frozenH = rowY[frozenRows] ?? 0;

  const posLeft = scrollLeft + frozenW;
  const posRight = posLeft + viewportW;
  const posTop = scrollTop + frozenH;
  const posBottom = posTop + viewportH;

  const cStart = Math.max(frozenCols, findIndex(colX, posLeft) - 3);
  const cEnd = Math.min(colCount - 1, findIndex(colX, posRight) + 3);

  const rStart = Math.max(frozenRows, findIndex(rowY, posTop) - 8);
  const rEnd = Math.min(displayRows - 1, findIndex(rowY, posBottom) + 8);

  return { rStart, rEnd, cStart, cEnd };
}

import { SheetModel } from './types';
import { key } from './keys';

export function detectHeader(sheet: SheetModel): boolean {
  if (sheet.rowCount < 2 || sheet.colCount < 2) return false;

  let row0NonEmpty = 0;
  let row0AllStrings = true;

  for (let c = 0; c < sheet.colCount; c++) {
    const cell = sheet.cells.get(key(0, c));
    if (cell && cell.text.trim() !== '') {
      row0NonEmpty++;
      if (typeof cell.v !== 'string') {
        row0AllStrings = false;
      }
    }
  }

  if (row0NonEmpty < 2 || !row0AllStrings) return false;

  let row1Qualifies = false;
  for (let c = 0; c < sheet.colCount; c++) {
    const c0 = sheet.cells.get(key(0, c));
    const c1 = sheet.cells.get(key(1, c));
    if (c1 && typeof c1.v === 'number') {
      row1Qualifies = true;
      break;
    }
    if ((!c1 || c1.text.trim() === '') && (c0 && c0.text.trim() !== '')) {
      row1Qualifies = true;
      break;
    }
  }

  return row1Qualifies;
}

import { SheetModel } from './types';
import { key } from './keys';

export function viewToCsv(sheet: SheetModel, rowMap: Int32Array): string {
  const lines: string[] = [];

  for (let i = 0; i < rowMap.length; i++) {
    const r = rowMap[i];
    const rowFields: string[] = [];
    for (let c = 0; c < sheet.colCount; c++) {
      const cell = sheet.cells.get(key(r, c));
      let text = cell ? cell.text : '';
      if (
        text.includes('"') ||
        text.includes(',') ||
        text.includes('\n') ||
        text.includes('\r')
      ) {
        text = `"${text.replace(/"/g, '""')}"`;
      }
      rowFields.push(text);
    }
    lines.push(rowFields.join(','));
  }

  return '\uFEFF' + lines.join('\r\n');
}

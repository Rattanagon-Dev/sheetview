import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { SheetModel, Cell, CellStyle, CellValue } from './types';
import { key } from './keys';
import { parseInput } from './parseInput';
import { writeXlsx } from './xlsx';

export function decodeCsv(buf: ArrayBuffer): { text: string; encoding: 'utf-8' | 'windows-874' } {
  const bytes = new Uint8Array(buf);
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('windows-874').decode(bytes), encoding: 'windows-874' };
  }
}

export function parseCsv(buf: ArrayBuffer): { rows: string[][]; delimiter: string; encoding: 'utf-8' | 'windows-874' } {
  const { text, encoding } = decodeCsv(buf);
  const result = Papa.parse<string[]>(text, {
    delimiter: '',
    delimitersToGuess: [',', ';', '\t', '|'],
    skipEmptyLines: 'greedy',
  });
  return {
    rows: result.data,
    delimiter: result.meta.delimiter || ',',
    encoding,
  };
}

export function csvToModel(rows: string[][], fileName: string): SheetModel {
  const name = fileName.replace(/\.[^/.]+$/, '') || 'Sheet1';
  let colCount = 0;
  for (const r of rows) {
    if (r.length > colCount) colCount = r.length;
  }
  colCount = Math.max(colCount, 1);
  const rowCount = Math.max(rows.length, 1);

  const styles: CellStyle[] = [{ hAlign: 'right' }];
  const cells = new Map<number, Cell>();

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const raw = row[c];
      const v = parseInput(raw, 'csv') as CellValue;
      const isNum = typeof v === 'number';
      cells.set(key(r, c), {
        v,
        text: raw,
        s: isNum ? 0 : undefined,
      });
    }
  }

  const colWidths: number[] = [];
  const sampleLimit = Math.min(rows.length, 200);
  for (let c = 0; c < colCount; c++) {
    let maxCharLen = 0;
    for (let r = 0; r < sampleLimit; r++) {
      const str = rows[r]?.[c] ?? '';
      if (str.length > maxCharLen) maxCharLen = str.length;
    }
    const width = Math.min(320, Math.max(48, maxCharLen * 7 + 16));
    colWidths.push(width);
  }

  const rowHeights = new Array(rowCount).fill(22);

  return {
    name,
    rowCount,
    colCount,
    cells,
    styles,
    colWidths,
    rowHeights,
    merges: [],
    frozen: { rows: 0, cols: 0 },
  };
}

export function writeCsv(rows: string[][], delimiter: string): ArrayBuffer {
  const unparsed = Papa.unparse(rows, { delimiter, newline: '\r\n' });
  const csvStr = '\uFEFF' + unparsed;
  const encoded = new TextEncoder().encode(csvStr);
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
}

export async function csvRowsToXlsx(rows: string[][], headerRow: boolean): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const parsedRow: any[] = row.map((cell) => parseInput(cell, 'csv')); // exceljs-internal
    const excelRow = ws.addRow(parsedRow);
    if (r === 0 && headerRow) {
      excelRow.font = { bold: true };
    }
  }

  if (headerRow) {
    ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];
  }

  ws.columns.forEach((column) => {
    let maxLen = 10;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const valStr = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    column.width = Math.min(Math.max(maxLen + 3, 10), 50);
  });

  return writeXlsx(wb);
}

import * as Comlink from 'comlink';
import ExcelJS from 'exceljs';
import { LoadResult, WorkbookMeta, EditOp } from '../core/types';
import { parseXlsx, applyXlsxEdits, writeXlsx } from '../core/xlsx';
import { parseCsv, csvToModel, writeCsv, csvRowsToXlsx } from '../core/csv';

let wb: ExcelJS.Workbook | null = null;
let csv: { rows: string[][]; delimiter: string } | null = null;
let meta: WorkbookMeta | null = null;

const api = {
  async load(buf: ArrayBuffer, fileName: string): Promise<LoadResult> {
    const lowerName = fileName.toLowerCase();
    const bytes = new Uint8Array(buf);
    let isXlsx = false;

    if (lowerName.endsWith('.xlsx')) {
      isXlsx = true;
    } else if (lowerName.endsWith('.csv')) {
      isXlsx = false;
    } else {
      isXlsx = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4B;
    }

    if (isXlsx) {
      const res = await parseXlsx(buf);
      wb = res.wb;
      csv = null;
      meta = { fileName, format: 'xlsx' };
      return { meta, sheets: res.sheets };
    } else {
      const res = parseCsv(buf);
      wb = null;
      csv = { rows: res.rows, delimiter: res.delimiter };
      meta = {
        fileName,
        format: 'csv',
        csv: { delimiter: res.delimiter, encoding: res.encoding },
      };
      const sheet = csvToModel(res.rows, fileName);
      return { meta, sheets: [sheet] };
    }
  },

  async applyEdits(ops: EditOp[]): Promise<void> {
    if (wb) {
      applyXlsxEdits(wb, ops);
    } else if (csv) {
      for (const op of ops) {
        while (csv.rows.length <= op.r) {
          csv.rows.push([]);
        }
        while (csv.rows[op.r].length <= op.c) {
          csv.rows[op.r].push('');
        }
        csv.rows[op.r][op.c] = op.input;
      }
    }
  },

  async save(format: 'xlsx' | 'csv', headerRow: boolean): Promise<ArrayBuffer> {
    if (wb) {
      if (format !== 'xlsx') {
        throw new Error("XLSX workbooks must be saved as 'xlsx'");
      }
      return writeXlsx(wb);
    } else if (csv) {
      if (format === 'csv') {
        return writeCsv(csv.rows, csv.delimiter);
      } else {
        return csvRowsToXlsx(csv.rows, headerRow);
      }
    }
    throw new Error('No workbook or CSV data loaded');
  },
};

export type SheetApi = typeof api;
Comlink.expose(api);

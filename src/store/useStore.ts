import { create } from 'zustand';
import * as Comlink from 'comlink';
import { SheetModel, WorkbookMeta, EditOp, Cell, CellValue } from '../core/types';
import { ViewSpec, buildRowMap, ColumnFilter } from '../core/view';
import { detectHeader } from '../core/header';
import { key } from '../core/keys';
import { parseInput } from '../core/parseInput';
import { formatValue } from '../core/numfmt';
import type ExcelJS from 'exceljs';
import { parseXlsx, applyXlsxEdits, writeXlsx } from '../core/xlsx';
import { parseCsv, csvToModel, writeCsv, csvRowsToXlsx } from '../core/csv';
import { createWorkerClient, terminateWorker } from '../worker/client';
import type { SheetApi } from '../worker/sheet.worker';

let directWb: ExcelJS.Workbook | null = null;
let directCsv: { rows: string[][]; delimiter: string } | null = null;

async function directLoad(buf: ArrayBuffer, fileName: string) {
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
    directWb = res.wb;
    directCsv = null;
    return { meta: { fileName, format: 'xlsx' as const }, sheets: res.sheets };
  } else {
    const res = parseCsv(buf);
    directWb = null;
    directCsv = { rows: res.rows, delimiter: res.delimiter };
    const sheet = csvToModel(res.rows, fileName);
    return {
      meta: {
        fileName,
        format: 'csv' as const,
        csv: { delimiter: res.delimiter, encoding: res.encoding },
      },
      sheets: [sheet],
    };
  }
}

export interface SheetViewState {
  spec: ViewSpec;
  rowMap: Int32Array;
}

export interface UndoEntry {
  sheet: number;
  r: number;
  c: number;
  prev: Cell | undefined;
  prevInput: string;
}

export interface AppState {
  status: 'home' | 'loading' | 'ready' | 'error';
  error?: string;
  meta: WorkbookMeta | null;
  sheets: SheetModel[];
  views: SheetViewState[];
  active: number;
  version: number;
  selection: { r: number; c: number } | null; // SOURCE coordinates
  zoom: number;
  theme: 'system' | 'light' | 'dark';
  gridlines: boolean;
  pending: Map<string, EditOp>; // key `${sheet}:${r}:${c}`
  undo: UndoEntry[];
  panel: null | 'edit' | 'search' | 'sortFilter' | 'export' | 'settings';
  workerApi: Comlink.Remote<SheetApi> | null;

  // Actions
  openFile: (fileOrBuf: File | ArrayBuffer, fileName: string) => Promise<void>;
  closeFile: () => void;
  setActive: (i: number) => void;
  select: (r: number, c: number) => void;
  setZoom: (z: number) => void;
  editCell: (r: number, c: number, input: string) => void;
  undoLast: () => void;
  setSort: (col: number, dir: 'asc' | 'desc' | null) => void;
  setFilter: (col: number, filter: ColumnFilter | null) => void;
  toggleHeader: () => void;
  save: (format: 'xlsx' | 'csv') => Promise<Blob>;
  setTheme: (theme: 'system' | 'light' | 'dark') => void;
  setGridlines: (show: boolean) => void;
  openPanel: (p: AppState['panel']) => void;
}

const initialTheme = (localStorage.getItem('sheetview_theme') as 'system' | 'light' | 'dark') || 'system';
const initialGridlines = localStorage.getItem('sheetview_gridlines') !== 'false';

// Beforeunload navigation guard
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (useStore.getState().pending.size > 0) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

export const useStore = create<AppState>((set, get) => ({
  status: 'home',
  error: undefined,
  meta: null,
  sheets: [],
  views: [],
  active: 0,
  version: 0,
  selection: null,
  zoom: 1,
  theme: initialTheme,
  gridlines: initialGridlines,
  pending: new Map(),
  undo: [],
  panel: null,
  workerApi: null,

  openFile: async (fileOrBuf: File | ArrayBuffer, fileName: string) => {
    set({ status: 'loading', error: undefined });
    try {
      let buf: ArrayBuffer;
      if (fileOrBuf instanceof File) {
        buf = await fileOrBuf.arrayBuffer();
      } else {
        buf = fileOrBuf;
      }

      let workerApi: Comlink.Remote<SheetApi> | null = null;
      let res: { meta: WorkbookMeta; sheets: SheetModel[] } | null = null;

      // Slice buffer in case worker fails or times out so the buffer is not neutered
      const bufCopy = buf.slice(0);
      try {
        const client = createWorkerClient();
        const loadPromise = client.load(Comlink.transfer(buf, [buf]), fileName);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Worker timeout')), 1500)
        );
        res = await Promise.race([loadPromise, timeoutPromise]);
        workerApi = client;
      } catch (workerErr) {
        console.warn('Worker load failed or timed out, falling back to direct main-thread parser:', workerErr);
        terminateWorker();
        res = await directLoad(bufCopy, fileName);
        workerApi = null;
      }

      const views: SheetViewState[] = res.sheets.map((sheet) => {
        const headerRow = detectHeader(sheet);
        const spec: ViewSpec = { headerRow, sort: null, filters: {} };
        const rowMap = buildRowMap(sheet, spec);
        return { spec, rowMap };
      });

      set({
        status: 'ready',
        meta: res.meta,
        sheets: res.sheets,
        views,
        active: 0,
        version: 0,
        selection: { r: 0, c: 0 },
        pending: new Map(),
        undo: [],
        panel: null,
        workerApi,
      });
    } catch (err) {
      console.error(err);
      set({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load file',
      });
    }
  },

  closeFile: () => {
    const { pending } = get();
    if (pending.size > 0) {
      if (!window.confirm('Discard unsaved changes?')) {
        return;
      }
    }
    terminateWorker();
    directWb = null;
    directCsv = null;
    set({
      status: 'home',
      error: undefined,
      meta: null,
      sheets: [],
      views: [],
      active: 0,
      version: 0,
      selection: null,
      pending: new Map(),
      undo: [],
      panel: null,
      workerApi: null,
    });
  },

  setActive: (i: number) => {
    set({ active: i, selection: { r: 0, c: 0 } });
  },

  select: (r: number, c: number) => {
    set({ selection: { r, c } });
  },

  setZoom: (z: number) => {
    const clamped = Math.min(3, Math.max(0.5, Math.round(z * 20) / 20));
    set({ zoom: clamped });
  },

  editCell: (r: number, c: number, input: string) => {
    const { active, sheets, views, pending, undo, meta, version } = get();
    const sheet = sheets[active];
    if (!sheet) return;

    const cellKey = key(r, c);
    const prevCell = sheet.cells.get(cellKey);
    const prevInput = prevCell?.formula
      ? '=' + prevCell.formula
      : prevCell
      ? prevCell.text
      : '';

    const newUndo: UndoEntry[] = [
      ...undo,
      {
        sheet: active,
        r,
        c,
        prev: prevCell ? { ...prevCell } : undefined,
        prevInput,
      },
    ];

    const parsed = parseInput(input, meta?.format ?? 'xlsx');
    let v: CellValue = null;
    let formula: string | undefined;

    if (parsed !== null && typeof parsed === 'object' && 'formula' in parsed) {
      formula = parsed.formula;
      v = null;
    } else {
      v = parsed;
    }

    const style = prevCell?.s !== undefined ? sheet.styles[prevCell.s] : undefined;
    let text = formatValue(v, style?.numFmt);
    if (formula) text = '=' + formula;
    if (meta?.format === 'csv') {
      text = input;
    }

    sheet.cells.set(cellKey, {
      v,
      text,
      formula,
      s: prevCell?.s,
    });

    if (r + 1 > sheet.rowCount) sheet.rowCount = r + 1;
    if (c + 1 > sheet.colCount) sheet.colCount = c + 1;

    while (sheet.colWidths.length < sheet.colCount) {
      sheet.colWidths.push(Math.round(8.43 * 7 + 5));
    }
    while (sheet.rowHeights.length < sheet.rowCount) {
      sheet.rowHeights.push(Math.round(15 * 4 / 3));
    }

    const opKey = `${active}:${r}:${c}`;
    const newPending = new Map(pending);
    newPending.set(opKey, { sheet: active, r, c, input });

    // Recompute rowMap if sort/filter active
    const curView = views[active];
    const hasFilterOrSort =
      curView && (curView.spec.sort !== null || Object.keys(curView.spec.filters).length > 0);

    let newViews = views;
    if (hasFilterOrSort) {
      const newRowMap = buildRowMap(sheet, curView.spec);
      newViews = views.map((vState, idx) =>
        idx === active ? { ...vState, rowMap: newRowMap } : vState
      );
    }

    set({
      undo: newUndo,
      pending: newPending,
      views: newViews,
      version: version + 1,
    });
  },

  undoLast: () => {
    const { undo, sheets, views, pending, version } = get();
    if (undo.length === 0) return;

    const last = undo[undo.length - 1];
    const newUndo = undo.slice(0, -1);
    const sheet = sheets[last.sheet];
    if (!sheet) return;

    const cellKey = key(last.r, last.c);
    if (last.prev) {
      sheet.cells.set(cellKey, last.prev);
    } else {
      sheet.cells.delete(cellKey);
    }

    const opKey = `${last.sheet}:${last.r}:${last.c}`;
    const newPending = new Map(pending);
    newPending.set(opKey, {
      sheet: last.sheet,
      r: last.r,
      c: last.c,
      input: last.prevInput,
    });

    const curView = views[last.sheet];
    let newViews = views;
    if (
      curView &&
      (curView.spec.sort !== null || Object.keys(curView.spec.filters).length > 0)
    ) {
      const newRowMap = buildRowMap(sheet, curView.spec);
      newViews = views.map((vState, idx) =>
        idx === last.sheet ? { ...vState, rowMap: newRowMap } : vState
      );
    }

    set({
      undo: newUndo,
      pending: newPending,
      views: newViews,
      version: version + 1,
    });
  },

  setSort: (col: number, dir: 'asc' | 'desc' | null) => {
    const { active, views, sheets, version } = get();
    const curView = views[active];
    const sheet = sheets[active];
    if (!curView || !sheet) return;

    const newSpec: ViewSpec = {
      ...curView.spec,
      sort: dir ? { col, dir } : null,
    };
    const newRowMap = buildRowMap(sheet, newSpec);
    const newViews = views.map((vState, idx) =>
      idx === active ? { spec: newSpec, rowMap: newRowMap } : vState
    );

    set({ views: newViews, version: version + 1 });
  },

  setFilter: (col: number, filter: ColumnFilter | null) => {
    const { active, views, sheets, version } = get();
    const curView = views[active];
    const sheet = sheets[active];
    if (!curView || !sheet) return;

    const newFilters = { ...curView.spec.filters };
    if (filter) {
      newFilters[col] = filter;
    } else {
      delete newFilters[col];
    }

    const newSpec: ViewSpec = {
      ...curView.spec,
      filters: newFilters,
    };
    const newRowMap = buildRowMap(sheet, newSpec);
    const newViews = views.map((vState, idx) =>
      idx === active ? { spec: newSpec, rowMap: newRowMap } : vState
    );

    set({ views: newViews, version: version + 1 });
  },

  toggleHeader: () => {
    const { active, views, sheets, version } = get();
    const curView = views[active];
    const sheet = sheets[active];
    if (!curView || !sheet) return;

    const newSpec: ViewSpec = {
      ...curView.spec,
      headerRow: !curView.spec.headerRow,
    };
    const newRowMap = buildRowMap(sheet, newSpec);
    const newViews = views.map((vState, idx) =>
      idx === active ? { spec: newSpec, rowMap: newRowMap } : vState
    );

    set({ views: newViews, version: version + 1 });
  },

  save: async (format: 'xlsx' | 'csv') => {
    const { workerApi, pending, active, views } = get();
    const curView = views[active];
    const headerRow = curView ? curView.spec.headerRow : false;

    let buf: ArrayBuffer;
    if (workerApi) {
      const ops = Array.from(pending.values());
      if (ops.length > 0) {
        await workerApi.applyEdits(ops);
      }
      buf = await workerApi.save(format, headerRow);
    } else {
      const ops = Array.from(pending.values());
      if (directWb) {
        if (ops.length > 0) {
          applyXlsxEdits(directWb, ops);
        }
        if (format === 'xlsx') {
          buf = await writeXlsx(directWb);
        } else {
          throw new Error("XLSX workbooks must be saved as 'xlsx'");
        }
      } else if (directCsv) {
        if (ops.length > 0) {
          for (const op of ops) {
            while (directCsv.rows.length <= op.r) {
              directCsv.rows.push([]);
            }
            while (directCsv.rows[op.r].length <= op.c) {
              directCsv.rows[op.r].push('');
            }
            directCsv.rows[op.r][op.c] = op.input;
          }
        }
        if (format === 'csv') {
          buf = writeCsv(directCsv.rows, directCsv.delimiter);
        } else {
          buf = await csvRowsToXlsx(directCsv.rows, headerRow);
        }
      } else {
        throw new Error('No workbook loaded');
      }
    }

    const mime =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv;charset=utf-8';
    const blob = new Blob([buf], { type: mime });

    set({ pending: new Map() });
    return blob;
  },

  setTheme: (theme: 'system' | 'light' | 'dark') => {
    localStorage.setItem('sheetview_theme', theme);
    set({ theme });
  },

  setGridlines: (gridlines: boolean) => {
    localStorage.setItem('sheetview_gridlines', String(gridlines));
    set({ gridlines });
  },

  openPanel: (panel: AppState['panel']) => {
    set({ panel });
  },
}));

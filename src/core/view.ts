import { SheetModel, Cell } from './types';
import { key } from './keys';

export interface ColumnFilter {
  values?: Set<string>;
  contains?: string;
}

export interface ViewSpec {
  headerRow: boolean;
  sort: { col: number; dir: 'asc' | 'desc' } | null;
  filters: Record<number, ColumnFilter>;
}

export function buildRowMap(sheet: SheetModel, spec: ViewSpec): Int32Array {
  const startRow = spec.headerRow ? 1 : 0;
  const filteredRows: number[] = [];

  const filterEntries = Object.entries(spec.filters).map(([colStr, filter]) => ({
    col: Number(colStr),
    values: filter.values,
    contains: filter.contains ? filter.contains.toLowerCase() : undefined,
  }));

  for (let r = startRow; r < sheet.rowCount; r++) {
    let pass = true;
    for (const f of filterEntries) {
      const cell = sheet.cells.get(key(r, f.col));
      const text = cell ? cell.text : '';
      if (f.values && !f.values.has(text)) {
        pass = false;
        break;
      }
      if (f.contains !== undefined && !text.toLowerCase().includes(f.contains)) {
        pass = false;
        break;
      }
    }
    if (pass) {
      filteredRows.push(r);
    }
  }

  if (spec.sort) {
    const { col, dir } = spec.sort;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

    const parseVal = (cell?: Cell): { order: number; val: number | string | boolean; empty: boolean } => {
      if (!cell || cell.text === '') {
        return { order: 3, val: '', empty: true };
      }
      if (typeof cell.v === 'number') {
        return { order: 0, val: cell.v, empty: false };
      }
      const clean = cell.text.replace(/,/g, '');
      if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(clean)) {
        const n = Number(clean);
        if (!isNaN(n)) return { order: 0, val: n, empty: false };
      }
      if (typeof cell.v === 'boolean') {
        return { order: 2, val: cell.v, empty: false };
      }
      return { order: 1, val: cell.text, empty: false };
    };

    filteredRows.sort((rA, rB) => {
      const cellA = sheet.cells.get(key(rA, col));
      const cellB = sheet.cells.get(key(rB, col));
      const a = parseVal(cellA);
      const b = parseVal(cellB);

      // Empty cells always go last regardless of direction
      if (a.empty && b.empty) return rA - rB;
      if (a.empty) return 1;
      if (b.empty) return -1;

      let diff = 0;
      if (a.order !== b.order) {
        diff = a.order - b.order;
      } else if (a.order === 0) {
        diff = (a.val as number) - (b.val as number);
      } else if (a.order === 1) {
        diff = collator.compare(a.val as string, b.val as string);
      } else if (a.order === 2) {
        diff = a.val === b.val ? 0 : a.val ? 1 : -1;
      }

      if (dir === 'desc') {
        diff = -diff;
      }

      return diff !== 0 ? diff : rA - rB;
    });
  }

  const result = spec.headerRow ? [0, ...filteredRows] : filteredRows;
  return new Int32Array(result);
}

export function uniqueValues(
  sheet: SheetModel,
  col: number,
  headerRow: boolean,
  limit = 1000
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  const startRow = headerRow ? 1 : 0;
  for (let r = startRow; r < sheet.rowCount; r++) {
    const cell = sheet.cells.get(key(r, col));
    const val = cell ? cell.text : '';
    counts.set(val, (counts.get(val) ?? 0) + 1);
  }

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const list = Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  list.sort((a, b) => {
    if (a.value === '' && b.value !== '') return 1;
    if (b.value === '' && a.value !== '') return -1;
    return collator.compare(a.value, b.value);
  });

  return list.slice(0, limit);
}

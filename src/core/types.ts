export type CellValue = string | number | boolean | Date | null;

export interface CellStyle {
  bg?: string;
  color?: string; // '#RRGGBB'
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  fontSize?: number; // pt
  hAlign?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'middle' | 'bottom';
  wrap?: boolean;
  bT?: string;
  bR?: string;
  bB?: string;
  bL?: string; // CSS border shorthand e.g. '1px solid #000'
  numFmt?: string;
}

export interface Cell {
  v: CellValue;
  text: string;
  formula?: string;
  s?: number; /* style index */
}

export interface Merge {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
} // inclusive, 0-based

export interface SheetModel {
  name: string;
  rowCount: number;
  colCount: number;
  cells: Map<number, Cell>;
  styles: CellStyle[];
  colWidths: number[];
  rowHeights: number[]; // px at zoom 1; 0 = hidden
  merges: Merge[];
  frozen: { rows: number; cols: number };
}

export interface WorkbookMeta {
  fileName: string;
  format: 'xlsx' | 'csv';
  csv?: { delimiter: string; encoding: 'utf-8' | 'windows-874' };
}

export interface EditOp {
  sheet: number;
  r: number;
  c: number;
  input: string;
} // raw user input

export interface LoadResult {
  meta: WorkbookMeta;
  sheets: SheetModel[];
}

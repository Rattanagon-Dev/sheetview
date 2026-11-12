import ExcelJS from 'exceljs';
import { SheetModel, Cell, CellStyle, Merge, EditOp, CellValue } from './types';
import { key, parseRange } from './keys';
import { resolveColor, parseThemeXml, DEFAULT_THEME } from './colors';
import { formatValue } from './numfmt';
import { parseInput, ParsedInput } from './parseInput';

function getBorderCss(b?: any, theme: string[] = DEFAULT_THEME): string | undefined { // exceljs-internal
  if (!b || !b.style || b.style === 'none') return undefined;
  const width = b.style === 'thick' ? '3px' : b.style === 'medium' ? '2px' : '1px';
  const borderType = (b.style === 'dashed' || b.style === 'dotted') ? b.style : 'solid';
  const col = resolveColor(b.color as any, theme) ?? '#000000'; // exceljs-internal
  return `${width} ${borderType} ${col}`;
}

export async function parseXlsx(buf: ArrayBuffer): Promise<{ wb: ExcelJS.Workbook; sheets: SheetModel[] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const themeXml: string | undefined = (wb as any)._themes?.theme1 ?? (wb as any).model?.themes?.theme1; // exceljs-internal
  const theme = parseThemeXml(themeXml);

  const sheets: SheetModel[] = [];

  for (const ws of wb.worksheets) {
    if (ws.state === 'veryHidden') continue;

    let rowCount = Math.max(ws.rowCount, 1);
    let colCount = Math.max(ws.columnCount, ws.columns?.length ?? 0, 1);

    const cells = new Map<number, Cell>();
    const styles: CellStyle[] = [];
    const styleMap = new Map<string, number>();

    const getStyleIndex = (s: CellStyle): number => {
      const k = JSON.stringify(s);
      let idx = styleMap.get(k);
      if (idx === undefined) {
        idx = styles.length;
        styles.push(s);
        styleMap.set(k, idx);
      }
      return idx;
    };

    const defaultRowH = Math.round((15 * 4) / 3);
    const rowHeights: number[] = new Array(rowCount).fill(defaultRowH);

    ws.eachRow({ includeEmpty: true }, (row, rn) => {
      const r = rn - 1;
      if (r < rowCount) {
        rowHeights[r] = row.hidden ? 0 : Math.round(((row.height ?? 15) * 4) / 3);
      }
      row.eachCell({ includeEmpty: true }, (cell, cn) => {
        const c = cn - 1;
        if (cell.type === ExcelJS.ValueType.Merge) return;

        let v: CellValue = null;
        let formula: string | undefined;
        const rawVal = cell.value;

        if (rawVal === null || rawVal === undefined) {
          v = null;
        } else if (rawVal instanceof Date) {
          v = rawVal;
        } else if (typeof rawVal === 'object') {
          const obj = rawVal as any; // exceljs-internal
          if ('richText' in obj && Array.isArray(obj.richText)) {
            v = obj.richText.map((t: any) => t.text ?? '').join(''); // exceljs-internal
          } else if ('text' in obj) {
            v = obj.text ?? '';
          } else if ('error' in obj) {
            v = obj.error ?? '#ERROR!';
          } else if ('formula' in obj || 'sharedFormula' in obj) {
            formula = obj.formula ?? obj.sharedFormula;
            v = obj.result ?? null;
          } else {
            v = String(rawVal);
          }
        } else {
          v = rawVal as CellValue;
        }

        const numFmt = cell.numFmt;
        const text = formatValue(v, numFmt);

        const style: CellStyle = {};
        if (numFmt) style.numFmt = numFmt;

        const fill = cell.fill as any; // exceljs-internal
        if (fill && fill.type === 'pattern' && fill.pattern && fill.pattern !== 'none') {
          const bg = resolveColor(fill.fgColor, theme);
          if (bg) style.bg = bg;
        }

        const font = cell.font;
        if (font) {
          if (font.bold) style.bold = true;
          if (font.italic) style.italic = true;
          if (font.underline) style.underline = true;
          if (font.strike) style.strike = true;
          if (font.size) style.fontSize = font.size;
          const col = resolveColor(font.color as any, theme); // exceljs-internal
          if (col) style.color = col;
        }

        const align = cell.alignment;
        if (align) {
          if (align.horizontal === 'center' || align.horizontal === 'centerContinuous') {
            style.hAlign = 'center';
          } else if (align.horizontal === 'right') {
            style.hAlign = 'right';
          } else if (align.horizontal === 'left') {
            style.hAlign = 'left';
          }

          if (align.vertical === 'top') style.vAlign = 'top';
          else if (align.vertical === 'middle') style.vAlign = 'middle';
          else if (align.vertical === 'bottom') style.vAlign = 'bottom';

          if (align.wrapText) style.wrap = true;
        }

        const border = cell.border;
        if (border) {
          const bT = getBorderCss(border.top, theme);
          const bR = getBorderCss(border.right, theme);
          const bB = getBorderCss(border.bottom, theme);
          const bL = getBorderCss(border.left, theme);
          if (bT) style.bT = bT;
          if (bR) style.bR = bR;
          if (bB) style.bB = bB;
          if (bL) style.bL = bL;
        }

        const hasStyle = Object.keys(style).length > 0;
        if (v !== null || formula !== undefined || hasStyle) {
          const s = hasStyle ? getStyleIndex(style) : undefined;
          cells.set(key(r, c), { v, text, formula, s });
          if (r + 1 > rowCount) rowCount = r + 1;
          if (c + 1 > colCount) colCount = c + 1;
        }
      });
    });

    const colWidths: number[] = [];
    for (let c = 0; c < colCount; c++) {
      const col = ws.getColumn(c + 1);
      colWidths.push(col.hidden ? 0 : Math.round((col.width ?? 8.43) * 7 + 5));
    }

    while (rowHeights.length < rowCount) {
      rowHeights.push(defaultRowH);
    }

    const rawMerges: string[] = (ws.model as any).merges ?? []; // exceljs-internal
    const merges: Merge[] = rawMerges.map(parseRange);

    let frozen = { rows: 0, cols: 0 };
    const view0 = ws.views?.[0];
    if (view0 && (view0 as any).state === 'frozen') { // exceljs-internal
      frozen = {
        rows: (view0 as any).ySplit ?? 0, // exceljs-internal
        cols: (view0 as any).xSplit ?? 0, // exceljs-internal
      };
    }

    sheets.push({
      name: ws.name,
      rowCount,
      colCount,
      cells,
      styles,
      colWidths,
      rowHeights,
      merges,
      frozen,
    });
  }

  return { wb, sheets };
}

export function applyXlsxEdits(wb: ExcelJS.Workbook, ops: EditOp[]): void {
  let hasFormula = false;
  for (const op of ops) {
    const ws = wb.worksheets[op.sheet];
    if (!ws) continue;
    const parsed: ParsedInput = parseInput(op.input, 'xlsx');
    const cell = ws.getCell(op.r + 1, op.c + 1);
    if (parsed !== null && typeof parsed === 'object' && 'formula' in parsed) {
      cell.value = { formula: parsed.formula };
      hasFormula = true;
    } else {
      cell.value = parsed as any; // exceljs-internal
    }
  }

  if (hasFormula) {
    if (!wb.calcProperties) {
      (wb as any).calcProperties = {}; // exceljs-internal
    }
    wb.calcProperties.fullCalcOnLoad = true;
  }
}

export async function writeXlsx(wb: ExcelJS.Workbook): Promise<ArrayBuffer> {
  const buf = await wb.xlsx.writeBuffer();
  if (buf instanceof ArrayBuffer) return buf;
  const uint8 = new Uint8Array(buf as any); // exceljs-internal
  return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
}

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { SheetModel } from '../core/types';
import { ViewSpec } from '../core/view';
import { key, colName } from '../core/keys';

interface PrintViewProps {
  sheet: SheetModel;
  spec: ViewSpec;
  rowMap: Int32Array;
  onDone: () => void;
}

export const PrintView: React.FC<PrintViewProps> = ({
  sheet,
  spec,
  rowMap,
  onDone,
}) => {
  const printRoot = document.getElementById('print-root');

  useEffect(() => {
    if (typeof window.print !== 'function') {
      alert("Printing isn't available here. Open SheetView in Safari to export PDF.");
      onDone();
      return;
    }

    const handleAfterPrint = () => {
      onDone();
    };

    window.addEventListener('afterprint', handleAfterPrint);

    // Wait two animation frames before triggering print
    let raf1 = requestAnimationFrame(() => {
      let raf2 = requestAnimationFrame(() => {
        window.print();
      });
      return () => cancelAnimationFrame(raf2);
    });

    return () => {
      cancelAnimationFrame(raf1);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [onDone]);

  if (!printRoot) return null;

  const isSortOrFilterActive =
    spec.sort !== null || Object.keys(spec.filters).length > 0;
  const maxRows = Math.min(rowMap.length, 3000);

  // Compute merges if no sort or filter
  const covered = new Set<number>();
  const mergeMap = new Map<number, { colSpan: number; rowSpan: number }>();

  if (!isSortOrFilterActive) {
    for (const m of sheet.merges) {
      const anchorKey = key(m.r1, m.c1);
      mergeMap.set(anchorKey, {
        colSpan: m.c2 - m.c1 + 1,
        rowSpan: m.r2 - m.r1 + 1,
      });
      for (let r = m.r1; r <= m.r2; r++) {
        for (let c = m.c1; c <= m.c2; c++) {
          if (r !== m.r1 || c !== m.c1) {
            covered.add(key(r, c));
          }
        }
      }
    }
  }

  const tableContent = (
    <div>
      {rowMap.length > 3000 && (
        <div style={{ padding: '8px', fontStyle: 'italic', color: '#666' }}>
          Note: Only the first 3000 rows will be included in the print output.
        </div>
      )}
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            {Array.from({ length: sheet.colCount }, (_, c) => {
              const headerCell = spec.headerRow ? sheet.cells.get(key(0, c)) : undefined;
              return (
                <th key={`print-th-${c}`} style={{ width: sheet.colWidths[c] || 60 }}>
                  {headerCell?.text || colName(c)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxRows }, (_, dispR) => {
            const srcR = rowMap[dispR];
            if (spec.headerRow && dispR === 0) return null; // Already in thead
            return (
              <tr key={`print-tr-${srcR}`}>
                <td style={{ textAlign: 'center', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                  {srcR + 1}
                </td>
                {Array.from({ length: sheet.colCount }, (_, c) => {
                  const cellKey = key(srcR, c);
                  if (covered.has(cellKey)) return null;

                  const cell = sheet.cells.get(cellKey);
                  const styleObj = cell?.s !== undefined ? sheet.styles[cell.s] : undefined;
                  const mergeInfo = mergeMap.get(cellKey);

                  const bg = styleObj?.bg;
                  const color = styleObj?.color;
                  const textAlign = styleObj?.hAlign ?? (typeof cell?.v === 'number' ? 'right' : 'left');

                  return (
                    <td
                      key={`print-td-${srcR}-${c}`}
                      colSpan={mergeInfo?.colSpan}
                      rowSpan={mergeInfo?.rowSpan}
                      style={{
                        backgroundColor: bg,
                        color,
                        textAlign,
                        fontWeight: styleObj?.bold ? 'bold' : 'normal',
                        fontStyle: styleObj?.italic ? 'italic' : 'normal',
                      }}
                    >
                      {cell?.text ?? ''}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return ReactDOM.createPortal(tableContent, printRoot);
};

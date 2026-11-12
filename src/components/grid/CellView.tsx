import React from 'react';
import { Cell, CellStyle } from '../../core/types';

interface CellViewProps {
  r: number; // source r
  c: number; // source c
  cell?: Cell;
  styleObj?: CellStyle;
  left: number;
  top: number;
  width: number;
  height: number;
  zoom: number;
  gridlines: boolean;
  isSearchMatch?: boolean;
}

export const CellView: React.FC<CellViewProps> = React.memo(({
  r,
  c,
  cell,
  styleObj,
  left,
  top,
  width,
  height,
  zoom,
  gridlines,
  isSearchMatch,
}) => {
  if (width <= 0 || height <= 0) return null;

  const bg = isSearchMatch
    ? '#ffeb3b'
    : styleObj?.bg ?? 'var(--cell-bg)';
  const color = isSearchMatch
    ? '#000000'
    : styleObj?.color ?? (styleObj?.bg ? '#000000' : 'var(--cell-fg)');

  const fontSize = (styleObj?.fontSize ?? 11) * (4 / 3) * zoom;

  // Horizontal alignment
  let hAlign = styleObj?.hAlign;
  if (!hAlign) {
    if (cell && (typeof cell.v === 'number' || cell.v instanceof Date)) {
      hAlign = 'right';
    } else if (cell && typeof cell.v === 'boolean') {
      hAlign = 'center';
    } else {
      hAlign = 'left';
    }
  }

  const justify =
    hAlign === 'center' ? 'center' : hAlign === 'right' ? 'flex-end' : 'flex-start';

  // Vertical alignment
  const vAlign = styleObj?.vAlign ?? 'middle';
  const align =
    vAlign === 'top' ? 'flex-start' : vAlign === 'bottom' ? 'flex-end' : 'center';

  // Borders
  const borderRight = styleObj?.bR
    ? styleObj.bR
    : gridlines
    ? '1px solid var(--grid-line)'
    : 'none';
  const borderBottom = styleObj?.bB
    ? styleObj.bB
    : gridlines
    ? '1px solid var(--grid-line)'
    : 'none';

  // Inset box shadows for top and left borders
  const shadows: string[] = [];
  if (styleObj?.bT) {
    const parts = styleObj.bT.split(' ');
    const w = parts[0] || '1px';
    const col = parts[2] || '#000';
    shadows.push(`inset 0 ${w} 0 0 ${col}`);
  }
  if (styleObj?.bL) {
    const parts = styleObj.bL.split(' ');
    const w = parts[0] || '1px';
    const col = parts[2] || '#000';
    shadows.push(`inset ${w} 0 0 0 ${col}`);
  }

  const textDecorations: string[] = [];
  if (styleObj?.underline) textDecorations.push('underline');
  if (styleObj?.strike) textDecorations.push('line-through');

  return (
    <div
      data-testid={`cell-${r}-${c}`}
      className={`cell-view ${styleObj?.wrap ? 'wrap' : ''}`}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: bg,
        color,
        fontSize: `${fontSize}px`,
        fontWeight: styleObj?.bold ? 'bold' : 'normal',
        fontStyle: styleObj?.italic ? 'italic' : 'normal',
        textDecoration: textDecorations.length > 0 ? textDecorations.join(' ') : undefined,
        justifyContent: justify,
        alignItems: align,
        borderRight,
        borderBottom,
        boxShadow: shadows.length > 0 ? shadows.join(', ') : undefined,
      }}
    >
      {cell?.text ?? ''}
    </div>
  );
});

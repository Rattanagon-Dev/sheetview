import React from 'react';
import { colName } from '../../core/keys';
import { ViewSpec } from '../../core/view';

interface ColHeaderProps {
  c: number;
  left: number;
  width: number;
  height: number;
  isSelected: boolean;
  spec: ViewSpec;
  onClick?: () => void;
}

export const ColHeader: React.FC<ColHeaderProps> = ({
  c,
  left,
  width,
  height,
  isSelected,
  spec,
  onClick,
}) => {
  if (width <= 0) return null;

  const isSorted = spec.sort?.col === c;
  const sortDir = isSorted ? spec.sort?.dir : null;
  const isFiltered = !!spec.filters[c];

  const name = colName(c);

  return (
    <div
      className={`hdr-cell ${isSelected ? 'selected' : ''}`}
      style={{
        left: `${left}px`,
        top: 0,
        width: `${width}px`,
        height: `${height}px`,
      }}
      onClick={onClick}
    >
      <span>{name}</span>
      {isSorted && (
        <span style={{ marginLeft: 2, fontSize: 10 }}>
          {sortDir === 'asc' ? '↑' : '↓'}
        </span>
      )}
      {isFiltered && (
        <span style={{ marginLeft: 2, fontSize: 9 }}>⏷</span>
      )}
    </div>
  );
};

interface RowHeaderProps {
  displayR: number;
  srcR: number;
  top: number;
  width: number;
  height: number;
  isSelected: boolean;
  onClick?: () => void;
}

export const RowHeader: React.FC<RowHeaderProps> = ({
  srcR,
  top,
  width,
  height,
  isSelected,
  onClick,
}) => {
  if (height <= 0) return null;

  return (
    <div
      className={`hdr-cell ${isSelected ? 'selected' : ''}`}
      style={{
        left: 0,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
      onClick={onClick}
    >
      {srcR + 1}
    </div>
  );
};

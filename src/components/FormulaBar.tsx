import React from 'react';
import { Pencil } from 'lucide-react';
import { useStore } from '../store/useStore';
import { addr, key } from '../core/keys';

export const FormulaBar: React.FC = () => {
  const active = useStore((s) => s.active);
  const sheet = useStore((s) => s.sheets[active]);
  const selection = useStore((s) => s.selection);
  const openPanel = useStore((s) => s.openPanel);

  if (!sheet || !selection) return null;

  const cell = sheet.cells.get(key(selection.r, selection.c));
  const cellAddr = addr(selection.r, selection.c);
  const displayVal = cell?.formula ? `=${cell.formula}` : cell?.text ?? '';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        backgroundColor: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        minHeight: '36px',
        fontSize: '13px',
        userSelect: 'none',
      }}
    >
      {/* Address */}
      <div
        style={{
          fontWeight: 600,
          color: 'var(--accent)',
          minWidth: '48px',
          padding: '0 8px',
          borderRight: '1px solid var(--border)',
          textAlign: 'center',
        }}
      >
        {cellAddr}
      </div>

      {/* Value preview */}
      <div
        style={{
          flex: 1,
          padding: '0 12px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: 'monospace',
          color: 'var(--fg)',
        }}
      >
        {displayVal}
      </div>

      {/* Edit button */}
      <button
        data-testid="btn-edit"
        aria-label="Edit cell"
        onClick={() => openPanel('edit')}
        style={{ width: 36, height: 36, color: 'var(--accent)' }}
      >
        <Pencil size={16} />
      </button>
    </div>
  );
};

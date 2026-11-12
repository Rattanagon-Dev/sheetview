import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { addr, key } from '../core/keys';

export const CellEditor: React.FC = () => {
  const panel = useStore((s) => s.panel);
  const active = useStore((s) => s.active);
  const sheet = useStore((s) => s.sheets[active]);
  const selection = useStore((s) => s.selection);
  const editCell = useStore((s) => s.editCell);
  const openPanel = useStore((s) => s.openPanel);

  const [inputVal, setInputVal] = useState('');
  const [hasFormula, setHasFormula] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const isOpen = panel === 'edit' && selection !== null && !!sheet;

  useEffect(() => {
    if (isOpen && sheet && selection) {
      const cell = sheet.cells.get(key(selection.r, selection.c));
      const val = cell?.formula ? `=${cell.formula}` : cell?.text ?? '';
      setInputVal(val);
      setHasFormula(!!cell?.formula);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, sheet, selection]);

  if (!isOpen || !selection) return null;

  const handleDone = () => {
    if (hasFormula && !inputVal.startsWith('=')) {
      if (!window.confirm('This cell has a formula. Replace it with a value?')) {
        return;
      }
    }
    editCell(selection.r, selection.c, inputVal);
    openPanel(null);
  };

  const handleCancel = () => {
    openPanel(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDone();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const cellAddress = addr(selection.r, selection.c);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 150,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          backgroundColor: 'var(--panel)',
          color: 'var(--fg)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '450px',
          padding: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '15px' }}>Edit Cell {cellAddress}</span>
          <span style={{ fontSize: '12px', color: 'var(--hdr-fg)' }}>
            Enter to apply, Shift+Enter for newline
          </span>
        </div>

        <textarea
          ref={inputRef as any}
          data-testid="editor-input"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg)',
            color: 'var(--fg)',
            fontSize: '15px',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--panel-active)',
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            data-testid="editor-done"
            onClick={handleDone}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              fontWeight: 600,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useStore } from '../store/useStore';

export const SheetTabs: React.FC = () => {
  const sheets = useStore((s) => s.sheets);
  const active = useStore((s) => s.active);
  const setActive = useStore((s) => s.setActive);

  if (sheets.length === 0) return null;

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        overflowX: 'auto',
        backgroundColor: 'var(--panel)',
        borderTop: '1px solid var(--border)',
        padding: '0 8px',
        paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
        minHeight: '40px',
        userSelect: 'none',
        scrollbarWidth: 'none',
      }}
    >
      {sheets.map((sheet, i) => {
        const isActive = i === active;
        return (
          <button
            key={`tab-${sheet.name}-${i}`}
            data-testid={`sheet-tab-${i}`}
            onClick={() => setActive(i)}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--accent)' : 'var(--hdr-fg)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: '4px 4px 0 0',
              backgroundColor: isActive ? 'var(--bg)' : 'transparent',
              whiteSpace: 'nowrap',
              minHeight: '36px',
            }}
          >
            {sheet.name}
          </button>
        );
      })}
    </nav>
  );
};

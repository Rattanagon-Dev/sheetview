import React from 'react';
import { useStore } from '../store/useStore';
import { BottomSheet } from './BottomSheet';

export const SettingsSheet: React.FC = () => {
  const panel = useStore((s) => s.panel);
  const active = useStore((s) => s.active);
  const viewState = useStore((s) => s.views[active]);
  const theme = useStore((s) => s.theme);
  const gridlines = useStore((s) => s.gridlines);
  const setTheme = useStore((s) => s.setTheme);
  const setGridlines = useStore((s) => s.setGridlines);
  const toggleHeader = useStore((s) => s.toggleHeader);
  const openPanel = useStore((s) => s.openPanel);

  const isOpen = panel === 'settings';
  if (!isOpen) return null;

  const isHeaderOn = viewState?.spec.headerRow ?? false;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => openPanel(null)}
      title="Settings"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Theme Segmented Control */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            Theme
          </label>
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--panel-active)',
              borderRadius: '8px',
              padding: '3px',
              gap: '2px',
            }}
          >
            <button
              data-testid="theme-system"
              onClick={() => setTheme('system')}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: theme === 'system' ? 600 : 400,
                backgroundColor: theme === 'system' ? 'var(--bg)' : 'transparent',
                boxShadow: theme === 'system' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              System
            </button>
            <button
              data-testid="theme-light"
              onClick={() => setTheme('light')}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: theme === 'light' ? 600 : 400,
                backgroundColor: theme === 'light' ? 'var(--bg)' : 'transparent',
                boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Light
            </button>
            <button
              data-testid="theme-dark"
              onClick={() => setTheme('dark')}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: theme === 'dark' ? 600 : 400,
                backgroundColor: theme === 'dark' ? 'var(--bg)' : 'transparent',
                boxShadow: theme === 'dark' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Dark
            </button>
          </div>
        </div>

        {/* View Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600 }}>Grid Options</label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: 'var(--bg)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '14px' }}>First row is header</span>
            <input
              type="checkbox"
              checked={isHeaderOn}
              onChange={toggleHeader}
              style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: 'var(--bg)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '14px' }}>Show gridlines</span>
            <input
              type="checkbox"
              checked={gridlines}
              onChange={(e) => setGridlines(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
            />
          </label>
        </div>

        {/* About */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '16px',
            fontSize: '12px',
            color: 'var(--hdr-fg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--fg)' }}>SheetView v1.0.0</div>
          <div>Installable offline spreadsheet viewer & editor.</div>
          <div>All processing stays private on this device.</div>
        </div>
      </div>
    </BottomSheet>
  );
};

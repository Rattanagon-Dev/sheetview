import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Toolbar } from '../components/Toolbar';
import { FormulaBar } from '../components/FormulaBar';
import { SheetTabs } from '../components/SheetTabs';
import { Grid } from '../components/grid/Grid';
import { SearchBar } from '../components/SearchBar';
import { CellEditor } from '../components/CellEditor';
import { SortFilterSheet } from '../components/SortFilterSheet';
import { SettingsSheet } from '../components/SettingsSheet';
import { ExportSheet } from '../components/ExportSheet';
import { PrintView } from '../platform/print';
import { X } from 'lucide-react';

export const Viewer: React.FC = () => {
  const active = useStore((s) => s.active);
  const sheet = useStore((s) => s.sheets[active]);
  const viewState = useStore((s) => s.views[active]);
  const openPanel = useStore((s) => s.openPanel);
  const setFilter = useStore((s) => s.setFilter);

  const [searchMatchKey, setSearchMatchKey] = useState<number | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const hasFilters = viewState && Object.keys(viewState.spec.filters).length > 0;
  const totalRows = sheet ? sheet.rowCount - (viewState?.spec.headerRow ? 1 : 0) : 0;
  const filteredRows = viewState ? viewState.rowMap.length - (viewState.spec.headerRow ? 1 : 0) : 0;

  const handleClearAllFilters = () => {
    if (!viewState) return;
    for (const colStr of Object.keys(viewState.spec.filters)) {
      setFilter(Number(colStr), null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Top Toolbar */}
      <Toolbar onQuickSave={() => openPanel('export')} />

      {/* Search Bar Panel */}
      <SearchBar onMatchChange={setSearchMatchKey} />

      {/* Filter Status Chip */}
      {hasFilters && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 12px',
            backgroundColor: 'var(--hdr-sel-bg)',
            color: 'var(--hdr-sel-fg)',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          <span>
            Filtered: {filteredUniqueCount(filteredRows)} of {totalRows} rows
          </span>
          <button
            onClick={handleClearAllFilters}
            aria-label="Clear all filters"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'inherit',
              fontSize: '12px',
              minWidth: 'auto',
              minHeight: '28px',
              padding: '2px 8px',
            }}
          >
            Clear <X size={14} />
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Grid searchMatchKey={searchMatchKey} />
      </div>

      {/* Formula Bar */}
      <FormulaBar />

      {/* Bottom Sheet Tabs */}
      <SheetTabs />

      {/* Modals & Panels */}
      <CellEditor />
      <SortFilterSheet />
      <ExportSheet onPrint={() => setIsPrinting(true)} onToast={showToast} />
      <SettingsSheet />

      {/* PDF Print View */}
      {isPrinting && sheet && viewState && (
        <PrintView
          sheet={sheet}
          spec={viewState.spec}
          rowMap={viewState.rowMap}
          onDone={() => setIsPrinting(false)}
        />
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div
          data-testid="toast"
          style={{
            position: 'fixed',
            bottom: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 500,
            zIndex: 200,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
};

function filteredUniqueCount(count: number): number {
  return Math.max(0, count);
}

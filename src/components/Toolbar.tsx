import React, { useState, useEffect } from 'react';
import {
  X,
  Undo2,
  Search,
  ArrowUpDown,
  ZoomIn,
  ZoomOut,
  Save,
  Share2,
  Settings,
  MoreHorizontal,
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface ToolbarProps {
  onQuickSave: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onQuickSave }) => {
  const meta = useStore((s) => s.meta);
  const pending = useStore((s) => s.pending);
  const zoom = useStore((s) => s.zoom);
  const undo = useStore((s) => s.undo);
  const closeFile = useStore((s) => s.closeFile);
  const undoLast = useStore((s) => s.undoLast);
  const setZoom = useStore((s) => s.setZoom);
  const openPanel = useStore((s) => s.openPanel);

  const [isWide, setIsWide] = useState(window.innerWidth >= 700);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsWide(window.innerWidth >= 700);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDirty = pending.size > 0;
  const fileName = meta?.fileName ?? 'Untitled';
  const zoomPct = Math.round(zoom * 100);

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        paddingTop: 'max(8px, env(safe-area-inset-top))',
        backgroundColor: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        minHeight: '48px',
        userSelect: 'none',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Left: Close + File Name + Dirty Dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <button
          data-testid="btn-close"
          aria-label="Close file"
          onClick={closeFile}
          style={{ width: 44, height: 44 }}
        >
          <X size={20} />
        </button>
        <div
          style={{
            fontWeight: 600,
            fontSize: '15px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: isWide ? '300px' : '160px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title={fileName}
        >
          <span>{fileName}</span>
          {isDirty && (
            <span
              style={{
                display: 'inline-block',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
              }}
              title="Unsaved changes"
            />
          )}
        </div>
      </div>

      {/* Right Controls */}
      {isWide ? (
        /* iPad Layout */
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            data-testid="btn-undo"
            aria-label="Undo"
            disabled={undo.length === 0}
            onClick={undoLast}
            style={{ opacity: undo.length === 0 ? 0.4 : 1, width: 44, height: 44 }}
          >
            <Undo2 size={19} />
          </button>
          <button
            data-testid="btn-search"
            aria-label="Search"
            onClick={() => openPanel('search')}
            style={{ width: 44, height: 44 }}
          >
            <Search size={19} />
          </button>
          <button
            data-testid="btn-sortfilter"
            aria-label="Sort and Filter"
            onClick={() => openPanel('sortFilter')}
            style={{ width: 44, height: 44 }}
          >
            <ArrowUpDown size={19} />
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--panel-active)',
              borderRadius: '6px',
              padding: '0 2px',
              margin: '0 4px',
            }}
          >
            <button
              data-testid="btn-zoom-out"
              aria-label="Zoom out"
              onClick={() => setZoom(zoom - 0.1)}
              style={{ width: 36, height: 36 }}
            >
              <ZoomOut size={16} />
            </button>
            <span style={{ fontSize: '12px', minWidth: '42px', textAlign: 'center' }}>
              {zoomPct}%
            </span>
            <button
              data-testid="btn-zoom-in"
              aria-label="Zoom in"
              onClick={() => setZoom(zoom + 0.1)}
              style={{ width: 36, height: 36 }}
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <button
            data-testid="btn-save"
            aria-label="Save"
            onClick={onQuickSave}
            style={{ width: 44, height: 44 }}
          >
            <Save size={19} />
          </button>
          <button
            data-testid="btn-export"
            aria-label="Export or Share"
            onClick={() => openPanel('export')}
            style={{ width: 44, height: 44 }}
          >
            <Share2 size={19} />
          </button>
          <button
            data-testid="btn-settings"
            aria-label="Settings"
            onClick={() => openPanel('settings')}
            style={{ width: 44, height: 44 }}
          >
            <Settings size={19} />
          </button>
        </div>
      ) : (
        /* Phone Layout */
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            data-testid="btn-search"
            aria-label="Search"
            onClick={() => openPanel('search')}
            style={{ width: 44, height: 44 }}
          >
            <Search size={19} />
          </button>
          <button
            data-testid="btn-more"
            aria-label="More options"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            style={{ width: 44, height: 44 }}
          >
            <MoreHorizontal size={20} />
          </button>

          {/* Phone Dropdown Menu */}
          {showMoreMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: '8px',
                marginTop: '4px',
                backgroundColor: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                zIndex: 100,
                minWidth: '180px',
              }}
            >
              <button
                data-testid="btn-undo"
                aria-label="Undo"
                disabled={undo.length === 0}
                onClick={() => {
                  undoLast();
                  setShowMoreMenu(false);
                }}
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 12px',
                  gap: '8px',
                  opacity: undo.length === 0 ? 0.4 : 1,
                }}
              >
                <Undo2 size={17} /> Undo
              </button>
              <button
                data-testid="btn-sortfilter"
                aria-label="Sort and Filter"
                onClick={() => {
                  openPanel('sortFilter');
                  setShowMoreMenu(false);
                }}
                style={{ justifyContent: 'flex-start', padding: '8px 12px', gap: '8px' }}
              >
                <ArrowUpDown size={17} /> Sort & Filter
              </button>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  borderTop: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 13 }}>Zoom ({zoomPct}%)</span>
                <div style={{ display: 'flex' }}>
                  <button
                    data-testid="btn-zoom-out"
                    aria-label="Zoom out"
                    onClick={() => setZoom(zoom - 0.1)}
                    style={{ width: 36, height: 36 }}
                  >
                    <ZoomOut size={16} />
                  </button>
                  <button
                    data-testid="btn-zoom-in"
                    aria-label="Zoom in"
                    onClick={() => setZoom(zoom + 0.1)}
                    style={{ width: 36, height: 36 }}
                  >
                    <ZoomIn size={16} />
                  </button>
                </div>
              </div>
              <button
                data-testid="btn-save"
                aria-label="Save"
                onClick={() => {
                  onQuickSave();
                  setShowMoreMenu(false);
                }}
                style={{ justifyContent: 'flex-start', padding: '8px 12px', gap: '8px' }}
              >
                <Save size={17} /> Save
              </button>
              <button
                data-testid="btn-export"
                aria-label="Export or Share"
                onClick={() => {
                  openPanel('export');
                  setShowMoreMenu(false);
                }}
                style={{ justifyContent: 'flex-start', padding: '8px 12px', gap: '8px' }}
              >
                <Share2 size={17} /> Export / Share
              </button>
              <button
                data-testid="btn-settings"
                aria-label="Settings"
                onClick={() => {
                  openPanel('settings');
                  setShowMoreMenu(false);
                }}
                style={{ justifyContent: 'flex-start', padding: '8px 12px', gap: '8px' }}
              >
                <Settings size={17} /> Settings
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

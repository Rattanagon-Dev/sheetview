import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { isIOS } from '../platform/share';
import { getSampleArrayBuffer } from '../core/sampleData';
import { FileUp, Table, Share, AlertCircle } from 'lucide-react';

export const Home: React.FC = () => {
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const openFile = useStore((s) => s.openFile);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [largeWarning, setLargeWarning] = useState(false);

  // Check iOS Standalone PWA mode
  const showIosHint =
    isIOS() &&
    typeof window !== 'undefined' &&
    !window.matchMedia('(display-mode: standalone)').matches;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) {
      setLargeWarning(true);
    }
    await openFile(file, file.name);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) {
      setLargeWarning(true);
    }
    await openFile(file, file.name);
  };

  const handleSample = async (type: 'xlsx' | 'csv') => {
    const fileName = type === 'xlsx' ? 'sample.xlsx' : 'sample.csv';
    try {
      const buf = getSampleArrayBuffer(type);
      await openFile(buf, fileName);
    } catch {
      try {
        const res = await fetch(`./samples/${fileName}`);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          await openFile(buf, fileName);
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : String(err));
      }
    }
  };

  if (status === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <div style={{ fontSize: '18px', fontWeight: 600 }}>Opening...</div>
        {largeWarning && (
          <div style={{ color: 'var(--hdr-fg)', fontSize: '14px', maxWidth: '320px' }}>
            Large file, this may take a moment.
          </div>
        )}
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <AlertCircle size={48} color="#e53935" />
        <div style={{ fontSize: '18px', fontWeight: 600 }}>Couldn't Open File</div>
        <div style={{ color: 'var(--hdr-fg)', fontSize: '14px', maxWidth: '360px' }}>
          {error || 'An error occurred while parsing the file.'}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--accent)',
            color: '#fff',
            fontWeight: 600,
            borderRadius: '8px',
          }}
        >
          Try another file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        padding: '24px',
        boxSizing: 'border-box',
        gap: '24px',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <img
          src="./icons/icon-192.png"
          alt="SheetView logo"
          style={{ width: '80px', height: '80px', borderRadius: '18px', boxShadow: '0 4px 16px rgba(14, 124, 102, 0.25)' }}
        />
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fg)', marginTop: '8px' }}>
          SheetView
        </h1>
        <p style={{ color: 'var(--hdr-fg)', fontSize: '15px' }}>
          Offline spreadsheet viewer & editor for iPad & iPhone
        </p>
      </div>

      {/* Drag & Drop Card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        style={{
          width: '100%',
          border: `2px dashed ${isDragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: '16px',
          padding: '36px 20px',
          textAlign: 'center',
          backgroundColor: isDragOver ? 'var(--accent-light)' : 'var(--panel)',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <FileUp size={44} color="var(--accent)" />
        <div>
          <button
            data-testid="open-button"
            aria-label="Open file"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '12px 28px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 600,
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(14, 124, 102, 0.3)',
            }}
          >
            Open File
          </button>
          <input
            ref={fileInputRef}
            data-testid="open-input"
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        <p style={{ fontSize: '13px', color: 'var(--hdr-fg)' }}>
          or drop your file here • Supports .xlsx and .csv
        </p>
      </div>

      {/* Try sample links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px' }}>
        <span style={{ color: 'var(--hdr-fg)' }}>Try sample:</span>
        <button
          data-testid="sample-xlsx"
          aria-label="Try Excel sample"
          onClick={() => handleSample('xlsx')}
          style={{
            color: 'var(--accent)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            minWidth: 'auto',
            padding: '4px 8px',
          }}
        >
          <Table size={16} /> Excel (.xlsx)
        </button>
        <span style={{ color: 'var(--border)' }}>|</span>
        <button
          data-testid="sample-csv"
          aria-label="Try CSV sample"
          onClick={() => handleSample('csv')}
          style={{
            color: 'var(--accent)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            minWidth: 'auto',
            padding: '4px 8px',
          }}
        >
          CSV (Thai)
        </button>
      </div>

      {/* iOS Safari Add to Home Screen hint */}
      {showIosHint && (
        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
            color: 'var(--fg)',
          }}
        >
          <Share size={24} color="var(--accent)" />
          <div>
            <strong>Install on iOS:</strong> Tap <span style={{ fontWeight: 600 }}>Share</span> in
            Safari, then <span style={{ fontWeight: 600 }}>Add to Home Screen</span> for full-screen offline use.
          </div>
        </div>
      )}
    </div>
  );
};

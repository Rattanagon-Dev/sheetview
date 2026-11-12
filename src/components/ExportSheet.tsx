import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { BottomSheet } from './BottomSheet';
import { deliverFile, isIOS } from '../platform/share';
import { viewToCsv } from '../core/toCsv';
import { FileSpreadsheet, FileText, Printer, Download } from 'lucide-react';

interface ExportSheetProps {
  onPrint: () => void;
  onToast: (msg: string) => void;
}

export const ExportSheet: React.FC<ExportSheetProps> = ({ onPrint, onToast }) => {
  const panel = useStore((s) => s.panel);
  const meta = useStore((s) => s.meta);
  const active = useStore((s) => s.active);
  const sheet = useStore((s) => s.sheets[active]);
  const viewState = useStore((s) => s.views[active]);
  const save = useStore((s) => s.save);
  const openPanel = useStore((s) => s.openPanel);

  const [isPreparing, setIsPreparing] = useState(false);
  const [preparedFile, setPreparedFile] = useState<{ blob: Blob; name: string } | null>(null);

  const isOpen = panel === 'export';
  if (!isOpen || !meta) return null;

  const isCsv = meta.format === 'csv';
  const baseName = meta.fileName.replace(/\.[^/.]+$/, '');

  const handleDeliver = async () => {
    if (!preparedFile) return;
    try {
      const res = await deliverFile(preparedFile.blob, preparedFile.name);
      if (res !== 'cancelled') {
        onToast('Saved ✓');
        setPreparedFile(null);
        openPanel(null);
      }
    } catch (e) {
      console.error(e);
      alert('Could not deliver file: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleSaveOriginal = async () => {
    setIsPreparing(true);
    try {
      const blob = await save(meta.format);
      const name = meta.fileName;
      if (isIOS()) {
        setPreparedFile({ blob, name });
      } else {
        await deliverFile(blob, name);
        onToast('Saved ✓');
        openPanel(null);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsPreparing(false);
    }
  };

  const handleSaveAsXlsx = async () => {
    setIsPreparing(true);
    try {
      const blob = await save('xlsx');
      const name = `${baseName}.xlsx`;
      if (isIOS()) {
        setPreparedFile({ blob, name });
      } else {
        await deliverFile(blob, name);
        onToast('Saved ✓');
        openPanel(null);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save as XLSX: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsPreparing(false);
    }
  };

  const handleExportViewCsv = async () => {
    if (!sheet || !viewState) return;
    setIsPreparing(true);
    try {
      const csvContent = viewToCsv(sheet, viewState.rowMap);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const name = `${baseName} - ${sheet.name}.csv`;
      if (isIOS()) {
        setPreparedFile({ blob, name });
      } else {
        await deliverFile(blob, name);
        onToast('Saved ✓');
        openPanel(null);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to export CSV: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsPreparing(false);
    }
  };

  const handlePrintPdf = () => {
    openPanel(null);
    onPrint();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => {
        setPreparedFile(null);
        openPanel(null);
      }}
      title="Save & Export"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* iOS Ready to Share / Save Button */}
        {preparedFile ? (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--accent-light)',
              borderRadius: '12px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--accent)' }}>
              File is ready: {preparedFile.name}
            </div>
            <button
              data-testid="deliver-button"
              onClick={handleDeliver}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Download size={18} /> Share / Save to Files
            </button>
          </div>
        ) : (
          <>
            {isPreparing && (
              <div style={{ padding: '8px', textAlign: 'center', color: 'var(--hdr-fg)' }}>
                Preparing file...
              </div>
            )}

            {/* Option 1: Save (Original format) */}
            <button
              onClick={handleSaveOriginal}
              disabled={isPreparing}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '12px',
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                fontWeight: 500,
                fontSize: '15px',
              }}
            >
              <FileSpreadsheet size={22} color="var(--accent)" />
              <div style={{ textAlign: 'left' }}>
                <div>Save ({meta.format.toUpperCase()})</div>
                <div style={{ fontSize: '12px', color: 'var(--hdr-fg)' }}>
                  Save changes to {meta.fileName}
                </div>
              </div>
            </button>

            {/* Option 2: Save as XLSX (CSV only) */}
            {isCsv && (
              <button
                onClick={handleSaveAsXlsx}
                disabled={isPreparing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  fontWeight: 500,
                  fontSize: '15px',
                }}
              >
                <FileSpreadsheet size={22} color="#0E7C66" />
                <div style={{ textAlign: 'left' }}>
                  <div>Save as .xlsx</div>
                  <div style={{ fontSize: '12px', color: 'var(--hdr-fg)' }}>
                    Convert CSV to formatted Excel workbook
                  </div>
                </div>
              </button>
            )}

            {/* Option 3: Export CSV - current view */}
            <button
              onClick={handleExportViewCsv}
              disabled={isPreparing}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '12px',
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                fontWeight: 500,
                fontSize: '15px',
              }}
            >
              <FileText size={22} color="var(--accent)" />
              <div style={{ textAlign: 'left' }}>
                <div>Export CSV – current view</div>
                <div style={{ fontSize: '12px', color: 'var(--hdr-fg)' }}>
                  Export currently sorted and filtered rows
                </div>
              </div>
            </button>

            {/* Option 4: Export PDF */}
            <button
              onClick={handlePrintPdf}
              disabled={isPreparing}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '12px',
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                fontWeight: 500,
                fontSize: '15px',
              }}
            >
              <Printer size={22} color="var(--accent)" />
              <div style={{ textAlign: 'left' }}>
                <div>Export PDF</div>
                <div style={{ fontSize: '12px', color: 'var(--hdr-fg)' }}>
                  Print or save as PDF via system dialog
                </div>
              </div>
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
};

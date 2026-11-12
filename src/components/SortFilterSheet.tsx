import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { BottomSheet } from './BottomSheet';
import { colName, key } from '../core/keys';
import { uniqueValues } from '../core/view';
import { ArrowUpAZ, ArrowDownZA } from 'lucide-react';

export const SortFilterSheet: React.FC = () => {
  const panel = useStore((s) => s.panel);
  const active = useStore((s) => s.active);
  const sheet = useStore((s) => s.sheets[active]);
  const viewState = useStore((s) => s.views[active]);
  const selection = useStore((s) => s.selection);
  const setSort = useStore((s) => s.setSort);
  const setFilter = useStore((s) => s.setFilter);
  const openPanel = useStore((s) => s.openPanel);

  const isOpen = panel === 'sortFilter' && !!sheet && !!viewState;

  // Selected column to sort/filter
  const [selectedCol, setSelectedCol] = useState(0);
  const [containsText, setContainsText] = useState('');
  const [valueQuery, setValueQuery] = useState('');
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && selection) {
      setSelectedCol(selection.c);
    }
  }, [isOpen, selection]);

  // Read existing filter for selectedCol
  useEffect(() => {
    if (!viewState) return;
    const existing = viewState.spec.filters[selectedCol];
    setContainsText(existing?.contains ?? '');
    if (existing?.values) {
      setSelectedValues(new Set(existing.values));
    } else {
      setSelectedValues(new Set());
    }
    setValueQuery('');
  }, [selectedCol, viewState]);

  // Unique values for current column
  const allUnique = useMemo(() => {
    if (!sheet || !viewState) return [];
    return uniqueValues(sheet, selectedCol, viewState.spec.headerRow);
  }, [sheet, viewState, selectedCol]);

  const filteredUnique = useMemo(() => {
    if (!valueQuery.trim()) return allUnique;
    const q = valueQuery.toLowerCase();
    return allUnique.filter((item) => item.value.toLowerCase().includes(q));
  }, [allUnique, valueQuery]);

  if (!isOpen || !sheet || !viewState) return null;

  const { spec } = viewState;

  // Column label helper
  const getColLabel = (c: number): string => {
    if (spec.headerRow) {
      const headerCell = sheet.cells.get(key(0, c));
      if (headerCell?.text) return `${colName(c)} (${headerCell.text})`;
    }
    return colName(c);
  };

  const isSortedAsc = spec.sort?.col === selectedCol && spec.sort?.dir === 'asc';
  const isSortedDesc = spec.sort?.col === selectedCol && spec.sort?.dir === 'desc';

  const handleApply = () => {
    const hasValues = selectedValues.size > 0 && selectedValues.size < allUnique.length;
    const hasContains = containsText.trim().length > 0;

    if (!hasValues && !hasContains) {
      setFilter(selectedCol, null);
    } else {
      setFilter(selectedCol, {
        values: hasValues ? new Set(selectedValues) : undefined,
        contains: hasContains ? containsText.trim() : undefined,
      });
    }
    openPanel(null);
  };

  const handleClear = () => {
    setFilter(selectedCol, null);
    setSort(selectedCol, null);
    setSelectedValues(new Set());
    setContainsText('');
    openPanel(null);
  };

  const toggleVal = (v: string) => {
    const next = new Set(selectedValues);
    if (next.has(v)) {
      next.delete(v);
    } else {
      next.add(v);
    }
    setSelectedValues(next);
  };

  const handleSelectAll = () => {
    setSelectedValues(new Set(allUnique.map((u) => u.value)));
  };

  const handleSelectNone = () => {
    setSelectedValues(new Set());
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => openPanel(null)}
      title="Sort & Filter"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Column Picker */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Column
          </label>
          <select
            value={selectedCol}
            onChange={(e) => setSelectedCol(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
              color: 'var(--fg)',
              fontSize: '14px',
            }}
          >
            {Array.from({ length: sheet.colCount }, (_, c) => (
              <option key={`col-opt-${c}`} value={c}>
                {getColLabel(c)}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Buttons */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Sort
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              data-testid="sort-asc"
              aria-label="Sort ascending"
              onClick={() => setSort(selectedCol, isSortedAsc ? null : 'asc')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: isSortedAsc ? 'var(--accent-light)' : 'var(--bg)',
                color: isSortedAsc ? 'var(--accent)' : 'inherit',
                fontWeight: isSortedAsc ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <ArrowUpAZ size={18} /> A → Z
            </button>
            <button
              data-testid="sort-desc"
              aria-label="Sort descending"
              onClick={() => setSort(selectedCol, isSortedDesc ? null : 'desc')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: isSortedDesc ? 'var(--accent-light)' : 'var(--bg)',
                color: isSortedDesc ? 'var(--accent)' : 'inherit',
                fontWeight: isSortedDesc ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <ArrowDownZA size={18} /> Z → A
            </button>
          </div>
        </div>

        {/* Filter Text Contains */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Text Contains
          </label>
          <input
            type="text"
            placeholder="Filter text..."
            value={containsText}
            onChange={(e) => setContainsText(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
              color: 'var(--fg)',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Unique Values Checklist */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Filter by Values</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{ fontSize: '12px', color: 'var(--accent)', minWidth: 'auto', minHeight: 'auto', padding: '2px 6px' }}
              >
                All
              </button>
              <button
                type="button"
                onClick={handleSelectNone}
                style={{ fontSize: '12px', color: 'var(--accent)', minWidth: 'auto', minHeight: 'auto', padding: '2px 6px' }}
              >
                None
              </button>
            </div>
          </div>

          <input
            type="text"
            placeholder="Search values..."
            value={valueQuery}
            onChange={(e) => setValueQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
              color: 'var(--fg)',
              fontSize: '13px',
              marginBottom: '8px',
              boxSizing: 'border-box',
            }}
          />

          <div
            style={{
              maxHeight: '160px',
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg)',
              padding: '6px',
            }}
          >
            {filteredUnique.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--hdr-fg)', padding: '8px' }}>No values</div>
            ) : (
              filteredUnique.map((item) => {
                const isChecked = selectedValues.has(item.value);
                const displayVal = item.value === '' ? '(Empty)' : item.value;
                return (
                  <label
                    key={`val-${item.value}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleVal(item.value)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span>{displayVal}</span>
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--hdr-fg)' }}>{item.count}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button
            data-testid="filter-clear"
            onClick={handleClear}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'var(--panel-active)',
              fontWeight: 500,
            }}
          >
            Clear Filter
          </button>
          <button
            data-testid="filter-apply"
            onClick={handleApply}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              fontWeight: 600,
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

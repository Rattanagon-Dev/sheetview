import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { key } from '../core/keys';

interface SearchBarProps {
  onMatchChange: (matchKey: number | null) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onMatchChange }) => {
  const panel = useStore((s) => s.panel);
  const active = useStore((s) => s.active);
  const sheet = useStore((s) => s.sheets[active]);
  const viewState = useStore((s) => s.views[active]);
  const select = useStore((s) => s.select);
  const openPanel = useStore((s) => s.openPanel);

  const [query, setQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = panel === 'search';

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      setQuery('');
      setMatchIndex(0);
      onMatchChange(null);
    }
  }, [isOpen, onMatchChange]);

  // Find all matches in display order
  const matches = useMemo(() => {
    if (!isOpen || !sheet || !viewState || !query.trim()) return [];
    const q = query.toLowerCase();
    const results: { r: number; c: number; key: number }[] = [];
    const { rowMap } = viewState;

    for (let i = 0; i < rowMap.length; i++) {
      const srcR = rowMap[i];
      for (let c = 0; c < sheet.colCount; c++) {
        const cKey = key(srcR, c);
        const cell = sheet.cells.get(cKey);
        if (cell && cell.text.toLowerCase().includes(q)) {
          results.push({ r: srcR, c, key: cKey });
        }
      }
    }
    return results;
  }, [isOpen, sheet, viewState, query]);

  useEffect(() => {
    if (matches.length > 0) {
      const idx = Math.min(matchIndex, matches.length - 1);
      const hit = matches[idx];
      select(hit.r, hit.c);
      onMatchChange(hit.key);
    } else {
      onMatchChange(null);
    }
  }, [matches, matchIndex, select, onMatchChange]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (matches.length === 0) return;
    setMatchIndex((prev) => (prev + 1) % matches.length);
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    setMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) handlePrev();
      else handleNext();
    } else if (e.key === 'Escape') {
      openPanel(null);
    }
  };

  const countText = matches.length > 0 ? `${matchIndex + 1} / ${matches.length}` : '0 / 0';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        backgroundColor: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        minHeight: '44px',
        zIndex: 15,
      }}
    >
      <input
        ref={inputRef}
        data-testid="search-input"
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setMatchIndex(0);
        }}
        onKeyDown={handleKeyDown}
        style={{
          flex: 1,
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          color: 'var(--fg)',
          fontSize: '14px',
        }}
      />

      <span style={{ fontSize: '12px', color: 'var(--hdr-fg)', minWidth: '48px', textAlign: 'center' }}>
        {countText}
      </span>

      <button
        data-testid="search-prev"
        aria-label="Previous match"
        disabled={matches.length === 0}
        onClick={handlePrev}
        style={{ width: 36, height: 36, opacity: matches.length === 0 ? 0.4 : 1 }}
      >
        <ChevronUp size={18} />
      </button>

      <button
        data-testid="search-next"
        aria-label="Next match"
        disabled={matches.length === 0}
        onClick={handleNext}
        style={{ width: 36, height: 36, opacity: matches.length === 0 ? 0.4 : 1 }}
      >
        <ChevronDown size={18} />
      </button>

      <button
        aria-label="Close search"
        onClick={() => openPanel(null)}
        style={{ width: 36, height: 36 }}
      >
        <X size={18} />
      </button>
    </div>
  );
};

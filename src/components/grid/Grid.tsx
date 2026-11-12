import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { key } from '../../core/keys';
import { Merge } from '../../core/types';
import { buildOffsets, visibleRange } from './layout';
import { CellView } from './CellView';
import { ColHeader, RowHeader } from './Headers';
import { attachPinchZoom } from '../../platform/pinch';

interface GridProps {
  searchMatchKey?: number | null;
}

export const Grid: React.FC<GridProps> = ({ searchMatchKey }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const active = useStore((s) => s.active);
  const sheet = useStore((s) => s.sheets[active]);
  const viewState = useStore((s) => s.views[active]);
  const selection = useStore((s) => s.selection);
  const zoom = useStore((s) => s.zoom);
  const gridlines = useStore((s) => s.gridlines);
  const select = useStore((s) => s.select);
  const setZoom = useStore((s) => s.setZoom);
  const undoLast = useStore((s) => s.undoLast);
  const openPanel = useStore((s) => s.openPanel);

  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });
  const [viewportSize, setViewportSize] = useState({ w: 800, h: 600 });

  // Update viewport size
  useEffect(() => {
    const updateSize = () => {
      if (scrollerRef.current) {
        setViewportSize({
          w: scrollerRef.current.clientWidth,
          h: scrollerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Attach pinch zoom
  useEffect(() => {
    if (!rootRef.current) return;
    const cleanup = attachPinchZoom(
      rootRef.current,
      () => useStore.getState().zoom,
      (z) => setZoom(z),
      scrollerRef.current
    );
    return cleanup;
  }, [setZoom]);

  if (!sheet || !viewState) {
    return <div className="grid-root" data-testid="grid">No sheet data</div>;
  }

  const { spec, rowMap } = viewState;

  // Header row frozen logic
  const isSortOrFilterActive = spec.sort !== null || Object.keys(spec.filters).length > 0;
  const frozenRows = spec.headerRow
    ? Math.max(sheet.frozen.rows, 1)
    : sheet.frozen.rows;
  const frozenCols = sheet.frozen.cols;

  // Offsets
  const { colX, rowY, totalW, totalH } = useMemo(() => {
    return buildOffsets(sheet, rowMap, zoom);
  }, [sheet, rowMap, zoom]);

  const frozenW = colX[frozenCols] ?? 0;
  const frozenH = rowY[frozenRows] ?? 0;

  const headerH = Math.max(24, Math.round(24 * zoom));
  const digits = String(sheet.rowCount).length;
  const rowHeaderW = Math.round(Math.max(36, digits * 8 + 16) * zoom);

  // Throttled onScroll
  const rafScrollRef = useRef<number | null>(null);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (rafScrollRef.current !== null) {
      cancelAnimationFrame(rafScrollRef.current);
    }
    rafScrollRef.current = requestAnimationFrame(() => {
      setScrollPos({ left: target.scrollLeft, top: target.scrollTop });
    });
  };

  // Visible range in scroller
  const { rStart, rEnd, cStart, cEnd } = useMemo(() => {
    return visibleRange(
      scrollPos.top,
      scrollPos.left,
      viewportSize.w,
      viewportSize.h,
      colX,
      rowY,
      frozenRows,
      frozenCols
    );
  }, [scrollPos, viewportSize, colX, rowY, frozenRows, frozenCols]);

  // Merges (disabled when sort or filter active)
  const activeMerges: Merge[] = useMemo(() => {
    if (isSortOrFilterActive) return [];
    return sheet.merges;
  }, [isSortOrFilterActive, sheet.merges]);

  const coveredCells = useMemo(() => {
    const set = new Set<number>();
    for (const m of activeMerges) {
      for (let r = m.r1; r <= m.r2; r++) {
        for (let c = m.c1; c <= m.c2; c++) {
          if (r !== m.r1 || c !== m.c1) {
            set.add(key(r, c));
          }
        }
      }
    }
    return set;
  }, [activeMerges]);

  // Fast O(1) display row lookup
  const srcToDisp = useMemo(() => {
    if (!isSortOrFilterActive) return null;
    const map = new Map<number, number>();
    for (let i = 0; i < rowMap.length; i++) {
      map.set(rowMap[i], i);
    }
    return map;
  }, [isSortOrFilterActive, rowMap]);

  const getDispRow = useCallback(
    (srcR: number): number => {
      if (!srcToDisp) return srcR < rowMap.length ? srcR : -1;
      return srcToDisp.get(srcR) ?? -1;
    },
    [srcToDisp, rowMap.length]
  );

  // Filter merges by visible pane to avoid looping all merges across whole sheet
  const cornerMerges = useMemo(() => {
    if (activeMerges.length === 0 || frozenCols === 0 || frozenRows === 0) return [];
    return activeMerges.filter((m) => {
      const dispR1 = getDispRow(m.r1);
      return dispR1 !== -1 && m.c1 < frozenCols && dispR1 < frozenRows;
    });
  }, [activeMerges, frozenCols, frozenRows, getDispRow]);

  const frozenRowMerges = useMemo(() => {
    if (activeMerges.length === 0 || frozenRows === 0) return [];
    return activeMerges.filter((m) => {
      const dispR1 = getDispRow(m.r1);
      return (
        dispR1 !== -1 &&
        m.c1 >= frozenCols &&
        dispR1 < frozenRows &&
        m.c2 >= cStart &&
        m.c1 <= cEnd
      );
    });
  }, [activeMerges, frozenRows, frozenCols, cStart, cEnd, getDispRow]);

  const frozenColMerges = useMemo(() => {
    if (activeMerges.length === 0 || frozenCols === 0) return [];
    return activeMerges.filter((m) => {
      const dispR1 = getDispRow(m.r1);
      const dispR2 = getDispRow(m.r2);
      return (
        dispR1 !== -1 &&
        dispR2 !== -1 &&
        m.c1 < frozenCols &&
        dispR1 >= frozenRows &&
        dispR2 >= rStart &&
        dispR1 <= rEnd
      );
    });
  }, [activeMerges, frozenCols, frozenRows, rStart, rEnd, getDispRow]);

  const scrollerMerges = useMemo(() => {
    if (activeMerges.length === 0) return [];
    return activeMerges.filter((m) => {
      const dispR1 = getDispRow(m.r1);
      const dispR2 = getDispRow(m.r2);
      if (dispR1 === -1 || dispR2 === -1) return false;
      const isFrozenCol = m.c1 < frozenCols;
      const isFrozenRow = dispR1 < frozenRows;
      if (isFrozenCol || isFrozenRow) return false;
      return dispR2 >= rStart && dispR1 <= rEnd && m.c2 >= cStart && m.c1 <= cEnd;
    });
  }, [activeMerges, frozenCols, frozenRows, rStart, rEnd, cStart, cEnd, getDispRow]);

  // Pointer interactions: tap and double tap
  const tapInfoRef = useRef<{ x: number; y: number; time: number; r: number; c: number } | null>(null);
  const lastTapRef = useRef<{ r: number; c: number; time: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, srcR: number, srcC: number) => {
    tapInfoRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      r: srcR,
      c: srcC,
    };
  };

  const handlePointerUp = (e: React.PointerEvent, srcR: number, srcC: number) => {
    const tap = tapInfoRef.current;
    if (!tap) return;
    const dist = Math.hypot(e.clientX - tap.x, e.clientY - tap.y);
    const dur = Date.now() - tap.time;
    if (dist < 8 && dur < 500) {
      // Valid tap
      const last = lastTapRef.current;
      const now = Date.now();
      if (last && last.r === srcR && last.c === srcC && now - last.time < 300) {
        // Double tap
        openPanel('edit');
        lastTapRef.current = null;
      } else {
        select(srcR, srcC);
        lastTapRef.current = { r: srcR, c: srcC, time: now };
      }
    }
    tapInfoRef.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undoLast();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        openPanel('search');
        return;
      }

      const curSel = useStore.getState().selection;
      if (!curSel) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        openPanel('edit');
        return;
      }

      let newR = curSel.r;
      let newC = curSel.c;
      if (e.key === 'ArrowUp') newR = Math.max(0, newR - 1);
      else if (e.key === 'ArrowDown') newR = Math.min(sheet.rowCount - 1, newR + 1);
      else if (e.key === 'ArrowLeft') newC = Math.max(0, newC - 1);
      else if (e.key === 'ArrowRight') newC = Math.min(sheet.colCount - 1, newC + 1);
      else return;

      e.preventDefault();
      select(newR, newC);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sheet.rowCount, sheet.colCount, select, undoLast, openPanel]);

  // Selection box rendering calculation
  const selBox = useMemo(() => {
    if (!selection) return null;
    let selR1 = selection.r;
    let selC1 = selection.c;
    let selR2 = selection.r;
    let selC2 = selection.c;

    // Check merge
    for (const m of activeMerges) {
      if (selection.r >= m.r1 && selection.r <= m.r2 && selection.c >= m.c1 && selection.c <= m.c2) {
        selR1 = m.r1;
        selC1 = m.c1;
        selR2 = m.r2;
        selC2 = m.c2;
        break;
      }
    }

    // Map source row to display row with O(1) lookup
    const dispR1 = getDispRow(selR1);
    const dispR2 = getDispRow(selR2);

    if (dispR1 === -1 || dispR2 === -1) return null;

    const left = colX[selC1];
    const top = rowY[dispR1];
    const w = colX[selC2 + 1] - left;
    const h = rowY[dispR2 + 1] - top;

    // Identify which pane contains anchor (selC1, dispR1)
    const isFrozenCol = selC1 < frozenCols;
    const isFrozenRow = dispR1 < frozenRows;

    let pane: 'corner' | 'frozenRows' | 'frozenCols' | 'scroller' = 'scroller';
    let relLeft = left - frozenW;
    let relTop = top - frozenH;

    if (isFrozenCol && isFrozenRow) {
      pane = 'corner';
      relLeft = left;
      relTop = top;
    } else if (!isFrozenCol && isFrozenRow) {
      pane = 'frozenRows';
      relLeft = left - frozenW;
      relTop = top;
    } else if (isFrozenCol && !isFrozenRow) {
      pane = 'frozenCols';
      relLeft = left;
      relTop = top - frozenH;
    }

    return { pane, left: relLeft, top: relTop, w, h };
  }, [selection, activeMerges, getDispRow, colX, rowY, frozenCols, frozenRows, frozenW, frozenH]);

  // Render a cell given display row and column
  const renderCell = useCallback((dispR: number, c: number, left: number, top: number) => {
    const srcR = rowMap[dispR];
    const cKey = key(srcR, c);
    if (coveredCells.has(cKey)) return null;

    const cell = sheet.cells.get(cKey);
    const styleObj = cell?.s !== undefined ? sheet.styles[cell.s] : undefined;
    const w = colX[c + 1] - colX[c];
    const h = rowY[dispR + 1] - rowY[dispR];
    const isMatch = searchMatchKey === cKey;

    return (
      <div
        key={`cell-${srcR}-${c}`}
        style={{ position: 'absolute', left: `${left}px`, top: `${top}px` }}
        onPointerDown={(e) => handlePointerDown(e, srcR, c)}
        onPointerUp={(e) => handlePointerUp(e, srcR, c)}
      >
        <CellView
          r={srcR}
          c={c}
          cell={cell}
          styleObj={styleObj}
          left={0}
          top={0}
          width={w}
          height={h}
          zoom={zoom}
          gridlines={gridlines}
          isSearchMatch={isMatch}
        />
      </div>
    );
  }, [rowMap, coveredCells, sheet.cells, sheet.styles, colX, rowY, searchMatchKey, zoom, gridlines]);

  // Render a merged cell
  const renderMerge = useCallback((m: Merge, pane: 'corner' | 'frozenRows' | 'frozenCols' | 'scroller') => {
    const dispR1 = getDispRow(m.r1);
    const dispR2 = getDispRow(m.r2);
    if (dispR1 === -1 || dispR2 === -1) return null;

    const isFrozenCol = m.c1 < frozenCols;
    const isFrozenRow = dispR1 < frozenRows;

    let targetPane: 'corner' | 'frozenRows' | 'frozenCols' | 'scroller' = 'scroller';
    if (isFrozenCol && isFrozenRow) targetPane = 'corner';
    else if (!isFrozenCol && isFrozenRow) targetPane = 'frozenRows';
    else if (isFrozenCol && !isFrozenRow) targetPane = 'frozenCols';

    if (targetPane !== pane) return null;

    const cKey = key(m.r1, m.c1);
    const cell = sheet.cells.get(cKey);
    const styleObj = cell?.s !== undefined ? sheet.styles[cell.s] : undefined;

    const left = colX[m.c1] - (targetPane === 'frozenRows' || targetPane === 'scroller' ? frozenW : 0);
    const top = rowY[dispR1] - (targetPane === 'frozenCols' || targetPane === 'scroller' ? frozenH : 0);
    const w = colX[m.c2 + 1] - colX[m.c1];
    const h = rowY[dispR2 + 1] - rowY[dispR1];

    return (
      <div
        key={`merge-${m.r1}-${m.c1}`}
        style={{ position: 'absolute', left: `${left}px`, top: `${top}px` }}
        onPointerDown={(e) => handlePointerDown(e, m.r1, m.c1)}
        onPointerUp={(e) => handlePointerUp(e, m.r1, m.c1)}
      >
        <CellView
          r={m.r1}
          c={m.c1}
          cell={cell}
          styleObj={styleObj}
          left={0}
          top={0}
          width={w}
          height={h}
          zoom={zoom}
          gridlines={gridlines}
          isSearchMatch={searchMatchKey === cKey}
        />
      </div>
    );
  }, [getDispRow, frozenCols, frozenRows, sheet.cells, sheet.styles, colX, rowY, frozenW, frozenH, zoom, gridlines, searchMatchKey]);

  return (
    <div ref={rootRef} className="grid-root" data-testid="grid">
      {/* Corner Header (top-left) */}
      <div
        className="grid-corner"
        style={{ width: `${rowHeaderW}px`, height: `${headerH}px` }}
      />

      {/* Frozen Column Headers */}
      {frozenCols > 0 && (
        <div
          className="grid-col-hdr-frozen"
          style={{
            left: `${rowHeaderW}px`,
            width: `${frozenW}px`,
            height: `${headerH}px`,
          }}
        >
          {Array.from({ length: frozenCols }, (_, c) => (
            <ColHeader
              key={`col-hdr-f-${c}`}
              c={c}
              left={colX[c]}
              width={colX[c + 1] - colX[c]}
              height={headerH}
              isSelected={selection?.c === c}
              spec={spec}
              onClick={() => openPanel('sortFilter')}
            />
          ))}
        </div>
      )}

      {/* Scrollable Column Headers */}
      <div
        className="grid-col-hdr-scroll"
        style={{
          left: `${rowHeaderW + frozenW}px`,
          right: 0,
          height: `${headerH}px`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${totalW - frozenW}px`,
            height: `${headerH}px`,
            transform: `translateX(-${scrollPos.left}px)`,
          }}
        >
          {Array.from({ length: cEnd - Math.max(frozenCols, cStart) + 1 }, (_, i) => {
            const c = Math.max(frozenCols, cStart) + i;
            return (
              <ColHeader
                key={`col-hdr-s-${c}`}
                c={c}
                left={colX[c] - frozenW}
                width={colX[c + 1] - colX[c]}
                height={headerH}
                isSelected={selection?.c === c}
                spec={spec}
                onClick={() => openPanel('sortFilter')}
              />
            );
          })}
        </div>
      </div>

      {/* Frozen Row Headers */}
      {frozenRows > 0 && (
        <div
          className="grid-row-hdr-frozen"
          style={{
            top: `${headerH}px`,
            width: `${rowHeaderW}px`,
            height: `${frozenH}px`,
          }}
        >
          {Array.from({ length: frozenRows }, (_, r) => (
            <RowHeader
              key={`row-hdr-f-${r}`}
              displayR={r}
              srcR={rowMap[r]}
              top={rowY[r]}
              width={rowHeaderW}
              height={rowY[r + 1] - rowY[r]}
              isSelected={selection?.r === rowMap[r]}
            />
          ))}
        </div>
      )}

      {/* Scrollable Row Headers */}
      <div
        className="grid-row-hdr-scroll"
        style={{
          top: `${headerH + frozenH}px`,
          bottom: 0,
          width: `${rowHeaderW}px`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${rowHeaderW}px`,
            height: `${totalH - frozenH}px`,
            transform: `translateY(-${scrollPos.top}px)`,
          }}
        >
          {Array.from({ length: rEnd - Math.max(frozenRows, rStart) + 1 }, (_, i) => {
            const r = Math.max(frozenRows, rStart) + i;
            return (
              <RowHeader
                key={`row-hdr-s-${r}`}
                displayR={r}
                srcR={rowMap[r]}
                top={rowY[r] - frozenH}
                width={rowHeaderW}
                height={rowY[r + 1] - rowY[r]}
                isSelected={selection?.r === rowMap[r]}
              />
            );
          })}
        </div>
      </div>

      {/* Corner Cells */}
      {frozenCols > 0 && frozenRows > 0 && (
        <div
          className="grid-corner-cells"
          style={{
            left: `${rowHeaderW}px`,
            top: `${headerH}px`,
            width: `${frozenW}px`,
            height: `${frozenH}px`,
          }}
        >
          {Array.from({ length: frozenRows }, (_, r) =>
            Array.from({ length: frozenCols }, (_, c) =>
              renderCell(r, c, colX[c], rowY[r])
            )
          )}
          {cornerMerges.map((m) => renderMerge(m, 'corner'))}
          {selBox?.pane === 'corner' && (
            <div
              className="selection-ring"
              style={{
                left: `${selBox.left}px`,
                top: `${selBox.top}px`,
                width: `${selBox.w}px`,
                height: `${selBox.h}px`,
              }}
            />
          )}
        </div>
      )}

      {/* Frozen Rows (Horizontal Scroll) */}
      {frozenRows > 0 && (
        <div
          className="grid-frozen-rows"
          style={{
            left: `${rowHeaderW + frozenW}px`,
            right: 0,
            top: `${headerH}px`,
            height: `${frozenH}px`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: `${totalW - frozenW}px`,
              height: `${frozenH}px`,
              transform: `translateX(-${scrollPos.left}px)`,
            }}
          >
            {Array.from({ length: frozenRows }, (_, r) =>
              Array.from({ length: cEnd - Math.max(frozenCols, cStart) + 1 }, (_, i) => {
                const c = Math.max(frozenCols, cStart) + i;
                return renderCell(r, c, colX[c] - frozenW, rowY[r]);
              })
            )}
            {frozenRowMerges.map((m) => renderMerge(m, 'frozenRows'))}
            {selBox?.pane === 'frozenRows' && (
              <div
                className="selection-ring"
                style={{
                  left: `${selBox.left}px`,
                  top: `${selBox.top}px`,
                  width: `${selBox.w}px`,
                  height: `${selBox.h}px`,
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Frozen Columns (Vertical Scroll) */}
      {frozenCols > 0 && (
        <div
          className="grid-frozen-cols"
          style={{
            left: `${rowHeaderW}px`,
            top: `${headerH + frozenH}px`,
            bottom: 0,
            width: `${frozenW}px`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: `${frozenW}px`,
              height: `${totalH - frozenH}px`,
              transform: `translateY(-${scrollPos.top}px)`,
            }}
          >
            {Array.from({ length: rEnd - Math.max(frozenRows, rStart) + 1 }, (_, i) => {
              const r = Math.max(frozenRows, rStart) + i;
              return Array.from({ length: frozenCols }, (_, c) =>
                renderCell(r, c, colX[c], rowY[r] - frozenH)
              );
            })}
            {frozenColMerges.map((m) => renderMerge(m, 'frozenCols'))}
            {selBox?.pane === 'frozenCols' && (
              <div
                className="selection-ring"
                style={{
                  left: `${selBox.left}px`,
                  top: `${selBox.top}px`,
                  width: `${selBox.w}px`,
                  height: `${selBox.h}px`,
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Main Scroller (Only element that scrolls) */}
      <div
        ref={scrollerRef}
        className="grid-scroller"
        style={{
          left: `${rowHeaderW + frozenW}px`,
          top: `${headerH + frozenH}px`,
          right: 0,
          bottom: 0,
        }}
        onScroll={handleScroll}
      >
        <div
          style={{
            position: 'relative',
            width: `${Math.max(totalW - frozenW, 1)}px`,
            height: `${Math.max(totalH - frozenH, 1)}px`,
          }}
        >
          {Array.from({ length: rEnd - Math.max(frozenRows, rStart) + 1 }, (_, i) => {
            const r = Math.max(frozenRows, rStart) + i;
            return Array.from({ length: cEnd - Math.max(frozenCols, cStart) + 1 }, (_, j) => {
              const c = Math.max(frozenCols, cStart) + j;
              return renderCell(r, c, colX[c] - frozenW, rowY[r] - frozenH);
            });
          })}
          {scrollerMerges.map((m) => renderMerge(m, 'scroller'))}
          {selBox?.pane === 'scroller' && (
            <div
              className="selection-ring"
              style={{
                left: `${selBox.left}px`,
                top: `${selBox.top}px`,
                width: `${selBox.w}px`,
                height: `${selBox.h}px`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

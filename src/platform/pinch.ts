export function attachPinchZoom(
  el: HTMLElement,
  getZoom: () => number,
  setZoom: (z: number) => void,
  scroller?: HTMLElement | null
): () => void {
  let startZoom = 1;
  let startScrollLeft = 0;
  let startScrollTop = 0;

  // Safari gesture events
  const onGestureStart = (e: any) => {
    e.preventDefault();
    startZoom = getZoom();
    if (scroller) {
      startScrollLeft = scroller.scrollLeft;
      startScrollTop = scroller.scrollTop;
    }
  };

  const onGestureChange = (e: any) => {
    e.preventDefault();
    const scale = e.scale;
    const newZoom = Math.min(3, Math.max(0.5, Math.round(startZoom * scale * 20) / 20));
    setZoom(newZoom);
    if (scroller && scale > 0) {
      scroller.scrollLeft = startScrollLeft * scale;
      scroller.scrollTop = startScrollTop * scale;
    }
  };

  // Pointer events fallback for non-Safari devices
  const activePointers = new Map<number, { x: number; y: number }>();
  let initialDist = 0;

  const onPointerDown = (e: PointerEvent) => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 2) {
      startZoom = getZoom();
      const [p1, p2] = Array.from(activePointers.values());
      initialDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (scroller) {
        startScrollLeft = scroller.scrollLeft;
        startScrollTop = scroller.scrollTop;
      }
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 2 && initialDist > 0) {
      const [p1, p2] = Array.from(activePointers.values());
      const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const scale = currentDist / initialDist;
      const newZoom = Math.min(3, Math.max(0.5, Math.round(startZoom * scale * 20) / 20));
      setZoom(newZoom);
      if (scroller && scale > 0) {
        scroller.scrollLeft = startScrollLeft * scale;
        scroller.scrollTop = startScrollTop * scale;
      }
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) {
      initialDist = 0;
    }
  };

  // Attach handlers
  (el as any).addEventListener('gesturestart', onGestureStart, { passive: false });
  (el as any).addEventListener('gesturechange', onGestureChange, { passive: false });
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);

  return () => {
    (el as any).removeEventListener('gesturestart', onGestureStart);
    (el as any).removeEventListener('gesturechange', onGestureChange);
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerUp);
  };
}

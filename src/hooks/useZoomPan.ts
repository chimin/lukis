import { useState, useCallback, useRef, useEffect } from 'react';

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const ZOOM_STEP = 0.1;

interface ZoomState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function useZoomPan(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, offsetX: 0, offsetY: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoom((prev) => {
          const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale + delta));
          const ratio = newScale / prev.scale;
          return {
            scale: newScale,
            offsetX: mouseX - ratio * (mouseX - prev.offsetX),
            offsetY: mouseY - ratio * (mouseY - prev.offsetY),
          };
        });
      } else {
        e.preventDefault();
        setZoom((prev) => ({
          ...prev,
          offsetX: prev.offsetX - e.deltaX,
          offsetY: prev.offsetY - e.deltaY,
        }));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setZoom((prev) => ({ ...prev, offsetX: prev.offsetX + dx, offsetY: prev.offsetY + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((prev) => {
      const el = containerRef.current;
      const cx = el ? el.clientWidth / 2 : 0;
      const cy = el ? el.clientHeight / 2 : 0;
      const newScale = Math.min(MAX_SCALE, prev.scale + ZOOM_STEP);
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        offsetX: cx - ratio * (cx - prev.offsetX),
        offsetY: cy - ratio * (cy - prev.offsetY),
      };
    });
  }, [containerRef]);

  const zoomOut = useCallback(() => {
    setZoom((prev) => {
      const el = containerRef.current;
      const cx = el ? el.clientWidth / 2 : 0;
      const cy = el ? el.clientHeight / 2 : 0;
      const newScale = Math.max(MIN_SCALE, prev.scale - ZOOM_STEP);
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        offsetX: cx - ratio * (cx - prev.offsetX),
        offsetY: cy - ratio * (cy - prev.offsetY),
      };
    });
  }, [containerRef]);

  const reset = useCallback(() => {
    setZoom({ scale: 1, offsetX: 0, offsetY: 0 });
  }, []);

  return {
    scale: zoom.scale,
    offsetX: zoom.offsetX,
    offsetY: zoom.offsetY,
    handlers: { handleMouseDown, handleMouseMove, handleMouseUp },
    reset,
    zoomIn,
    zoomOut,
  };
}

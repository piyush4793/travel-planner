import { useState, useCallback, useEffect, useRef } from "react";

const KEYBOARD_STEP = 20;

export function usePanelDrag(initialWidth: number, minWidth: number) {
  const [panelWidth, setPanelWidth] = useState(initialWidth);
  const maxWidth = typeof window !== "undefined" ? window.innerWidth * 0.5 : 600;
  const cleanupRef = useRef<(() => void) | null>(null);

  // Ensure listeners are removed if component unmounts mid-drag
  useEffect(() => () => { cleanupRef.current?.(); }, []);

  function startPanelDrag() {
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    function onMove(e: PointerEvent) {
      const w = Math.round(Math.min(Math.max(minWidth, window.innerWidth - e.clientX), window.innerWidth * 0.5));
      setPanelWidth(w);
    }
    function onUp() {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      cleanupRef.current = null;
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    cleanupRef.current = () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPanelWidth((w) => Math.min(w + KEYBOARD_STEP, maxWidth));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPanelWidth((w) => Math.max(w - KEYBOARD_STEP, minWidth));
    }
  }, [minWidth, maxWidth]);

  /** Props to spread on the drag handle element for a11y */
  const dragHandleProps = {
    role: "separator" as const,
    "aria-orientation": "vertical" as const,
    "aria-valuenow": panelWidth,
    "aria-valuemin": minWidth,
    "aria-valuemax": maxWidth,
    "aria-label": "Resize panel",
    tabIndex: 0,
    onKeyDown: handleKeyDown,
  };

  return { panelWidth, startPanelDrag, dragHandleProps };
}

import { useState } from "react";

export function usePanelDrag(initialWidth: number, minWidth: number) {
  const [panelWidth, setPanelWidth] = useState(initialWidth);

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
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  return { panelWidth, startPanelDrag };
}

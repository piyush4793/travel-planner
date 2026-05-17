import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  label: string;
  active: boolean;
  children: (close: () => void) => React.ReactNode;
};

export default function FilterChip({ label, active, children }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function toggle() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(o => !o);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !panelRef.current?.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border ${
          active
            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
            : open
            ? "bg-gray-100 text-gray-700 border-gray-300"
            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        {label}
        <svg
          className={`w-2.5 h-2.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 10 6"
          fill="currentColor"
        >
          <path d="M0 0l5 6 5-6z" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 99999 }}
          className="bg-white border border-gray-200 rounded-2xl shadow-xl"
        >
          {children(() => setOpen(false))}
        </div>,
        document.body
      )}
    </>
  );
}

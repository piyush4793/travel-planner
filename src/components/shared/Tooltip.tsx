import { useState, useRef } from "react";
import { createPortal } from "react-dom";

type Props = {
  text: string;
  children?: React.ReactNode;
  triggerClassName?: string;
};

export default function Tooltip({ text, children, triggerClassName }: Props) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [below, setBelow] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  function show() {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      const flip = r.top < 110;
      setBelow(flip);
      let left = r.left + r.width / 2;
      // Prevent overflow on edges (tooltip is ~176px / w-44)
      const halfWidth = 88;
      if (left - halfWidth < 8) left = halfWidth + 8;
      if (left + halfWidth > window.innerWidth - 8) left = window.innerWidth - halfWidth - 8;
      setPos(
        flip
          ? { top: r.bottom + 8, left }
          : { top: r.top - 6, left }
      );
    }
    setVisible(true);
  }

  function hide() { setVisible(false); }

  return (
    <>
      <button
        type="button"
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={show}
        className={`inline-flex items-center justify-center w-5 h-5 min-w-[20px] min-h-[20px] rounded-full bg-current/15 text-current text-[9px] font-black cursor-help select-none leading-none shrink-0 opacity-60 focus-ring ${triggerClassName ?? ""}`}
        aria-label={text}
        aria-describedby={visible ? "tooltip-content" : undefined}
      >
        {children ?? "i"}
      </button>

      {visible && createPortal(
        <div
          id="tooltip-content"
          role="tooltip"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: below ? "translate(-50%, 0)" : "translate(-50%, -100%)",
            zIndex: 99999,
            pointerEvents: "none",
          }}
          className="bg-gray-900 text-white text-[11px] leading-snug rounded-xl px-3 py-2 shadow-2xl w-44 text-center"
        >
          {text}
          <span
            className={`absolute left-1/2 -translate-x-1/2 border-[5px] border-transparent ${
              below
                ? "bottom-full border-b-gray-900"
                : "top-full border-t-gray-900"
            }`}
          />
        </div>,
        document.body
      )}
    </>
  );
}

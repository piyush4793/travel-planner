import { useState, useEffect } from "react";
import type { Country } from "../../core/types";
import { getWikiImage } from "../../utils/wikiImages";

type Props = {
  country: Country;
  x: number;
  y: number;
  isVisited: boolean;
};

export default function HoverCard({ country, x, y, isVisited }: Props) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    setImgSrc(null);
    const title = country.landmark ?? country.name;
    getWikiImage(title).then(setImgSrc);
  }, [country]);

  return (
    <div
      className="hover-card absolute z-40 w-44 rounded-xl overflow-hidden shadow-2xl border border-white/20"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, calc(-100% - 52px))",
        pointerEvents: "none",
      }}
    >
      <div className="relative h-28 bg-gradient-to-br from-slate-700 to-slate-900">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={country.name}
            className="w-full h-full object-cover"
            onError={() => setImgSrc(null)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-black text-white/20 select-none">
              {country.name[0]}
            </span>
          </div>
        )}
        {isVisited && (
          <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            Visited
          </span>
        )}
        {/* small arrow pointing down to the pin */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 shadow" />
      </div>
      <div className="bg-white px-3 py-2">
        <p className="font-semibold text-gray-900 text-sm leading-tight">{country.name}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{country.budget}</p>
      </div>
    </div>
  );
}

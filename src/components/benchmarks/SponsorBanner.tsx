import { useEffect, useRef, useState } from "react";
import { BANNER_SPONSORS } from "./sponsorData";

const SCROLL_BUCKET = 150;

export function SponsorBanner() {
  const [index, setIndex] = useState(0);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY;

    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = Math.trunc((y - lastY.current) / SCROLL_BUCKET);
        if (delta !== 0) {
          setIndex((prev) => ((prev + delta) % BANNER_SPONSORS.length + BANNER_SPONSORS.length) % BANNER_SPONSORS.length);
          lastY.current = y;
        }
        ticking.current = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const sponsor = BANNER_SPONSORS[index];

  return (
    <div className="xl:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 max-w-md mx-auto">
        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-text-dimmer">
          Partners
        </span>
        <a
          href={sponsor.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 hover:opacity-75 transition-opacity"
        >
          <img src={sponsor.logo} alt={sponsor.name} loading="lazy" decoding="async" className="h-6 w-auto object-contain block dark:hidden" />
          <img src={sponsor.logoDark} alt={sponsor.name} loading="lazy" decoding="async" className="h-6 w-auto object-contain hidden dark:block" />
        </a>
        <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
          {BANNER_SPONSORS.map((s, i) => (
            <span
              key={s.name}
              className={
                i === index
                  ? "h-1.5 w-3 rounded-full bg-gray-500 dark:bg-gray-400"
                  : "h-1.5 w-1.5 rounded-full bg-gray-200 dark:bg-gray-700"
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

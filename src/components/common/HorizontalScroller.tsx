import React, { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Horizontal scroll-snap container. Touch/native scrolling on mobile,
 * arrow buttons on desktop (shown only when scrollable). No new deps.
 */
export const HorizontalScroller: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <div className="relative group/scroller">
      <div
        ref={ref}
        onScroll={update}
        className={`flex gap-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth ${className}`}
      >
        {children}
      </div>
      {canLeft && (
        <button
          aria-label="向左滚动"
          onClick={() => scrollBy(-1)}
          className="hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-slate-900/90 border border-white/10 text-white shadow-lg transition hover:bg-slate-800"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canRight && (
        <button
          aria-label="向右滚动"
          onClick={() => scrollBy(1)}
          className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-slate-900/90 border border-white/10 text-white shadow-lg transition hover:bg-slate-800"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

import React from 'react';

/**
 * Pure-CSS shimmer skeletons (no dependency). Layout-stable placeholders for
 * the new Discover page so data loads never cause content jumps.
 */

const shimmer =
  'relative overflow-hidden bg-white/[0.06] rounded-xl before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/[0.08] before:to-transparent before:animate-[shimmer_1.4s_infinite] motion-reduce:before:animate-none';

export const SkeletonBanner: React.FC = () => (
  <div className="rounded-3xl border border-white/10 p-6 sm:p-10">
    <div className="flex flex-col md:flex-row items-center gap-8">
      <div className="flex-1 w-full space-y-4">
        <div className={`h-6 w-28 ${shimmer}`} />
        <div className={`h-9 w-3/4 ${shimmer}`} />
        <div className={`h-4 w-full ${shimmer}`} />
        <div className={`h-4 w-2/3 ${shimmer}`} />
        <div className="flex gap-3 pt-2">
          <div className={`h-11 w-32 rounded-full ${shimmer}`} />
          <div className={`h-11 w-32 rounded-full ${shimmer}`} />
        </div>
      </div>
      <div className={`h-48 w-48 shrink-0 rounded-full ${shimmer}`} />
    </div>
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="w-40 shrink-0 snap-start p-3">
    <div className={`aspect-square w-full mb-3 rounded-xl ${shimmer}`} />
    <div className={`h-4 w-3/4 mb-2 ${shimmer}`} />
    <div className={`h-3 w-1/2 ${shimmer}`} />
  </div>
);

export const SkeletonRow: React.FC = () => (
  <div className="flex items-center gap-3 px-3 py-2.5">
    <div className={`h-11 w-11 rounded-lg shrink-0 ${shimmer}`} />
    <div className="flex-1 space-y-2">
      <div className={`h-3.5 w-2/5 ${shimmer}`} />
      <div className={`h-3 w-1/4 ${shimmer}`} />
    </div>
  </div>
);

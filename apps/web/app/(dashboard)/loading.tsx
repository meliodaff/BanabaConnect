"use client";

import { useDictionary } from "@/components/I18nProvider";
import { PageHeader } from "@/components/PageHeader";
import {
  Bone,
  CardSkeleton,
  PriorityBadgeSkeleton,
  SkeletonBody,
} from "@/components/Skeleton";

/**
 * Overview while it loads: the four number tiles, "Most urgent now", and the two side panels.
 * Pages in this group without their own loading.tsx fall back to this one.
 */
export default function OverviewLoading() {
  const t = useDictionary();
  return (
    <>
      <PageHeader title={t.overview.title} description={t.overview.description}>
        <Bone className="skeleton-in h-6 w-44 rounded-full" />
      </PageHeader>

      <SkeletonBody label={t.loading.overview} className="px-8 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <div key={tile} className="rounded-lg border border-line bg-surface p-5">
              <Bone className="h-4 w-36" />
              <Bone className="mt-3 h-9 w-14" />
              <Bone className="mt-3 h-3.5 w-48" />
              <Bone className="mt-4 h-4 w-28" />
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <CardSkeleton title={t.overview.mostUrgent}>
            <ul className="divide-y divide-line">
              {[0, 1, 2, 3, 4].map((row) => (
                <li key={row} className="grid grid-cols-[150px_minmax(0,1fr)_auto] items-center gap-4 py-3">
                  <PriorityBadgeSkeleton />
                  <div className="min-w-0">
                    <Bone className="h-4 w-32" />
                    <Bone className="mt-2 h-3.5 w-3/4" />
                  </div>
                  <Bone className="h-7 w-24 rounded-full" />
                </li>
              ))}
            </ul>
          </CardSkeleton>

          <div className="space-y-6">
            <CardSkeleton title={t.overview.several}>
              <ul className="divide-y divide-line">
                {[0, 1, 2].map((row) => (
                  <li key={row} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <Bone className="h-4 w-40" />
                      <Bone className="mt-2 h-3.5 w-56" />
                    </div>
                    <Bone className="h-7 w-24 rounded-full" />
                  </li>
                ))}
              </ul>
            </CardSkeleton>

            <CardSkeleton title={t.overview.byType}>
              <div className="space-y-3">
                {["w-full", "w-4/5", "w-3/5", "w-2/5"].map((width, row) => (
                  <div key={row} className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                    <Bone className="h-4 w-20" />
                    <Bone className={`h-5 ${width}`} />
                  </div>
                ))}
              </div>
            </CardSkeleton>
          </div>
        </div>
      </SkeletonBody>
    </>
  );
}

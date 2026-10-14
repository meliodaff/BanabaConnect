"use client";

import { useDictionary } from "@/components/I18nProvider";
import { PageHeader } from "@/components/PageHeader";
import { Bone, SkeletonBody } from "@/components/Skeleton";

/** The monthly report while it loads: the real title, then the sheet taking shape. */
export default function MonthlyReportLoading() {
  const t = useDictionary();
  return (
    <>
      <PageHeader title={t.monthly.title} description={t.monthly.description}>
        <div aria-hidden className="skeleton-in flex flex-wrap items-center gap-3">
          <Bone className="h-10 w-44" />
          <Bone className="h-5 w-28" />
          <Bone className="h-10 w-44" />
          <Bone className="h-10 w-40" />
        </div>
      </PageHeader>

      <SkeletonBody label={t.loading.monthly} className="px-8 py-6">
        <Bone className="mb-4 h-5 w-36" />
        <div className="mx-auto max-w-[210mm] rounded-lg border border-line bg-surface px-[14mm] py-[12mm] shadow-sm">
          <div className="flex items-center gap-3 border-b-2 border-line pb-4">
            <Bone className="h-[15mm] w-[15mm] rounded-full" />
            <div className="space-y-2">
              <Bone className="h-4 w-32" />
              <Bone className="h-6 w-56" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((index) => (
              <Bone key={index} className="h-20 rounded" />
            ))}
          </div>
          <Bone className="mt-6 h-16 w-full" />
          <Bone className="mt-6 h-40 w-full" />
        </div>
      </SkeletonBody>
    </>
  );
}

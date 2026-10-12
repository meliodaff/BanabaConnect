import {
  Bone,
  CardSkeleton,
  PriorityBadgeSkeleton,
  SkeletonBody,
} from "@/components/Skeleton";

/**
 * One report while it loads, in the same two columns: what the resident saw and where on the
 * left; status, priority, reporter and timeline on the right. The card titles are real.
 */
export default function ReportLoading() {
  return (
    <SkeletonBody label="the report" className="px-8 py-6">
      <Bone className="my-2 h-5 w-36" />

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <PriorityBadgeSkeleton size="lg" />
        <div>
          <Bone className="h-7 w-48" />
          <Bone className="mt-2 h-4 w-64" />
        </div>
        <Bone className="h-7 w-24 rounded-full" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <CardSkeleton title="What the resident saw">
            <Bone className="h-72 w-full rounded-lg" />
            <Bone className="mt-4 h-4 w-full" />
            <Bone className="mt-2 h-4 w-2/3" />
          </CardSkeleton>

          <CardSkeleton title="Location">
            <Bone className="h-80 w-full rounded-lg" />
            <div className="mt-3 flex justify-between gap-2">
              <Bone className="h-4 w-56" />
              <Bone className="h-4 w-32" />
            </div>
          </CardSkeleton>
        </div>

        <div className="space-y-6">
          <CardSkeleton title="Update status">
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3].map((option) => (
                <Bone key={option} className="h-10 w-24" />
              ))}
            </div>
            <Bone className="mt-4 h-20 w-full" />
            <Bone className="mt-3 h-11 w-36" />
          </CardSkeleton>

          <CardSkeleton title="Why this priority">
            <div className="space-y-4">
              {[0, 1, 2].map((part) => (
                <div key={part}>
                  <div className="flex justify-between gap-3">
                    <Bone className="h-4 w-28" />
                    <Bone className="h-4 w-12" />
                  </div>
                  <Bone className="mt-2 h-3.5 w-3/4" />
                </div>
              ))}
            </div>
          </CardSkeleton>

          <CardSkeleton title="Reporter">
            <div className="space-y-2.5">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                  <Bone className="h-4 w-16" />
                  <Bone className="h-4 w-40" />
                </div>
              ))}
            </div>
          </CardSkeleton>

          <CardSkeleton title="Timeline">
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item}>
                  <Bone className="h-4 w-44" />
                  <Bone className="mt-1.5 h-3.5 w-36" />
                </div>
              ))}
            </div>
          </CardSkeleton>
        </div>
      </div>
    </SkeletonBody>
  );
}

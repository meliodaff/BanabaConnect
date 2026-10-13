import { PageHeader } from "@/components/PageHeader";
import {
  Bone,
  PriorityBadgeSkeleton,
  SkeletonBody,
  TabsSkeleton,
} from "@/components/Skeleton";
import { QUEUE_COLUMNS, QUEUE_DETAILS } from "@/lib/queueLayout";

/** The Reports list while it loads: its filters, column headers and rows, in the real layout. */
export default function ReportsLoading() {
  return (
    <>
      <PageHeader title="Reports" description="Incident reports from residents of Barangay Banaba.">
        <TabsSkeleton widths={["w-20", "w-24", "w-20", "w-14"]} />
      </PageHeader>

      <SkeletonBody label="reports" className="px-8 py-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Bone className="h-4 w-72" />
            <Bone className="h-3.5 w-[28rem] max-w-full" />
          </div>
          <Bone className="h-6 w-44 rounded-full" />
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className={`hidden border-b border-line bg-page px-5 py-[13px] xl:grid ${QUEUE_COLUMNS}`}>
            {["w-16", "w-14", "w-16", "w-16", "w-12"].map((width, index) => (
              <Bone key={index} className={`h-3.5 ${width}`} />
            ))}
          </div>
          <ul className="divide-y divide-line">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <li key={row} className={`grid px-5 py-3.5 ${QUEUE_COLUMNS}`}>
                <PriorityBadgeSkeleton />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Bone className="h-5 w-32" />
                    <Bone className="h-6 w-28 rounded-full" />
                  </div>
                  <Bone className="mt-2 h-4 w-4/5" />
                </div>
                <div className={QUEUE_DETAILS}>
                  <div className="w-56 min-w-0">
                    <Bone className="mt-1 h-4 w-32" />
                    <Bone className="mt-1.5 h-7 w-28 rounded-full" />
                  </div>
                  <div className="w-36">
                    <Bone className="mt-1 h-4 w-20" />
                    <Bone className="mt-2 h-3.5 w-28" />
                  </div>
                  <div>
                    <Bone className="h-7 w-24 rounded-full" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </SkeletonBody>
    </>
  );
}

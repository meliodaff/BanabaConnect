import { PageHeader } from "@/components/PageHeader";
import {
  Bone,
  PriorityBadgeSkeleton,
  SkeletonBody,
  TabsSkeleton,
} from "@/components/Skeleton";
import { QUEUE_COLUMNS } from "@/lib/queueLayout";

/** The Reports list while it loads: its filters, column headers and rows, in the real layout. */
export default function ReportsLoading() {
  return (
    <>
      <PageHeader title="Reports" description="Incident reports from residents of Barangay Banaba.">
        <TabsSkeleton widths={["w-20", "w-24", "w-20", "w-14"]} />
      </PageHeader>

      <SkeletonBody label="reports" className="px-8 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Bone className="h-4 w-full max-w-xl" />
          <Bone className="h-6 w-44 rounded-full" />
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className={`hidden gap-4 border-b border-line bg-page px-5 py-3.5 lg:grid ${QUEUE_COLUMNS}`}>
            {["w-16", "w-14", "w-16", "w-14", "w-16", "w-12"].map((width, index) => (
              <Bone key={index} className={`h-3.5 ${width}`} />
            ))}
          </div>
          <ul>
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <li
                key={row}
                className={`grid grid-cols-1 gap-3 border-b border-line px-5 py-4 last:border-b-0 ${QUEUE_COLUMNS}`}
              >
                <PriorityBadgeSkeleton />
                <div className="min-w-0">
                  <Bone className="h-4 w-36" />
                  <Bone className="mt-2 h-3.5 w-11/12" />
                </div>
                <div className="min-w-0">
                  <Bone className="h-4 w-32" />
                  <Bone className="mt-2 h-3.5 w-24" />
                </div>
                <Bone className="h-4 w-20" />
                <Bone className="h-4 w-24" />
                <Bone className="h-7 w-24 rounded-full" />
              </li>
            ))}
          </ul>
        </div>
      </SkeletonBody>
    </>
  );
}

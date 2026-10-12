import { PageHeader } from "@/components/PageHeader";
import { Bone, SkeletonBody, TabsSkeleton } from "@/components/Skeleton";

/** The Map while its reports load: filters, legend, and the map area at its real size. */
export default function MapLoading() {
  return (
    <>
      <PageHeader title="Map" description="Loading reports…">
        <TabsSkeleton widths={["w-20", "w-24", "w-20", "w-14"]} />
      </PageHeader>

      <SkeletonBody label="the map" className="px-8 py-6">
        <div className="mb-3 flex flex-wrap gap-4">
          {["w-20", "w-14", "w-20", "w-14", "w-48", "w-72"].map((width, index) => (
            <Bone key={index} className={`h-4 ${width}`} />
          ))}
        </div>
        <div className="mb-4 flex justify-end">
          <Bone className="h-6 w-44 rounded-full" />
        </div>
        {/* Same height as the map (components/map/LiveMap.tsx). */}
        <div
          className="flex items-center justify-center rounded-lg border border-line bg-surface motion-safe:animate-pulse"
          style={{ height: "calc(100vh - 250px)" }}
        >
          <p className="text-[15px] font-semibold text-muted">Loading map…</p>
        </div>
      </SkeletonBody>
    </>
  );
}

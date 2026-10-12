import { PageHeader } from "@/components/PageHeader";
import { Bone, SkeletonBody, TabsSkeleton } from "@/components/Skeleton";

/** Residents while they load: filters and resident cards (ID photo, details, review buttons). */
export default function ResidentsLoading() {
  return (
    <>
      <PageHeader
        title="Residents"
        description="Check each Barangay ID against the resident's details. Verified residents' reports rank higher."
      >
        <TabsSkeleton widths={["w-40", "w-24", "w-32", "w-32"]} />
      </PageHeader>

      <SkeletonBody label="residents" className="px-8 py-6">
        <ul className="grid gap-5 2xl:grid-cols-2">
          {[0, 1].map((card) => (
            <li
              key={card}
              className="grid gap-5 rounded-lg border border-line bg-surface p-5 md:grid-cols-[260px_minmax(0,1fr)]"
            >
              <Bone className="aspect-[4/3] w-full rounded-lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Bone className="h-6 w-44" />
                  <Bone className="h-6 w-28 rounded-full" />
                </div>
                <div className="mt-4 space-y-2.5">
                  {["w-32", "w-28", "w-56"].map((width, row) => (
                    <div key={row} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                      <Bone className="h-4 w-16" />
                      <Bone className={`h-4 ${width}`} />
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex gap-2 border-t border-line pt-4">
                  <Bone className="h-11 w-32" />
                  <Bone className="h-11 w-28" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </SkeletonBody>
    </>
  );
}

import type { VerificationStatus } from "@banabaconnect/shared";
import type { Metadata } from "next";
import { VerificationBadge } from "@/components/Badges";
import { FilterTabs } from "@/components/FilterTabs";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ReviewForm } from "@/components/ReviewForm";
import { listResidents, type ResidentForReview } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { pageQuery, parsePage } from "@/lib/pagination";

export const metadata: Metadata = { title: "Residents" };

const FILTERS = {
  pending: { label: "Waiting for review", statuses: ["pending"] },
  verified: { label: "Verified", statuses: ["verified"] },
  rejected: { label: "Not approved", statuses: ["rejected"] },
  all: { label: "All residents", statuses: ["unverified", "pending", "verified", "rejected"] },
} as const satisfies Record<string, { label: string; statuses: readonly VerificationStatus[] }>;

type Filter = keyof typeof FILTERS;

function parseFilter(value: unknown): Filter {
  return typeof value === "string" && value in FILTERS ? (value as Filter) : "pending";
}

const EMPTY: Record<Filter, string> = {
  pending: "No Barangay IDs waiting for review",
  verified: "No verified residents yet",
  rejected: "No rejected IDs",
  all: "No registered residents yet",
};

const REVIEWED: Record<string, { tone: string; message: string }> = {
  approved: {
    tone: "border-success bg-success-soft text-success",
    message:
      "Barangay ID approved. The resident is now verified, and their open reports moved up the queue.",
  },
  rejected: {
    tone: "border-line bg-surface text-ink",
    message:
      "Barangay ID not approved. The resident sees your reason in the app and can send a new photo.",
  },
};

export default async function ResidentsPage({ searchParams }: PageProps<"/residents">) {
  const params = await searchParams;
  const filter = parseFilter(params.show);
  const reviewed = typeof params.reviewed === "string" ? REVIEWED[params.reviewed] : undefined;
  const { residents, total, page } = await listResidents(FILTERS[filter].statuses, parsePage(params.page));

  return (
    <>
      <PageHeader
        title="Residents"
        description="Check each Barangay ID against the resident's details. Verified residents' reports rank higher."
      >
        <FilterTabs
          label="Verification status"
          basePath="/residents"
          param="show"
          current={filter}
          tabs={(Object.keys(FILTERS) as Filter[]).map((key) => ({ key, label: FILTERS[key].label }))}
        />
      </PageHeader>

      {/* The page links land here, at the top of the list. */}
      <div id="residents-list" className="scroll-mt-4 px-8 py-6">
        {reviewed && (
          <p role="status" className={`mb-5 rounded-lg border px-4 py-3 text-[15px] font-semibold ${reviewed.tone}`}>
            {reviewed.message}
          </p>
        )}
        {residents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center">
            <p className="text-lg font-bold">{EMPTY[filter]}</p>
            <p className="mt-1 text-[15px] text-muted">
              Residents send their Barangay ID from the Profile tab in the app.
            </p>
          </div>
        ) : (
          <ul className="grid gap-5 2xl:grid-cols-2">
            {residents.map((resident) => (
              <ResidentCard key={resident.id} resident={resident} />
            ))}
          </ul>
        )}
        <Pagination
          page={page}
          total={total}
          noun="residents"
          hrefFor={(target) => `/residents?show=${filter}${pageQuery(target)}`}
          anchor="residents-list"
          className="mt-6"
        />
      </div>
    </>
  );
}

function ResidentCard({ resident }: { resident: ResidentForReview }) {
  return (
    <li className="grid gap-5 rounded-lg border border-line bg-surface p-5 md:grid-cols-[260px_minmax(0,1fr)]">
      <div>
        {resident.idPhotoUrl ? (
          <a href={resident.idPhotoUrl} target="_blank" rel="noreferrer" title="Open the full-size photo">
            {/* A signed, short-lived Supabase link. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resident.idPhotoUrl}
              alt={`Barangay ID sent by ${resident.name ?? "the resident"}`}
              className="aspect-[4/3] w-full rounded-lg bg-page object-contain"
            />
          </a>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-page px-4 text-center text-sm text-muted">
            No ID photo sent yet
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold">{resident.name ?? "No name"}</h2>
          <VerificationBadge status={resident.verification} />
        </div>
        <dl className="mt-3 grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[15px]">
          <dt className="text-muted">Mobile</dt>
          <dd className="font-semibold">{resident.phone ?? "Not given"}</dd>
          <dt className="text-muted">Sitio / purok</dt>
          <dd className="font-semibold">{resident.area ?? "Not given"}</dd>
          <dt className="text-muted">Address</dt>
          <dd className="font-semibold">{resident.address ?? "Not given"}</dd>
          {resident.verifiedAt && (
            <>
              <dt className="text-muted">Verified</dt>
              <dd className="font-semibold">{formatDateTime(resident.verifiedAt)}</dd>
            </>
          )}
        </dl>
        {resident.verification === "rejected" && resident.note && (
          <p className="mt-3 rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink">
            Reason given: {resident.note}
          </p>
        )}

        {resident.verification === "pending" && (
          <div className="mt-4 border-t border-line pt-4">
            <ReviewForm profileId={resident.id} hasIdPhoto={resident.idPhotoUrl !== null} />
          </div>
        )}
      </div>
    </li>
  );
}

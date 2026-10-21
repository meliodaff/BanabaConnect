import type { VerificationStatus } from "@banabaconnect/shared";
import type { Metadata } from "next";
import { VerificationBadge } from "@/components/Badges";
import { FilterTabs } from "@/components/FilterTabs";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ReviewForm } from "@/components/ReviewForm";
import { listResidents, type ResidentForReview } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n-server";
import { parsePage } from "@/lib/pagination";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).residents.title };
}

/** The filters' statuses; their names are in the dictionary (residents.filters). */
const FILTERS = {
  pending: ["pending"],
  verified: ["verified"],
  rejected: ["rejected"],
  all: ["unverified", "pending", "verified", "rejected"],
} as const satisfies Record<string, readonly VerificationStatus[]>;

type Filter = keyof typeof FILTERS;

function parseFilter(value: unknown): Filter {
  return typeof value === "string" && value in FILTERS ? (value as Filter) : "pending";
}

const REVIEWED_TONE = {
  approved: "border-success bg-success-soft text-success",
  rejected: "border-line bg-surface text-ink",
} as const;

export default async function ResidentsPage({ searchParams }: PageProps<"/residents">) {
  const params = await searchParams;
  const filter = parseFilter(params.show);
  const reviewed = params.reviewed === "approved" || params.reviewed === "rejected" ? params.reviewed : null;
  const [{ residents, total, page }, t] = await Promise.all([
    listResidents(FILTERS[filter], parsePage(params.page)),
    getDictionary(),
  ]);

  return (
    <>
      <PageHeader title={t.residents.title} description={t.residents.description}>
        <FilterTabs
          label={t.residents.filtersLabel}
          basePath="/residents"
          param="show"
          current={filter}
          tabs={(Object.keys(FILTERS) as Filter[]).map((key) => ({ key, label: t.residents.filters[key] }))}
        />
      </PageHeader>

      {/* The page links land here, at the top of the list. */}
      <div id="residents-list" data-tour="residents-list" className="scroll-mt-4 px-8 py-6">
        {reviewed && (
          <p
            role="status"
            className={`mb-5 rounded-lg border px-4 py-3 text-[15px] font-semibold ${REVIEWED_TONE[reviewed]}`}
          >
            {t.residents[reviewed]}
          </p>
        )}
        {residents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center">
            <p className="text-lg font-bold">{t.residents.empty[filter]}</p>
            <p className="mt-1 text-[15px] text-muted">{t.residents.emptyHint}</p>
          </div>
        ) : (
          <ul className="grid gap-5 2xl:grid-cols-2">
            {residents.map((resident, index) => (
              <ResidentCard key={resident.id} resident={resident} t={t} first={index === 0} />
            ))}
          </ul>
        )}
        <Pagination
          page={page}
          total={total}
          list="residents"
          baseHref={`/residents?show=${filter}`}
          anchor="residents-list"
          className="mt-6"
        />
      </div>
    </>
  );
}

/** `first` marks the card the dashboard tutorial points at. */
function ResidentCard({ resident, t, first }: { resident: ResidentForReview; t: Dictionary; first: boolean }) {
  return (
    <li
      data-tour={first ? "resident-first" : undefined}
      className="grid gap-5 rounded-lg border border-line bg-surface p-5 md:grid-cols-[260px_minmax(0,1fr)]"
    >
      <div>
        {resident.idPhotoUrl ? (
          <a href={resident.idPhotoUrl} target="_blank" rel="noreferrer" title={t.residents.openPhoto}>
            {/* A signed, short-lived Supabase link. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resident.idPhotoUrl}
              alt={t.residents.idAlt(resident.name)}
              className="aspect-[4/3] w-full rounded-lg bg-page object-contain"
            />
          </a>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-page px-4 text-center text-sm text-muted">
            {t.residents.noPhoto}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold">{resident.name ?? t.common.noName}</h2>
          <VerificationBadge status={resident.verification} />
        </div>
        <dl className="mt-3 grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[15px]">
          <dt className="text-muted">{t.report.mobile}</dt>
          <dd className="font-semibold">{resident.phone ?? t.common.notGiven}</dd>
          <dt className="text-muted">{t.report.area}</dt>
          <dd className="font-semibold">{resident.area ?? t.common.notGiven}</dd>
          <dt className="text-muted">{t.report.address}</dt>
          <dd className="font-semibold">{resident.address ?? t.common.notGiven}</dd>
          {resident.verifiedAt && (
            <>
              <dt className="text-muted">{t.residents.verifiedOn}</dt>
              <dd className="font-semibold">{formatDateTime(resident.verifiedAt)}</dd>
            </>
          )}
        </dl>
        {resident.verification === "rejected" && resident.note && (
          <p className="mt-3 rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink">
            {t.residents.reason(resident.note)}
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

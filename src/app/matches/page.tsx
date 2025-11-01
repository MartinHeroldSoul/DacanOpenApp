// src/app/matches/page.tsx
import Link from "next/link";
import SeasonSelect from "./season-select";
import { query } from "@/lib/db";

// DŮLEŽITÉ: ať je stránka vždy dynamická a nerevaliduje se ze statiky
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

type Search = { season?: string; day?: string };

// Pomocná komponenta pro přepínač dnů (jen odkazy, žádný JS stav)
function DayTabs({ seasonId, day }: { seasonId: number; day: number }) {
  const base = `/matches?season=${seasonId}`;
  return (
    <div className="inline-flex overflow-hidden rounded-md border">
      {[1, 2].map((d) => {
        const active = d === day;
        return (
          <Link
            key={d}
            href={`${base}&day=${d}`}
            prefetch={false}
            className={[
              "px-4 py-2 text-sm",
              active
                ? "bg-green-600 text-white"
                : "bg-white hover:bg-gray-50 text-gray-700",
              d === 1 ? "border-r" : "",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            Day {d}
          </Link>
        );
      })}
    </div>
  );
}

// Helpery pro bezpečný parse
function toInt(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function clampDay(v: string | undefined, fallback: 1 | 2): 1 | 2 {
  const n = Number(v);
  return n === 2 ? 2 : 1;
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams?: Search;
}) {
  // 1) sezóny
  const seasons = await query<{ id: number; year: number; name: string }>(
    `select id, year, name from seasons order by year desc`
  );
  if (!seasons.length) {
    return <div className="p-6">No seasons found.</div>;
  }
  const defaultSeasonId = seasons[0].id;

  // 2) načti seasonId + day ze searchParams
  const seasonId = toInt(searchParams?.season, defaultSeasonId);
  const day = clampDay(searchParams?.day, 1);

  // 3) zápasy
  const matches = await query<{
    id: number;
    legacy_id: string | null;
    course_name: string | null;
    status: string;
  }>(
    `
    select m.id, m.legacy_id, c.name as course_name, m.status
    from matches m
    join round_schedule rs on rs.id = m.round_id
    left join courses c on c.id = m.course_id
    where m.season_id = $1 and rs.day_number = $2
    order by m.id
    `,
    [seasonId, day]
  );

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between gap-4">
        <SeasonSelect seasons={seasons} value={seasonId} day={day} />
        <DayTabs seasonId={seasonId} day={day} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Match
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Course
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {matches.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">#{m.id}</td>
                <td className="px-4 py-3">{m.course_name ?? "TBD"}</td>
                <td className="px-4 py-3">{m.status}</td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={`/match/${m.id}`}
                    className="rounded bg-black px-3 py-1 text-sm text-white"
                  >
                    Open
                  </a>
                </td>
              </tr>
            ))}
            {!matches.length && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                  Žádné zápasy pro vybraný den/sezonu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
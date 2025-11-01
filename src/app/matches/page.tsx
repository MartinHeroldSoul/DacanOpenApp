// src/app/matches/page.tsx
import SeasonSelect from "./season-select";
import DayTabs from "./day-tabs";
import { query } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// jistota, že Next nic neuloží do cache
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

type Search = { season?: string; day?: string };

export default async function MatchesPage({ searchParams }: { searchParams?: Search }) {
  noStore(); // runtime no-cache

  // 1) Sezóny
  const seasons = await query<{ id: number; year: number; name: string }>(
    `select id, year, name
     from seasons
     order by year desc`
  );
  if (!seasons.length) {
    return <div className="p-6">No seasons found.</div>;
  }
  const defaultSeasonId = seasons[0].id;

  // 2) Parametry
  const seasonId = Number.isFinite(Number(searchParams?.season))
    ? Number(searchParams?.season)
    : defaultSeasonId;

  const dayStr: "1" | "2" = searchParams?.day === "2" ? "2" : "1";
  const dayNum: 1 | 2 = dayStr === "2" ? 2 : 1;

  // 3) Zápasy
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
    [seasonId, dayNum]
  );

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      {/* DEBUG badge – hned vidíš, co server skutečně načetl */}
      <div className="text-xs text-gray-500">
        DEBUG: seasonId=<b>{seasonId}</b>, day=<b>{dayNum}</b>
      </div>

      <div className="flex items-center justify-between gap-4">
        <SeasonSelect seasons={seasons} value={seasonId} day={dayNum} />
        <DayTabs seasonId={seasonId} day={dayNum} />
      </div>

      <div className="mt-2 overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">MATCH</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">COURSE</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">STATUS</th>
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
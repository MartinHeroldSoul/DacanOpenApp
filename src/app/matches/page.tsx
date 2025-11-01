// src/app/matches/page.tsx
import SeasonSelect from "./season-select";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type Search = { season?: string; day?: string };

export default async function MatchesPage({
  searchParams,
}: { searchParams?: Search }) {
  // 1) načti seznam sezon (ať víme default)
  const seasons = await query<{ id: number; year: number; name: string }>(
    `select id, year, name from seasons order by year desc`
  );
  if (!seasons.length) {
    return <div className="p-6">No seasons found.</div>;
  }

  const defaultSeasonId = seasons[0].id;

  // 2) bezpečně přečti seasonId
  let seasonId = Number.parseInt(searchParams?.season ?? "", 10);
  if (!Number.isFinite(seasonId)) seasonId = defaultSeasonId;

  // 3) bezpečně přečti day (jen 1 nebo 2)
  let day = Number.parseInt(searchParams?.day ?? "", 10);
  if (day !== 1 && day !== 2) day = 1;

  // 4) načti zápasy pro (seasonId, day)
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
        <div className="flex gap-2">
          <a
            href={`/matches?season=${seasonId}&day=1`}
            className={`rounded px-3 py-1 text-sm ${day === 1 ? "bg-black text-white" : "bg-gray-100"}`}
          >
            Day 1
          </a>
          <a
            href={`/matches?season=${seasonId}&day=2`}
            className={`rounded px-3 py-1 text-sm ${day === 2 ? "bg-black text-white" : "bg-gray-100"}`}
          >
            Day 2
          </a>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Match</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Course</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
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
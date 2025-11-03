// src/app/matches/[day]/page.tsx
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import SeasonSelect from "../season-select";
import DayTabs from "../DayTabs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { day: string };
type Search = { season?: string };

export default async function MatchesByDayPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: Search;
}) {
  // 1) Ověř a normalizuj 'day' ze segmentu
  const rawDay = Number.parseInt(params.day, 10);
  const day = rawDay === 1 || rawDay === 2 ? rawDay : 1;

  if (rawDay !== day) {
    // pokud přijde /matches/foo → přesměruj na /matches/1 (zachovej season, pokud je)
    const seasonQS = searchParams?.season ? `?season=${searchParams.season}` : "";
    redirect(`/matches/${day}${seasonQS}`);
  }

  // 2) Načti sezóny a určete default
  const seasons = await query<{ id: number; year: number; name: string }>(
    `select id, year, name from seasons order by year desc`
  );
  if (!seasons.length) {
    return <div className="p-6">No seasons found.</div>;
  }
  const defaultSeasonId = seasons[0].id;

  // 3) Ověř a normalizuj 'season' z query
  let seasonId = Number.parseInt(searchParams?.season ?? "", 10);
  if (!Number.isFinite(seasonId)) {
    // Není-li validní, přesměruj na stejnou cestu s default season
    redirect(`/matches/${day}?season=${defaultSeasonId}`);
  }

  // 4) Data zápasů pro (seasonId, day)
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
    <div className="mx-auto max-w-5xl p-6">
      <p className="mb-2 text-xs text-gray-400">
        DEBUG: seasonId={seasonId}, day={day}
      </p>

      <div className="flex items-center justify-between gap-4">
        <SeasonSelect seasons={seasons} value={seasonId} day={day} />
        <DayTabs seasonId={seasonId} day={day} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Match
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Course
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Status
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {matches.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">#{m.id}</td>
                <td className="px-4 py-3 text-gray-800">{m.course_name ?? "TBD"}</td>
                <td className="px-4 py-3 text-gray-800">{m.status}</td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={`/match/${m.id}`}
                    className="rounded-md bg-black px-3 py-1 text-sm font-medium text-white hover:bg-gray-900"
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
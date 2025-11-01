// src/app/matches/page.tsx
import Link from "next/link";
import SeasonSelect from "./season-select";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type Search = { season?: string; day?: string };

// Pomocná komponenta pro přepínač dnů (server-safe přes <Link>)
function DayTabs({ seasonId, day }: { seasonId: number; day: number }) {
  const base = `/matches?season=${seasonId}`;
  return (
    <div className="inline-flex overflow-hidden rounded-md border">
      {[1, 2].map((d) => (
        <Link
          key={d}
          href={`${base}&day=${d}`}
          prefetch={false}
          className={[
            "px-4 py-2 text-sm",
            d === day
              ? "bg-green-600 text-white"
              : "bg-white hover:bg-gray-50 text-gray-700",
            d === 1 ? "border-r" : ""
          ].join(" ")}
          aria-current={d === day ? "page" : undefined}
        >
          Day {d}
        </Link>
      ))}
    </div>
  );
}

export default async function MatchesPage({
  searchParams,
}: { searchParams?: Search }) {
  // 1) Sezóny (pro default)
  const seasons = await query<{ id: number; year: number; name: string }>(
    `select id, year, name from seasons order by year desc`
  );
  if (!seasons.length) {
    return <div className="p-6">No seasons found.</div>;
  }
  const defaultSeasonId = seasons[0].id;

  // 2) bezpečné parsování parametrů
  let seasonId = Number.parseInt(searchParams?.season ?? "", 10);
  if (!Number.isFinite(seasonId)) seasonId = defaultSeasonId;

  let day = Number.parseInt(searchParams?.day ?? "", 10);
  if (day !== 1 && day !== 2) day = 1;

  // 3) Zápasy pro (seasonId, day)
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
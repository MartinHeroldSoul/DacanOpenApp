// src/app/matches/page.tsx
import Link from "next/link";
import SeasonSelect from "./season-select";
import { query } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Search = { season?: string; day?: string };

// Pomocná komponenta: záložky pro Day 1 / Day 2
function DayTabs({ seasonId, activeDay }: { seasonId: number; activeDay: "1" | "2" }) {
  const btn = (d: "1" | "2") => (
    <Link
      key={d}
      href={{ pathname: "/matches", query: { season: seasonId, day: d } }}
      prefetch={false}
      className={[
        "px-4 py-2 text-sm",
        d === activeDay ? "bg-green-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700",
        d === "1" ? "border-r" : ""
      ].join(" ")}
      aria-current={d === activeDay ? "page" : undefined}
    >
      Day {d}
    </Link>
  );

  return (
    <div className="inline-flex overflow-hidden rounded-md border">
      {btn("1")}
      {btn("2")}
    </div>
  );
}

export default async function MatchesPage({ searchParams }: { searchParams?: Search }) {
  noStore(); // úplně vypne cache pro tuhle page

  // 1) Sezóny (kvůli defaultu)
  const seasons = await query<{ id: number; year: number; name: string }>(
    `select id, year, name from seasons order by year desc`
  );
  if (!seasons.length) {
    return <div className="p-6">No seasons found.</div>;
  }
  const defaultSeasonId = seasons[0].id;

  // 2) Bezpečné čtení searchParams
  const seasonId = Number.isFinite(Number(searchParams?.season))
    ? Number(searchParams?.season)
    : defaultSeasonId;

  // aktivní den jako string (jen "1" nebo "2") – pro UI
  const dayStr: "1" | "2" = (searchParams?.day === "2" ? "2" : "1");

  // numerický day pro SQL (1/2)
  const dayNum = dayStr === "2" ? 2 : 1;

  // 3) Zápasy pro vybranou sezonu/den
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
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between gap-4">
        {/* Season selector udržuje ?season=... a nemění ?day */}
        <SeasonSelect seasons={seasons} value={seasonId} day={Number(dayStr)} />

        {/* Přepínač dnů – barva se teď přepíná podle dayStr a URL se přegeneruje správně */}
        <DayTabs seasonId={seasonId} activeDay={dayStr} />
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
                  <Link
                    href={`/match/${m.id}`}
                    className="rounded bg-black px-3 py-1 text-sm text-white"
                    prefetch={false}
                  >
                    Open
                  </Link>
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
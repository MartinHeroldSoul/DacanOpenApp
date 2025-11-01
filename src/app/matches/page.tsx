// src/app/matches/page.tsx
import Link from "next/link";
import { query } from "@/lib/db";
import SeasonSelect from "./season-select";

export const dynamic = "force-dynamic";

type Search = { season?: string; day?: string };

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  // 1) Sezóny
  const seasons = await query<{ id: number; year: number; name: string }>(
    `select id, year, name from seasons order by year desc`
  );

  const latest = seasons[0];
  const seasonId = Number(searchParams.season ?? latest?.id);
  const day = Number(searchParams.day ?? 1);

  // 2) Zápasy pro vybraný den
  const matches = await query<{
    id: number;
    course_name: string | null;
    red_name: string | null;
    blue_name: string | null;
    result_text: string | null;
  }>(
    `
    with t_red as (
      select m.id, 'Red Team'::text as red_name
      from matches m where m.season_id = $1
    ),
    t_blue as (
      select m.id, 'Blue Team'::text as blue_name
      from matches m where m.season_id = $1
    ),
    course as (
      select m.id, c.name as course_name
      from matches m
      left join courses c on c.id = m.course_id
      where m.season_id = $1
    ),
    res as (
      select m.id,
             case mr.winner_side
               when 'red'  then 'RED won '  || coalesce(mr.margin::text,'')
               when 'blue' then 'BLUE won ' || coalesce(mr.margin::text,'')
               when 'as'   then 'AS'
               else null
             end as result_text
      from matches m
      left join match_results mr on mr.match_id = m.id
      where m.season_id = $1 and m.round_id = (
        select id from round_schedule where season_id = $1 and day_number = $2
      )
    )
    select c.id, course.course_name, t_red.red_name, t_blue.blue_name, res.result_text
    from matches c
      left join course on course.id = c.id
      left join t_red on t_red.id = c.id
      left join t_blue on t_blue.id = c.id
      left join res on res.id = c.id
    where c.season_id = $1
      and c.round_id = (select id from round_schedule where season_id = $1 and day_number = $2)
    order by c.id
  `,
    [seasonId, day]
  );

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Matches</h1>

      {/* CLIENT component jen na změnu roku */}
      <SeasonSelect
        seasons={seasons}
        value={seasonId}
        day={day}
      />

      {/* Day přepínač čistě odkazy */}
      <div className="flex gap-2">
        <Link
          href={`/matches?season=${seasonId}&day=1`}
          className={`rounded px-3 py-1 text-sm border ${
            day === 1 ? "bg-black text-white" : "bg-white"
          }`}
        >
          Day 1
        </Link>
        <Link
          href={`/matches?season=${seasonId}&day=2`}
          className={`rounded px-3 py-1 text-sm border ${
            day === 2 ? "bg-black text-white" : "bg-white"
          }`}
        >
          Day 2
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border">
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
                Result
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {matches.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {m.red_name ?? "Red"} vs {m.blue_name ?? "Blue"}
                  </div>
                </td>
                <td className="px-4 py-3">{m.course_name ?? "—"}</td>
                <td className="px-4 py-3">{m.result_text ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/match/${m.id}`}
                    className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}

            {!matches.length && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                  Žádné zápasy pro vybraný den.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
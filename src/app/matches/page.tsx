// src/app/matches/page.tsx
import Link from 'next/link';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SeasonRow = { id: number; year: number; name: string | null };

async function getSeasons(): Promise<SeasonRow[]> {
  return query<SeasonRow>(`select id, year, name from seasons order by year desc`);
}

async function getDefaultYear(): Promise<number> {
  const rows = await query<{ year: number }>(`select max(year) as year from seasons`);
  return Number(rows[0]?.year ?? new Date().getFullYear());
}

async function getMatches(year: number, day: number) {
  // Zápasy pro daný rok a den; vytáhneme názvy obou týmů, název hřiště a rychlý summary výsledku
  return query<{
    id: number;
    legacy_id: string | null;
    course_name: string | null;
    red_team: string | null;
    blue_team: string | null;
    winner_side: 'red' | 'blue' | 'as' | null;
    margin: number | null;
  }>(
    `
    with rs as (
      select m.id as match_id, m.season_id, m.course_id, m.round_id
      from matches m
      join seasons s on s.id = m.season_id
      join round_schedule sch on sch.id = m.round_id
      where s.year = $1 and sch.day_number = $2
    ),
    red_side as (
      select mp.match_id, max(ps.team_id) as team_id
      from match_participants mp
      join matches m on m.id = mp.match_id
      left join player_season ps on ps.player_id = mp.player_id and ps.season_id = m.season_id
      where mp.side='red'
      group by mp.match_id
    ),
    blue_side as (
      select mp.match_id, max(ps.team_id) as team_id
      from match_participants mp
      join matches m on m.id = mp.match_id
      left join player_season ps on ps.player_id = mp.player_id and ps.season_id = m.season_id
      where mp.side='blue'
      group by mp.match_id
    )
    select
      r.match_id as id,
      m.legacy_id,
      c.name as course_name,
      tr.name as red_team,
      tb.name as blue_team,
      mr.winner_side,
      mr.margin
    from rs r
    join matches m on m.id = r.match_id
    left join courses c on c.id = r.course_id
    left join red_side  rr on rr.match_id = r.match_id
    left join blue_side bb on bb.match_id = r.match_id
    left join teams tr on tr.id = rr.team_id
    left join teams tb on tb.id = bb.team_id
    left join match_results mr on mr.match_id = r.match_id
    order by r.match_id asc
    `,
    [year, day]
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: 'red' | 'blue' | 'gray' }) {
  const colors =
    color === 'red'
      ? 'bg-red-50 text-red-700 ring-red-200'
      : color === 'blue'
      ? 'bg-blue-50 text-blue-700 ring-blue-200'
      : 'bg-gray-50 text-gray-600 ring-gray-200';
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${colors}`}>{children}</span>;
}

export default async function MatchesPage({ searchParams }: { searchParams: { year?: string; day?: string } }) {
  const seasons = await getSeasons();
  const defaultYear = await getDefaultYear();

  const year = Number(searchParams.year ?? defaultYear);
  const day = Number(searchParams.day ?? 1);

  const matches = await getMatches(year, day);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Matches</h1>
      <p className="mt-1 text-sm text-gray-500">Vyber rok a den – uvidíš všechny zápasy a rychlé výsledky.</p>

      {/* Year selector + Day toggle */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Season:</label>
          <select
            name="year"
            defaultValue={year}
            onChange={(e) => {
              const u = new URL(window.location.href);
              u.searchParams.set('year', e.target.value);
              // zachovej zvolený den
              u.searchParams.set('day', String(day));
              window.location.href = u.toString();
            }}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.year}>
                {s.name ?? s.year}
              </option>
            ))}
          </select>
        </form>

        <div className="inline-flex overflow-hidden rounded-lg border">
          <Link
            href={{ pathname: '/matches', query: { year, day: 1 } }}
            className={`px-4 py-2 text-sm ${day === 1 ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            Day 1
          </Link>
          <Link
            href={{ pathname: '/matches', query: { year, day: 2 } }}
            className={`px-4 py-2 text-sm border-l ${day === 2 ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            Day 2
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {matches.map((m) => {
          const result =
            m.winner_side === 'red'
              ? <Badge color="red">RED won {m.margin ?? ''}{m.margin ? ' UP' : ''}</Badge>
              : m.winner_side === 'blue'
              ? <Badge color="blue">BLUE won {m.margin ?? ''}{m.margin ? ' UP' : ''}</Badge>
              : m.winner_side === 'as'
              ? <Badge color="gray">All Square</Badge>
              : <Badge color="gray">No result</Badge>;
          return (
            <Link
              key={m.id}
              href={`/match/${m.id}`}
              className="group rounded-lg border bg-white p-4 hover:shadow"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm text-gray-500">{m.course_name ?? '—'}</div>
                  <div className="mt-0.5 text-base font-semibold">
                    {m.red_team ?? 'Red'} <span className="text-gray-400">vs</span> {m.blue_team ?? 'Blue'}
                  </div>
                </div>
                <div>{result}</div>
              </div>
              {m.legacy_id && <div className="mt-2 text-xs text-gray-400">Match: {m.legacy_id}</div>}
            </Link>
          );
        })}

        {!matches.length && (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-gray-500">
            Pro zvolený rok/den nejsou žádné zápasy.
          </div>
        )}
      </div>
    </div>
  );
}
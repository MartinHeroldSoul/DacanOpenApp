// src/app/match/[id]/page.tsx
import { query } from '@/lib/db';
import Link from 'next/link';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getMatchHeader(matchId: number) {
  const rows = await query<{
    id: number;
    course_name: string | null;
    red_team: string | null;
    blue_team: string | null;
    winner_side: 'red' | 'blue' | 'as' | null;
    margin: number | null;
  }>(
    `
    with red_side as (
      select mp.match_id, max(ps.team_id) as team_id
      from match_participants mp
      join matches m on m.id = mp.match_id
      left join player_season ps on ps.player_id = mp.player_id and ps.season_id = m.season_id
      where mp.side='red' and mp.match_id=$1
      group by mp.match_id
    ),
    blue_side as (
      select mp.match_id, max(ps.team_id) as team_id
      from match_participants mp
      join matches m on m.id = mp.match_id
      left join player_season ps on ps.player_id = mp.player_id and ps.season_id = m.season_id
      where mp.side='blue' and mp.match_id=$1
      group by mp.match_id
    )
    select
      m.id,
      c.name as course_name,
      tr.name as red_team,
      tb.name as blue_team,
      mr.winner_side,
      mr.margin
    from matches m
    left join courses c on c.id = m.course_id
    left join red_side rr on rr.match_id = m.id
    left join blue_side bb on bb.match_id = m.id
    left join teams tr on tr.id = rr.team_id
    left join teams tb on tb.id = bb.team_id
    left join match_results mr on mr.match_id = m.id
    where m.id = $1
    `,
    [matchId]
  );
  return rows[0];
}

async function getHoleScores(matchId: number) {
  return query<{
    hole_number: number;
    par: number;
    red_score: number | null;
    blue_score: number | null;
    winner_side: 'red' | 'blue' | 'as' | null;
  }>(
    `
    select h.hole_number, h.par, s.red_score, s.blue_score, s.winner_side
    from scores s
    join holes h on h.id = s.hole_id
    where s.match_id = $1
    order by h.hole_number
    `,
    [matchId]
  );
}

export default async function MatchPage({ params }: { params: { id: string } }) {
  const matchId = Number(params.id);
  const head = await getMatchHeader(matchId);
  const holes = await getHoleScores(matchId);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 text-sm">
        <Link href="/matches" className="text-gray-600 hover:text-gray-900">&larr; Back to Matches</Link>
      </div>

      <h1 className="text-2xl font-semibold">
        {head?.red_team ?? 'Red'} <span className="text-gray-400">vs</span> {head?.blue_team ?? 'Blue'}
      </h1>
      <p className="mt-1 text-sm text-gray-500">{head?.course_name ?? '—'}</p>

      {head && (
        <div className="mt-3 text-sm">
          {head.winner_side === 'red' && <span className="rounded bg-red-50 px-2 py-1 font-medium text-red-700 ring-1 ring-red-200">RED won {head.margin ?? ''}{head.margin ? ' UP' : ''}</span>}
          {head.winner_side === 'blue' && <span className="rounded bg-blue-50 px-2 py-1 font-medium text-blue-700 ring-1 ring-blue-200">BLUE won {head.margin ?? ''}{head.margin ? ' UP' : ''}</span>}
          {head.winner_side === 'as' && <span className="rounded bg-gray-50 px-2 py-1 font-medium text-gray-700 ring-1 ring-gray-200">All Square</span>}
          {!head.winner_side && <span className="rounded bg-gray-50 px-2 py-1 font-medium text-gray-600 ring-1 ring-gray-200">No result</span>}
        </div>
      )}

      {/* Hole-by-hole scoring */}
      <div className="mt-6 overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Par</th>
              <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Red</th>
              <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Blue</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Winner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {holes.map((h) => (
              <tr key={h.hole_number}>
                <td className="px-3 py-2 text-sm text-gray-700">{h.hole_number}</td>
                <td className="px-3 py-2 text-sm text-gray-700">{h.par}</td>
                <td className="px-3 py-2 text-sm text-gray-900 text-center">{h.red_score ?? '—'}</td>
                <td className="px-3 py-2 text-sm text-gray-900 text-center">{h.blue_score ?? '—'}</td>
                <td className="px-3 py-2 text-sm">
                  {h.winner_side === 'red' && <span className="rounded bg-red-50 px-2 py-1 text-red-700 ring-1 ring-red-200">RED</span>}
                  {h.winner_side === 'blue' && <span className="rounded bg-blue-50 px-2 py-1 text-blue-700 ring-1 ring-blue-200">BLUE</span>}
                  {h.winner_side === 'as' && <span className="rounded bg-gray-50 px-2 py-1 text-gray-700 ring-1 ring-gray-200">AS</span>}
                  {!h.winner_side && <span className="rounded bg-gray-50 px-2 py-1 text-gray-600 ring-1 ring-gray-200">—</span>}
                </td>
              </tr>
            ))}
            {!holes.length && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">Žádná skóre nejsou zaznamenána.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
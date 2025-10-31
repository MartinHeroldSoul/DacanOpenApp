import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getSeason() {
  const seasons = await query<{ id: number; year: number; name: string }>(
    `select id, year, name from seasons order by year desc limit 1`
  );
  if (!seasons.length) throw new Error('No seasons found');
  return seasons[0];
}

async function getLeaderboard(seasonId: number) {
  return await query<{
    season_id: number;
    team_id: number;
    team_code: string;
    team_name: string;
    team_points: string;
  }>(
    `select season_id, team_id, team_code, team_name, team_points
     from v_leaderboard_by_team
     where season_id = $1
     order by team_points::numeric desc`,
    [seasonId]
  );
}

async function getMatchesCount(seasonId: number) {
  const rows = await query<{ cnt: string }>(
    `select count(*) as cnt from matches where season_id = $1`,
    [seasonId]
  );
  return Number(rows[0]?.cnt ?? 0);
}

export default async function LeaderboardPage() {
  const season = await getSeason();
  const table = await getLeaderboard(season.id);
  const matchesCount = await getMatchesCount(season.id);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Leaderboard – {season.name ?? season.year}</h1>
      <p className="mt-1 text-sm text-gray-500">Sečteno z výsledků zápasů v této sezóně. Celkem zápasů: {matchesCount}</p>

      <div className="mt-6 overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tým</th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Body</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {table.map((row) => (
              <tr key={row.team_id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{row.team_name}</div>
                  <div className="text-xs text-gray-500 uppercase">{row.team_code}</div>
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {Number(row.team_points).toFixed(1)}
                </td>
              </tr>
            ))}
            {!table.length && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={2}>
                  Zatím žádné body.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        * Tohle zobrazení používá view <code>v_leaderboard_by_team</code>. Pokud body neodpovídají, ověř přepočet
        (<code>match_results</code>) a přiřazení hráčů k týmům v tabulce <code>player_season</code>.
      </p>
    </div>
  );
}
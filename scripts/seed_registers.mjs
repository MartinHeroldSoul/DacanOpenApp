import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function upsert(table, cols, vals, conflictCol = cols[0]) {
  const columns = cols.join(", ");
  const placeholders = vals.map((_, i) => `$${i+1}`).join(", ");
  const sql = `insert into ${table} (${columns}) values (${placeholders})
               on conflict (${conflictCol}) do nothing;`;
  await client.query(sql, vals);
}

async function main() {
  await client.connect();

  // game_modes
  await upsert("game_modes", ["code","name","min_players_per_side","max_players_per_side"], ["individual","Singles",1,1], "code");
  await upsert("game_modes", ["code","name","min_players_per_side","max_players_per_side"], ["team","Texas Scramble",2,2], "code");
  await upsert("game_modes", ["code","name","min_players_per_side","max_players_per_side"], ["group","Group Play",2,4], "code");

  // scoring_modes
  await upsert("scoring_modes", ["code","name","per_hole_result","rules_json"], ["match_play","Match Play",1, JSON.stringify({})], "code");
  await upsert("scoring_modes", ["code","name","per_hole_result","rules_json"], ["stroke_play","Stroke Play",0, JSON.stringify({})], "code");
  await upsert("scoring_modes", ["code","name","per_hole_result","rules_json"], ["stableford","Stableford",0, JSON.stringify({ points:[0,1,2,3,4,5] })], "code");

  // hcp_policies
  await upsert("hcp_policies", ["code","name","rules_json"], ["gross","Bez HCP", JSON.stringify({})], "code");
  await upsert("hcp_policies", ["code","name","rules_json"], ["net_dacan","Dacan Net", JSON.stringify({ cap:36 })], "code");
  await upsert("hcp_policies", ["code","name","rules_json"], ["texas_share_3_8","Texas 3/8", JSON.stringify({ share:0.375, cap:36 })], "code");

  // season 2025
  await upsert("seasons", ["year","name"], [2025, "Dacan Open 2025"], "year");

  // načtení ID
  const { rows: gm } = await client.query(`select id, code from game_modes`);
  const { rows: sm } = await client.query(`select id, code from scoring_modes`);
  const { rows: hp } = await client.query(`select id, code from hcp_policies`);
  const { rows: ss } = await client.query(`select id from seasons where year=2025 limit 1`);

  const idOf = (arr, code) => arr.find(x => x.code === code)?.id;
  const seasonId = ss[0].id;

  const teamId = idOf(gm, "team");
  const individualId = idOf(gm, "individual");
  const matchPlayId = idOf(sm, "match_play");
  const texasHcpId = idOf(hp, "texas_share_3_8");
  const netDacanId = idOf(hp, "net_dacan");

  // round_schedule (den 1 a 2) – defaulty
  await client.query(
    `insert into round_schedule (season_id, day_number, default_game_mode_id, default_scoring_mode_id, default_hcp_policy_id)
     values ($1, 1, $2, $3, $4)
     on conflict (season_id, day_number) do nothing`,
    [seasonId, teamId, matchPlayId, texasHcpId]
  );

  await client.query(
    `insert into round_schedule (season_id, day_number, default_game_mode_id, default_scoring_mode_id, default_hcp_policy_id)
     values ($1, 2, $2, $3, $4)
     on conflict (season_id, day_number) do nothing`,
    [seasonId, individualId, matchPlayId, netDacanId]
  );

  await client.end();
  console.log("✅ Seed rejstříků + defaulty pro 2025 hotovo.");
}

main().catch(e => { console.error(e); process.exit(1); });
import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({ connectionString: process.env.DATABASE_URL });

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function q(sql, params = []) {
  const res = await client.query(sql, params);
  return res;
}

async function idOrInsert(sqlSelect, sqlInsert, paramsSelect = [], paramsInsert = []) {
  const s = await q(sqlSelect, paramsSelect);
  if (s.rows.length) return s.rows[0].id;
  const i = await q(sqlInsert, paramsInsert);
  return i.rows[0].id;
}

async function getIdsMap(table, keyCol = 'code') {
  const { rows } = await q(`select id, ${keyCol} as key from ${table}`);
  const map = {};
  rows.forEach(r => map[r.key] = r.id);
  return map;
}

async function ensureBaseRegisters() {
  // game_modes
  await q(`insert into game_modes (code, name, min_players_per_side, max_players_per_side)
           values
           ('individual','Singles',1,1),
           ('team','Texas Scramble',2,2)
           on conflict (code) do nothing`);

  // scoring_modes
  await q(`insert into scoring_modes (code, name, per_hole_result, rules_json)
           values
           ('match_play','Match Play',1,'{}'::jsonb),
           ('stroke_play','Stroke Play',0,'{}'::jsonb),
           ('stableford','Stableford',0,'{"points":[0,1,2,3,4,5]}'::jsonb)
           on conflict (code) do nothing`);

  // hcp_policies
  await q(`insert into hcp_policies (code, name, rules_json)
           values
           ('gross','Bez HCP','{}'::jsonb),
           ('net_dacan','Dacan Net','{"cap":36}'::jsonb),
           ('texas_share_3_8','Texas 3/8','{"share":0.375,"cap":36}'::jsonb)
           on conflict (code) do nothing`);
}

async function ensureSeasonTeamsSchedule() {
  const seasonId = await idOrInsert(
    `select id from seasons where year=$1`,
    `insert into seasons (year, name) values ($1,$2) returning id`,
    [2025],
    [2025, 'Dacan Open 2025']
  );

  // Teams (red/blue)
  await q(
    `insert into teams (season_id, code, name)
     values ($1,'red','Red Team')
     on conflict (season_id, code) do nothing`,
    [seasonId]
  );
  await q(
    `insert into teams (season_id, code, name)
     values ($1,'blue','Blue Team')
     on conflict (season_id, code) do nothing`,
    [seasonId]
  );

  // round_schedule den 1 a 2
  const gm = await getIdsMap('game_modes');
  const sm = await getIdsMap('scoring_modes');
  const hp = await getIdsMap('hcp_policies');

  await q(
    `insert into round_schedule (season_id, day_number, default_game_mode_id, default_scoring_mode_id, default_hcp_policy_id)
     values ($1,1,$2,$3,$4)
     on conflict (season_id, day_number) do nothing`,
    [seasonId, gm['team'], sm['match_play'], hp['texas_share_3_8']]
  );
  await q(
    `insert into round_schedule (season_id, day_number, default_game_mode_id, default_scoring_mode_id, default_hcp_policy_id)
     values ($1,2,$2,$3,$4)
     on conflict (season_id, day_number) do nothing`,
    [seasonId, gm['individual'], sm['match_play'], hp['net_dacan']]
  );

  return seasonId;
}

async function ensureCoursesAndHoles() {
  // Dvě hřiště (18 jamek každé)
  let c1Sel = await q(`select id from courses where legacy_id=$1`, ['USTI']);
  let c1;
  if (c1Sel.rows.length) {
    c1 = c1Sel.rows[0].id;
  } else {
    const c1Ins = await q(
      `insert into courses (legacy_id, name, city, rating, slope)
       values ($1,$2,$3,$4,$5) returning id`,
      ['USTI', 'Golf Resort Terasy Ústí', 'Ústí nad Labem', 72.0, 125]
    );
    c1 = c1Ins.rows[0].id;
  }
  let c2Sel = await q(`select id from courses where legacy_id=$1`, ['BARBORA']);
  let c2;
  if (c2Sel.rows.length) {
    c2 = c2Sel.rows[0].id;
  } else {
    const c2Ins = await q(
      `insert into courses (legacy_id, name, city, rating, slope)
       values ($1,$2,$3,$4,$5) returning id`,
      ['BARBORA', 'Golf Resort Barbora', 'Krupka', 71.5, 123]
    );
    c2 = c2Ins.rows[0].id;
  }

  for (const courseId of [c1, c2]) {
    for (let h = 1; h <= 18; h++) {
      const par = [5,4,3][rnd(0,2)];
      await q(
        `insert into holes (course_id, hole_number, par, stroke_index, photo_url)
         values ($1,$2,$3,$4,$5)
         on conflict (course_id, hole_number) do update set par=excluded.par`,
        [courseId, h, par, rnd(1,18), null]
      );
    }
  }
  return { c1, c2 };
}

function fakeName(i) {
  const first = ['Jan','Petr','Jakub','Tomáš','Martin','Marek','David','Jiří','Matyáš','Ondřej'];
  const last  = ['Novák','Svoboda','Dvořák','Král','Procházka','Trnka','Šutko','Herold','Varhaník','Bernat'];
  return `${first[i % first.length]} ${last[i % last.length]}`;
}

async function ensurePlayers(seasonId) {
  // 20 hráčů
  const ids = [];
  for (let i = 1; i <= 20; i++) {
    const full = fakeName(i);
    const legacy = `P${i}`;
    const hcp = rnd(0, 36) + (Math.random() < 0.5 ? 0.0 : 0.5); // .0 nebo .5
    const res = await q(
      `insert into players (legacy_id, full_name, hcp_current)
       values ($1,$2,$3)
       on conflict (legacy_id) do update set full_name=excluded.full_name
       returning id`,
      [legacy, full, hcp]
    );
    ids.push(res.rows[0].id);

    // přiřaď do sezóny + tým
    const side = i % 2 === 0 ? 'red' : 'blue';
    const team = await q(`select id from teams where season_id=$1 and code=$2`, [seasonId, side]);
    await q(
      `insert into player_season (player_id, season_id, team_id)
       values ($1,$2,$3)
       on conflict (player_id, season_id) do update set team_id=excluded.team_id`,
      [res.rows[0].id, seasonId, team.rows[0]?.id ?? null]
    );
  }
  return ids;
}

async function createMatches(seasonId, courseId, dayNumber, type) {
  // vytvoří 8 zápasů pro daný den
  // type: 'team' nebo 'singles'
  const matches = [];
  for (let i = 1; i <= 8; i++) {
    const legacy = `S${seasonId}-D${dayNumber}-${type}-${i}`;
    const res = await q(
      `insert into matches (legacy_id, season_id, course_id, round_id, stage, status)
       values ($1,$2,$3,
         (select id from round_schedule where season_id=$2 and day_number=$4),
         $5, 'finished'
       )
       on conflict (legacy_id) do update set course_id=excluded.course_id
       returning id`,
      [legacy, seasonId, courseId, dayNumber, 'Final']
    );
    matches.push(res.rows[0].id);
  }
  return matches;
}

async function addParticipants(matchId, type, redPlayers, bluePlayers) {
  // smaž existující pro idempotenci
  await q(`delete from match_participants where match_id=$1`, [matchId]);
  let order = 1;
  for (const p of redPlayers) {
    await q(
      `insert into match_participants (match_id, side, player_id, order_in_side)
       values ($1,'red',$2,$3)`,
      [matchId, p, order++]
    );
  }
  order = 1;
  for (const p of bluePlayers) {
    await q(
      `insert into match_participants (match_id, side, player_id, order_in_side)
       values ($1,'blue',$2,$3)`,
      [matchId, p, order++]
    );
  }
}

async function addScores(matchId, courseId) {
  // pro každou jamku vlož red/blue skóre ~ par ±1
  const holes = await q(`select id, hole_number, par from holes where course_id=$1 order by hole_number`, [courseId]);
  for (const h of holes.rows) {
    const red = Math.max(2, h.par + rnd(-1, 2));
    const blue = Math.max(2, h.par + rnd(-1, 2));
    const winner = red === blue ? 'as' : (red < blue ? 'red' : 'blue');
    await q(
      `insert into scores (match_id, hole_id, red_score, blue_score, winner_side, client_id)
       values ($1,$2,$3,$4,$5, gen_random_uuid()::text)
       on conflict (match_id, hole_id)
       do update set red_score=excluded.red_score, blue_score=excluded.blue_score, winner_side=excluded.winner_side`,
      [matchId, h.id, red, blue, winner]
    );
  }
}

async function main() {
  await client.connect();

  // 0) registry
  await ensureBaseRegisters();

  // 1) sezóna, týmy, schedule
  const seasonId = await ensureSeasonTeamsSchedule();

  // 2) hřiště + jamky
  const { c1, c2 } = await ensureCoursesAndHoles();

  // 3) hráči
  const playerIds = await ensurePlayers(seasonId);
  const red = playerIds.filter((_, i) => i % 2 === 1);
  const blue = playerIds.filter((_, i) => i % 2 === 0);

  // 4) zápasy den 1 (Texas team) na c1
  const matchesD1 = await createMatches(seasonId, c1, 1, 'team');
  for (let i = 0; i < matchesD1.length; i++) {
    // každá strana 2 hráči (Texas)
    const rp = [red[(i*2) % red.length], red[(i*2+1) % red.length]];
    const bp = [blue[(i*2) % blue.length], blue[(i*2+1) % blue.length]];
    await addParticipants(matchesD1[i], 'team', rp, bp);
    await addScores(matchesD1[i], c1);
  }

  // 5) zápasy den 2 (Singles) na c2
  const matchesD2 = await createMatches(seasonId, c2, 2, 'singles');
  for (let i = 0; i < matchesD2.length; i++) {
    const rp = [red[i % red.length]];
    const bp = [blue[i % blue.length]];
    await addParticipants(matchesD2[i], 'singles', rp, bp);
    await addScores(matchesD2[i], c2);
  }

  console.log('✅ Mock data seeded.');
  await client.end();
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
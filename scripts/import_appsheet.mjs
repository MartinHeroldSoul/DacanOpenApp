import 'dotenv/config';
import pkg from 'pg';
import XLSX from 'xlsx';
import dayjs from 'dayjs';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';

const { Client } = pkg;

/**
 * KONFIGURACE
 * Pokud se názvy listů/hlaviček liší, uprav tady (není potřeba měnit logiku níž).
 */
const CFG = {
  xlsxPath: './data/appsheet.xlsx',
  seasonYear: 2025,                    // cílová sezóna
  sheets: {
    players: 'Players',
    courses: 'Field difficulty',
    holes:   'Field holes',
    schedule: 'This_year_field',      // volitelné
    games:   'Games',
    results: 'Results',
    leaderboard: 'Leaderboard',       // volitelné
  },
  // mapování sloupců (přizpůsob podle Excelu)
  cols: {
    players: {
      id: 'ID_Players',
      name: 'Name',
      firstName: 'First name',
      lastName: 'Second name',
      hcp: 'HCP',
      size: 'Size',
      phone: 'Phone',
      photo: 'Photo',
      team: 'Team',                   // 'red' | 'blue' (pokud ve zdroji je)
    },
    courses: {
      id: 'FieldID',
      name: 'Field Name',
      city: 'City',
      rating: 'Rating',
      slope: 'Slope',
    },
    holes: {
      fieldId: 'FieldID',
      hole: 'Hole',
      par: 'Par',
      strokeIndex: 'HCPIndex',        // pokud nemáš, nech null
      photo: 'Photo',
    },
    schedule: {
      day: 'Day',                     // 1 / 2
      fieldId: 'FieldID',
      gameModeCode: 'GameMode',       // 'team' | 'individual' (pokud je v xlsx)
      scoringCode: 'Scoring',         // 'match_play' ... (pokud je v xlsx)
      hcpPolicyCode: 'HCP',           // 'gross' | 'net_dacan' ... (pokud je v xlsx)
    },
    games: {
      id: 'ID',                       // legacy id zápasu
      fieldId: 'FieldID',
      teeStage: 'Tee',                // např. 'Final'
      redNames: 'Red',                // "Šutko & Trnka"
      blueNames: 'Blue',              // "Marek & Pleticha"
      status: 'Status',               // 'not_started'|'in_progress'|'finished' (pokud máš)
    },
    results: {
      gameId: 'GameID',
      hole: 'Hole',
      rScore: 'R Score',
      bScore: 'B Score',
    },
    leaderboard: {
      team: 'Team',                   // 'red' | 'blue'
      points: 'Points',
    },
  },
  // fallbacky: pokud This_year_field neobsahuje kódy, použije se výchozí z round_schedule (seed)
  defaults: {
    roundDay1: { game: 'team', scoring: 'match_play', hcp: 'texas_share_3_8' },
    roundDay2: { game: 'individual', scoring: 'match_play', hcp: 'net_dacan' },
  }
};

// Pomocné funkce
const norm = (s) => (s ?? '').toString().trim();
const lower = (s) => norm(s).toLowerCase();
const splitPair = (s) => norm(s).split('&').map(x => norm(x)).filter(Boolean);  // ['Šutko','Trnka']
function fullNameKey(name) {
  // zjednodušené porovnání jmen (bez diakritiky), case-insensitive
  return slugify(norm(name), { lower: true, strict: true });
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
const report = { unknownPlayers: new Set(), missedCourses: new Set(), missedHoles: new Set(), matches: [], errors: [] };

async function q(sql, params = []) {
  try {
    return await client.query(sql, params);
  } catch (e) {
    report.errors.push({ sql, params, err: e.message });
    throw e;
  }
}

async function getSeasonId(year) {
  const { rows } = await q(`select id from seasons where year = $1 limit 1`, [year]);
  if (!rows.length) throw new Error(`Seasons: year=${year} not found. Run seed first.`);
  return rows[0].id;
}

async function readSheet(name) {
  const wb = XLSX.readFile(CFG.xlsxPath);
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

async function upsertPlayer(row) {
  const c = CFG.cols.players;
  const legacy = norm(row[c.id]);
  const full = norm(row[c.name]) || `${norm(row[c.firstName])} ${norm(row[c.lastName])}`.trim();
  if (!legacy && !full) return null;

  const hcp = row[c.hcp] != null ? Number(row[c.hcp]) : null;
  const size = norm(row[c.size]);
  const phone = norm(row[c.phone]);
  const photo = norm(row[c.photo]);

  // try find by legacy or full_name
  let res = await q(`select id from players where legacy_id=$1 or lower(full_name)=lower($2) limit 1`, [legacy || null, full]);
  if (res.rows.length) return res.rows[0].id;

  res = await q(
    `insert into players (legacy_id, first_name, last_name, full_name, hcp_current, size_label, phone, photo_url)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (legacy_id) do nothing
     returning id`,
    [legacy || null, norm(row[c.firstName]) || null, norm(row[c.lastName]) || null, full, hcp, size || null, phone || null, photo || null]
  );
  if (res.rows.length) return res.rows[0].id;

  // when conflict (legacy null & duplicate), fetch by name
  const res2 = await q(`select id from players where lower(full_name)=lower($1) limit 1`, [full]);
  return res2.rows[0]?.id ?? null;
}

async function ensurePlayerSeason(playerId, seasonId, teamCodeFromXlsx) {
  // find team in season
  let teamId = null;
  if (teamCodeFromXlsx) {
    const { rows: t } = await q(`select id from teams where season_id=$1 and code=$2`, [seasonId, lower(teamCodeFromXlsx)]);
    teamId = t[0]?.id ?? null;
  }
  // upsert player_season
  await q(
    `insert into player_season (player_id, season_id, team_id)
     values ($1,$2,$3)
     on conflict (player_id, season_id) do update set team_id = coalesce(excluded.team_id, player_season.team_id)`,
    [playerId, seasonId, teamId]
  );
}

async function upsertCourse(row) {
  const c = CFG.cols.courses;
  const legacy = norm(row[c.id]);
  const name = norm(row[c.name]);
  if (!legacy && !name) return null;

  const city = norm(row[c.city]) || null;
  const rating = row[c.rating] != null ? Number(row[c.rating]) : null;
  const slope = row[c.slope] != null ? Number(row[c.slope]) : null;

  let res = await q(`select id from courses where legacy_id=$1 or lower(name)=lower($2) limit 1`, [legacy || null, name]);
  if (res.rows.length) return res.rows[0].id;

  res = await q(
    `insert into courses (legacy_id, name, city, rating, slope)
     values ($1,$2,$3,$4,$5)
     on conflict (legacy_id) do nothing
     returning id`,
    [legacy || null, name, city, rating, slope]
  );
  if (res.rows.length) return res.rows[0].id;

  const res2 = await q(`select id from courses where lower(name)=lower($1) limit 1`, [name]);
  return res2.rows[0]?.id ?? null;
}

async function upsertHole(row, courseId) {
  const c = CFG.cols.holes;
  const holeNum = Number(row[c.hole]);
  if (!courseId || !holeNum) return null;
  const par = row[c.par] != null ? Number(row[c.par]) : null;
  const sIdx = row[c.strokeIndex] != null ? Number(row[c.strokeIndex]) : null;
  const photo = norm(row[c.photo]) || null;

  // unique (course_id, hole_number)
  const { rows } = await q(
    `insert into holes (course_id, hole_number, par, stroke_index, photo_url)
     values ($1,$2,$3,$4,$5)
     on conflict (course_id, hole_number) do update set par=excluded.par, stroke_index=excluded.stroke_index, photo_url=coalesce(excluded.photo_url, holes.photo_url)
     returning id`,
    [courseId, holeNum, par, sIdx, photo]
  );
  return rows[0]?.id ?? null;
}

async function getRoundDefaults(seasonId, dayNumber) {
  const { rows } = await q(
    `select default_game_mode_id, default_scoring_mode_id, default_hcp_policy_id
     from round_schedule where season_id=$1 and day_number=$2`, [seasonId, dayNumber]
  );
  if (!rows.length) return { gameModeId: null, scoringModeId: null, hcpPolicyId: null };
  const r = rows[0];
  return { gameModeId: r.default_game_mode_id, scoringModeId: r.default_scoring_mode_id, hcpPolicyId: r.default_hcp_policy_id };
}

async function lookupIdsByCode() {
  const load = async (tbl) => (await q(`select id, code from ${tbl}`)).rows.reduce((acc, r) => (acc[r.code] = r.id, acc), {});
  return {
    gameModes: await load('game_modes'),
    scoringModes: await load('scoring_modes'),
    hcpPolicies: await load('hcp_policies'),
    courses: (await q(`select id, legacy_id from courses`)).rows.reduce((acc, r) => (acc[r.legacy_id] = r.id, acc), {}),
    holesByCourse: null
  };
}

async function cacheHolesByCourse() {
  const { rows } = await q(`select id, course_id, hole_number from holes`);
  const map = {};
  for (const r of rows) {
    map[r.course_id] ??= {};
    map[r.course_id][r.hole_number] = r.id;
  }
  return map;
}

async function findPlayerIdByName(name) {
  if (!name) return null;
  const key = fullNameKey(name);
  const { rows } = await q(`select id, full_name from players`);
  for (const r of rows) {
    if (fullNameKey(r.full_name) === key) return r.id;
  }
  report.unknownPlayers.add(name);
  return null;
}

async function ensureMatch(row, seasonId, dict) {
  const c = CFG.cols.games;
  const legacy = norm(row[c.id]);
  const stage = norm(row[c.teeStage]) || null;
  const status = lower(row[c.status]) || 'finished'; // často z historických dat
  const courseLegacy = norm(row[c.fieldId]);
  const courseId = dict.courses[courseLegacy];
  if (!courseId) report.missedCourses.add(courseLegacy);

  // round definujeme podle dne hřiště?
  // Pokud ve zdroji není „day“, rozlišíme heuristikou (např. singles vs team podle počtu hráčů) – necháme NULL a spoléháme na schedule/day ručně.
  const roundId = null;

  // vytvoř zápas, pokud neexistuje
  let res = await q(`select id from matches where legacy_id=$1 limit 1`, [legacy]);
  if (res.rows.length) return { matchId: res.rows[0].id, courseId };

  res = await q(
    `insert into matches (legacy_id, season_id, course_id, round_id, stage, status)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (legacy_id) do nothing
     returning id`,
    [legacy, seasonId, courseId || null, roundId, stage, status]
  );
  if (res.rows.length) return { matchId: res.rows[0].id, courseId };

  const res2 = await q(`select id from matches where legacy_id=$1 limit 1`, [legacy]);
  return { matchId: res2.rows[0]?.id ?? null, courseId };
}

async function insertParticipants(matchId, side, names) {
  // vyčisti staré (bezpečné idempotentně)
  await q(`delete from match_participants where match_id=$1 and side=$2`, [matchId, side]);
  let order = 1;
  for (const nm of names) {
    const pid = await findPlayerIdByName(nm);
    await q(
      `insert into match_participants (match_id, side, player_id, order_in_side)
       values ($1,$2,$3,$4)`,
      [matchId, side, pid, order++]
    );
  }
}

async function insertScoreRow(matchId, courseId, row, dict) {
  const c = CFG.cols.results;
  const holeNum = Number(row[c.hole]);
  if (!holeNum) return;

  // zjisti hole_id – musí existovat
  const holeId = dict.holesByCourse?.[courseId]?.[holeNum];
  if (!holeId) {
    report.missedHoles.add(`course:${courseId}-hole:${holeNum}`);
    return;
  }

  const rScore = row[c.rScore] != null ? Number(row[c.rScore]) : null;
  const bScore = row[c.bScore] != null ? Number(row[c.bScore]) : null;

  // idempotentně podle (match_id, hole_id)
  await q(
    `insert into scores (match_id, hole_id, red_score, blue_score, client_id)
     values ($1,$2,$3,$4,$5)
     on conflict (match_id, hole_id)
     do update set red_score=excluded.red_score, blue_score=excluded.blue_score`,
    [matchId, holeId, rScore, bScore, uuidv4()]
  );
}

async function main() {
  const dry = process.argv.includes('--dry');
  const limit = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || 0);

  await client.connect();
  const seasonId = await getSeasonId(CFG.seasonYear);

  // 1) Players
  const players = await readSheet(CFG.sheets.players);
  for (const row of players) {
    const pid = await upsertPlayer(row);
    if (pid) {
      const teamCode = lower(row[CFG.cols.players.team] || '');
      await ensurePlayerSeason(pid, seasonId, ['red','blue'].includes(teamCode) ? teamCode : null);
    }
  }

  // 2) Courses + holes
  const courses = await readSheet(CFG.sheets.courses);
  const courseIdByLegacy = {};
  for (const r of courses) {
    const cid = await upsertCourse(r);
    const legacy = norm(r[CFG.cols.courses.id]);
    if (cid && legacy) courseIdByLegacy[legacy] = cid;
  }

  const holes = await readSheet(CFG.sheets.holes);
  for (const r of holes) {
    const fid = norm(r[CFG.cols.holes.fieldId]);
    const courseId = courseIdByLegacy[fid];
    if (!courseId) { report.missedCourses.add(fid); continue; }
    await upsertHole(r, courseId);
  }

  // cache holes
  const dict = await lookupIdsByCode();
  dict.courses = courseIdByLegacy;
  dict.holesByCourse = await cacheHolesByCourse();

  // 3) (Volitelně) Aktualizuj round_schedule podle This_year_field (pokud je)
  const sched = await readSheet(CFG.sheets.schedule);
  if (sched.length) {
    for (const r of sched) {
      const day = Number(r[CFG.cols.schedule.day]);
      if (!day) continue;
      const fLegacy = norm(r[CFG.cols.schedule.fieldId]);
      const courseId = courseIdByLegacy[fLegacy] || null;

      // defaulty z Excelu, jinak necháme to, co je naseté
      const gmId = dict.gameModes[lower(r[CFG.cols.schedule.gameModeCode] || '')] || null;
      const smId = dict.scoringModes[lower(r[CFG.cols.schedule.scoringCode] || '')] || null;
      const hpId = dict.hcpPolicies[lower(r[CFG.cols.schedule.hcpPolicyCode] || '')] || null;

      await q(
        `insert into round_schedule (season_id, day_number, course_id, default_game_mode_id, default_scoring_mode_id, default_hcp_policy_id)
         values ($1,$2,$3,$4,$5,$6)
         on conflict (season_id, day_number)
         do update set course_id=coalesce(excluded.course_id, round_schedule.course_id),
                       default_game_mode_id=coalesce(excluded.default_game_mode_id, round_schedule.default_game_mode_id),
                       default_scoring_mode_id=coalesce(excluded.default_scoring_mode_id, round_schedule.default_scoring_mode_id),
                       default_hcp_policy_id=coalesce(excluded.default_hcp_policy_id, round_schedule.default_hcp_policy_id)`,
        [seasonId, day, courseId, gmId, smId, hpId]
      );
    }
  }

  // 4) Matches + participants + scores
  const games = await readSheet(CFG.sheets.games);
  let processed = 0;
  for (const g of games) {
    if (limit && processed >= limit) break;
    processed++;

    const { matchId, courseId } = await ensureMatch(g, seasonId, dict);
    if (!matchId) continue;

    const red = splitPair(g[CFG.cols.games.redNames]);
    const blue = splitPair(g[CFG.cols.games.blueNames]);

    await insertParticipants(matchId, 'red', red);
    await insertParticipants(matchId, 'blue', blue);

    // výsledky jamek patří k tomuto zápasu:
    const results = await readSheet(CFG.sheets.results);
    const gameId = norm(g[CFG.cols.games.id]);

    for (const r of results.filter(x => norm(x[CFG.cols.results.gameId]) === gameId)) {
      await insertScoreRow(matchId, courseId, r, dict);
    }

    report.matches.push({ legacy: gameId, matchId, red, blue });
  }

  // 5) (Volitelně) leaderboard
  const lb = await readSheet(CFG.sheets.leaderboard);
  if (lb.length) {
    for (const r of lb) {
      const team = lower(r[CFG.cols.leaderboard.team]);
      const pts = r[CFG.cols.leaderboard.points] != null ? Number(r[CFG.cols.leaderboard.points]) : null;
      if (!['red','blue'].includes(team) || pts == null) continue;
      await q(
        `insert into tournament_points (season_id, side, points)
         values ($1,$2,$3)
         on conflict (season_id, side) do update set points=excluded.points`,
        [seasonId, team, pts]
      );
    }
  }

  // výstup reportu
  const fs = await import('fs');
  const out = {
    unknownPlayers: Array.from(report.unknownPlayers).sort(),
    missedCourses: Array.from(report.missedCourses).sort(),
    missedHoles: Array.from(report.missedHoles).sort(),
    matches: report.matches,
    errors: report.errors,
    when: dayjs().format(),
  };
  fs.writeFileSync('import-report.json', JSON.stringify(out, null, 2));
  console.log('✅ Import hotov. Report → import-report.json');

  await client.end();
}

main().catch(err => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
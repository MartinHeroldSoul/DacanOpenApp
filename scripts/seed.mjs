import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const DB_URL =
  process.env.DATABASE_URL ||
  process.env.NEXT_PUBLIC_DATABASE_URL; // fallback kdyby někdy

if (!DB_URL) {
  console.error('DATABASE_URL není nastaveno. Zkontroluj .env nebo .env.local');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('🌱 Seed start');

  // Season 2025
  const seasonIns = await client.query(
    `insert into seasons (year, name)
     values (2025, 'Dacan Open 2025')
     on conflict do nothing
     returning id;`
  );

  let seasonId = seasonIns.rows[0]?.id;
  if (!seasonId) {
    const s = await client.query(`select id from seasons where year = 2025 limit 1;`);
    seasonId = s.rows[0].id;
  }

  // Course
  const courseIns = await client.query(
    `insert into courses (name) values ('Dacan Course')
     returning id;`
  );
  const courseId = courseIns.rows[0].id;

  // 18 holí
  for (let i = 1; i <= 18; i++) {
    const par = [4, 4, 3, 5][(i - 1) % 4];
    await client.query(
      `insert into holes (course_id, number, par, stroke_index)
       values ($1, $2, $3, $4)
       on conflict do nothing;`,
      [courseId, i, par, i]
    );
  }

  // 4 flighty pro den 1 i 2
  for (const day of [1, 2]) {
    for (let n = 1; n <= 4; n++) {
      await client.query(
        `insert into flights (season_id, day, number)
         values ($1, $2, $3)
         on conflict do nothing;`,
        [seasonId, day, n]
      );
    }
  }

  await client.end();
  console.log('✅ Seed hotov: Season 2025 + course + 18 jamky + flighty');
}

main().catch((e) => {
  console.error('❌ Chyba při seedu:', e);
  process.exit(1);
});
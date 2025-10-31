import pkg from "pg";
const { Client } = pkg;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log("🌱 Spouštím seed...");

  const season = await client.query(
    `insert into seasons (year, name)
     values (2025, 'Dacan Open 2025')
     on conflict do nothing
     returning id;`
  );

  let seasonId = season.rows[0]?.id;
  if (!seasonId) {
    const s = await client.query(`select id from seasons where year = 2025 limit 1;`);
    seasonId = s.rows[0].id;
  }

  const course = await client.query(
    `insert into courses (name) values ('Dacan Course')
     returning id;`
  );
  const courseId = course.rows[0].id;

  for (let i = 1; i <= 18; i++) {
    const par = [4, 4, 3, 5][(i - 1) % 4];
    await client.query(
      `insert into holes (course_id, number, par, stroke_index)
       values ($1, $2, $3, $4)
       on conflict do nothing;`,
      [courseId, i, par, i]
    );
  }

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
  console.log("✅ Seed hotov: Season 2025 + hřiště + jamky + flighty.");
}

main().catch((err) => {
  console.error("❌ Chyba při seedu:", err);
  process.exit(1);
});
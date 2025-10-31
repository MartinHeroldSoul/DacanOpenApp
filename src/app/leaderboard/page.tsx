import { Client } from "pg";

export const dynamic = "force-dynamic";

async function getData() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const day1 = await client.query(`select id, number from flights where day=1 order by number;`);
  const day2 = await client.query(`select id, number from flights where day=2 order by number;`);

  await client.end();
  return { day1: day1.rows, day2: day2.rows };
}

export default async function LeaderboardPage() {
  const { day1, day2 } = await getData();

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Leaderboard (MVP – flighty)</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2">Day 1 – Texas</h2>
        <ul className="list-disc pl-6">
          {day1.map((f: any) => <li key={f.id}>Flight #{f.number}</li>)}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Day 2 – Singles</h2>
        <ul className="list-disc pl-6">
          {day2.map((f: any) => <li key={f.id}>Flight #{f.number}</li>)}
        </ul>
      </section>
    </main>
  );
}
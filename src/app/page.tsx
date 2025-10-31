export default function Home() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dacan Open</h1>
      <p className="mb-4">Oficiální prezentace turnaje a výsledková aplikace.</p>
      <a
        href="/leaderboard"
        className="inline-block px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition"
      >
        Zobrazit Leaderboard
      </a>
    </main>
  );
}
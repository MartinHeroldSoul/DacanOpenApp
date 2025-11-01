// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <div className="max-w-lg text-center">
        <h1 className="text-5xl font-bold mb-6">Dacan Open</h1>
        <p className="text-lg text-gray-300 mb-10">
          Oficiální prezentace turnaje a výsledková aplikace.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/leaderboard"
            className="rounded bg-green-600 hover:bg-green-700 px-6 py-3 text-lg font-semibold text-white transition"
          >
            Zobrazit Leaderboard
          </Link>

          <Link
            href="/matches"
            className="rounded bg-white hover:bg-gray-100 px-6 py-3 text-lg font-semibold text-black transition"
          >
            Zobrazit Zápasy
          </Link>
        </div>
      </div>
    </main>
  );
}
// src/app/page.tsx
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold mb-4">Dacan Open</h1>
      <p className="text-gray-600 mb-6">
        Oficiální prezentace turnaje a výsledková aplikace.
      </p>

      <a
        href="/matches/1"
        className="inline-flex items-center rounded-md bg-green-600 px-5 py-3 text-white font-medium hover:bg-green-700"
      >
        Zobrazit zápasy
      </a>
    </main>
  );
}
// src/app/matches/season-select.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";

export default function SeasonSelect({
  seasons,
  value,
  day,
}: {
  seasons: { id: number; year: number; name: string }[];
  value: number;
  day: number; // 1 nebo 2 – držíme ho ze segmentu
}) {
  const router = useRouter();
  const pathname = usePathname(); // např. /matches/1 nebo /matches/2

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="season" className="text-sm text-gray-600">
        Season
      </label>
      <select
        id="season"
        name="season"
        defaultValue={value}
        onChange={(e) => {
          const seasonId = Number(e.target.value);
          // přesměrujeme na /matches/{day}?season={seasonId}
          router.push(`/matches/${day}?season=${seasonId}`);
        }}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none"
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name ?? s.year}
          </option>
        ))}
      </select>
    </div>
  );
}
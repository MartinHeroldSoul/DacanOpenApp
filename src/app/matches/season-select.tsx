'use client';

import { useRouter, useSearchParams } from 'next/navigation';

type Season = { id: number; year: number; name: string };

export default function SeasonSelect({
  seasons,
  value,
  day,
}: {
  seasons: Season[];
  value: number;     // aktuální seasonId (ze serveru)
  day: number;       // aktuální den (1/2) – jen pro fallback
}) {
  const router = useRouter();
  const search = useSearchParams();

  // Navigovat POUZE při změně hodnoty v selectu
  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const seasonId = e.target.value;
    // zachovej aktuální 'day' z URL, případně použij prop
    const d = search.get('day') ?? String(day ?? 1);
    router.push(`/matches?season=${seasonId}&day=${d}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="season" className="text-sm text-gray-600">
        Season
      </label>
      <select
        id="season"
        name="season"
        defaultValue={value}          // žádná navigace při mountu
        onChange={onChange}           // navigace jen na změnu
        className="rounded border px-2 py-1 text-sm"
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name ?? `Season ${s.year}`}
          </option>
        ))}
      </select>
    </div>
  );
}
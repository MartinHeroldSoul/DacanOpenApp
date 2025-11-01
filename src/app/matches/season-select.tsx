// src/app/matches/season-select.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function SeasonSelect({
  seasons,
  value,
  day,
}: {
  seasons: { id: number; year: number; name: string }[];
  value: number;
  day: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const season = e.target.value;
    const d = params.get("day") ?? String(day);
    router.replace(`/matches?season=${season}&day=${d}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">Season</label>
      <select
        name="year"
        defaultValue={value}
        onChange={onChange}
        className="rounded border px-2 py-1 text-sm"
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
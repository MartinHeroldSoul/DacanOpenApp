// src/app/matches/DayTabs.tsx
import Link from "next/link";

export default function DayTabs({
  seasonId,
  day,
}: {
  seasonId: number;
  day: number;
}) {
  const base = (d: number) => `/matches/${d}?season=${seasonId}`;

  const btn = (d: number, label: string) => {
    const active = d === day;
    return (
      <Link
        key={d}
        href={base(d)}
        prefetch={false}
        aria-current={active ? "page" : undefined}
        className={[
          "px-4 py-2 text-sm rounded-md border",
          active
            ? "bg-green-600 text-white border-green-600"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
        ].join(" ")}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="inline-flex gap-2">
      {btn(1, "Day 1")}
      {btn(2, "Day 2")}
    </div>
  );
}
// src/app/matches/day-tabs.tsx
import Link from "next/link";

export default function DayTabs({
  seasonId,
  day,
}: {
  seasonId: number;
  day: 1 | 2;
}) {
  const base = "/matches";

  const Btn = (d: 1 | 2) => (
    <Link
      key={d}
      href={{ pathname: base, query: { season: seasonId, day: d } }}
      prefetch={false}
      className={[
        "px-4 py-2 text-sm",
        d === day
          ? "bg-green-600 text-white"
          : "bg-white hover:bg-gray-50 text-gray-700",
        d === 1 ? "border-r" : "",
      ].join(" ")}
      aria-current={d === day ? "page" : undefined}
    >
      Day {d}
    </Link>
  );

  return (
    <div className="inline-flex overflow-hidden rounded-md border">
      {Btn(1)}
      {Btn(2)}
    </div>
  );
}
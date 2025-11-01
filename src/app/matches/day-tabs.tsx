// src/app/matches/day-tabs.tsx
export default function DayTabs({
  seasonId,
  day,
}: {
  seasonId: number;
  day: 1 | 2;
}) {
  const Btn = (d: 1 | 2) => (
    <a
      key={d}
      href={`/matches?season=${seasonId}&day=${d}`} // tvrdý reload
      className={[
        "px-4 py-2 text-sm",
        d === day ? "bg-green-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700",
        d === 1 ? "border-r" : "",
      ].join(" ")}
      aria-current={d === day ? "page" : undefined}
    >
      Day {d}
    </a>
  );

  return (
    <div className="inline-flex overflow-hidden rounded-md border">
      {Btn(1)}
      {Btn(2)}
    </div>
  );
}
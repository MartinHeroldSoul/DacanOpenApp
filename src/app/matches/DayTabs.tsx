// src/app/matches/DayTabs.tsx
type Props = { seasonId: number; day: number };

export default function DayTabs({ seasonId, day }: Props) {
  const base = `/matches?season=${seasonId}`;

  const btn = (d: 1 | 2) => {
    const active = d === day;
    const common =
      "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border transition";
    const on =
      "bg-green-600 text-white border-green-600 shadow";
    const off =
      "bg-white text-gray-800 border-gray-300 hover:bg-gray-50";

    return (
      <a
        key={d}
        href={`${base}&day=${d}`}
        className={`${common} ${active ? on : off}`}
        aria-current={active ? "page" : undefined}
      >
        {`Day ${d}`}
      </a>
    );
  };

  return (
    <div className="inline-flex gap-2">{btn(1)}{btn(2)}</div>
  );
}
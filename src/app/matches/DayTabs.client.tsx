'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function DayTabs({
  seasonId,
  day,
}: { seasonId: number; day: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // aktuální hodnoty z URL (fallback na props z SSR, aby to sedělo při prvním renderu)
  const s = Number(sp.get('season')) || seasonId || 1;
  const d = Number(sp.get('day')) || day || 1;

  const setDay = (newDay: number) => {
    const params = new URLSearchParams(sp.toString());
    params.set('season', String(s));
    params.set('day', String(newDay));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const Tab = ({ n, label }: { n: number; label: string }) => (
    <button
      type="button"
      onClick={() => setDay(n)}
      aria-pressed={d === n}
      className={[
        'px-4 py-2 text-sm rounded-md border transition-colors',
        d === n
          ? 'bg-green-600 text-white border-green-600'
          : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300',
      ].join(' ')}
    >
      {label}
    </button>
  );

  return (
    <div className="inline-flex gap-2">
      <Tab n={1} label="Day 1" />
      <Tab n={2} label="Day 2" />
    </div>
  );
}
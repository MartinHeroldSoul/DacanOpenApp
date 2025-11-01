'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function DayTabs({ seasonId }: { seasonId: number }) {
  const sp = useSearchParams();
  const activeDay: '1' | '2' = sp.get('day') === '2' ? '2' : '1';

  const btn = (d: '1' | '2') => (
    <Link
      key={d}
      href={{ pathname: '/matches', query: { season: seasonId, day: d } }}
      prefetch={false}
      className={[
        'px-4 py-2 text-sm',
        d === activeDay ? 'bg-green-600 text-white' : 'bg-white hover:bg-gray-50 text-gray-700',
        d === '1' ? 'border-r' : '',
      ].join(' ')}
      aria-current={d === activeDay ? 'page' : undefined}
    >
      Day {d}
    </Link>
  );

  return (
    <div className="inline-flex overflow-hidden rounded-md border">
      {btn('1')}
      {btn('2')}
    </div>
  );
}
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DayTabs({
  seasonId,
  day,
}: {
  seasonId: number;
  day: number;
}) {
  const router = useRouter();

  const handleClick = (targetDay: number) => {
    const newUrl = `/matches?season=${seasonId}&day=${targetDay}`;
    // Vyvolá navigaci ručně i když URL je stejná
    router.push(newUrl);
  };

  return (
    <div className="inline-flex overflow-hidden rounded-md border border-gray-300 bg-gray-100 dark:bg-gray-800">
      {[1, 2].map((d) => (
        <button
          key={d}
          onClick={() => handleClick(d)}
          className={[
            "px-4 py-2 text-sm transition-colors",
            d === day
              ? "bg-green-600 text-white"
              : "bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200",
            d === 1 ? "border-r border-gray-300" : "",
          ].join(" ")}
        >
          Day {d}
        </button>
      ))}
    </div>
  );
}
// src/app/matches/page.tsx
import { redirect } from "next/navigation";

// Přesměruje /matches na /matches/1 (Day 1).
// Day 2 je pak /matches/2, případně přidej /matches/3 atd.
export default function MatchesIndex() {
  redirect("/matches/1");
}
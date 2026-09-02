import type { ContentCandidate, CandidateSortOrder } from "@/lib/db";

export type CandidateWithStats = ContentCandidate & {
  usageCount: number;
  lastUsedDate: string | null;
};

const collator = new Intl.Collator("ja");

export function buildCandidateStats(
  candidates: ContentCandidate[],
  statsMap: Map<string, { count: number; lastDate: string | null }>
): CandidateWithStats[] {
  return candidates.map((c) => {
    const stats = statsMap.get(c.id) ?? { count: 0, lastDate: null };
    return {
      ...c,
      usageCount: stats.count,
      lastUsedDate: stats.lastDate,
    };
  });
}

export function sortCandidates(
  items: CandidateWithStats[],
  order: CandidateSortOrder
): CandidateWithStats[] {
  const copy = [...items];
  if (order === "frequency") {
    copy.sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
      const aDate = a.lastUsedDate ?? "";
      const bDate = b.lastUsedDate ?? "";
      return bDate.localeCompare(aDate);
    });
  } else if (order === "recent") {
    copy.sort((a, b) => {
      if (!a.lastUsedDate && !b.lastUsedDate) return a.name.localeCompare(b.name, "ja");
      if (!a.lastUsedDate) return 1;
      if (!b.lastUsedDate) return -1;
      return b.lastUsedDate.localeCompare(a.lastUsedDate);
    });
  } else {
    copy.sort((a, b) => {
      const aKey = a.reading || a.name;
      const bKey = b.reading || b.name;
      return collator.compare(aKey, bKey);
    });
  }
  return copy;
}

export function filterCandidates(items: CandidateWithStats[], query: string): CandidateWithStats[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.reading?.toLowerCase().includes(q) ?? false)
  );
}

export function weightedRandomPick(
  items: CandidateWithStats[],
  count: number
): CandidateWithStats[] {
  if (items.length === 0) return [];
  const pool = [...items];
  const picked: CandidateWithStats[] = [];
  const today = new Date();

  while (picked.length < count && pool.length > 0) {
    const weights = pool.map((item) => {
      if (!item.lastUsedDate) return 10;
      const days = Math.floor(
        (today.getTime() - new Date(item.lastUsedDate + "T00:00:00").getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return Math.max(1, days);
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

export function randomPick(items: CandidateWithStats[], count: number): CandidateWithStats[] {
  const pool = [...items];
  const picked: CandidateWithStats[] = [];
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

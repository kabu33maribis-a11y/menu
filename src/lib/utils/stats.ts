import { applyCookCount, isDiningOutUnknownCandidate } from "@/lib/constants";
import type { RecordWithDetails } from "@/lib/actions/records";

export type PeriodPreset = "week" | "month" | "3months" | "custom";

export type StatsData = {
  totalRecords: number;
  recordedDays: number;
  homeCookedCount: number;
  diningOutCount: number;
  cookCounts: { memberId: string; name: string; count: number }[];
  eatCounts: { memberId: string; name: string; count: number }[];
  diningOutCounts: { memberId: string; name: string; count: number }[];
  mealTypeCounts: { mealType: string; label: string; count: number }[];
  homeRanking: { name: string; count: number }[];
  diningRanking: { name: string; count: number }[];
  weeklyTrend: { week: string; homeCooked: number; diningOut: number }[];
};

function countEater(record: RecordWithDetails, memberId: string): boolean {
  return record.eaters === "both" || record.eaters === memberId;
}

export function computeStats(
  records: RecordWithDetails[],
  memberMap: Record<string, string>
): StatsData {
  const homeCooked = records.filter((r) => r.category === "home_cooked");
  const diningOut = records.filter((r) => r.category === "dining_out");
  const recordedDays = new Set(records.map((r) => r.date)).size;

  const cookCountsMap: Record<string, number> = { member_1: 0, member_2: 0 };
  for (const r of homeCooked) {
    applyCookCount(cookCountsMap, r.cookMemberId);
  }

  const eatCountsMap: Record<string, number> = {};
  const diningCountsMap: Record<string, number> = {};
  for (const r of records) {
    for (const memberId of ["member_1", "member_2"]) {
      if (countEater(r, memberId)) {
        eatCountsMap[memberId] = (eatCountsMap[memberId] ?? 0) + 1;
        if (r.category === "dining_out") {
          diningCountsMap[memberId] = (diningCountsMap[memberId] ?? 0) + 1;
        }
      }
    }
  }

  const mealTypeLabels: Record<string, string> = {
    lunch: "昼食",
    dinner: "夕食",
    other: "その他",
  };
  const mealTypeCountsMap: Record<string, number> = {};
  for (const r of homeCooked) {
    mealTypeCountsMap[r.mealType] = (mealTypeCountsMap[r.mealType] ?? 0) + 1;
  }

  const homeRankMap: Record<string, { name: string; count: number }> = {};
  for (const r of homeCooked) {
    if (!homeRankMap[r.candidateId]) {
      homeRankMap[r.candidateId] = { name: r.candidateName, count: 0 };
    }
    homeRankMap[r.candidateId].count++;
  }

  const diningRankMap: Record<string, { name: string; count: number }> = {};
  for (const r of diningOut) {
    if (isDiningOutUnknownCandidate({ id: r.candidateId, name: r.candidateName })) {
      continue;
    }
    if (!diningRankMap[r.candidateId]) {
      diningRankMap[r.candidateId] = { name: r.candidateName, count: 0 };
    }
    diningRankMap[r.candidateId].count++;
  }

  const weekMap: Record<string, { homeCooked: number; diningOut: number }> = {};
  for (const r of records) {
    const date = new Date(r.date + "T00:00:00");
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    const weekKey = monday.toISOString().slice(0, 10);
    if (!weekMap[weekKey]) weekMap[weekKey] = { homeCooked: 0, diningOut: 0 };
    if (r.category === "home_cooked") weekMap[weekKey].homeCooked++;
    else weekMap[weekKey].diningOut++;
  }

  const toMemberList = (map: Record<string, number>) =>
    Object.entries(map).map(([memberId, count]) => ({
      memberId,
      name: memberMap[memberId] ?? memberId,
      count,
    }));

  return {
    totalRecords: records.length,
    recordedDays,
    homeCookedCount: homeCooked.length,
    diningOutCount: diningOut.length,
    cookCounts: toMemberList(cookCountsMap),
    eatCounts: toMemberList(eatCountsMap),
    diningOutCounts: toMemberList(diningCountsMap),
    mealTypeCounts: Object.entries(mealTypeCountsMap).map(([mealType, count]) => ({
      mealType,
      label: mealTypeLabels[mealType] ?? mealType,
      count,
    })),
    homeRanking: Object.values(homeRankMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    diningRanking: Object.values(diningRankMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    weeklyTrend: Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({ week, ...data })),
  };
}

export const MEAL_TYPE_LABELS: Record<string, string> = {
  lunch: "昼食",
  dinner: "夕食",
  other: "その他",
};

export const CATEGORY_LABELS: Record<string, string> = {
  home_cooked: "自炊",
  dining_out: "外食",
};

export const DINING_OUT_UNKNOWN_ID = "dining_out_unknown";
export const DINING_OUT_UNKNOWN_NAME = "内容を覚えていない";
export const DINING_OUT_UNKNOWN_READING = "ないようをおぼえていない";

export function isDiningOutUnknownCandidate(candidate: {
  id: string;
  name?: string | null;
}): boolean {
  return candidate.id === DINING_OUT_UNKNOWN_ID || candidate.name === DINING_OUT_UNKNOWN_NAME;
}

export const EATERS_LABELS: Record<string, string> = {
  member_1: "メンバー1",
  member_2: "メンバー2",
  both: "2人とも",
};

export const COOK_BOTH_CREDIT = 0.5;

/** カレンダー・凡例用のメンバー色 */
export const MEMBER_COLORS: Record<string, string> = {
  member_1: "#e07a4a",
  member_2: "#5b8a72",
  both: "#7a6b9e",
};

export const DINING_OUT_COLOR = "#9b6b9e";

export function getRecordAccentColor(record: {
  category: string;
  cookMemberId: string | null;
}): string {
  if (record.category === "dining_out") return DINING_OUT_COLOR;
  if (record.cookMemberId && MEMBER_COLORS[record.cookMemberId]) {
    return MEMBER_COLORS[record.cookMemberId];
  }
  return "var(--muted)";
}

export function applyCookCount(
  cookCounts: Record<string, number>,
  cookMemberId: string | null
) {
  if (!cookMemberId) return;
  if (cookMemberId === "both") {
    cookCounts.member_1 = (cookCounts.member_1 ?? 0) + COOK_BOTH_CREDIT;
    cookCounts.member_2 = (cookCounts.member_2 ?? 0) + COOK_BOTH_CREDIT;
    return;
  }
  cookCounts[cookMemberId] = (cookCounts[cookMemberId] ?? 0) + 1;
}

export function formatCookCount(count: number): string {
  return Number.isInteger(count) ? String(count) : count.toFixed(1);
}

export function cookDisplayName(
  cookMemberId: string | null,
  memberMap: Record<string, string>
): string | null {
  if (!cookMemberId) return null;
  if (cookMemberId === "both") return "2人とも";
  return memberMap[cookMemberId] ?? cookMemberId;
}

export const SORT_ORDER_LABELS: Record<string, string> = {
  frequency: "よく使う順",
  recent: "最近使った順",
  kana: "五十音順",
};

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDisplayDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function todayString(): string {
  return formatDate(new Date());
}

export function getWeekRange(base = new Date()): { start: string; end: string } {
  const day = base.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: formatDate(monday), end: formatDate(sunday) };
}

export function getMonthRange(base = new Date()): { start: string; end: string } {
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

export function getLast3MonthsRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  return { start: formatDate(start), end: formatDate(end) };
}

export function daysBetween(from: string, to: string): number {
  const a = parseDate(from).getTime();
  const b = parseDate(to).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

export function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const days: (Date | null)[] = [];

  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export function getRecentDates(count: number, endDate = new Date()): string[] {
  const dates: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(endDate.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}

export function nowIso(): string {
  return new Date().toISOString();
}

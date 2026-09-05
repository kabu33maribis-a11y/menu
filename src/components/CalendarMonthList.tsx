import Link from "next/link";
import { RecordCard } from "@/components/RecordCard";
import { formatDisplayDate, todayString } from "@/lib/constants";
import type { MealType } from "@/lib/db";
import type { RecordWithDetails } from "@/lib/actions/records";

type Props = {
  year: number;
  month: number;
  records: RecordWithDetails[];
  memberMap: Record<string, string>;
};

const MEAL_ORDER: Record<MealType, number> = {
  lunch: 0,
  dinner: 1,
  other: 2,
};

export function CalendarMonthList({ year, month, records, memberMap }: Props) {
  const returnTo = `/calendar?year=${year}&month=${month + 1}&view=list`;
  const returnToParam = encodeURIComponent(returnTo);
  const today = todayString();

  const recordsByDate = new Map<string, RecordWithDetails[]>();
  for (const r of records) {
    const list = recordsByDate.get(r.date) ?? [];
    list.push(r);
    recordsByDate.set(r.date, list);
  }

  for (const list of recordsByDate.values()) {
    list.sort(
      (a, b) =>
        (MEAL_ORDER[a.mealType] ?? 99) - (MEAL_ORDER[b.mealType] ?? 99) ||
        a.createdAt.localeCompare(b.createdAt)
    );
  }

  const dates = [...recordsByDate.keys()].sort((a, b) => b.localeCompare(a));

  if (dates.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-3xl mb-2" aria-hidden="true">
          📭
        </p>
        <p className="text-sm font-medium text-muted">この月の記録はまだありません</p>
        <Link href={`/?returnTo=${returnToParam}`} className="btn btn-primary mt-4">
          ＋ 記録を追加
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {dates.map((date) => {
        const dayRecords = recordsByDate.get(date) ?? [];
        const isToday = date === today;
        return (
          <section key={date} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h3
                className={`font-serif text-base font-semibold tracking-wide ${
                  isToday ? "text-primary" : "text-ink"
                }`}
              >
                {formatDisplayDate(date)}
                {isToday && (
                  <span className="ml-2 align-middle text-xs font-sans font-semibold text-primary">
                    今日
                  </span>
                )}
              </h3>
              <Link
                href={`/?date=${date}&returnTo=${returnToParam}`}
                className="btn btn-secondary btn-sm"
              >
                ＋ 追加
              </Link>
            </div>
            <div className="space-y-2">
              {dayRecords.map((r) => (
                <RecordCard
                  key={r.id}
                  record={r}
                  memberMap={memberMap}
                  compact
                  returnTo={returnTo}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

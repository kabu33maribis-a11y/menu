import Link from "next/link";
import { CalendarGrid } from "@/components/CalendarGrid";
import { CalendarMonthList } from "@/components/CalendarMonthList";
import { CalendarSwipeNav } from "@/components/CalendarSwipeNav";
import { getMembers, getMemberMap } from "@/lib/actions/members";
import { getRecords } from "@/lib/actions/records";
import { getMonthRange } from "@/lib/constants";

type Props = {
  searchParams: Promise<{ year?: string; month?: string; view?: string }>;
};

function calendarHref(year: number, monthIndex: number, view: "calendar" | "list") {
  const params = new URLSearchParams({
    year: String(year),
    month: String(monthIndex + 1),
  });
  if (view === "list") params.set("view", "list");
  return `/calendar?${params.toString()}`;
}

export default async function CalendarPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) - 1 : now.getMonth();
  const view = params.view === "list" ? "list" : "calendar";

  const { start, end } = getMonthRange(new Date(year, month, 1));
  const [records, memberMap, members] = await Promise.all([
    getRecords({ startDate: start, endDate: end }),
    getMemberMap(),
    getMembers(),
  ]);

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const title = new Date(year, month, 1).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });

  const prevHref = calendarHref(prev.getFullYear(), prev.getMonth(), view);
  const nextHref = calendarHref(next.getFullYear(), next.getMonth(), view);
  const currentHref = calendarHref(now.getFullYear(), now.getMonth(), view);
  const calendarViewHref = calendarHref(year, month, "calendar");
  const listViewHref = calendarHref(year, month, "list");

  return (
    <CalendarSwipeNav key={`${year}-${month}-${view}`} prevHref={prevHref} nextHref={nextHref}>
      <div className="space-y-6">
        <div className="card flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="kicker mb-1">📅 カレンダー</p>
            <h2 className="page-title">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="segment-group" role="group" aria-label="表示切替">
              <Link
                href={calendarViewHref}
                className={`segment-btn ${view === "calendar" ? "segment-btn-on" : ""}`}
                aria-current={view === "calendar" ? "page" : undefined}
              >
                カレンダー
              </Link>
              <Link
                href={listViewHref}
                className={`segment-btn ${view === "list" ? "segment-btn-on" : ""}`}
                aria-current={view === "list" ? "page" : undefined}
              >
                リスト
              </Link>
            </div>
            {!isCurrentMonth && (
              <Link href={currentHref} className="btn btn-primary btn-sm">
                今月へ
              </Link>
            )}
            <Link href={prevHref} className="btn btn-secondary btn-sm">
              ← 前月
            </Link>
            <Link href={nextHref} className="btn btn-secondary btn-sm">
              翌月 →
            </Link>
          </div>
        </div>
        {view === "list" ? (
          <CalendarMonthList
            year={year}
            month={month}
            records={records}
            memberMap={memberMap}
          />
        ) : (
          <CalendarGrid
            year={year}
            month={month}
            records={records}
            memberMap={memberMap}
            members={members}
          />
        )}
      </div>
    </CalendarSwipeNav>
  );
}

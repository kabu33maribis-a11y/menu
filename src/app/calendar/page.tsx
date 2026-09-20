import { cookies } from "next/headers";
import Link from "next/link";
import { CalendarGrid } from "@/components/CalendarGrid";
import { CalendarLegend } from "@/components/CalendarLegend";
import { CalendarList } from "@/components/CalendarList";
import { CalendarSwipeNav } from "@/components/CalendarSwipeNav";
import { CalendarViewToggle } from "@/components/CalendarViewToggle";
import { getMembers, getMemberMap } from "@/lib/actions/members";
import { getRecords } from "@/lib/actions/records";
import { getMonthRange } from "@/lib/constants";

type View = "grid" | "list";

type Props = {
  searchParams: Promise<{ year?: string; month?: string; view?: string }>;
};

function resolveView(param: string | undefined, cookie: string | undefined): View {
  if (param === "list" || param === "grid") return param;
  if (cookie === "list") return "list";
  return "grid";
}

function calendarHref(year: number, month: number, view: View) {
  return `/calendar?year=${year}&month=${month}&view=${view}`;
}

export default async function CalendarPage({ searchParams }: Props) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) - 1 : now.getMonth();
  const view = resolveView(params.view, cookieStore.get("cal-view")?.value);

  const { start, end } = getMonthRange(new Date(year, month, 1));
  const [records, memberMap, members] = await Promise.all([
    getRecords({ startDate: start, endDate: end }),
    getMemberMap(),
    getMembers(),
  ]);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const title = new Date(year, month, 1).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });

  const prevHref = calendarHref(prev.getFullYear(), prev.getMonth() + 1, view);
  const nextHref = calendarHref(next.getFullYear(), next.getMonth() + 1, view);
  const thisMonthHref = `/calendar?view=${view}`;
  const returnTo = calendarHref(year, month + 1, view);

  return (
    <CalendarSwipeNav key={`${year}-${month}`} prevHref={prevHref} nextHref={nextHref}>
      <div className="space-y-6">
        <div className="card flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="kicker mb-1">📅 カレンダー</p>
            <h2 className="page-title">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CalendarViewToggle year={year} month={month + 1} view={view} />
            {!isCurrentMonth && (
              <Link href={thisMonthHref} className="btn btn-primary btn-sm">
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
          <CalendarList
            year={year}
            month={month}
            records={records}
            memberMap={memberMap}
            returnTo={returnTo}
          />
        ) : (
          <CalendarGrid
            year={year}
            month={month}
            records={records}
            memberMap={memberMap}
            returnTo={returnTo}
          />
        )}
        <CalendarLegend members={members} />
      </div>
    </CalendarSwipeNav>
  );
}

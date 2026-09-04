import Link from "next/link";
import { CalendarGrid } from "@/components/CalendarGrid";
import { CalendarSwipeNav } from "@/components/CalendarSwipeNav";
import { getMembers, getMemberMap } from "@/lib/actions/members";
import { getRecords } from "@/lib/actions/records";
import { getMonthRange } from "@/lib/constants";

type Props = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

export default async function CalendarPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) - 1 : now.getMonth();

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

  const prevHref = `/calendar?year=${prev.getFullYear()}&month=${prev.getMonth() + 1}`;
  const nextHref = `/calendar?year=${next.getFullYear()}&month=${next.getMonth() + 1}`;

  return (
    <CalendarSwipeNav key={`${year}-${month}`} prevHref={prevHref} nextHref={nextHref}>
      <div className="space-y-6">
        <div className="card flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="kicker mb-1">📅 カレンダー</p>
            <h2 className="page-title">{title}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isCurrentMonth && (
              <Link href="/calendar" className="btn btn-primary btn-sm">
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
        <CalendarGrid
          year={year}
          month={month}
          records={records}
          memberMap={memberMap}
          members={members}
        />
      </div>
    </CalendarSwipeNav>
  );
}

import Link from "next/link";
import { ShiftStampPageClient } from "@/components/ShiftStampPageClient";
import { getMemberMap, getMembers } from "@/lib/actions/members";
import { getShiftStamps } from "@/lib/actions/shifts";
import { getMonthRange } from "@/lib/constants";
import type { ShiftMemberId } from "@/lib/db";

type Props = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

function shiftsHref(year: number, month: number) {
  return `/shifts?year=${year}&month=${month}`;
}

export default async function ShiftsPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) - 1 : now.getMonth();

  const { start, end } = getMonthRange(new Date(year, month, 1));
  const [stamps, memberMap, members] = await Promise.all([
    getShiftStamps(start, end),
    getMemberMap(),
    getMembers(),
  ]);

  const memberIds = members
    .map((m) => m.id)
    .filter((id): id is ShiftMemberId => id === "member_1" || id === "member_2");

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const title = new Date(year, month, 1).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });

  const prevHref = shiftsHref(prev.getFullYear(), prev.getMonth() + 1);
  const nextHref = shiftsHref(next.getFullYear(), next.getMonth() + 1);

  return (
    <div className="shift-page-root space-y-2">
      <div className="card card-compact flex flex-wrap items-center justify-between gap-2 !p-2">
        <div>
          <p className="kicker mb-0">シフト</p>
          <h2 className="page-title shift-page-title">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {!isCurrentMonth && (
            <Link href="/shifts" className="btn btn-primary btn-sm">
              今月
            </Link>
          )}
          <Link href={prevHref} className="btn btn-secondary btn-sm">
            ←
          </Link>
          <Link href={nextHref} className="btn btn-secondary btn-sm">
            →
          </Link>
        </div>
      </div>

      <ShiftStampPageClient
        year={year}
        month={month}
        stamps={stamps}
        memberMap={memberMap}
        memberIds={memberIds}
      />
    </div>
  );
}

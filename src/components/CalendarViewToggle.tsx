"use client";

import Link from "next/link";

type View = "grid" | "list";

type Props = {
  year: number;
  month: number;
  view: View;
};

function persistView(view: View) {
  document.cookie = `cal-view=${view}; path=/; max-age=31536000; SameSite=Lax`;
}

export function CalendarViewToggle({ year, month, view }: Props) {
  const gridHref = `/calendar?year=${year}&month=${month}&view=grid`;
  const listHref = `/calendar?year=${year}&month=${month}&view=list`;

  return (
    <div className="cal-view-toggle segment-group" role="group" aria-label="表示切替">
      <Link
        href={gridHref}
        scroll={false}
        className={`segment-btn ${view === "grid" ? "segment-btn-on" : ""}`}
        aria-current={view === "grid" ? "page" : undefined}
        onClick={() => persistView("grid")}
      >
        カレンダー
      </Link>
      <Link
        href={listHref}
        scroll={false}
        className={`segment-btn ${view === "list" ? "segment-btn-on" : ""}`}
        aria-current={view === "list" ? "page" : undefined}
        onClick={() => persistView("list")}
      >
        リスト
      </Link>
    </div>
  );
}

"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CalendarDayPanel } from "@/components/CalendarDayPanel";
import {
  cookDisplayName,
  DINING_OUT_COLOR,
  formatDate,
  getRecordAccentColor,
  getRecordAccentTint,
  MEMBER_COLORS,
  todayString,
} from "@/lib/constants";
import type { MealType } from "@/lib/db";
import type { RecordWithDetails } from "@/lib/actions/records";

type Props = {
  year: number;
  month: number;
  records: RecordWithDetails[];
  memberMap: Record<string, string>;
  members: { id: string; name: string }[];
};

const WEEKDAYS = [
  { label: "月", className: "" },
  { label: "火", className: "" },
  { label: "水", className: "" },
  { label: "木", className: "" },
  { label: "金", className: "" },
  { label: "土", className: "cal-weekday-sat" },
  { label: "日", className: "cal-weekday-sun" },
];

const SLOTS: { type: MealType; label: string }[] = [
  { type: "lunch", label: "昼" },
  { type: "dinner", label: "夕" },
];

export function CalendarGrid({ year, month, records, memberMap, members }: Props) {
  const returnTo = `/calendar?year=${year}&month=${month + 1}`;
  const returnToParam = encodeURIComponent(returnTo);
  const today = todayString();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);

  const recordsByDate = new Map<string, RecordWithDetails[]>();
  for (const r of records) {
    const list = recordsByDate.get(r.date) ?? [];
    list.push(r);
    recordsByDate.set(r.date, list);
  }

  const selectedRecords = selectedDate ? (recordsByDate.get(selectedDate) ?? []) : [];

  return (
    <div>
      <div className="cal-grid-wrap">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((w) => (
            <div key={w.label} className={`cal-weekday ${w.className}`}>
              {w.label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-t border-line">
          {days.map((day, idx) => {
            if (!day) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[88px] border-b border-r border-line bg-paper sm:min-h-[108px]"
                />
              );
            }

            const dateStr = formatDate(day);
            const dayRecords = recordsByDate.get(dateStr) ?? [];
            const isToday = dateStr === today;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const other = dayRecords.filter((r) => r.mealType === "other");

            const renderSlot = (slotType: MealType, label: string) => {
              const items = dayRecords.filter((r) => r.mealType === slotType);
              if (items.length === 0) {
                return (
                  <Link
                    key={slotType}
                    href={`/?date=${dateStr}&mealType=${slotType}&returnTo=${returnToParam}`}
                    className="cal-cell-slot cal-cell-slot-empty"
                    title={`${label}を追加`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>{label}</span>
                    <span className="opacity-40">＋</span>
                  </Link>
                );
              }
              return items.map((r) => {
                const accent = getRecordAccentColor(r);
                const tint = getRecordAccentTint(r);
                const cookName = cookDisplayName(r.cookMemberId, memberMap);
                const prefix = r.category === "dining_out" ? "外" : "自";
                return (
                  <Link
                    key={r.id}
                    href={`/records/${r.id}/edit?returnTo=${returnToParam}`}
                    className="cal-cell-slot cal-cell-slot-filled"
                    style={{ borderLeftColor: accent, backgroundColor: tint }}
                    title={`${label} ${prefix} ${r.candidateName}${cookName ? ` (${cookName})` : ""} — クリックで編集`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="min-w-0 truncate">
                      {r.category === "dining_out" ? "🍽 " : "🍳 "}
                      {r.candidateName}
                    </span>
                  </Link>
                );
              });
            };

            return (
              <button
                key={dateStr}
                type="button"
                className={`cal-day-cell min-h-[88px] border-b border-r border-line px-1 py-1.5 text-left sm:min-h-[108px] sm:px-2 sm:py-2 ${
                  isToday ? "cal-day-today" : isWeekend ? "cal-day-weekend" : ""
                }`}
                onClick={() => setSelectedDate(dateStr)}
                aria-label={`${day.getDate()}日の献立を表示`}
              >
                <span
                  className={`cal-day-number ${isToday ? "cal-day-number-today" : "text-ink"}`}
                >
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {SLOTS.flatMap((s) => renderSlot(s.type, s.label))}
                  {other.length > 0 &&
                    other.map((r) => {
                      const accent = getRecordAccentColor(r);
                      const tint = getRecordAccentTint(r);
                      return (
                        <Link
                          key={r.id}
                          href={`/records/${r.id}/edit?returnTo=${returnToParam}`}
                          className="cal-cell-slot cal-cell-slot-filled"
                          style={{ borderLeftColor: accent, backgroundColor: tint }}
                          title={`他 ${r.candidateName} — クリックで編集`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="min-w-0 truncate">{r.candidateName}</span>
                        </Link>
                      );
                    })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-paper-elevated px-4 py-3 shadow-sm">
        {members.map((m) => (
          <span key={m.id} className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <span className="cal-legend-dot" style={{ backgroundColor: MEMBER_COLORS[m.id] }} />
            {m.name}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <span className="cal-legend-dot" style={{ backgroundColor: DINING_OUT_COLOR }} />
          外食
        </span>
        <span className="meta ml-auto sm:hidden">左右フリックで月移動</span>
        <span className="meta ml-auto hidden sm:inline">
          左右フリックで月移動 · 日付タップで詳細
        </span>
      </div>

      {selectedDate &&
        createPortal(
          <CalendarDayPanel
            date={selectedDate}
            records={selectedRecords}
            memberMap={memberMap}
            returnTo={returnTo}
            onClose={() => setSelectedDate(null)}
          />,
          document.body
        )}
    </div>
  );
}

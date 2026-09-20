"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CalendarDayPanel } from "@/components/CalendarDayPanel";
import {
  CATEGORY_LABELS,
  cookDisplayName,
  formatDate,
  getRecordAccentColor,
  getRecordAccentTint,
  todayString,
} from "@/lib/constants";
import type { MealType } from "@/lib/db";
import type { RecordWithDetails } from "@/lib/actions/records";

type Props = {
  year: number;
  month: number;
  records: RecordWithDetails[];
  memberMap: Record<string, string>;
  returnTo: string;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const SLOTS: { type: MealType; label: string; icon: string }[] = [
  { type: "lunch", label: "昼", icon: "☀️" },
  { type: "dinner", label: "夕", icon: "🌙" },
];

export function CalendarList({ year, month, records, memberMap, returnTo }: Props) {
  const returnToParam = encodeURIComponent(returnTo);
  const today = todayString();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const lastDay = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: lastDay }, (_, i) => new Date(year, month, i + 1));

  const recordsByDate = new Map<string, RecordWithDetails[]>();
  for (const r of records) {
    const list = recordsByDate.get(r.date) ?? [];
    list.push(r);
    recordsByDate.set(r.date, list);
  }

  const selectedRecords = selectedDate ? (recordsByDate.get(selectedDate) ?? []) : [];

  useEffect(() => {
    document.getElementById("cal-list-today")?.scrollIntoView({ block: "center" });
  }, [year, month]);

  return (
    <div>
      <div className="cal-list">
        {days.map((day) => {
          const dateStr = formatDate(day);
          const dayRecords = recordsByDate.get(dateStr) ?? [];
          const isToday = dateStr === today;
          const weekday = day.getDay();
          const isWeekend = weekday === 0 || weekday === 6;
          const other = dayRecords.filter((r) => r.mealType === "other");

          const renderSlot = (slotType: MealType, label: string, icon: string) => {
            const items = dayRecords.filter((r) => r.mealType === slotType);
            if (items.length === 0) {
              return (
                <Link
                  key={slotType}
                  href={`/?date=${dateStr}&mealType=${slotType}&returnTo=${returnToParam}`}
                  className="cal-list-meal cal-list-meal-empty"
                >
                  <span className="cal-list-meal-label">
                    {icon} {label}
                  </span>
                  <span className="cal-list-meal-name">未記録</span>
                </Link>
              );
            }
            return (
              <div key={slotType} className="space-y-1">
                {items.map((r) => {
                  const accent = getRecordAccentColor(r);
                  const tint = getRecordAccentTint(r);
                  const cookName = cookDisplayName(r.cookMemberId, memberMap);
                  return (
                    <Link
                      key={r.id}
                      href={`/records/${r.id}/edit?returnTo=${returnToParam}`}
                      className="cal-list-meal cal-list-meal-filled"
                      style={{ borderLeftColor: accent, backgroundColor: tint }}
                    >
                      <span className="cal-list-meal-label">
                        {icon} {label}
                      </span>
                      <span className="cal-list-meal-name">{r.candidateName}</span>
                      <span className="cal-list-meal-meta">
                        {r.category === "home_cooked" ? "🍳 " : "🍽 "}
                        {CATEGORY_LABELS[r.category]}
                        {cookName ? ` · ${cookName}` : ""}
                      </span>
                    </Link>
                  );
                })}
              </div>
            );
          };

          return (
            <article
              key={dateStr}
              id={isToday ? "cal-list-today" : undefined}
              className={`cal-list-day ${isToday ? "cal-list-day-today" : isWeekend ? "cal-list-day-weekend" : ""}`}
            >
              <button
                type="button"
                className="cal-list-date"
                onClick={() => setSelectedDate(dateStr)}
                aria-label={`${day.getDate()}日の献立を表示`}
              >
                <span className={`cal-day-number ${isToday ? "cal-day-number-today" : "text-ink"}`}>
                  {day.getDate()}
                </span>
                <span
                  className={`cal-list-weekday ${
                    weekday === 6 ? "cal-weekday-sat" : weekday === 0 ? "cal-weekday-sun" : ""
                  }`}
                >
                  {WEEKDAYS[weekday]}
                </span>
                {isToday && <span className="cal-list-today-tag">今日</span>}
              </button>
              <div className="cal-list-meals">
                {SLOTS.map((s) => renderSlot(s.type, s.label, s.icon))}
                {other.map((r) => {
                  const accent = getRecordAccentColor(r);
                  const tint = getRecordAccentTint(r);
                  return (
                    <Link
                      key={r.id}
                      href={`/records/${r.id}/edit?returnTo=${returnToParam}`}
                      className="cal-list-meal cal-list-meal-filled cal-list-meal-other"
                      style={{ borderLeftColor: accent, backgroundColor: tint }}
                    >
                      <span className="cal-list-meal-label">🍴 その他</span>
                      <span className="cal-list-meal-name">{r.candidateName}</span>
                    </Link>
                  );
                })}
              </div>
            </article>
          );
        })}
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

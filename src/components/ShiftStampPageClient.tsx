"use client";

import {
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  DINNER_SKIP_COLOR,
  formatDate,
  formatShiftChipLabel,
  memberUsesShiftSchedule,
  SHIFT_TYPE_COLORS,
  SHIFT_TYPE_LABELS,
  SHIFT_TYPE_SHORT_LABELS,
  SHIFT_TYPES,
  todayString,
} from "@/lib/constants";
import {
  applyDinnerNeeds,
  applyShiftTypes,
  clearShiftStamps,
} from "@/lib/actions/shifts";
import type { ShiftMemberId, ShiftStamp, ShiftType } from "@/lib/db";

type Props = {
  year: number;
  month: number;
  stamps: ShiftStamp[];
  memberMap: Record<string, string>;
  memberIds: ShiftMemberId[];
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

function stampKey(date: string, memberId: string) {
  return `${date}:${memberId}`;
}

type StampEntry = {
  shiftType: ShiftType | null;
  needsDinner: boolean | null;
};

type DragState = {
  mode: "add" | "remove";
  touched: Set<string>;
  pointerId: number;
};

function chipToneClass(entry: StampEntry | undefined): string {
  if (!entry) return "shift-chip-blank";
  if (entry.needsDinner === false) return "shift-chip-skip";
  if (entry.needsDinner === true) return "shift-chip-need";
  if (entry.shiftType) return "shift-chip-shift-only";
  return "shift-chip-blank";
}

export function ShiftStampPageClient({
  year,
  month,
  stamps,
  memberMap,
  memberIds,
}: Props) {
  const today = todayString();
  const [activeMember, setActiveMember] = useState<ShiftMemberId>(
    memberIds[0] ?? "member_1"
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const dragRef = useRef<DragState | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const gridRef = useRef<HTMLDivElement>(null);

  const usesShift = memberUsesShiftSchedule(activeMember);

  const stampMap = useMemo(() => {
    const map = new Map<string, StampEntry>();
    for (const s of stamps) {
      map.set(stampKey(s.date, s.memberId), {
        shiftType: s.shiftType,
        needsDinner: s.needsDinner,
      });
    }
    return map;
  }, [stamps]);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  while (days.length % 7 !== 0) days.push(null);

  const daysInMonth = lastDay.getDate();
  const monthDates = useMemo(() => {
    const list: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(formatDate(new Date(year, month, d)));
    }
    return list;
  }, [year, month, daysInMonth]);

  function applyDragDate(dateStr: string) {
    const drag = dragRef.current;
    if (!drag || drag.touched.has(dateStr)) return;
    drag.touched.add(dateStr);
    setSelected((prev) => {
      const next = new Set(prev);
      if (drag.mode === "add") next.add(dateStr);
      else next.delete(dateStr);
      return next;
    });
  }

  function dateFromPoint(clientX: number, clientY: number): string | null {
    const el = document.elementFromPoint(clientX, clientY);
    const cell = el?.closest<HTMLElement>("[data-shift-date]");
    return cell?.dataset.shiftDate ?? null;
  }

  function endDrag(pointerId?: number) {
    const drag = dragRef.current;
    if (!drag) return;
    if (pointerId !== undefined && drag.pointerId !== pointerId) return;
    dragRef.current = null;
    setDragging(false);
    try {
      gridRef.current?.releasePointerCapture(drag.pointerId);
    } catch {
      /* already released */
    }
  }

  function onGridPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (pending || e.button !== 0) return;
    const dateStr = dateFromPoint(e.clientX, e.clientY);
    if (!dateStr) return;

    e.preventDefault();
    const mode = selectedRef.current.has(dateStr) ? "remove" : "add";
    dragRef.current = {
      mode,
      touched: new Set(),
      pointerId: e.pointerId,
    };
    setDragging(true);
    gridRef.current?.setPointerCapture(e.pointerId);
    applyDragDate(dateStr);
  }

  function onGridPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dateStr = dateFromPoint(e.clientX, e.clientY);
    if (dateStr) applyDragDate(dateStr);
  }

  function selectUnstamped() {
    const next = new Set<string>();
    for (const date of monthDates) {
      const entry = stampMap.get(stampKey(date, activeMember));
      if (usesShift) {
        if (!entry || (entry.shiftType === null && entry.needsDinner === null)) {
          next.add(date);
        }
      } else if (!entry || entry.needsDinner === null) {
        next.add(date);
      }
    }
    setSelected(next);
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function withSelected(run: (dates: string[]) => Promise<void>) {
    const dates = [...selected];
    if (dates.length === 0) {
      setError("日付を選択してください");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await run(dates);
        setSelected(new Set());
      } catch (err) {
        setError(err instanceof Error ? err.message : "保存に失敗しました");
      }
    });
  }

  function runApplyShift(shiftType: ShiftType) {
    withSelected((dates) =>
      applyShiftTypes({ memberId: activeMember, dates, shiftType })
    );
  }

  function runApplyDinner(needsDinner: boolean) {
    withSelected((dates) =>
      applyDinnerNeeds({ memberId: activeMember, dates, needsDinner })
    );
  }

  function runClear() {
    withSelected((dates) =>
      clearShiftStamps({ memberId: activeMember, dates })
    );
  }

  return (
    <div className="shift-page">
      <div
        ref={gridRef}
        className={`cal-grid-wrap shift-grid-wrap ${dragging ? "shift-grid-dragging" : ""}`}
        onPointerDown={onGridPointerDown}
        onPointerMove={onGridPointerMove}
        onPointerUp={(e) => endDrag(e.pointerId)}
        onPointerCancel={(e) => endDrag(e.pointerId)}
      >
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((w) => (
            <div key={w.label} className={`cal-weekday shift-weekday ${w.className}`}>
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
                  className="shift-cell shift-cell-empty"
                />
              );
            }

            const dateStr = formatDate(day);
            const isToday = dateStr === today;
            const isSelected = selected.has(dateStr);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div
                key={dateStr}
                data-shift-date={dateStr}
                className={[
                  "shift-cell",
                  isToday ? "shift-cell-today" : "",
                  isSelected ? "shift-cell-selected" : "",
                  isWeekend ? "shift-cell-weekend" : "",
                  pending ? "shift-cell-disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={isSelected}
                aria-label={`${dateStr}を選択`}
              >
                <span className="shift-cell-day">{day.getDate()}</span>
                <div className="shift-cell-stamps">
                  {memberIds.map((id) => {
                    const entry = stampMap.get(stampKey(dateStr, id));
                    const label = formatShiftChipLabel(
                      id,
                      entry?.shiftType ?? null,
                      entry?.needsDinner ?? null,
                      true
                    );
                    const fullLabel = formatShiftChipLabel(
                      id,
                      entry?.shiftType ?? null,
                      entry?.needsDinner ?? null,
                      false
                    );
                    return (
                      <span
                        key={id}
                        className={[
                          "shift-chip",
                          id === "member_1" ? "shift-chip-m1" : "shift-chip-m2",
                          chipToneClass(entry),
                          id === activeMember ? "shift-chip-active-member" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        title={`${memberMap[id] ?? id}: ${fullLabel || "未記入"}`}
                      >
                        {label || "·"}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="shift-toolbar card card-compact">
        <div className="shift-member-tabs" role="tablist" aria-label="対象メンバー">
          {memberIds.map((id) => {
            const on = activeMember === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={on}
                className={`shift-member-tab ${on ? "shift-member-tab-on" : ""} ${
                  id === "member_1" ? "shift-member-tab-m1" : "shift-member-tab-m2"
                }`}
                onClick={() => {
                  setActiveMember(id);
                  setSelected(new Set());
                  setError(null);
                }}
              >
                {memberMap[id] ?? id}
              </button>
            );
          })}
        </div>

        <div className="shift-select-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={selectUnstamped}
            disabled={pending}
          >
            未記入を選択
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={clearSelection}
            disabled={pending || selected.size === 0}
          >
            選択解除
          </button>
          <span className="shift-selected-count">
            {selected.size > 0
              ? `${selected.size}日選択中`
              : "ドラッグで日付を選択"}
          </span>
        </div>

        {usesShift && (
          <div className="shift-palette-block">
            <p className="shift-palette-heading">勤務帯</p>
            <div className="shift-palette" aria-label="勤務帯スタンプ">
              {SHIFT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className="shift-palette-btn"
                  style={{ "--stamp-color": SHIFT_TYPE_COLORS[type] } as CSSProperties}
                  disabled={pending || selected.size === 0}
                  onClick={() => runApplyShift(type)}
                  title={SHIFT_TYPE_LABELS[type]}
                >
                  <span className="shift-palette-short">
                    {SHIFT_TYPE_SHORT_LABELS[type]}
                  </span>
                  <span className="shift-palette-label">{SHIFT_TYPE_LABELS[type]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="shift-palette-block">
          <p className="shift-palette-heading">夜ご飯</p>
          <div className="shift-palette shift-palette-dinner" aria-label="夜ご飯スタンプ">
            <button
              type="button"
              className="shift-palette-btn shift-chip-skip"
              style={{ "--stamp-color": DINNER_SKIP_COLOR } as CSSProperties}
              disabled={pending || selected.size === 0}
              onClick={() => runApplyDinner(false)}
            >
              <span className="shift-palette-short">不要</span>
              <span className="shift-palette-label">いらない</span>
            </button>
            <button
              type="button"
              className="shift-palette-btn shift-palette-erase"
              disabled={pending || selected.size === 0}
              onClick={runClear}
            >
              <span className="shift-palette-short">クリア</span>
              <span className="shift-palette-label">クリア</span>
            </button>
          </div>
        </div>

        {error && <p className="shift-error">{error}</p>}
        {pending && <p className="shift-pending">保存中…</p>}
      </div>
    </div>
  );
}

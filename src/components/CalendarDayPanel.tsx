"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  CATEGORY_LABELS,
  cookDisplayName,
  formatDisplayDate,
  getRecordAccentColor,
  getRecordAccentTint,
} from "@/lib/constants";
import type { MealType } from "@/lib/db";
import type { RecordWithDetails } from "@/lib/actions/records";

type Props = {
  date: string;
  records: RecordWithDetails[];
  memberMap: Record<string, string>;
  returnTo: string;
  onClose: () => void;
};

const SLOT_ORDER: { type: MealType; label: string; icon: string }[] = [
  { type: "lunch", label: "昼食", icon: "☀️" },
  { type: "dinner", label: "夕食", icon: "🌙" },
  { type: "other", label: "その他", icon: "🍴" },
];

export function CalendarDayPanel({ date, records, memberMap, returnTo, onClose }: Props) {
  const returnToParam = encodeURIComponent(returnTo);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const recordsByType = new Map<MealType, RecordWithDetails[]>();
  for (const r of records) {
    const list = recordsByType.get(r.mealType) ?? [];
    list.push(r);
    recordsByType.set(r.mealType, list);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${formatDisplayDate(date)}の記録`}
    >
      <button
        type="button"
        className="modal-overlay absolute inset-0"
        onClick={onClose}
        aria-label="閉じる"
      />
      <div className="modal-panel relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-paper-elevated px-5 py-4">
          <div>
            <p className="kicker mb-1">📅 この日の献立</p>
            <h3 className="font-serif text-lg font-semibold tracking-wide">
              {formatDisplayDate(date)}
            </h3>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕ 閉じる
          </button>
        </div>

        <div className="space-y-1 px-5 py-4">
          {SLOT_ORDER.map(({ type, label, icon }) => {
            const items = recordsByType.get(type) ?? [];
            return (
              <div key={type} className="rounded-xl border border-line bg-paper p-4">
                <p className="label mb-3 flex items-center gap-1.5">
                  <span>{icon}</span>
                  {label}
                </p>
                {items.length === 0 ? (
                  <Link
                    href={`/?date=${date}&mealType=${type}&returnTo=${returnToParam}`}
                    className="cal-slot-empty flex w-full items-center justify-center gap-2 py-5"
                  >
                    <span className="text-xl leading-none">＋</span>
                    <span className="text-sm font-medium">記録を追加</span>
                  </Link>
                ) : (
                  <div className="space-y-2">
                    {items.map((r) => {
                      const accent = getRecordAccentColor(r);
                      const tint = getRecordAccentTint(r);
                      const cookName = cookDisplayName(r.cookMemberId, memberMap);
                      return (
                        <Link
                          key={r.id}
                          href={`/records/${r.id}/edit?returnTo=${returnToParam}`}
                          className="cal-slot-filled group flex items-start gap-3 px-3 py-3"
                          style={{ borderLeftColor: accent, backgroundColor: tint }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-serif text-base font-semibold tracking-wide group-hover:text-primary">
                              {r.candidateName}
                            </p>
                            <p className="meta mt-1">
                              {r.category === "home_cooked" ? "🍳 " : "🍽 "}
                              {CATEGORY_LABELS[r.category]}
                              {cookName && ` · ${cookName}`}
                            </p>
                            {r.memo && (
                              <p className="mt-1.5 rounded-lg bg-paper-elevated px-2 py-1 text-xs text-muted line-clamp-2">
                                {r.memo}
                              </p>
                            )}
                          </div>
                          <span className="btn btn-secondary btn-sm shrink-0 !px-2.5 !py-1 text-xs">
                            編集
                          </span>
                        </Link>
                      );
                    })}
                    <Link
                      href={`/?date=${date}&mealType=${type}&returnTo=${returnToParam}`}
                      className="cal-slot-empty mt-1 flex w-full items-center justify-center gap-1.5 py-2.5 text-xs"
                    >
                      ＋ 追加
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-line px-5 py-4">
          <Link
            href={`/?date=${date}&returnTo=${returnToParam}`}
            className="btn btn-primary w-full"
          >
            ＋ この日に記録を追加
          </Link>
        </div>
      </div>
    </div>
  );
}

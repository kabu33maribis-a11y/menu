"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CandidatePicker } from "@/components/CandidatePicker";
import { createRecord, deleteRecord, updateRecord } from "@/lib/actions/records";
import { formatDate, formatDisplayDate, parseDate, todayString } from "@/lib/constants";
import type { CandidateSortOrder, CookMember, Eaters, MealCategory, MealType } from "@/lib/db";
import type { RecordWithDetails } from "@/lib/actions/records";

type Props = {
  members: { id: string; name: string }[];
  initial?: RecordWithDetails;
  defaultDate?: string;
  defaultMealType?: MealType;
  defaultCategory?: MealCategory;
  defaultCandidateId?: string;
  sortOrder: CandidateSortOrder;
  returnTo?: string;
};

function memberTone(id: string) {
  if (id === "member_1") return "m1";
  return "m2";
}

function weekdayClass(dateStr: string) {
  const day = parseDate(dateStr).getDay();
  if (day === 0) return "text-dinner";
  if (day === 6) return "text-[#4a7ab5]";
  return "text-ink";
}

function isPersonOn(value: string, personId: string) {
  return value === "both" || value === personId;
}

function togglePerson<T extends string>(current: T, personId: string, allIds: string[]): T {
  const selected = new Set(current === "both" ? allIds : [current]);
  if (selected.has(personId)) {
    if (selected.size <= 1) return current;
    selected.delete(personId);
  } else {
    selected.add(personId);
  }
  const remaining = allIds.filter((id) => selected.has(id));
  return (remaining.length === allIds.length ? "both" : remaining[0]) as T;
}

export function RecordForm({
  members,
  initial,
  defaultDate,
  defaultMealType,
  defaultCategory,
  defaultCandidateId,
  sortOrder,
  returnTo,
}: Props) {
  const router = useRouter();
  const afterSavePath = returnTo ?? "/records";
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(initial?.date ?? defaultDate ?? todayString());
  const [mealType, setMealType] = useState<MealType>(
    initial?.mealType ?? defaultMealType ?? "dinner"
  );
  const [category, setCategory] = useState<MealCategory>(
    initial?.category ?? defaultCategory ?? "home_cooked"
  );
  const [cookMemberId, setCookMemberId] = useState<CookMember>(
    initial?.cookMemberId ?? "member_1"
  );
  const [eaters, setEaters] = useState<Eaters>(initial?.eaters ?? "both");
  const [candidateId, setCandidateId] = useState(
    initial?.candidateId ?? defaultCandidateId ?? ""
  );
  const [candidateName, setCandidateName] = useState(initial?.candidateName ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [showMemo, setShowMemo] = useState(Boolean(initial?.memo));
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const today = todayString();
  const isToday = date === today;
  const memberIds = members.map((m) => m.id);

  const save = (continueEntering: boolean) => {
    if (!candidateId) {
      setError("内容を選択してください");
      return;
    }
    setError(null);
    setSavedMessage(null);
    startTransition(async () => {
      try {
        const payload = {
          date,
          mealType,
          category,
          cookMemberId: category === "home_cooked" ? cookMemberId : null,
          eaters,
          candidateId,
          memo,
        };
        if (initial) {
          await updateRecord(initial.id, payload);
          router.push(afterSavePath);
          router.refresh();
          return;
        }
        await createRecord(payload);
        if (continueEntering) {
          setCandidateId("");
          setCandidateName("");
          setMemo("");
          setShowMemo(false);
          setSavedMessage("保存しました。続けて入力できます。");
          router.refresh();
        } else {
          router.push(afterSavePath);
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "保存に失敗しました");
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save(false);
  };

  const handleDelete = () => {
    if (!initial) return;
    if (!confirm("この記録を削除しますか？")) return;
    startTransition(async () => {
      await deleteRecord(initial.id);
      router.push(afterSavePath);
      router.refresh();
    });
  };

  const shiftDate = (delta: number) => {
    const next = parseDate(date);
    next.setDate(next.getDate() + delta);
    setDate(formatDate(next));
    setSavedMessage(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      <div
        className={`date-banner ${
          mealType === "lunch"
            ? "date-banner-lunch"
            : mealType === "dinner"
              ? "date-banner-dinner"
              : "date-banner-other"
        }`}
      >
        <button
          type="button"
          className="date-banner-btn"
          onClick={() => shiftDate(-1)}
          aria-label="前の日"
        >
          ←
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
          <label className="relative inline-flex min-w-0 cursor-pointer items-center gap-1">
            {initial && (
              <span className="kicker mb-0" aria-hidden="true">
                ✏️
              </span>
            )}
            <span className={`date-banner-date ${weekdayClass(date)}`}>
              {formatDisplayDate(date)}
            </span>
            <input
              type="date"
              className="date-banner-input absolute inset-0 cursor-pointer opacity-0"
              value={date}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch {
                  e.currentTarget.focus();
                }
              }}
              onChange={(e) => {
                setDate(e.target.value);
                setSavedMessage(null);
              }}
              aria-label="日付を選ぶ"
            />
          </label>
          {!isToday ? (
            <button
              type="button"
              className="badge bg-paper-elevated text-primary-dark"
              onClick={() => {
                setDate(today);
                setSavedMessage(null);
              }}
            >
              今日へ
            </button>
          ) : (
            <span className="badge badge-home">今日</span>
          )}
        </div>
        <button
          type="button"
          className="date-banner-btn"
          onClick={() => shiftDate(1)}
          aria-label="次の日"
        >
          →
        </button>
      </div>

      <div className="record-form-body">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-light px-3 py-2 text-sm font-medium text-danger">
            {error}
          </div>
        )}
        {savedMessage && (
          <div className="rounded-lg border border-secondary/30 bg-secondary-light px-3 py-2 text-sm font-medium text-secondary-dark">
            {savedMessage}
          </div>
        )}

        <div className="record-choice-stack">
          <div className="flex gap-1.5">
            <button
              type="button"
              className={`choice choice-compact choice-home ${category === "home_cooked" ? "choice-on" : ""}`}
              onClick={() => {
                if (category !== "home_cooked") {
                  setCategory("home_cooked");
                  setCandidateId("");
                  setCandidateName("");
                }
              }}
            >
              <span className="choice-compact-icon" aria-hidden="true">
                🍳
              </span>
              自炊
            </button>
            <button
              type="button"
              className={`choice choice-compact choice-out ${category === "dining_out" ? "choice-on" : ""}`}
              onClick={() => {
                if (category !== "dining_out") {
                  setCategory("dining_out");
                  setCandidateId("");
                  setCandidateName("");
                }
              }}
            >
              <span className="choice-compact-icon" aria-hidden="true">
                🍽
              </span>
              外食
            </button>
          </div>
          <div className="flex gap-1.5">
            {(
              [
                ["lunch", "☀️", "昼", "choice-lunch"],
                ["dinner", "🌙", "夕", "choice-dinner"],
                ["other", "🍴", "他", "choice-other"],
              ] as const
            ).map(([value, emoji, label, tone]) => (
              <button
                key={value}
                type="button"
                className={`choice choice-compact ${tone} ${mealType === value ? "choice-on" : ""}`}
                onClick={() => setMealType(value)}
                aria-label={value === "lunch" ? "昼食" : value === "dinner" ? "夕食" : "その他"}
              >
                <span className="choice-compact-icon" aria-hidden="true">
                  {emoji}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="record-people">
          {category === "home_cooked" && (
            <div className="record-people-row">
              <p className="record-people-label">作った</p>
              <div className="flex min-w-0 flex-1 gap-1.5">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`choice choice-compact choice-${memberTone(m.id)} ${
                      isPersonOn(cookMemberId, m.id) ? "choice-on" : ""
                    }`}
                    onClick={() => setCookMemberId(togglePerson(cookMemberId, m.id, memberIds))}
                    aria-pressed={isPersonOn(cookMemberId, m.id)}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="record-people-row">
            <p className="record-people-label">食べた</p>
            <div className="flex min-w-0 flex-1 gap-1.5">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`choice choice-compact choice-${memberTone(m.id)} ${
                    isPersonOn(eaters, m.id) ? "choice-on" : ""
                  }`}
                  onClick={() => setEaters(togglePerson(eaters, m.id, memberIds))}
                  aria-pressed={isPersonOn(eaters, m.id)}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="record-dish">
          {candidateName ? (
            <div
              className={`selected-dish ${
                category === "home_cooked" ? "selected-dish-home" : "selected-dish-out"
              }`}
            >
              <span aria-hidden="true">✓</span>
              <p className="min-w-0 flex-1 font-serif text-base font-semibold tracking-wide">
                {candidateName}
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setCandidateId("");
                  setCandidateName("");
                }}
              >
                変更
              </button>
            </div>
          ) : (
            <>
              <p className="record-people-label mb-0">内容</p>
              <CandidatePicker
                key={category}
                category={category}
                selectedId={candidateId}
                initialSortOrder={sortOrder}
                onSelect={(id, name) => {
                  setCandidateId(id);
                  setCandidateName(name);
                  setError(null);
                }}
              />
            </>
          )}
        </div>

        {showMemo ? (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="record-people-label mb-0" htmlFor="record-memo">
                メモ
              </label>
              {!memo && (
                <button
                  type="button"
                  className="text-xs font-medium text-muted"
                  onClick={() => setShowMemo(false)}
                >
                  閉じる
                </button>
              )}
            </div>
            <textarea
              id="record-memo"
              className="input min-h-[64px]"
              placeholder="味の感想、お店のメモなど"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>
        ) : (
          <button
            type="button"
            className="record-memo-toggle"
            onClick={() => setShowMemo(true)}
          >
            ＋ メモ
          </button>
        )}
      </div>

      <div className="form-actions-bar">
        <button type="submit" className="btn btn-primary record-save-main" disabled={pending}>
          {initial ? "✓ 更新する" : "✓ 保存する"}
        </button>
        {!initial && (
          <button
            type="button"
            className="btn btn-success"
            disabled={pending}
            onClick={() => save(true)}
          >
            続けて入力
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
          キャンセル
        </button>
        {initial && (
          <button
            type="button"
            className="btn btn-danger ml-auto"
            onClick={handleDelete}
            disabled={pending}
          >
            削除
          </button>
        )}
      </div>
    </form>
  );
}

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
  if (id === "both") return "both";
  if (id === "member_1") return "m1";
  return "m2";
}

function weekdayClass(dateStr: string) {
  const day = parseDate(dateStr).getDay();
  if (day === 0) return "text-dinner";
  if (day === 6) return "text-[#4a7ab5]";
  return "text-ink";
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
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const today = todayString();
  const isToday = date === today;
  const mealLabel = mealType === "lunch" ? "昼食" : mealType === "dinner" ? "夕食" : "その他";
  const mealEmoji = mealType === "lunch" ? "☀️" : mealType === "dinner" ? "🌙" : "🍴";
  const categoryLabel = category === "home_cooked" ? "自炊" : "外食";
  const cookName =
    cookMemberId === "both"
      ? "2人とも"
      : members.find((m) => m.id === cookMemberId)?.name ?? "";

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
        <div className="min-w-0 flex-1 text-center">
          {initial && (
            <p className="kicker mb-1 justify-center">✏️ 編集中</p>
          )}
          <label className="relative mx-auto inline-flex cursor-pointer flex-col items-center">
            <span className={`date-banner-date ${weekdayClass(date)}`}>
              {formatDisplayDate(date)}
            </span>
            <span className="mt-1 text-sm font-medium text-muted">
              {mealEmoji} {mealLabel} · {category === "home_cooked" ? "🍳" : "🍽"} {categoryLabel}
              {category === "home_cooked" && cookName ? ` · ${cookName}` : ""}
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
          <div className="mt-2 flex justify-center gap-2">
            {!isToday && (
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
            )}
            {isToday && <span className="badge badge-home">今日</span>}
          </div>
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

      <div className="space-y-4 px-4 py-5 sm:px-6">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        )}
        {savedMessage && (
          <div className="rounded-xl border border-secondary/30 bg-secondary-light px-4 py-3 text-sm font-medium text-secondary-dark">
            {savedMessage}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="label">種別</p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`choice choice-tile choice-home ${category === "home_cooked" ? "choice-on" : ""}`}
                onClick={() => {
                  if (category !== "home_cooked") {
                    setCategory("home_cooked");
                    setCandidateId("");
                    setCandidateName("");
                  }
                }}
              >
                <span className="choice-tile-icon" aria-hidden="true">
                  🍳
                </span>
                自炊
              </button>
              <button
                type="button"
                className={`choice choice-tile choice-out ${category === "dining_out" ? "choice-on" : ""}`}
                onClick={() => {
                  if (category !== "dining_out") {
                    setCategory("dining_out");
                    setCandidateId("");
                    setCandidateName("");
                  }
                }}
              >
                <span className="choice-tile-icon" aria-hidden="true">
                  🍽
                </span>
                外食
              </button>
            </div>
          </div>

          <div>
            <p className="label">食事区分</p>
            <div className="flex gap-2">
              {(
                [
                  ["lunch", "☀️", "昼食", "choice-lunch"],
                  ["dinner", "🌙", "夕食", "choice-dinner"],
                  ["other", "🍴", "その他", "choice-other"],
                ] as const
              ).map(([value, emoji, label, tone]) => (
                <button
                  key={value}
                  type="button"
                  className={`choice choice-tile ${tone} ${mealType === value ? "choice-on" : ""}`}
                  onClick={() => setMealType(value)}
                >
                  <span className="choice-tile-icon" aria-hidden="true">
                    {emoji}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`grid gap-3 ${category === "home_cooked" ? "sm:grid-cols-2" : ""}`}>
          {category === "home_cooked" && (
            <div className="form-block form-block-home">
              <p className="label">👨‍🍳 作った人</p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`choice choice-${memberTone(m.id)} ${cookMemberId === m.id ? "choice-on" : ""}`}
                    onClick={() => setCookMemberId(m.id as CookMember)}
                  >
                    {m.name}
                  </button>
                ))}
                <button
                  type="button"
                  className={`choice choice-both ${cookMemberId === "both" ? "choice-on" : ""}`}
                  onClick={() => setCookMemberId("both")}
                >
                  2人とも
                </button>
              </div>
              {cookMemberId === "both" && (
                <p className="meta mt-2">調理回数は各0.5回で集計します</p>
              )}
            </div>
          )}

          <div className={`form-block ${category === "dining_out" ? "form-block-out" : ""}`}>
            <p className="label">😋 食べた人</p>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`choice choice-${memberTone(m.id)} ${eaters === m.id ? "choice-on" : ""}`}
                  onClick={() => setEaters(m.id as Eaters)}
                >
                  {m.name}
                </button>
              ))}
              <button
                type="button"
                className={`choice choice-both ${eaters === "both" ? "choice-on" : ""}`}
                onClick={() => setEaters("both")}
              >
                2人とも
              </button>
            </div>
          </div>
        </div>

        <div className="form-block form-block-dish">
          <p className="label">📝 内容</p>
          {candidateName ? (
            <div
              className={`selected-dish mb-3 ${
                category === "home_cooked" ? "selected-dish-home" : "selected-dish-out"
              }`}
            >
              <span className="text-lg" aria-hidden="true">
                ✓
              </span>
              <p className="min-w-0 flex-1 font-serif text-lg font-semibold tracking-wide">
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
            <p className="meta mb-3">料理や店を選んでください</p>
          )}
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
        </div>

        <div>
          <label className="label" htmlFor="record-memo">
            メモ（任意）
          </label>
          <textarea
            id="record-memo"
            className="input min-h-[80px]"
            placeholder="味の感想、お店のメモなど"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>
      </div>

      <div className="form-actions-bar">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {initial ? "✓ 更新する" : "✓ 保存する"}
        </button>
        {!initial && (
          <button
            type="button"
            className="btn btn-success"
            disabled={pending}
            onClick={() => save(true)}
          >
            保存して続けて入力
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

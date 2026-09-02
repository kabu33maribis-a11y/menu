"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CandidatePicker } from "@/components/CandidatePicker";
import { createRecord, deleteRecord, updateRecord } from "@/lib/actions/records";
import { formatDate, parseDate, todayString } from "@/lib/constants";
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
    initial?.cookMemberId ?? (members[0]?.id as CookMember) ?? "member_1"
  );
  const [eaters, setEaters] = useState<Eaters>(initial?.eaters ?? "both");
  const [candidateId, setCandidateId] = useState(
    initial?.candidateId ?? defaultCandidateId ?? ""
  );
  const [candidateName, setCandidateName] = useState(initial?.candidateName ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

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
    <form onSubmit={handleSubmit} className="max-w-xl space-y-8">
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

      <div>
        <label className="label">📅 日付</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-secondary btn-sm shrink-0"
            onClick={() => shiftDate(-1)}
            aria-label="前の日"
          >
            ←
          </button>
          <input
            type="date"
            className="input min-w-0 flex-1"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSavedMessage(null);
            }}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm shrink-0"
            onClick={() => shiftDate(1)}
            aria-label="次の日"
          >
            →
          </button>
        </div>
      </div>

      <div>
        <label className="label">🍳 種別</label>
        <div className="flex flex-wrap gap-2">
          {(["home_cooked", "dining_out"] as MealCategory[]).map((c) => (
            <button
              key={c}
              type="button"
              className={`choice ${category === c ? "choice-on" : ""}`}
              onClick={() => {
                if (category !== c) {
                  setCategory(c);
                  setCandidateId("");
                  setCandidateName("");
                }
              }}
            >
              {c === "home_cooked" ? "🍳 自炊" : "🍽 外食"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">🕐 食事区分</label>
        <div className="flex flex-wrap gap-2">
          {(["lunch", "dinner", "other"] as MealType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`choice ${mealType === t ? "choice-on" : ""}`}
              onClick={() => setMealType(t)}
            >
              {t === "lunch" ? "☀️ 昼食" : t === "dinner" ? "🌙 夕食" : "🍴 その他"}
            </button>
          ))}
        </div>
      </div>

      {category === "home_cooked" && (
        <div>
          <label className="label">👨‍🍳 作った人</label>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`choice ${cookMemberId === m.id ? "choice-on" : ""}`}
                onClick={() => setCookMemberId(m.id as CookMember)}
              >
                {m.name}
              </button>
            ))}
            <button
              type="button"
              className={`choice ${cookMemberId === "both" ? "choice-on" : ""}`}
              onClick={() => setCookMemberId("both")}
            >
              2人とも
            </button>
          </div>
          <p className="meta mt-2">「2人とも」は調理回数を各0.5回で集計します</p>
        </div>
      )}

      <div>
        <label className="label">😋 食べた人</label>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`choice ${eaters === m.id ? "choice-on" : ""}`}
              onClick={() => setEaters(m.id as Eaters)}
            >
              {m.name}
            </button>
          ))}
          <button
            type="button"
            className={`choice ${eaters === "both" ? "choice-on" : ""}`}
            onClick={() => setEaters("both")}
          >
            2人とも
          </button>
        </div>
      </div>

      <div>
        <label className="label">📝 内容</label>
        {candidateName && (
          <p className="mb-3 rounded-lg bg-primary-light px-3 py-2 font-serif text-base font-medium tracking-wide text-primary-dark">
            選択中 · {candidateName}
          </p>
        )}
        <CandidatePicker
          key={category}
          category={category}
          selectedId={candidateId}
          initialSortOrder={sortOrder}
          onSelect={(id, name) => {
            setCandidateId(id);
            setCandidateName(name);
          }}
        />
      </div>

      <div>
        <label className="label">メモ（任意）</label>
        <textarea
          className="input min-h-[88px]"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
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

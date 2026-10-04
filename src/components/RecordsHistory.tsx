"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DateInput } from "@/components/DateInput";
import { RecordCard } from "@/components/RecordCard";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { RecordWithDetails } from "@/lib/actions/records";

export type RecordFilters = {
  start?: string;
  end?: string;
  category?: string;
  member?: string;
};

type Props = {
  records: RecordWithDetails[];
  memberMap: Record<string, string>;
  filters: RecordFilters;
};

function shortDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${year}/${Number(month)}/${Number(day)}`;
}

function filterSummary(filters: RecordFilters, memberMap: Record<string, string>): string[] {
  const parts: string[] = [];
  if (filters.start && filters.end) {
    parts.push(`${shortDate(filters.start)}〜${shortDate(filters.end)}`);
  } else if (filters.start) {
    parts.push(`${shortDate(filters.start)}以降`);
  } else if (filters.end) {
    parts.push(`${shortDate(filters.end)}まで`);
  }
  if (filters.category && CATEGORY_LABELS[filters.category]) {
    parts.push(filters.category === "home_cooked" ? "🍳 自炊" : "🍽 外食");
  }
  if (filters.member && memberMap[filters.member]) {
    parts.push(memberMap[filters.member]);
  }
  return parts;
}

export function RecordsHistory({ records, memberMap, filters }: Props) {
  const [open, setOpen] = useState(false);
  const summary = filterSummary(filters, memberMap);
  const hasFilters = summary.length > 0;
  const filterKey = `${filters.start ?? ""}|${filters.end ?? ""}|${filters.category ?? ""}|${filters.member ?? ""}`;
  const closeFilter = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setOpen(false);
  }, [filterKey]);

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="kicker mb-1">📋 履歴</p>
          <h2 className="page-title">履歴</h2>
          <p className="meta mt-1">{records.length} 件</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            className="btn btn-secondary flex-1 sm:flex-none"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            🔍 検索
          </button>
          <Link href="/" className="btn btn-primary flex-1 sm:flex-none">
            ＋ 記録を追加
          </Link>
        </div>
      </div>

      {hasFilters ? (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink">
            <span className="font-medium text-primary">絞り込み中</span>
            <span className="ml-2">{summary.join(" · ")}</span>
          </p>
          <Link href="/records" className="btn btn-ghost btn-sm shrink-0">
            解除
          </Link>
        </div>
      ) : null}

      {records.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="mb-2 text-3xl" aria-hidden="true">
            📭
          </p>
          <p className="text-sm font-medium text-muted">
            {hasFilters ? "条件に合う記録がありません" : "記録がありません"}
          </p>
          {hasFilters ? (
            <button type="button" className="btn btn-secondary mt-4" onClick={() => setOpen(true)}>
              条件を変える
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <RecordCard key={record.id} record={record} memberMap={memberMap} />
          ))}
        </div>
      )}

      {open ? (
        <FilterScreen
          filters={filters}
          memberMap={memberMap}
          hasFilters={hasFilters}
          onClose={closeFilter}
        />
      ) : null}
    </div>
  );
}

function FilterScreen({
  filters,
  memberMap,
  hasFilters,
  onClose,
}: {
  filters: RecordFilters;
  memberMap: Record<string, string>;
  hasFilters: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="records-filter-screen" role="dialog" aria-modal="true" aria-labelledby="records-filter-title">
      <button type="button" className="records-filter-backdrop" onClick={onClose} aria-label="閉じる" />
      <div className="records-filter-panel">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="kicker mb-1">🔍 検索</p>
            <h3 id="records-filter-title" className="font-serif text-lg font-semibold tracking-wide">
              絞り込み
            </h3>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕ 閉じる
          </button>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const params = new URLSearchParams();
            for (const [key, value] of data.entries()) {
              if (typeof value === "string" && value) params.set(key, value);
            }
            const query = params.toString();
            onClose();
            router.push(query ? `/records?${query}` : "/records");
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="min-w-0">
              <label className="label" htmlFor="record-filter-start">
                開始日
              </label>
              <DateInput id="record-filter-start" name="start" defaultValue={filters.start ?? ""} />
            </div>
            <div className="min-w-0">
              <label className="label" htmlFor="record-filter-end">
                終了日
              </label>
              <DateInput id="record-filter-end" name="end" defaultValue={filters.end ?? ""} />
            </div>
            <div className="min-w-0">
              <label className="label" htmlFor="record-filter-category">
                種別
              </label>
              <select
                id="record-filter-category"
                name="category"
                defaultValue={filters.category ?? ""}
                className="input"
              >
                <option value="">すべて</option>
                <option value="home_cooked">自炊</option>
                <option value="dining_out">外食</option>
              </select>
            </div>
            <div className="min-w-0">
              <label className="label" htmlFor="record-filter-member">
                メンバー
              </label>
              <select
                id="record-filter-member"
                name="member"
                defaultValue={filters.member ?? ""}
                className="input"
              >
                <option value="">すべて</option>
                <option value="member_1">{memberMap.member_1}</option>
                <option value="member_2">{memberMap.member_2}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-line px-5 py-4">
            <button type="submit" className="btn btn-primary w-full">
              絞り込む
            </button>
            {hasFilters ? (
              <Link href="/records" className="btn btn-secondary w-full" onClick={onClose}>
                条件を解除
              </Link>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

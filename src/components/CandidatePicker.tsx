"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createCandidate,
  getCandidates,
} from "@/lib/actions/candidates";
import { setCandidateSortOrder } from "@/lib/actions/settings";
import { isDiningOutUnknownCandidate, SORT_ORDER_LABELS } from "@/lib/constants";
import type { CandidateSortOrder, MealCategory } from "@/lib/db";
import type { CandidateWithStats } from "@/lib/utils/candidates";

type Props = {
  category: MealCategory;
  selectedId?: string;
  onSelect: (id: string, name: string) => void;
  initialSortOrder: CandidateSortOrder;
};

export function CandidatePicker({
  category,
  selectedId,
  onSelect,
  initialSortOrder,
}: Props) {
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [candidates, setCandidates] = useState<CandidateWithStats[]>([]);
  const [unknownCandidate, setUnknownCandidate] = useState<CandidateWithStats | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState("");
  const [newReading, setNewReading] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [pending, startTransition] = useTransition();

  const load = (q = query) => {
    startTransition(async () => {
      const list = await getCandidates(category, { query: q });
      const unknown = list.find(isDiningOutUnknownCandidate) ?? null;
      setCandidates(list.filter((c) => !isDiningOutUnknownCandidate(c)));
      if (!q || unknown) setUnknownCandidate(unknown);
      setLoaded(true);
    });
  };

  useEffect(() => {
    setUnknownCandidate(null);
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(query);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSortChange = (order: CandidateSortOrder) => {
    setSortOrder(order);
    startTransition(async () => {
      await setCandidateSortOrder(order);
      load(query);
    });
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      const created = await createCandidate({
        name: newName,
        reading: newReading,
        category,
      });
      setNewName("");
      setNewReading("");
      setShowNewForm(false);
      onSelect(created.id, created.name);
      load(query);
    });
  };

  return (
    <div className="space-y-4">
      {category === "dining_out" && unknownCandidate && (
        <button
          type="button"
          onClick={() => onSelect(unknownCandidate.id, unknownCandidate.name)}
          className={`flex w-full items-baseline justify-between gap-4 border-b border-line py-3 text-left ${
            selectedId === unknownCandidate.id ? "text-ink" : "text-muted hover:text-ink"
          }`}
        >
          <span>
            <span
              className={`tracking-wide ${selectedId === unknownCandidate.id ? "font-serif text-ink" : ""}`}
            >
              {unknownCandidate.name}
            </span>
            <span className="meta mt-1 block">店名・メニューを覚えていないときに選ぶ</span>
          </span>
          <span className="meta shrink-0">
            {unknownCandidate.usageCount}回
            {unknownCandidate.lastUsedDate
              ? ` · ${unknownCandidate.lastUsedDate}`
              : " · 未使用"}
          </span>
        </button>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <select
          className="input max-w-[160px]"
          value={sortOrder}
          onChange={(e) => handleSortChange(e.target.value as CandidateSortOrder)}
        >
          {Object.entries(SORT_ORDER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          className="input flex-1"
          placeholder="候補を検索（入力で絞り込み）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), load(query))}
        />
        {pending && <span className="meta shrink-0">検索中</span>}
      </div>

      <div className="max-h-64 overflow-y-auto border-t border-line">
        {!loaded && <p className="py-4 text-sm text-muted">読み込み中</p>}
        {loaded && candidates.length === 0 && (
          <p className="py-4 text-sm text-muted">候補がありません</p>
        )}
        {candidates.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id, c.name)}
            className={`flex w-full items-baseline justify-between gap-4 border-b border-line py-3 text-left ${
              selectedId === c.id ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            <span className={`tracking-wide ${selectedId === c.id ? "font-serif text-ink" : ""}`}>
              {c.name}
            </span>
            <span className="meta shrink-0">
              {c.usageCount}回
              {c.lastUsedDate ? ` · ${c.lastUsedDate}` : " · 未使用"}
            </span>
          </button>
        ))}
      </div>

      {!showNewForm ? (
        <button type="button" className="btn btn-secondary" onClick={() => setShowNewForm(true)}>
          新規候補を追加
        </button>
      ) : (
        <div className="space-y-3 pt-2">
          <input
            className="input"
            placeholder="名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="input"
            placeholder="かな読み（任意）"
            value={newReading}
            onChange={(e) => setNewReading(e.target.value)}
          />
          <div className="flex gap-4">
            <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={pending}>
              追加
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowNewForm(false)}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

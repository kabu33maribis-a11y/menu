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

  const chipTone = category === "home_cooked" ? "candidate-chip-home" : "candidate-chip-out";

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
    <div className="space-y-3">
      {category === "dining_out" && unknownCandidate && (
        <button
          type="button"
          onClick={() => onSelect(unknownCandidate.id, unknownCandidate.name)}
          className={`candidate-chip candidate-chip-unknown candidate-chip-out ${
            selectedId === unknownCandidate.id ? "candidate-chip-on" : ""
          }`}
        >
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{unknownCandidate.name}</span>
            <span className="meta mt-0.5 block font-normal">
              店名・メニューを覚えていないときに選ぶ
            </span>
          </span>
          <span className="candidate-chip-count shrink-0">
            {unknownCandidate.usageCount}回
          </span>
        </button>
      )}

      <input
        className="input"
        placeholder="候補を検索"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), load(query))}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {Object.entries(SORT_ORDER_LABELS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`choice choice-sm ${
              sortOrder === value
                ? `choice-on ${category === "home_cooked" ? "choice-home" : "choice-out"}`
                : ""
            }`}
            onClick={() => handleSortChange(value as CandidateSortOrder)}
          >
            {label}
          </button>
        ))}
        {pending && <span className="meta ml-1">検索中</span>}
      </div>

      <div className="candidate-grid">
        {!loaded && <p className="py-3 text-sm text-muted">読み込み中</p>}
        {loaded && candidates.length === 0 && (
          <p className="py-3 text-sm text-muted">候補がありません</p>
        )}
        {candidates.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id, c.name)}
            className={`candidate-chip ${chipTone} ${
              selectedId === c.id ? "candidate-chip-on" : ""
            }`}
          >
            <span>{c.name}</span>
            <span className="candidate-chip-count">
              {c.usageCount}
              {c.lastUsedDate ? ` · ${c.lastUsedDate.slice(5)}` : ""}
            </span>
          </button>
        ))}
      </div>

      {!showNewForm ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNewForm(true)}>
          ＋ 新規候補を追加
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-line bg-paper-elevated p-3">
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
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={handleCreate} disabled={pending}>
              追加
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNewForm(false)}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

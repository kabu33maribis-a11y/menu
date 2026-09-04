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

function optionLabel(c: CandidateWithStats) {
  const extra = [
    `${c.usageCount}回`,
    c.lastUsedDate ? c.lastUsedDate.slice(5) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return extra ? `${c.name}（${extra}）` : c.name;
}

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
  const [knownById, setKnownById] = useState<Record<string, CandidateWithStats>>({});
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState("");
  const [newReading, setNewReading] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [pending, startTransition] = useTransition();

  const load = (q = query) => {
    startTransition(async () => {
      const list = await getCandidates(category, { query: q });
      const unknown = list.find(isDiningOutUnknownCandidate) ?? null;
      const visible = list.filter((c) => !isDiningOutUnknownCandidate(c));
      setCandidates(visible);
      if (!q || unknown) setUnknownCandidate(unknown);
      setKnownById((prev) => {
        const next = { ...prev };
        for (const c of list) next[c.id] = c;
        return next;
      });
      setLoaded(true);
    });
  };

  useEffect(() => {
    setUnknownCandidate(null);
    setKnownById({});
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

  const handleSelectChange = (id: string) => {
    if (!id) return;
    const picked =
      unknownCandidate?.id === id
        ? unknownCandidate
        : candidates.find((c) => c.id === id) ?? knownById[id];
    if (picked) onSelect(picked.id, picked.name);
  };

  const dropdownItems = (() => {
    const items: CandidateWithStats[] = [];
    const seen = new Set<string>();
    if (unknownCandidate) {
      items.push(unknownCandidate);
      seen.add(unknownCandidate.id);
    }
    for (const c of candidates) {
      items.push(c);
      seen.add(c.id);
    }
    if (selectedId && !seen.has(selectedId) && knownById[selectedId]) {
      items.unshift(knownById[selectedId]);
    }
    return items;
  })();

  return (
    <div className="space-y-3">
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

      <select
        className="input candidate-select"
        value={selectedId ?? ""}
        onChange={(e) => handleSelectChange(e.target.value)}
        disabled={!loaded}
        aria-label="候補"
      >
        <option value="">
          {!loaded ? "読み込み中" : "料理や店を選んでください"}
        </option>
        {dropdownItems.map((c) => (
          <option key={c.id} value={c.id}>
            {optionLabel(c)}
          </option>
        ))}
      </select>
      {loaded && dropdownItems.length === 0 ? (
        <p className="text-sm text-muted">候補がありません</p>
      ) : null}
    </div>
  );
}

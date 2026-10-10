"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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

function optionMeta(c: CandidateWithStats) {
  return [
    `${c.usageCount}回`,
    c.lastUsedDate ? c.lastUsedDate.slice(5) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function CandidatePicker({
  category,
  selectedId,
  onSelect,
  initialSortOrder,
}: Props) {
  const [query, setQuery] = useState("");
  const [resultsQuery, setResultsQuery] = useState("");
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [candidates, setCandidates] = useState<CandidateWithStats[]>([]);
  const [unknownCandidate, setUnknownCandidate] = useState<CandidateWithStats | null>(null);
  const [knownById, setKnownById] = useState<Record<string, CandidateWithStats>>({});
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState("");
  const [newReading, setNewReading] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const requestSeq = useRef(0);
  const creatingRef = useRef(false);
  const queryRef = useRef(query);
  queryRef.current = query;

  const applyList = (q: string, list: CandidateWithStats[]) => {
    const unknown = list.find(isDiningOutUnknownCandidate) ?? null;
    const visible = list.filter((c) => !isDiningOutUnknownCandidate(c));
    setCandidates(visible);
    setUnknownCandidate(unknown);
    setKnownById((prev) => {
      const next = { ...prev };
      for (const c of list) next[c.id] = c;
      return next;
    });
    setResultsQuery(q);
    setLoaded(true);
    return { visible, unknown };
  };

  const load = (q = query) => {
    if (creatingRef.current) return;
    const id = ++requestSeq.current;
    startTransition(async () => {
      const list = await getCandidates(category, { query: q });
      if (id !== requestSeq.current || creatingRef.current) return;
      if (queryRef.current !== q) return;
      applyList(q, list);
    });
  };

  const createFromName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || creatingRef.current) return;
    creatingRef.current = true;
    startTransition(async () => {
      try {
        const created = await createCandidate({
          name: trimmed,
          category,
        });
        const withStats: CandidateWithStats = {
          ...created,
          usageCount: 0,
          lastUsedDate: null,
        };
        setKnownById((prev) => ({ ...prev, [created.id]: withStats }));
        queryRef.current = "";
        setQuery("");
        onSelect(created.id, created.name);
        const list = await getCandidates(category, { query: "" });
        if (queryRef.current !== "") return;
        applyList("", list);
      } finally {
        creatingRef.current = false;
        if (queryRef.current.trim() !== trimmed) load(queryRef.current);
      }
    });
  };

  const searchOrCreate = () => {
    const name = query.trim();
    if (!name) {
      load(query);
      return;
    }
    if (
      loaded &&
      resultsQuery === query &&
      candidates.length === 0 &&
      !unknownCandidate
    ) {
      createFromName(name);
      return;
    }
    if (creatingRef.current) return;
    creatingRef.current = true;
    const id = ++requestSeq.current;
    startTransition(async () => {
      try {
        const list = await getCandidates(category, { query: name });
        if (id !== requestSeq.current || queryRef.current.trim() !== name) return;
        const { visible, unknown } = applyList(name, list);
        if (visible.length > 0 || unknown) return;
        const created = await createCandidate({
          name,
          category,
        });
        const withStats: CandidateWithStats = {
          ...created,
          usageCount: 0,
          lastUsedDate: null,
        };
        setKnownById((prev) => ({ ...prev, [created.id]: withStats }));
        queryRef.current = "";
        setQuery("");
        onSelect(created.id, created.name);
        const full = await getCandidates(category, { query: "" });
        if (queryRef.current !== "") return;
        applyList("", full);
      } finally {
        creatingRef.current = false;
        if (queryRef.current.trim() !== name) load(queryRef.current);
      }
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
      if (seen.has(c.id)) continue;
      items.push(c);
      seen.add(c.id);
    }
    return items;
  })();

  const trimmedQuery = query.trim();
  const canCreateFromQuery =
    loaded &&
    !pending &&
    resultsQuery === query &&
    trimmedQuery.length > 0 &&
    candidates.length === 0 &&
    !unknownCandidate;

  return (
    <div className="candidate-picker">
      {showNewForm ? (
        <div className="candidate-new-form">
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
      ) : (
        <div className="candidate-search-row">
          <input
            className="input"
            placeholder="候補を検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              searchOrCreate();
            }}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm candidate-add-btn"
            onClick={() => {
              setNewName(trimmedQuery);
              setShowNewForm(true);
            }}
            aria-label="新規候補を追加"
            title="新規候補を追加"
          >
            ＋
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1">
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

      {!loaded ? (
        <p className="text-sm text-muted">読み込み中</p>
      ) : dropdownItems.length > 0 ? (
        <div className="candidate-list" role="listbox" aria-label="候補">
          {dropdownItems.map((c) => {
            const meta = optionMeta(c);
            const selected = selectedId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`candidate-option ${
                  selected
                    ? `candidate-option-on ${
                        category === "home_cooked"
                          ? "candidate-option-home"
                          : "candidate-option-out"
                      }`
                    : ""
                }`}
                onClick={() => handleSelectChange(c.id)}
              >
                <span className="candidate-option-name">{c.name}</span>
                {meta ? <span className="candidate-option-meta">{meta}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {canCreateFromQuery ? (
        <button
          type="button"
          className="btn btn-primary btn-sm candidate-create-query"
          onClick={() => createFromName(trimmedQuery)}
          disabled={pending}
        >
          「{trimmedQuery}」を新規登録
        </button>
      ) : loaded && dropdownItems.length === 0 ? (
        <p className="text-sm text-muted">候補がありません</p>
      ) : null}
    </div>
  );
}

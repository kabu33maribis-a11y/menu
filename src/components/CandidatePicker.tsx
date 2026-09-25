"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import {
  createCandidate,
  getCandidates,
} from "@/lib/actions/candidates";
import { setCandidateSortOrder } from "@/lib/actions/settings";
import { isDiningOutUnknownCandidate, SORT_ORDER_LABELS } from "@/lib/constants";
import type { CandidateSortOrder, MealCategory } from "@/lib/db";
import {
  filterCandidates,
  type CandidateWithStats,
} from "@/lib/utils/candidates";

type Props = {
  category: MealCategory;
  selectedId?: string;
  onSelect: (id: string, name: string) => void;
  initialSortOrder: CandidateSortOrder;
};

function metaLabel(c: CandidateWithStats) {
  return [
    `${c.usageCount}回`,
    c.lastUsedDate ? c.lastUsedDate.slice(5) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function hasExactNameMatch(items: CandidateWithStats[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return items.some((c) => c.name.toLowerCase() === q);
}

export function CandidatePicker({
  category,
  selectedId,
  onSelect,
  initialSortOrder,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [allCandidates, setAllCandidates] = useState<CandidateWithStats[]>([]);
  const [unknownCandidate, setUnknownCandidate] = useState<CandidateWithStats | null>(null);
  const [knownById, setKnownById] = useState<Record<string, CandidateWithStats>>({});
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const loadAll = () => {
    startTransition(async () => {
      setBusy(true);
      try {
        const list = await getCandidates(category);
        const unknown = list.find(isDiningOutUnknownCandidate) ?? null;
        const visible = list.filter((c) => !isDiningOutUnknownCandidate(c));
        setUnknownCandidate(unknown);
        setAllCandidates(visible);
        setKnownById((prev) => {
          const next = { ...prev };
          for (const c of list) next[c.id] = c;
          return next;
        });
        setLoaded(true);
      } finally {
        setBusy(false);
      }
    });
  };

  useEffect(() => {
    setUnknownCandidate(null);
    setKnownById({});
    setAllCandidates([]);
    setQuery("");
    setOpen(false);
    setLoaded(false);
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const trimmedQuery = query.trim();

  const filtered = filterCandidates(allCandidates, query);
  const listItems: CandidateWithStats[] = [];
  const seen = new Set<string>();

  if (unknownCandidate && !trimmedQuery) {
    listItems.push(unknownCandidate);
    seen.add(unknownCandidate.id);
  }
  for (const c of filtered) {
    listItems.push(c);
    seen.add(c.id);
  }
  if (selectedId && !seen.has(selectedId) && knownById[selectedId] && !trimmedQuery) {
    listItems.unshift(knownById[selectedId]);
  }

  const canCreate =
    trimmedQuery.length > 0 && !hasExactNameMatch(allCandidates, trimmedQuery);
  const optionCount = listItems.length + (canCreate ? 1 : 0);

  useEffect(() => {
    setHighlight(0);
  }, [query, listItems.length, canCreate]);

  const pick = (c: CandidateWithStats) => {
    onSelect(c.id, c.name);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const createFromQuery = (name = trimmedQuery) => {
    const value = name.trim();
    if (!value) return;
    startTransition(async () => {
      setBusy(true);
      try {
        const created = await createCandidate({ name: value, category });
        onSelect(created.id, created.name);
        setQuery("");
        setOpen(false);
        const list = await getCandidates(category);
        const unknown = list.find(isDiningOutUnknownCandidate) ?? null;
        const visible = list.filter((c) => !isDiningOutUnknownCandidate(c));
        setUnknownCandidate(unknown);
        setAllCandidates(visible);
        setKnownById((prev) => {
          const next = { ...prev };
          for (const c of list) next[c.id] = c;
          return next;
        });
        setLoaded(true);
      } finally {
        setBusy(false);
      }
    });
  };

  const handleSortChange = (order: CandidateSortOrder) => {
    setSortOrder(order);
    startTransition(async () => {
      setBusy(true);
      try {
        await setCandidateSortOrder(order);
        const list = await getCandidates(category);
        const unknown = list.find(isDiningOutUnknownCandidate) ?? null;
        const visible = list.filter((c) => !isDiningOutUnknownCandidate(c));
        setUnknownCandidate(unknown);
        setAllCandidates(visible);
        setKnownById((prev) => {
          const next = { ...prev };
          for (const c of list) next[c.id] = c;
          return next;
        });
        setLoaded(true);
      } finally {
        setBusy(false);
      }
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      if (optionCount === 0) return;
      setHighlight((prev) => (prev + 1) % optionCount);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (optionCount === 0) return;
      setHighlight((prev) => (prev - 1 + optionCount) % optionCount);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (!open && trimmedQuery) {
        setOpen(true);
        return;
      }
      if (canCreate && (listItems.length === 0 || highlight === listItems.length)) {
        createFromQuery();
        return;
      }
      if (listItems[highlight]) {
        pick(listItems[highlight]);
      } else if (canCreate) {
        createFromQuery();
      }
    }
  };

  return (
    <div className="candidate-picker" ref={rootRef}>
      <div className="candidate-search-row">
        <input
          ref={inputRef}
          className="input"
          placeholder="料理や店を検索・追加"
          value={query}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && optionCount > 0 ? `${listId}-opt-${highlight}` : undefined
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

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
        {busy && <span className="meta ml-1">更新中</span>}
      </div>

      {open ? (
        <div
          id={listId}
          className="candidate-suggest"
          role="listbox"
          aria-label="候補一覧"
        >
          {!loaded ? (
            <p className="candidate-suggest-empty">読み込み中…</p>
          ) : (
            <>
              {listItems.map((c, index) => {
                const meta = metaLabel(c);
                const isOn = selectedId === c.id || highlight === index;
                return (
                  <button
                    key={c.id}
                    type="button"
                    id={`${listId}-opt-${index}`}
                    role="option"
                    aria-selected={isOn}
                    className={`candidate-suggest-item ${
                      isDiningOutUnknownCandidate(c) ? "candidate-suggest-unknown" : ""
                    } ${category === "home_cooked" ? "candidate-suggest-home" : "candidate-suggest-out"} ${
                      isOn ? "candidate-suggest-item-on" : ""
                    } ${selectedId === c.id ? "candidate-suggest-item-selected" : ""}`}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => pick(c)}
                  >
                    <span className="candidate-suggest-name">{c.name}</span>
                    {meta ? <span className="candidate-suggest-meta">{meta}</span> : null}
                  </button>
                );
              })}

              {canCreate ? (
                <button
                  type="button"
                  id={`${listId}-opt-${listItems.length}`}
                  role="option"
                  aria-selected={highlight === listItems.length}
                  className={`candidate-suggest-item candidate-suggest-create ${
                    highlight === listItems.length ? "candidate-suggest-item-on" : ""
                  }`}
                  onMouseEnter={() => setHighlight(listItems.length)}
                  onClick={() => createFromQuery()}
                  disabled={busy}
                >
                  <span className="candidate-suggest-name">
                    「{trimmedQuery}」を新規追加
                  </span>
                  <span className="candidate-suggest-meta">＋</span>
                </button>
              ) : null}

              {listItems.length === 0 && !canCreate ? (
                <p className="candidate-suggest-empty">候補がありません</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

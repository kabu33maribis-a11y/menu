"use client";

import { useMemo, useState } from "react";
import { DateInput } from "@/components/DateInput";
import { StatsCharts } from "@/components/StatsCharts";
import { getWeekRange, getMonthRange, getLast3MonthsRange } from "@/lib/constants";
import { computeStats } from "@/lib/utils/stats";
import type { RecordWithDetails } from "@/lib/actions/records";

type Props = {
  records: RecordWithDetails[];
  memberMap: Record<string, string>;
  defaultStart: string;
  defaultEnd: string;
};

type Tab = "all" | "home" | "dining";

const PRESETS = [
  { id: "week", label: "今週", getRange: getWeekRange },
  { id: "month", label: "今月", getRange: getMonthRange },
  { id: "3m", label: "3ヶ月", getRange: getLast3MonthsRange },
] as const;

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "全体" },
  { value: "home", label: "自炊" },
  { value: "dining", label: "外食" },
];

function rangeMatches(
  start: string,
  end: string,
  getRange: () => { start: string; end: string }
): boolean {
  const range = getRange();
  return start === range.start && end === range.end;
}

export function StatsPageClient({ records, memberMap, defaultStart, defaultEnd }: Props) {
  const [tab, setTab] = useState<Tab>("all");
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);

  const filtered = useMemo(
    () => records.filter((r) => r.date >= start && r.date <= end),
    [records, start, end]
  );

  const stats = useMemo(() => computeStats(filtered, memberMap), [filtered, memberMap]);

  const activePreset = PRESETS.find((p) => rangeMatches(start, end, p.getRange))?.id;

  const applyPreset = (getRange: () => { start: string; end: string }) => {
    const range = getRange();
    setStart(range.start);
    setEnd(range.end);
  };

  return (
    <div className="space-y-4">
      <section className="card card-compact">
        <div className="stats-toolbar">
          <div className="stats-toolbar-row">
            <div className="segment-group" role="group" aria-label="期間">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`segment-btn ${activePreset === p.id ? "segment-btn-on" : ""}`}
                  onClick={() => applyPreset(p.getRange)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="segment-group" role="group" aria-label="表示">
              {TABS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`segment-btn ${tab === value ? "segment-btn-on" : ""}`}
                  onClick={() => setTab(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="stats-date-row">
            <DateInput
              id="stats-start"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              aria-label="開始日"
            />
            <span className="stats-date-sep">—</span>
            <DateInput
              id="stats-end"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              aria-label="終了日"
            />
          </div>
        </div>
      </section>

      <StatsCharts stats={stats} tab={tab} />
    </div>
  );
}

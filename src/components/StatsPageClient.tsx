"use client";

import { useMemo, useState } from "react";
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

export function StatsPageClient({ records, memberMap, defaultStart, defaultEnd }: Props) {
  const [tab, setTab] = useState<"all" | "home" | "dining">("all");
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);

  const filtered = useMemo(
    () => records.filter((r) => r.date >= start && r.date <= end),
    [records, start, end]
  );

  const stats = useMemo(() => computeStats(filtered, memberMap), [filtered, memberMap]);

  const presets = [
    { label: "今週", getRange: getWeekRange },
    { label: "今月", getRange: getMonthRange },
    { label: "直近3ヶ月", getRange: getLast3MonthsRange },
  ];

  return (
    <div className="space-y-12">
      <div className="space-y-8">
        <div className="flex flex-wrap gap-6">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              className="choice"
              onClick={() => {
                const range = p.getRange();
                setStart(range.start);
                setEnd(range.end);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid max-w-xl gap-8 md:grid-cols-2">
          <div>
            <label className="label">開始日</label>
            <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label">終了日</label>
            <input type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-6">
          {([
            ["all", "全体"],
            ["home", "自炊"],
            ["dining", "外食"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`choice ${tab === value ? "choice-on" : ""}`}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="rule pt-10">
        <StatsCharts stats={stats} tab={tab} />
      </div>
    </div>
  );
}

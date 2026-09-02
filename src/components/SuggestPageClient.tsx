"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { getMealSuggestions } from "@/lib/actions/candidates";
import type { CandidateWithStats } from "@/lib/utils/candidates";
import { daysBetween, todayString } from "@/lib/constants";

type Props = {
  initialSuggestions: CandidateWithStats[];
  initialStale: CandidateWithStats[];
};

export function SuggestPageClient({ initialSuggestions, initialStale }: Props) {
  const [preferStale, setPreferStale] = useState(true);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [stale] = useState(initialStale);
  const [pending, startTransition] = useTransition();
  const today = todayString();

  const reroll = () => {
    startTransition(async () => {
      const next = await getMealSuggestions(preferStale);
      setSuggestions(next);
    });
  };

  return (
    <div className="space-y-16">
      <section>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker mb-2">今日</p>
            <h3 className="section-title">提案</h3>
          </div>
          <label className="flex items-center gap-2 text-sm tracking-wide text-muted">
            <input
              type="checkbox"
              className="accent-ink"
              checked={preferStale}
              onChange={(e) => setPreferStale(e.target.checked)}
            />
            しばらく作っていない料理を優先
          </label>
        </div>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted">自炊用の候補を設定画面で追加してください</p>
        ) : (
          <ol className="space-y-10">
            {suggestions.map((s, i) => (
              <li key={s.id} className="grid grid-cols-[3rem_1fr] gap-4">
                <span className="font-serif text-2xl text-muted">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="font-serif text-xl tracking-wide">{s.name}</p>
                  <p className="meta mt-1">
                    {s.lastUsedDate
                      ? `最終 ${s.lastUsedDate}（${daysBetween(s.lastUsedDate, today)}日前）`
                      : "未調理"}
                  </p>
                  <Link
                    href={`/?category=home_cooked&candidateId=${s.id}&date=${today}&mealType=dinner`}
                    className="btn btn-secondary mt-4"
                  >
                    この献立で記録
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        )}
        <button type="button" className="btn btn-secondary mt-10" onClick={reroll} disabled={pending}>
          再抽選
        </button>
      </section>

      <section className="rule pt-10">
        <p className="kicker mb-2">一覧</p>
        <h3 className="section-title mb-8">しばらく作っていない料理</h3>
        {stale.length === 0 ? (
          <p className="text-sm text-muted">候補がありません</p>
        ) : (
          <ul className="divide-y divide-line">
            {stale.map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-3 py-5">
                <div>
                  <p className="font-serif text-lg tracking-wide">{s.name}</p>
                  <p className="meta mt-1">
                    {s.lastUsedDate
                      ? `${daysBetween(s.lastUsedDate, today)}日ぶり · 最終 ${s.lastUsedDate}`
                      : "一度も作っていません"}
                  </p>
                </div>
                <Link
                  href={`/?category=home_cooked&candidateId=${s.id}&date=${today}&mealType=dinner`}
                  className="btn btn-secondary text-xs"
                >
                  記録する
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { RecordCard } from "@/components/RecordCard";
import { getMembers, getMemberMap } from "@/lib/actions/members";
import { getRecords, getMissingDaysInRange, getWeekSummary } from "@/lib/actions/records";
import { formatCookCount, formatDisplayDate, getRecentDates, todayString } from "@/lib/constants";

export default async function HomePage() {
  const today = todayString();
  const [todayRecords, weekSummary, memberMap, members] = await Promise.all([
    getRecords({ date: today }),
    getWeekSummary(),
    getMemberMap(),
    getMembers(),
  ]);

  const recent30Start = getRecentDates(30)[0];
  const missingDays = await getMissingDaysInRange(recent30Start, today);

  return (
    <div className="space-y-10">
      <section className="card card-accent">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="kicker mb-2">📍 今日</p>
            <h2 className="section-title">今日の記録</h2>
            <p className="meta mt-2">{formatDisplayDate(today)}</p>
          </div>
          <div className="quick-action-grid">
            <Link
              href={`/records/new?date=${today}&mealType=lunch`}
              className="btn btn-lunch btn-sm md:btn-sm"
            >
              ☀️ 昼を追加
            </Link>
            <Link
              href={`/records/new?date=${today}&mealType=dinner`}
              className="btn btn-dinner btn-sm md:btn-sm"
            >
              🌙 夕を追加
            </Link>
            <Link href="/records/new" className="btn btn-primary btn-sm md:col-span-2">
              ＋ 記録を追加
            </Link>
            <Link href="/suggest" className="btn btn-secondary btn-sm hidden md:inline-flex">
              ✨ 献立を決める
            </Link>
          </div>
        </div>
        {todayRecords.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-line bg-paper p-8 text-center">
            <p className="mb-1 text-3xl" aria-hidden="true">
              🍽️
            </p>
            <p className="text-sm font-medium text-muted">まだ記録がありません</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href={`/records/new?date=${today}&mealType=lunch`}
                className="btn btn-lunch"
              >
                ☀️ 昼食を記録
              </Link>
              <Link
                href={`/records/new?date=${today}&mealType=dinner`}
                className="btn btn-dinner"
              >
                🌙 夕食を記録
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {todayRecords.map((r) => (
              <RecordCard key={r.id} record={r} memberMap={memberMap} compact />
            ))}
          </div>
        )}
      </section>

      <section className="card md:hidden">
        <p className="label mb-3">ショートカット</p>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/records" className="btn btn-secondary btn-sm">
            📋 記録一覧
          </Link>
          <Link href="/suggest" className="btn btn-secondary btn-sm">
            ✨ 献立を決める
          </Link>
        </div>
      </section>

      {missingDays.length > 0 && (
        <section className="card">
          <p className="kicker mb-2">⚠️ 未記録</p>
          <h2 className="section-title">直近30日 · {missingDays.length}日</h2>
          <p className="meta mt-1">記録の抜けている日があります</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {missingDays.slice(-10).reverse().map((d) => (
              <Link key={d} href={`/records/new?date=${d}`} className="chip">
                {d}
              </Link>
            ))}
            {missingDays.length > 10 && (
              <span className="meta flex items-center px-2">
                ほか {missingDays.length - 10}日
              </span>
            )}
          </div>
        </section>
      )}

      <section className="card">
        <p className="kicker mb-2">📈 今週</p>
        <h2 className="section-title">
          {weekSummary.start} – {weekSummary.end}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-lg">
          <div className="stat-card stat-card-home">
            <p className="label">🍳 自炊</p>
            <p className="stat-value text-secondary">
              {weekSummary.homeCooked}
              <span className="ml-1 font-sans text-sm font-medium text-muted">回</span>
            </p>
          </div>
          <div className="stat-card stat-card-out">
            <p className="label">🍽 外食</p>
            <p className="stat-value" style={{ color: "var(--accent)" }}>
              {weekSummary.diningOut}
              <span className="ml-1 font-sans text-sm font-medium text-muted">回</span>
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-xl bg-paper p-4">
          <p className="label">👨‍🍳 調理回数</p>
          <ul className="mt-3 space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg bg-paper-elevated px-3 py-2 text-sm"
              >
                <span className="font-medium">{m.name}</span>
                <span className="rounded-full bg-secondary-light px-2.5 py-0.5 text-xs font-semibold text-secondary-dark">
                  {formatCookCount(weekSummary.cookCounts[m.id] ?? 0)} 回
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

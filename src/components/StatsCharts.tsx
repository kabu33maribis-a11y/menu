"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MEMBER_COLORS } from "@/lib/constants";
import type { StatsData } from "@/lib/utils/stats";

const HOME = "#5b8a72";
const OUT = "#9b6b9e";
const LUNCH = "#f0b429";
const DINNER = "#d4736a";
const OTHER = "#7a6b9e";
const MUTED = "#8a8279";
const LINE = "#e8dfd4";

type Props = {
  stats: StatsData;
  tab: "all" | "home" | "dining";
};

type Slice = { name: string; value: number; color: string };

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function formatWeekTick(week: string): string {
  const [, m, d] = week.split("-");
  if (!m || !d) return week;
  return `${Number(m)}/${Number(d)}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string; fill?: string; payload?: { color?: string } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-paper-elevated px-3 py-2.5 text-sm shadow-md">
      {label ? <p className="mb-1.5 text-xs font-medium text-muted">{label}</p> : null}
      <ul className="space-y-1">
        {payload.map((item) => (
          <li key={item.name} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: item.color ?? item.fill ?? item.payload?.color ?? MUTED }}
            />
            <span className="text-muted">{item.name}</span>
            <span className="ml-auto font-semibold tabular-nums">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DonutCard({
  kicker,
  title,
  slices,
  centerValue,
  centerLabel,
}: {
  kicker: string;
  title: string;
  slices: Slice[];
  centerValue: string;
  centerLabel: string;
}) {
  const visible = slices.filter((s) => s.value > 0);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0 || visible.length === 0) return null;

  return (
    <section className="card">
      <p className="kicker mb-1">{kicker}</p>
      <h3 className="section-title">{title}</h3>
      <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="relative h-[210px] w-full max-w-[240px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={visible}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={86}
                paddingAngle={visible.length > 1 ? 3 : 0}
                cornerRadius={6}
                strokeWidth={0}
              >
                {visible.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-serif text-3xl font-semibold leading-none tracking-wide">{centerValue}</p>
            <p className="mt-1 text-[11px] font-medium text-muted">{centerLabel}</p>
          </div>
        </div>
        <ul className="w-full min-w-0 flex-1 space-y-2.5">
          {slices.map((s) => (
            <li key={s.name} className="flex items-center gap-2.5 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
              <span className="font-semibold tabular-nums">{s.value}</span>
              <span className="w-10 text-right text-xs text-muted tabular-nums">{pct(s.value, total)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function RankList({
  kicker,
  title,
  items,
  color,
}: {
  kicker: string;
  title: string;
  items: { name: string; count: number }[];
  color: string;
}) {
  if (items.length === 0) return null;
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <section className="card">
      <p className="kicker mb-1">{kicker}</p>
      <h3 className="section-title">{title}</h3>
      <ol className="mt-5 space-y-3">
        {items.map((item, i) => (
          <li key={item.name}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-4 shrink-0 text-xs font-semibold text-muted">{i + 1}</span>
                <span className="truncate font-medium">{item.name}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{item.count}</span>
            </div>
            <div className="rank-bar-track">
              <div
                className="rank-bar-fill"
                style={{ width: `${(item.count / max) * 100}%`, background: color }}
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function StatsCharts({ stats, tab }: Props) {
  const mixSlices: Slice[] = [
    { name: "自炊", value: stats.homeCookedCount, color: HOME },
    { name: "外食", value: stats.diningOutCount, color: OUT },
  ];
  const homeShare = pct(stats.homeCookedCount, stats.totalRecords);

  const cookSlices: Slice[] = stats.cookCounts.map((c) => ({
    name: c.name,
    value: c.count,
    color: MEMBER_COLORS[c.memberId] ?? MUTED,
  }));
  const cookTotal = stats.cookCounts.reduce((sum, c) => sum + c.count, 0);

  const diningSlices: Slice[] = stats.diningOutCounts.map((c) => ({
    name: c.name,
    value: c.count,
    color: MEMBER_COLORS[c.memberId] ?? OUT,
  }));
  const diningTotal = stats.diningOutCounts.reduce((sum, c) => sum + c.count, 0);

  const mealColors: Record<string, string> = { lunch: LUNCH, dinner: DINNER, other: OTHER };
  const mealSlices: Slice[] = stats.mealTypeCounts.map((m) => ({
    name: m.label,
    value: m.count,
    color: mealColors[m.mealType] ?? MUTED,
  }));
  const mealTotal = stats.mealTypeCounts.reduce((sum, m) => sum + m.count, 0);

  const weekly = stats.weeklyTrend.map((w) => ({
    ...w,
    weekLabel: formatWeekTick(w.week),
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="stat-card">
          <p className="label">記録</p>
          <p className="stat-value mt-1">{stats.totalRecords}</p>
          <p className="meta mt-1">件</p>
        </div>
        <div className="stat-card">
          <p className="label">記録した日</p>
          <p className="stat-value mt-1">{stats.recordedDays}</p>
          <p className="meta mt-1">日</p>
        </div>
        <div className="stat-card stat-card-home">
          <p className="label">自炊</p>
          <p className="stat-value mt-1 text-secondary">{stats.homeCookedCount}</p>
          <p className="meta mt-1">{homeShare}%</p>
        </div>
        <div className="stat-card stat-card-out">
          <p className="label">外食</p>
          <p className="stat-value mt-1" style={{ color: OUT }}>
            {stats.diningOutCount}
          </p>
          <p className="meta mt-1">{pct(stats.diningOutCount, stats.totalRecords)}%</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {tab === "all" && (
          <DonutCard
            kicker="🥧 バランス"
            title="自炊と外食"
            slices={mixSlices}
            centerValue={`${homeShare}%`}
            centerLabel="自炊比率"
          />
        )}

        {(tab === "all" || tab === "home") && (
          <DonutCard
            kicker="👨‍🍳 分担"
            title="だれが作ったか"
            slices={cookSlices}
            centerValue={String(cookTotal)}
            centerLabel="調理回数"
          />
        )}

        {(tab === "all" || tab === "dining") && (
          <DonutCard
            kicker="🍽 外食"
            title="だれが外食したか"
            slices={diningSlices}
            centerValue={String(diningTotal)}
            centerLabel="外食回数"
          />
        )}

        {tab === "home" && (
          <DonutCard
            kicker="⏰ 時間帯"
            title="食事区分"
            slices={mealSlices}
            centerValue={String(mealTotal)}
            centerLabel="自炊回数"
          />
        )}
      </div>

      {tab === "all" && weekly.length > 0 && (
        <section className="card">
          <p className="kicker mb-1">📈 推移</p>
          <h3 className="section-title">週ごとの記録</h3>
          <div className="mt-4 h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="statsHomeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={HOME} stopOpacity={0.38} />
                    <stop offset="100%" stopColor={HOME} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="statsOutFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={OUT} stopOpacity={0.38} />
                    <stop offset="100%" stopColor={OUT} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={LINE} vertical={false} strokeDasharray="3 6" />
                <XAxis
                  dataKey="weekLabel"
                  tick={{ fontSize: 11, fill: MUTED }}
                  axisLine={{ stroke: LINE }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: MUTED }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  labelFormatter={(_, payload) => {
                    const week = payload?.[0]?.payload?.week as string | undefined;
                    return week ?? "";
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="homeCooked"
                  name="自炊"
                  stroke={HOME}
                  fill="url(#statsHomeFill)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: HOME }}
                />
                <Area
                  type="monotone"
                  dataKey="diningOut"
                  name="外食"
                  stroke={OUT}
                  fill="url(#statsOutFill)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: OUT }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex justify-center gap-4 text-xs font-medium text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: HOME }} />
              自炊
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: OUT }} />
              外食
            </span>
          </div>
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {(tab === "all" || tab === "home") && (
          <RankList kicker="🍳 よく作る" title="人気の料理" items={stats.homeRanking} color={HOME} />
        )}
        {(tab === "all" || tab === "dining") && (
          <RankList kicker="📍 よく行く" title="外食先" items={stats.diningRanking} color={OUT} />
        )}
      </div>
    </div>
  );
}

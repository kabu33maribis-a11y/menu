"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatsData } from "@/lib/utils/stats";

const INK = "#2b2824";
const ACCENT = "#6a5040";
const MUTED = "#7a736b";
const LINE = "#d4cdc2";
const PAPER = "#f2eee6";

type Props = {
  stats: StatsData;
  tab: "all" | "home" | "dining";
};

const axis = { fontSize: 12, fill: MUTED };
const tooltipStyle = {
  backgroundColor: PAPER,
  border: `1px solid ${LINE}`,
  borderRadius: 0,
  color: INK,
  fontSize: 12,
};

export function StatsCharts({ stats, tab }: Props) {
  return (
    <div className="space-y-16">
      <div className="grid max-w-2xl grid-cols-3 gap-x-8 gap-y-8">
        <div>
          <p className="label">記録件数</p>
          <p className="stat-value">{stats.totalRecords}</p>
        </div>
        <div>
          <p className="label">記録日数</p>
          <p className="stat-value">{stats.recordedDays}</p>
        </div>
        <div>
          <p className="label">自炊 / 外食</p>
          <p className="stat-value">
            {stats.homeCookedCount}
            <span className="mx-1 font-sans text-base font-normal text-muted">/</span>
            {stats.diningOutCount}
          </p>
        </div>
      </div>

      {tab === "all" && stats.weeklyTrend.length > 0 && (
        <div>
          <h3 className="section-title mb-8">週別推移</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats.weeklyTrend}>
              <CartesianGrid stroke={LINE} vertical={false} />
              <XAxis dataKey="week" tick={axis} axisLine={{ stroke: LINE }} tickLine={false} />
              <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: MUTED }} />
              <Line type="linear" dataKey="homeCooked" name="自炊" stroke={INK} strokeWidth={1.5} dot={false} />
              <Line type="linear" dataKey="diningOut" name="外食" stroke={ACCENT} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {(tab === "all" || tab === "home") && stats.cookCounts.some((c) => c.count > 0) && (
        <div>
          <h3 className="section-title mb-8">メンバー別 調理回数</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.cookCounts}>
              <CartesianGrid stroke={LINE} vertical={false} />
              <XAxis dataKey="name" tick={axis} axisLine={{ stroke: LINE }} tickLine={false} />
              <YAxis allowDecimals tick={axis} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="回数" fill={INK} radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {(tab === "all" || tab === "dining") && stats.diningOutCounts.some((c) => c.count > 0) && (
        <div>
          <h3 className="section-title mb-8">メンバー別 外食回数</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.diningOutCounts}>
              <CartesianGrid stroke={LINE} vertical={false} />
              <XAxis dataKey="name" tick={axis} axisLine={{ stroke: LINE }} tickLine={false} />
              <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="回数" fill={ACCENT} radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === "home" && stats.mealTypeCounts.length > 0 && (
        <div>
          <h3 className="section-title mb-8">食事区分別 自炊回数</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.mealTypeCounts}>
              <CartesianGrid stroke={LINE} vertical={false} />
              <XAxis dataKey="label" tick={axis} axisLine={{ stroke: LINE }} tickLine={false} />
              <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="回数" fill={INK} radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {(tab === "all" || tab === "home") && stats.homeRanking.length > 0 && (
        <div>
          <h3 className="section-title mb-8">人気料理</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, stats.homeRanking.length * 36)}>
            <BarChart data={stats.homeRanking} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke={LINE} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={axis} axisLine={{ stroke: LINE }} tickLine={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ ...axis, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="回数" fill={INK} radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {(tab === "all" || tab === "dining") && stats.diningRanking.length > 0 && (
        <div>
          <h3 className="section-title mb-8">外食先</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, stats.diningRanking.length * 36)}>
            <BarChart data={stats.diningRanking} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke={LINE} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={axis} axisLine={{ stroke: LINE }} tickLine={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ ...axis, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="回数" fill={ACCENT} radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

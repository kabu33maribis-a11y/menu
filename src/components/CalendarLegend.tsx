import { DINING_OUT_COLOR, MEMBER_COLORS } from "@/lib/constants";

type Props = {
  members: { id: string; name: string }[];
};

export function CalendarLegend({ members }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-paper-elevated px-4 py-3 shadow-sm">
      {members.map((m) => (
        <span key={m.id} className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <span className="cal-legend-dot" style={{ backgroundColor: MEMBER_COLORS[m.id] }} />
          {m.name}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <span className="cal-legend-dot" style={{ backgroundColor: DINING_OUT_COLOR }} />
        外食
      </span>
      <span className="meta ml-auto sm:hidden">左右フリックで月移動</span>
      <span className="meta ml-auto hidden sm:inline">左右フリックで月移動 · 日付タップで詳細</span>
    </div>
  );
}

import Link from "next/link";
import {
  EATERS_LABELS,
  MEAL_TYPE_LABELS,
  cookDisplayName,
  formatDisplayDate,
  getRecordAccentColor,
} from "@/lib/constants";
import type { RecordWithDetails } from "@/lib/actions/records";

type Props = {
  record: RecordWithDetails;
  memberMap: Record<string, string>;
  compact?: boolean;
};

function mealBadgeClass(mealType: string) {
  if (mealType === "lunch") return "badge-lunch";
  if (mealType === "dinner") return "badge-dinner";
  return "badge-other";
}

function categoryBadgeClass(category: string) {
  return category === "home_cooked" ? "badge-home" : "badge-out";
}

export function RecordCard({ record, memberMap, compact }: Props) {
  const cookName = cookDisplayName(record.cookMemberId, memberMap);
  const eaterLabel =
    record.eaters === "both"
      ? "2人とも"
      : memberMap[record.eaters] ?? EATERS_LABELS[record.eaters];
  const accent = getRecordAccentColor(record);

  return (
    <div className="record-card flex items-start justify-between gap-4">
      <div
        className="min-w-0 flex-1 border-l-4 pl-4"
        style={{ borderLeftColor: accent }}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {!compact && (
            <span className="meta text-xs">{formatDisplayDate(record.date)}</span>
          )}
          <span className={`badge ${mealBadgeClass(record.mealType)}`}>
            {record.mealType === "lunch" && "☀️ "}
            {record.mealType === "dinner" && "🌙 "}
            {MEAL_TYPE_LABELS[record.mealType]}
          </span>
          <span className={`badge ${categoryBadgeClass(record.category)}`}>
            {record.category === "home_cooked" ? "🍳 自炊" : "🍽 外食"}
          </span>
        </div>
        <p className="font-serif text-lg font-semibold tracking-wide text-ink">
          {record.candidateName}
        </p>
        <p className="mt-1.5 text-sm text-muted">
          {record.category === "home_cooked" && cookName && (
            <span>作った人 {cookName} · </span>
          )}
          食べた人 {eaterLabel}
        </p>
        {record.memo && (
          <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-sm text-muted">
            {record.memo}
          </p>
        )}
      </div>
      <Link href={`/records/${record.id}/edit`} className="btn btn-secondary btn-sm shrink-0">
        編集
      </Link>
    </div>
  );
}

import Link from "next/link";
import { DateInput } from "@/components/DateInput";
import { RecordCard } from "@/components/RecordCard";
import { getMemberMap } from "@/lib/actions/members";
import { getRecords } from "@/lib/actions/records";
import type { MealCategory } from "@/lib/db";

type Props = {
  searchParams: Promise<{
    start?: string;
    end?: string;
    category?: string;
    member?: string;
  }>;
};

export default async function RecordsPage({ searchParams }: Props) {
  const params = await searchParams;
  const [records, memberMap] = await Promise.all([
    getRecords({
      startDate: params.start,
      endDate: params.end,
      category: params.category as MealCategory | undefined,
      memberId: params.member,
    }),
    getMemberMap(),
  ]);

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="kicker mb-1">📋 記録</p>
          <h2 className="page-title">記録一覧</h2>
        </div>
        <Link href="/" className="btn btn-primary">
          ＋ 記録を追加
        </Link>
      </div>

      <form method="GET" action="/records" className="card grid gap-5 md:grid-cols-4">
        <div>
          <label className="label">開始日</label>
          <DateInput name="start" defaultValue={params.start} />
        </div>
        <div>
          <label className="label">終了日</label>
          <DateInput name="end" defaultValue={params.end} />
        </div>
        <div>
          <label className="label">種別</label>
          <select name="category" defaultValue={params.category ?? ""} className="input">
            <option value="">すべて</option>
            <option value="home_cooked">自炊</option>
            <option value="dining_out">外食</option>
          </select>
        </div>
        <div>
          <label className="label">メンバー</label>
          <select name="member" defaultValue={params.member ?? ""} className="input">
            <option value="">すべて</option>
            <option value="member_1">{memberMap.member_1}</option>
            <option value="member_2">{memberMap.member_2}</option>
          </select>
        </div>
        <div className="md:col-span-4">
          <button type="submit" className="btn btn-primary">
            🔍 絞り込む
          </button>
        </div>
      </form>

      {records.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-2" aria-hidden="true">📭</p>
          <p className="text-sm font-medium text-muted">記録がありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <RecordCard key={r.id} record={r} memberMap={memberMap} />
          ))}
        </div>
      )}
    </div>
  );
}

import { RecordsHistory } from "@/components/RecordsHistory";
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
  const filters = {
    start: params.start || undefined,
    end: params.end || undefined,
    category: params.category || undefined,
    member: params.member || undefined,
  };
  const [records, memberMap] = await Promise.all([
    getRecords({
      startDate: filters.start,
      endDate: filters.end,
      category: filters.category as MealCategory | undefined,
      memberId: filters.member,
    }),
    getMemberMap(),
  ]);

  return <RecordsHistory records={records} memberMap={memberMap} filters={filters} />;
}

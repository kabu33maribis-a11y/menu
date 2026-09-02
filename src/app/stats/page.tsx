import { StatsPageClient } from "@/components/StatsPageClient";
import { getMemberMap } from "@/lib/actions/members";
import { getRecords } from "@/lib/actions/records";
import { getMonthRange } from "@/lib/constants";

export default async function StatsPage() {
  const { start, end } = getMonthRange();
  const [records, memberMap] = await Promise.all([getRecords(), getMemberMap()]);

  return (
    <div className="space-y-10">
      <h2 className="page-title">統計</h2>
      <StatsPageClient
        records={records}
        memberMap={memberMap}
        defaultStart={start}
        defaultEnd={end}
      />
    </div>
  );
}

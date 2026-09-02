import { RecordForm } from "@/components/RecordForm";
import { getMembers } from "@/lib/actions/members";
import { getCandidateSortOrder } from "@/lib/actions/settings";
import type { MealCategory, MealType } from "@/lib/db";

type Props = {
  searchParams: Promise<{
    date?: string;
    mealType?: string;
    category?: string;
    candidateId?: string;
    returnTo?: string;
  }>;
};

export default async function NewRecordPage({ searchParams }: Props) {
  const params = await searchParams;
  const [members, sortOrder] = await Promise.all([getMembers(), getCandidateSortOrder()]);

  return (
    <div className="space-y-6">
      <div className="card card-accent">
        <p className="kicker mb-1">✏️ 新規</p>
        <h2 className="page-title">記録を追加</h2>
      </div>
      <div className="card">
        <RecordForm
        members={members}
        defaultDate={params.date}
        defaultMealType={params.mealType as MealType | undefined}
        defaultCategory={params.category as MealCategory | undefined}
        defaultCandidateId={params.candidateId}
        sortOrder={sortOrder}
        returnTo={params.returnTo}
      />
      </div>
    </div>
  );
}

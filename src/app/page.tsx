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

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const [members, sortOrder] = await Promise.all([getMembers(), getCandidateSortOrder()]);

  return (
    <div className="card card-flush">
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
  );
}

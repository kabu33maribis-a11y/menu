import { notFound } from "next/navigation";
import { RecordForm } from "@/components/RecordForm";
import { getMembers } from "@/lib/actions/members";
import { getRecordById } from "@/lib/actions/records";
import { getCandidateSortOrder } from "@/lib/actions/settings";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function EditRecordPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  const [record, members, sortOrder] = await Promise.all([
    getRecordById(id),
    getMembers(),
    getCandidateSortOrder(),
  ]);

  if (!record) notFound();

  return (
    <div className="space-y-6">
      <div className="card card-accent">
        <p className="kicker mb-1">✏️ 編集</p>
        <h2 className="page-title">記録を編集</h2>
      </div>
      <div className="card">
        <RecordForm
          members={members}
          initial={record}
          sortOrder={sortOrder}
          returnTo={returnTo}
        />
      </div>
    </div>
  );
}

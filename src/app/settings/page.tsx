import { SettingsPageClient } from "@/components/SettingsPageClient";
import { getMembers } from "@/lib/actions/members";
import { getCandidates } from "@/lib/actions/candidates";

export default async function SettingsPage() {
  const [members, homeCandidates, diningCandidates] = await Promise.all([
    getMembers(),
    getCandidates("home_cooked", { includeArchived: true }),
    getCandidates("dining_out", { includeArchived: true }),
  ]);

  return (
    <div className="space-y-4">
      <h2 className="page-title">設定</h2>
      <SettingsPageClient
        members={members}
        homeCandidates={homeCandidates}
        diningCandidates={diningCandidates}
      />
    </div>
  );
}

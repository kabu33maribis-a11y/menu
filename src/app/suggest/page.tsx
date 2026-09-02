import { SuggestPageClient } from "@/components/SuggestPageClient";
import { getMealSuggestions, getStaleCandidates } from "@/lib/actions/candidates";

export default async function SuggestPage() {
  const [suggestions, stale] = await Promise.all([
    getMealSuggestions(true),
    getStaleCandidates(),
  ]);

  return (
    <div className="space-y-10">
      <h2 className="page-title">献立を決める</h2>
      <SuggestPageClient initialSuggestions={suggestions} initialStale={stale} />
    </div>
  );
}

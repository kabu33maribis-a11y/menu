"use client";

import type { PurchaseHistoryWithItems } from "@/lib/actions/shopping";

type Props = {
  histories: PurchaseHistoryWithItems[];
};

function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
}

function groupByCategory(items: PurchaseHistoryWithItems["items"]) {
  const map = new Map<string, string[]>();
  const order: string[] = [];
  for (const item of items) {
    if (!map.has(item.categoryName)) {
      map.set(item.categoryName, []);
      order.push(item.categoryName);
    }
    map.get(item.categoryName)!.push(item.ingredientName);
  }
  return order.map((name) => ({ name, items: map.get(name)! }));
}

export function ShoppingHistoryView({ histories }: Props) {
  if (histories.length === 0) {
    return (
      <div className="shopping-empty">
        <p className="shopping-empty-title">購入履歴はまだありません</p>
        <p className="meta mt-2">買い物完了すると、ここに記録されます</p>
      </div>
    );
  }

  return (
    <div className="shopping-view space-y-4">
      {histories.map((history) => {
        const groups = groupByCategory(history.items);
        return (
          <details key={history.id} className="card shopping-history-card" open>
            <summary className="shopping-history-summary">
              <span className="font-serif text-lg tracking-wide">
                {formatHistoryDate(history.purchasedAt)}
              </span>
              <span className="meta">{history.items.length} 品</span>
            </summary>
            <div className="mt-4 space-y-4">
              {groups.map((group) => (
                <div key={group.name}>
                  <p className="shopping-category-title mb-2">{group.name}</p>
                  <ul className="space-y-1">
                    {group.items.map((name, i) => (
                      <li key={`${name}-${i}`} className="text-sm text-ink">
                        · {name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

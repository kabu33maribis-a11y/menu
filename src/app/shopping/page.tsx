import { getPurchaseHistories, getShoppingBoard } from "@/lib/actions/shopping";
import { ShoppingPageClient } from "@/components/shopping/ShoppingPageClient";

export default async function ShoppingPage() {
  const [board, histories] = await Promise.all([
    getShoppingBoard(),
    getPurchaseHistories(),
  ]);

  return <ShoppingPageClient initialBoard={board} initialHistories={histories} />;
}

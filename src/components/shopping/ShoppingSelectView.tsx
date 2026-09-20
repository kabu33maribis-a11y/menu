"use client";

import { useState, useTransition } from "react";
import {
  addTemporaryItem,
  removeShoppingItem,
  toggleShoppingSelection,
  type ShoppingBoard,
} from "@/lib/actions/shopping";
import { CategorySection } from "./CategorySection";
import { ShoppingItemRow } from "./ShoppingItemRow";

type Props = {
  board: ShoppingBoard;
  onBoardChange: (board: ShoppingBoard) => void;
  onStartShopping: () => void;
  onRefresh: () => void;
};

export function ShoppingSelectView({
  board,
  onBoardChange,
  onStartShopping,
  onRefresh,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [showTempForm, setShowTempForm] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempCategoryId, setTempCategoryId] = useState(
    board.categories[0]?.id ?? ""
  );

  const toggle = (ingredientId: string) => {
    // Optimistic UI
    onBoardChange({
      ...board,
      categories: board.categories.map((cat) => ({
        ...cat,
        ingredients: cat.ingredients.map((ing) => {
          if (ing.id !== ingredientId) return ing;
          const nextSelected = !ing.isSelected;
          return {
            ...ing,
            isSelected: nextSelected,
            isPurchased: nextSelected ? ing.isPurchased : false,
            shoppingItemId: nextSelected ? ing.shoppingItemId ?? "pending" : null,
          };
        }),
      })),
      selectedCount: board.categories
        .flatMap((c) => c.ingredients)
        .reduce((n, ing) => {
          const selected = ing.id === ingredientId ? !ing.isSelected : ing.isSelected;
          return n + (selected ? 1 : 0);
        }, 0) + board.categories.reduce((n, c) => n + c.temporaryItems.length, 0),
    });

    startTransition(async () => {
      await toggleShoppingSelection(ingredientId);
      onRefresh();
    });
  };

  const addTemp = () => {
    if (!tempName.trim() || !tempCategoryId) return;
    startTransition(async () => {
      await addTemporaryItem(tempCategoryId, tempName);
      setTempName("");
      setShowTempForm(false);
      onRefresh();
    });
  };

  const hasAnyIngredients = board.categories.some(
    (c) => c.ingredients.length > 0 || c.temporaryItems.length > 0
  );

  return (
    <div className="shopping-view">
      <p className="meta mb-4">今回買うものにチェックをつけてください</p>

      {!hasAnyIngredients ? (
        <div className="shopping-empty">
          <p className="shopping-empty-title">定番食材がまだありません</p>
          <p className="meta mt-2">「管理」から普段買う食材を登録してください</p>
        </div>
      ) : (
        <div className="space-y-6">
          {board.categories.map((cat) => {
            if (cat.ingredients.length === 0 && cat.temporaryItems.length === 0) {
              return null;
            }
            return (
              <CategorySection key={cat.id} title={cat.name}>
                {cat.ingredients.map((ing) => (
                  <ShoppingItemRow
                    key={ing.id}
                    name={ing.name}
                    checked={ing.isSelected}
                    onToggle={() => toggle(ing.id)}
                    disabled={pending}
                    mode="select"
                  />
                ))}
                {cat.temporaryItems.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    name={item.tempName ?? ""}
                    checked
                    temporary
                    onToggle={() => {
                      startTransition(async () => {
                        await removeShoppingItem(item.id);
                        onRefresh();
                      });
                    }}
                    disabled={pending}
                    mode="select"
                  />
                ))}
              </CategorySection>
            );
          })}
        </div>
      )}

      <div className="shopping-actions mt-8 space-y-3">
        {showTempForm ? (
          <div className="card space-y-3">
            <p className="label">今回だけ追加</p>
            <select
              className="input w-full"
              value={tempCategoryId}
              onChange={(e) => setTempCategoryId(e.target.value)}
            >
              {board.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              className="input w-full"
              placeholder="食材名（例：生クリーム）"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTemp();
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={addTemp}
                disabled={pending || !tempName.trim()}
              >
                追加
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowTempForm(false)}
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-secondary w-full"
            onClick={() => setShowTempForm(true)}
            disabled={board.categories.length === 0}
          >
            ＋ 今回だけ追加
          </button>
        )}

        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={onStartShopping}
          disabled={board.selectedCount === 0}
        >
          {board.purchasedCount > 0 ? "買い物に戻る" : "買い物を開始"}
          {board.selectedCount > 0 ? `（${board.selectedCount}）` : ""}
        </button>
      </div>
    </div>
  );
}

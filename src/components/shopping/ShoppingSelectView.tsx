"use client";

import {
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  addTemporaryItem,
  removeShoppingItem,
  setShoppingSelection,
  type ShoppingBoard,
} from "@/lib/actions/shopping";
import { CategorySection } from "./CategorySection";
import { ShoppingItemRow } from "./ShoppingItemRow";

type Props = {
  board: ShoppingBoard;
  onBoardChange: Dispatch<SetStateAction<ShoppingBoard>>;
  onStartShopping: () => void;
};

function countSelected(board: ShoppingBoard): number {
  let n = 0;
  for (const cat of board.categories) {
    for (const ing of cat.ingredients) {
      if (ing.isSelected) n++;
    }
    n += cat.temporaryItems.length;
  }
  return n;
}

function countPurchased(board: ShoppingBoard): number {
  let n = 0;
  for (const cat of board.categories) {
    for (const ing of cat.ingredients) {
      if (ing.isSelected && ing.isPurchased) n++;
    }
    for (const item of cat.temporaryItems) {
      if (item.isPurchased) n++;
    }
  }
  return n;
}

function withCounts(board: ShoppingBoard): ShoppingBoard {
  return {
    ...board,
    selectedCount: countSelected(board),
    purchasedCount: countPurchased(board),
  };
}

export function ShoppingSelectView({ board, onBoardChange, onStartShopping }: Props) {
  const boardRef = useRef(board);
  boardRef.current = board;
  const [formPending, startFormTransition] = useTransition();
  const [showTempForm, setShowTempForm] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempCategoryId, setTempCategoryId] = useState(board.categories[0]?.id ?? "");

  const applyBoard = (next: ShoppingBoard) => {
    const counted = withCounts(next);
    boardRef.current = counted;
    onBoardChange(counted);
  };

  const toggle = (ingredientId: string) => {
    const prev = boardRef.current;
    const current = prev.categories
      .flatMap((c) => c.ingredients)
      .find((ing) => ing.id === ingredientId);
    const nextSelected = !current?.isSelected;
    const itemId = nextSelected
      ? current?.shoppingItemId && current.shoppingItemId !== "pending"
        ? current.shoppingItemId
        : crypto.randomUUID()
      : undefined;

    applyBoard({
      ...prev,
      categories: prev.categories.map((cat) => ({
        ...cat,
        ingredients: cat.ingredients.map((ing) => {
          if (ing.id !== ingredientId) return ing;
          return {
            ...ing,
            isSelected: nextSelected,
            isPurchased: nextSelected ? ing.isPurchased : false,
            shoppingItemId: nextSelected ? (itemId ?? null) : null,
          };
        }),
      })),
    });

    void setShoppingSelection(ingredientId, nextSelected, itemId).catch(() => {
      const latest = boardRef.current;
      applyBoard({
        ...latest,
        categories: latest.categories.map((cat) => ({
          ...cat,
          ingredients: cat.ingredients.map((ing) => {
            if (ing.id !== ingredientId) return ing;
            return {
              ...ing,
              isSelected: !nextSelected,
              shoppingItemId: !nextSelected ? (itemId ?? ing.shoppingItemId) : null,
              isPurchased: !nextSelected ? false : ing.isPurchased,
            };
          }),
        })),
      });
    });
  };

  const removeTemp = (itemId: string) => {
    const prev = boardRef.current;
    applyBoard({
      ...prev,
      categories: prev.categories.map((cat) => ({
        ...cat,
        temporaryItems: cat.temporaryItems.filter((item) => item.id !== itemId),
      })),
    });
    void removeShoppingItem(itemId);
  };

  const addTemp = () => {
    if (!tempName.trim() || !tempCategoryId) return;
    const name = tempName.trim();
    const categoryId = tempCategoryId;
    setTempName("");
    setShowTempForm(false);

    startFormTransition(async () => {
      try {
        const item = await addTemporaryItem(categoryId, name);
        const prev = boardRef.current;
        applyBoard({
          ...prev,
          categories: prev.categories.map((cat) =>
            cat.id === categoryId
              ? { ...cat, temporaryItems: [...cat.temporaryItems, item] }
              : cat
          ),
        });
      } catch (err) {
        alert(err instanceof Error ? err.message : "追加に失敗しました");
      }
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
                    mode="select"
                  />
                ))}
                {cat.temporaryItems.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    name={item.tempName ?? ""}
                    checked
                    temporary
                    onToggle={() => removeTemp(item.id)}
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
                disabled={formPending || !tempName.trim()}
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

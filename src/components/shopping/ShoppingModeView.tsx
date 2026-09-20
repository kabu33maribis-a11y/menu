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
  completeShopping,
  setPurchased,
  type ShoppingBoard,
} from "@/lib/actions/shopping";
import { CategorySection } from "./CategorySection";
import { ShoppingItemRow } from "./ShoppingItemRow";

type Props = {
  board: ShoppingBoard;
  onBoardChange: Dispatch<SetStateAction<ShoppingBoard>>;
  onGoSelect: () => void;
  onCompleted: () => void;
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

export function ShoppingModeView({
  board,
  onBoardChange,
  onGoSelect,
  onCompleted,
}: Props) {
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

  const selectedCategories = board.categories
    .map((cat) => ({
      ...cat,
      ingredients: cat.ingredients.filter((ing) => ing.isSelected),
    }))
    .filter((cat) => cat.ingredients.length > 0 || cat.temporaryItems.length > 0);

  const toggleItem = (itemId: string) => {
    const prev = boardRef.current;
    const currentPurchased =
      prev.categories.some((cat) =>
        cat.ingredients.some(
          (ing) => ing.shoppingItemId === itemId && ing.isPurchased
        )
      ) ||
      prev.categories.some((cat) =>
        cat.temporaryItems.some((item) => item.id === itemId && item.isPurchased)
      );
    const nextPurchased = !currentPurchased;

    applyBoard({
      ...prev,
      categories: prev.categories.map((cat) => ({
        ...cat,
        ingredients: cat.ingredients.map((ing) =>
          ing.shoppingItemId === itemId
            ? { ...ing, isPurchased: nextPurchased }
            : ing
        ),
        temporaryItems: cat.temporaryItems.map((item) =>
          item.id === itemId ? { ...item, isPurchased: nextPurchased } : item
        ),
      })),
    });

    void setPurchased(itemId, nextPurchased).catch(() => {
      const latest = boardRef.current;
      applyBoard({
        ...latest,
        categories: latest.categories.map((cat) => ({
          ...cat,
          ingredients: cat.ingredients.map((ing) =>
            ing.shoppingItemId === itemId
              ? { ...ing, isPurchased: !nextPurchased }
              : ing
          ),
          temporaryItems: cat.temporaryItems.map((item) =>
            item.id === itemId ? { ...item, isPurchased: !nextPurchased } : item
          ),
        })),
      });
    });
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

  const finish = () => {
    const msg =
      board.purchasedCount > 0
        ? `購入済み ${board.purchasedCount} 件を履歴に保存し、今回のリストをリセットします。よろしいですか？`
        : "購入済みのものがありません。今回のリストをリセットしますか？";
    if (!confirm(msg)) return;

    startFormTransition(async () => {
      await completeShopping();
      onCompleted();
    });
  };

  if (selectedCategories.length === 0) {
    return (
      <div className="shopping-empty">
        <p className="shopping-empty-title">今回買うものはありません</p>
        <p className="meta mt-2">定番食材から今回買うものを選んでください</p>
        <button type="button" className="btn btn-primary mt-6" onClick={onGoSelect}>
          食材を選ぶ
        </button>
      </div>
    );
  }

  return (
    <div className="shopping-view shopping-view-mode">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn btn-ghost btn-sm shopping-back-btn"
          onClick={onGoSelect}
        >
          ← リストに戻る
        </button>
        <p className="meta shrink-0">
          {board.purchasedCount} / {board.selectedCount}
        </p>
      </div>

      <div className="space-y-6 pb-28">
        {selectedCategories.map((cat) => (
          <CategorySection key={cat.id} title={cat.name}>
            {cat.ingredients.map((ing) => (
              <ShoppingItemRow
                key={ing.id}
                name={ing.name}
                checked
                purchased={ing.isPurchased}
                onToggle={() => {
                  if (ing.shoppingItemId) toggleItem(ing.shoppingItemId);
                }}
                disabled={!ing.shoppingItemId}
                mode="shop"
              />
            ))}
            {cat.temporaryItems.map((item) => (
              <ShoppingItemRow
                key={item.id}
                name={item.tempName ?? ""}
                checked
                purchased={item.isPurchased}
                temporary
                onToggle={() => toggleItem(item.id)}
                mode="shop"
              />
            ))}
          </CategorySection>
        ))}

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
              placeholder="食材名"
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
          >
            ＋ 今回だけ追加
          </button>
        )}
      </div>

      <div className="shopping-complete-bar">
        <div className="shopping-complete-bar-inner">
          <button type="button" className="btn btn-secondary" onClick={onGoSelect}>
            戻る
          </button>
          <button
            type="button"
            className="btn btn-success flex-1"
            onClick={finish}
            disabled={formPending}
          >
            買い物完了
          </button>
        </div>
      </div>
    </div>
  );
}

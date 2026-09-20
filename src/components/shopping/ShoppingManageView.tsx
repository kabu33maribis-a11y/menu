"use client";

import { useState, useTransition } from "react";
import {
  createCategory,
  createIngredient,
  deleteCategory,
  deleteIngredient,
  reorderCategory,
  reorderIngredient,
  updateCategory,
  updateIngredient,
  type ShoppingBoard,
} from "@/lib/actions/shopping";

type Props = {
  board: ShoppingBoard;
  onRefresh: () => void;
};

export function ShoppingManageView({ board, onRefresh }: Props) {
  const [pending, startTransition] = useTransition();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newIngredientByCat, setNewIngredientByCat] = useState<Record<string, string>>({});
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editingIngredientName, setEditingIngredientName] = useState("");

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await fn();
        onRefresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "操作に失敗しました");
      }
    });
  };

  return (
    <div className="shopping-view space-y-8">
      <p className="meta">定番のカテゴリと食材を管理します</p>

      <div className="card space-y-3">
        <p className="label">カテゴリを追加</p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="例：乾物"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newCategoryName.trim()) {
                run(async () => {
                  await createCategory(newCategoryName);
                  setNewCategoryName("");
                });
              }
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending || !newCategoryName.trim()}
            onClick={() =>
              run(async () => {
                await createCategory(newCategoryName);
                setNewCategoryName("");
              })
            }
          >
            追加
          </button>
        </div>
      </div>

      {board.categories.map((cat, catIndex) => (
        <section key={cat.id} className="card shopping-manage-cat">
          <div className="shopping-manage-cat-head">
            {editingCategoryId === cat.id ? (
              <div className="flex flex-1 gap-2">
                <input
                  className="input flex-1"
                  value={editingCategoryName}
                  onChange={(e) => setEditingCategoryName(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      await updateCategory(cat.id, editingCategoryName);
                      setEditingCategoryId(null);
                    })
                  }
                >
                  保存
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setEditingCategoryId(null)}
                >
                  取消
                </button>
              </div>
            ) : (
              <>
                <h3 className="shopping-category-title flex-1">{cat.name}</h3>
                <div className="shopping-manage-ops">
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    disabled={pending || catIndex === 0}
                    onClick={() => run(() => reorderCategory(cat.id, "up"))}
                    aria-label="上へ"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    disabled={pending || catIndex === board.categories.length - 1}
                    onClick={() => run(() => reorderCategory(cat.id, "down"))}
                    aria-label="下へ"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => {
                      setEditingCategoryId(cat.id);
                      setEditingCategoryName(cat.name);
                    }}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-danger"
                    disabled={pending}
                    onClick={() => {
                      if (
                        !confirm(
                          `「${cat.name}」と中の食材を削除しますか？`
                        )
                      ) {
                        return;
                      }
                      run(() => deleteCategory(cat.id));
                    }}
                  >
                    削除
                  </button>
                </div>
              </>
            )}
          </div>

          <ul className="mt-3 divide-y divide-line">
            {cat.ingredients.map((ing, ingIndex) => (
              <li key={ing.id} className="shopping-manage-ing">
                {editingIngredientId === ing.id ? (
                  <div className="flex flex-1 gap-2 py-2">
                    <input
                      className="input flex-1"
                      value={editingIngredientName}
                      onChange={(e) => setEditingIngredientName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          await updateIngredient(ing.id, editingIngredientName);
                          setEditingIngredientId(null);
                        })
                      }
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setEditingIngredientId(null)}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="shopping-manage-ing-name">{ing.name}</span>
                    <div className="shopping-manage-ops">
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        disabled={pending || ingIndex === 0}
                        onClick={() => run(() => reorderIngredient(ing.id, "up"))}
                        aria-label="上へ"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        disabled={pending || ingIndex === cat.ingredients.length - 1}
                        onClick={() => run(() => reorderIngredient(ing.id, "down"))}
                        aria-label="下へ"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        onClick={() => {
                          setEditingIngredientId(ing.id);
                          setEditingIngredientName(ing.name);
                        }}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-danger"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm(`「${ing.name}」を削除しますか？`)) return;
                          run(() => deleteIngredient(ing.id));
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-3 flex gap-2">
            <input
              className="input flex-1"
              placeholder="食材を追加"
              value={newIngredientByCat[cat.id] ?? ""}
              onChange={(e) =>
                setNewIngredientByCat((prev) => ({
                  ...prev,
                  [cat.id]: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                const name = newIngredientByCat[cat.id]?.trim();
                if (e.key === "Enter" && name) {
                  run(async () => {
                    await createIngredient(cat.id, name);
                    setNewIngredientByCat((prev) => ({ ...prev, [cat.id]: "" }));
                  });
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              disabled={pending || !(newIngredientByCat[cat.id] ?? "").trim()}
              onClick={() => {
                const name = newIngredientByCat[cat.id] ?? "";
                run(async () => {
                  await createIngredient(cat.id, name);
                  setNewIngredientByCat((prev) => ({ ...prev, [cat.id]: "" }));
                });
              }}
            >
              追加
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}

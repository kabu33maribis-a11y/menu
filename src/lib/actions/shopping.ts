"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { nowIso } from "@/lib/constants";
import {
  ensureDatabase,
  execute,
  queryAll,
  queryOne,
  type PurchaseHistory,
  type PurchaseHistoryItem,
  type ShoppingCategory,
  type ShoppingIngredient,
  type ShoppingItem,
} from "@/lib/db";

function revalidateShopping() {
  revalidatePath("/shopping");
  revalidatePath("/", "layout");
}

function rowToCategory(row: Record<string, unknown>): ShoppingCategory {
  return {
    id: row.id as string,
    name: row.name as string,
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToIngredient(row: Record<string, unknown>): ShoppingIngredient {
  return {
    id: row.id as string,
    categoryId: row.category_id as string,
    name: row.name as string,
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToItem(row: Record<string, unknown>): ShoppingItem {
  return {
    id: row.id as string,
    ingredientId: (row.ingredient_id as string | null) ?? null,
    categoryId: row.category_id as string,
    tempName: (row.temp_name as string | null) ?? null,
    isPurchased: Boolean(row.is_purchased),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export type ShoppingBoardIngredient = ShoppingIngredient & {
  shoppingItemId: string | null;
  isSelected: boolean;
  isPurchased: boolean;
};

export type ShoppingBoardCategory = ShoppingCategory & {
  ingredients: ShoppingBoardIngredient[];
  temporaryItems: ShoppingItem[];
};

export type ShoppingBoard = {
  categories: ShoppingBoardCategory[];
  selectedCount: number;
  purchasedCount: number;
};

export type PurchaseHistoryWithItems = PurchaseHistory & {
  items: PurchaseHistoryItem[];
};

export async function getShoppingBoard(): Promise<ShoppingBoard> {
  await ensureDatabase();

  const categoryRows = await queryAll("SELECT * FROM shopping_categories ORDER BY sort_order ASC");
  const categories = categoryRows.map(rowToCategory);

  const ingredientRows = await queryAll(
    "SELECT * FROM shopping_ingredients ORDER BY sort_order ASC"
  );
  const ingredients = ingredientRows.map(rowToIngredient);

  const itemRows = await queryAll("SELECT * FROM shopping_items");
  const items = itemRows.map(rowToItem);

  const itemsByIngredient = new Map<string, ShoppingItem>();
  const tempByCategory = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    if (item.ingredientId) {
      itemsByIngredient.set(item.ingredientId, item);
    } else {
      const list = tempByCategory.get(item.categoryId) ?? [];
      list.push(item);
      tempByCategory.set(item.categoryId, list);
    }
  }

  const boardCategories: ShoppingBoardCategory[] = categories.map((cat) => ({
    ...cat,
    ingredients: ingredients
      .filter((ing) => ing.categoryId === cat.id)
      .map((ing) => {
        const selected = itemsByIngredient.get(ing.id);
        return {
          ...ing,
          shoppingItemId: selected?.id ?? null,
          isSelected: Boolean(selected),
          isPurchased: selected?.isPurchased ?? false,
        };
      }),
    temporaryItems: tempByCategory.get(cat.id) ?? [],
  }));

  const selectedCount = items.length;
  const purchasedCount = items.filter((i) => i.isPurchased).length;

  return { categories: boardCategories, selectedCount, purchasedCount };
}

export async function createCategory(name: string): Promise<ShoppingCategory> {
  await ensureDatabase();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("カテゴリ名を入力してください");

  const maxRow = await queryOne<{ max_order: number | null }>(
    "SELECT MAX(sort_order) as max_order FROM shopping_categories"
  );
  const sortOrder = (maxRow?.max_order ?? -1) + 1;
  const now = nowIso();
  const id = uuidv4();

  await execute(
    `INSERT INTO shopping_categories (id, name, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, trimmed, sortOrder, now, now]
  );
  revalidateShopping();
  return { id, name: trimmed, sortOrder, createdAt: now, updatedAt: now };
}

export async function updateCategory(id: string, name: string): Promise<void> {
  await ensureDatabase();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("カテゴリ名を入力してください");
  const now = nowIso();
  await execute("UPDATE shopping_categories SET name = ?, updated_at = ? WHERE id = ?", [
    trimmed,
    now,
    id,
  ]);
  revalidateShopping();
}

export async function deleteCategory(id: string): Promise<void> {
  await ensureDatabase();
  await execute("DELETE FROM shopping_items WHERE category_id = ?", [id]);
  await execute("DELETE FROM shopping_ingredients WHERE category_id = ?", [id]);
  await execute("DELETE FROM shopping_categories WHERE id = ?", [id]);
  revalidateShopping();
}

export async function reorderCategory(id: string, direction: "up" | "down"): Promise<void> {
  await ensureDatabase();
  const rows = await queryAll("SELECT * FROM shopping_categories ORDER BY sort_order ASC");
  const list = rows.map(rowToCategory);
  const index = list.findIndex((c) => c.id === id);
  if (index < 0) throw new Error("カテゴリが見つかりません");
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= list.length) return;

  const a = list[index];
  const b = list[swapIndex];
  const now = nowIso();
  await execute("UPDATE shopping_categories SET sort_order = ?, updated_at = ? WHERE id = ?", [
    b.sortOrder,
    now,
    a.id,
  ]);
  await execute("UPDATE shopping_categories SET sort_order = ?, updated_at = ? WHERE id = ?", [
    a.sortOrder,
    now,
    b.id,
  ]);
  revalidateShopping();
}

export async function createIngredient(
  categoryId: string,
  name: string
): Promise<ShoppingIngredient> {
  await ensureDatabase();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("食材名を入力してください");

  const category = await queryOne("SELECT id FROM shopping_categories WHERE id = ?", [categoryId]);
  if (!category) throw new Error("カテゴリが見つかりません");

  const maxRow = await queryOne<{ max_order: number | null }>(
    "SELECT MAX(sort_order) as max_order FROM shopping_ingredients WHERE category_id = ?",
    [categoryId]
  );
  const sortOrder = (maxRow?.max_order ?? -1) + 1;
  const now = nowIso();
  const id = uuidv4();

  await execute(
    `INSERT INTO shopping_ingredients
     (id, category_id, name, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, categoryId, trimmed, sortOrder, now, now]
  );
  revalidateShopping();
  return {
    id,
    categoryId,
    name: trimmed,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateIngredient(id: string, name: string): Promise<void> {
  await ensureDatabase();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("食材名を入力してください");
  const now = nowIso();
  await execute("UPDATE shopping_ingredients SET name = ?, updated_at = ? WHERE id = ?", [
    trimmed,
    now,
    id,
  ]);
  revalidateShopping();
}

export async function deleteIngredient(id: string): Promise<void> {
  await ensureDatabase();
  await execute("DELETE FROM shopping_items WHERE ingredient_id = ?", [id]);
  await execute("DELETE FROM shopping_ingredients WHERE id = ?", [id]);
  revalidateShopping();
}

export async function reorderIngredient(id: string, direction: "up" | "down"): Promise<void> {
  await ensureDatabase();
  const row = await queryOne("SELECT * FROM shopping_ingredients WHERE id = ?", [id]);
  if (!row) throw new Error("食材が見つかりません");
  const ingredient = rowToIngredient(row);

  const rows = await queryAll(
    "SELECT * FROM shopping_ingredients WHERE category_id = ? ORDER BY sort_order ASC",
    [ingredient.categoryId]
  );
  const list = rows.map(rowToIngredient);
  const index = list.findIndex((i) => i.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= list.length) return;

  const a = list[index];
  const b = list[swapIndex];
  const now = nowIso();
  await execute("UPDATE shopping_ingredients SET sort_order = ?, updated_at = ? WHERE id = ?", [
    b.sortOrder,
    now,
    a.id,
  ]);
  await execute("UPDATE shopping_ingredients SET sort_order = ?, updated_at = ? WHERE id = ?", [
    a.sortOrder,
    now,
    b.id,
  ]);
  revalidateShopping();
}

export async function toggleShoppingSelection(ingredientId: string): Promise<void> {
  await ensureDatabase();
  const existing = await queryOne("SELECT id FROM shopping_items WHERE ingredient_id = ?", [
    ingredientId,
  ]);
  if (existing) {
    await execute("DELETE FROM shopping_items WHERE id = ?", [existing.id as string]);
    revalidateShopping();
    return;
  }

  const ingRow = await queryOne("SELECT * FROM shopping_ingredients WHERE id = ?", [ingredientId]);
  if (!ingRow) throw new Error("食材が見つかりません");
  const ingredient = rowToIngredient(ingRow);
  const now = nowIso();
  await execute(
    `INSERT INTO shopping_items
     (id, ingredient_id, category_id, temp_name, is_purchased, created_at, updated_at)
     VALUES (?, ?, ?, NULL, 0, ?, ?)`,
    [uuidv4(), ingredient.id, ingredient.categoryId, now, now]
  );
  revalidateShopping();
}

export async function addTemporaryItem(categoryId: string, name: string): Promise<ShoppingItem> {
  await ensureDatabase();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("食材名を入力してください");

  const category = await queryOne("SELECT id FROM shopping_categories WHERE id = ?", [categoryId]);
  if (!category) throw new Error("カテゴリが見つかりません");

  const now = nowIso();
  const id = uuidv4();
  await execute(
    `INSERT INTO shopping_items
     (id, ingredient_id, category_id, temp_name, is_purchased, created_at, updated_at)
     VALUES (?, NULL, ?, ?, 0, ?, ?)`,
    [id, categoryId, trimmed, now, now]
  );
  revalidateShopping();
  return {
    id,
    ingredientId: null,
    categoryId,
    tempName: trimmed,
    isPurchased: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function removeShoppingItem(itemId: string): Promise<void> {
  await ensureDatabase();
  await execute("DELETE FROM shopping_items WHERE id = ?", [itemId]);
  revalidateShopping();
}

export async function togglePurchased(itemId: string): Promise<void> {
  await ensureDatabase();
  const row = await queryOne("SELECT * FROM shopping_items WHERE id = ?", [itemId]);
  if (!row) throw new Error("買い物アイテムが見つかりません");
  const item = rowToItem(row);
  const now = nowIso();
  await execute("UPDATE shopping_items SET is_purchased = ?, updated_at = ? WHERE id = ?", [
    item.isPurchased ? 0 : 1,
    now,
    itemId,
  ]);
  revalidateShopping();
}

export async function completeShopping(): Promise<{ historyId: string | null; itemCount: number }> {
  await ensureDatabase();

  const itemRows = await queryAll(
    `SELECT si.*,
            sc.name as category_name,
            sc.sort_order as category_sort_order,
            COALESCE(sing.name, si.temp_name) as ingredient_name,
            COALESCE(sing.sort_order, 0) as item_sort_order
     FROM shopping_items si
     JOIN shopping_categories sc ON sc.id = si.category_id
     LEFT JOIN shopping_ingredients sing ON sing.id = si.ingredient_id
     WHERE si.is_purchased = 1
     ORDER BY sc.sort_order ASC, COALESCE(sing.sort_order, 0) ASC, si.created_at ASC`
  );

  let historyId: string | null = null;
  if (itemRows.length > 0) {
    historyId = uuidv4();
    const now = nowIso();
    await execute(
      "INSERT INTO purchase_histories (id, purchased_at, created_at) VALUES (?, ?, ?)",
      [historyId, now, now]
    );

    for (let i = 0; i < itemRows.length; i++) {
      const row = itemRows[i];
      await execute(
        `INSERT INTO purchase_history_items
         (id, history_id, category_name, ingredient_name, category_sort_order, item_sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          historyId,
          row.category_name as string,
          row.ingredient_name as string,
          Number(row.category_sort_order),
          Number(row.item_sort_order) || i,
        ]
      );
    }
  }

  await execute("DELETE FROM shopping_items");
  revalidateShopping();
  return { historyId, itemCount: itemRows.length };
}

export async function getPurchaseHistories(): Promise<PurchaseHistoryWithItems[]> {
  await ensureDatabase();
  const historyRows = await queryAll(
    "SELECT * FROM purchase_histories ORDER BY purchased_at DESC"
  );
  if (historyRows.length === 0) return [];

  const itemRows = await queryAll(
    `SELECT * FROM purchase_history_items
     ORDER BY category_sort_order ASC, item_sort_order ASC`
  );

  const itemsByHistory = new Map<string, PurchaseHistoryItem[]>();
  for (const row of itemRows) {
    const item: PurchaseHistoryItem = {
      id: row.id as string,
      historyId: row.history_id as string,
      categoryName: row.category_name as string,
      ingredientName: row.ingredient_name as string,
      categorySortOrder: Number(row.category_sort_order),
      itemSortOrder: Number(row.item_sort_order),
    };
    const list = itemsByHistory.get(item.historyId) ?? [];
    list.push(item);
    itemsByHistory.set(item.historyId, list);
  }

  return historyRows.map((row) => ({
    id: row.id as string,
    purchasedAt: row.purchased_at as string,
    createdAt: row.created_at as string,
    items: itemsByHistory.get(row.id as string) ?? [],
  }));
}

export type MealCategory = "home_cooked" | "dining_out";
export type MealType = "lunch" | "dinner" | "other";
export type Eaters = "member_1" | "member_2" | "both";
export type CookMember = "member_1" | "member_2" | "both";
export type CandidateSortOrder = "frequency" | "recent" | "kana";
/** 勤務帯（メンバー2のみ） */
export type ShiftType = "early" | "mid" | "late" | "off";
export type ShiftMemberId = "member_1" | "member_2";

export type Member = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ContentCandidate = {
  id: string;
  name: string;
  reading: string | null;
  category: MealCategory;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MealRecord = {
  id: string;
  date: string;
  mealType: MealType;
  category: MealCategory;
  cookMemberId: CookMember | null;
  eaters: Eaters;
  candidateId: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 食材カテゴリ（野菜・肉など） */
export type ShoppingCategory = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** 定番食材マスタ（今回の購入状態は含まない） */
export type ShoppingIngredient = {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * 今回の買い物リスト行。
 * ingredientId あり＝定番から選択 / tempName あり＝一時追加。
 * 将来のセッション分離用にテーブル名は shopping_items のまま拡張可能。
 */
export type ShoppingItem = {
  id: string;
  ingredientId: string | null;
  categoryId: string;
  tempName: string | null;
  isPurchased: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseHistory = {
  id: string;
  purchasedAt: string;
  createdAt: string;
};

export type PurchaseHistoryItem = {
  id: string;
  historyId: string;
  categoryName: string;
  ingredientName: string;
  categorySortOrder: number;
  itemSortOrder: number;
};

/** シフト／夜ご飯（1日×1メンバー）。shiftType は member_2 のみ使用 */
export type ShiftStamp = {
  id: string;
  date: string;
  memberId: ShiftMemberId;
  shiftType: ShiftType | null;
  needsDinner: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export {
  getClient,
  getDbPath,
  getDbUrl,
  isRemoteDb,
  queryAll,
  queryOne,
  execute,
  executeBatch,
} from "./client";
export { ensureDatabase, initializeDatabase } from "./init";

export type MealCategory = "home_cooked" | "dining_out";
export type MealType = "lunch" | "dinner" | "other";
export type Eaters = "member_1" | "member_2" | "both";
export type CookMember = "member_1" | "member_2" | "both";
export type CandidateSortOrder = "frequency" | "recent" | "kana";

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

export { getClient, getDbPath, getDbUrl, isRemoteDb, queryAll, queryOne, execute } from "./client";
export { ensureDatabase, initializeDatabase } from "./init";

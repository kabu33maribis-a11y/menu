"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { applyCookCount, nowIso } from "@/lib/constants";
import { ensureDatabase, execute, queryAll, queryOne } from "@/lib/db";
import type { CookMember, Eaters, MealCategory, MealType } from "@/lib/db";

export type RecordWithDetails = {
  id: string;
  date: string;
  mealType: MealType;
  category: MealCategory;
  cookMemberId: CookMember | null;
  eaters: Eaters;
  candidateId: string;
  candidateName: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

type RecordRow = {
  id: string;
  date: string;
  meal_type: MealType;
  category: MealCategory;
  cook_member_id: CookMember | null;
  eaters: Eaters;
  candidate_id: string;
  candidate_name: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

function mapRecord(row: RecordRow): RecordWithDetails {
  return {
    id: row.id,
    date: row.date,
    mealType: row.meal_type,
    category: row.category,
    cookMemberId: row.cook_member_id,
    eaters: row.eaters,
    candidateId: row.candidate_id,
    candidateName: row.candidate_name,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const BASE_SELECT = `
  SELECT mr.*, cc.name as candidate_name
  FROM meal_records mr
  INNER JOIN content_candidates cc ON mr.candidate_id = cc.id
`;

export async function getRecords(filters?: {
  startDate?: string;
  endDate?: string;
  category?: MealCategory;
  memberId?: string;
  date?: string;
}): Promise<RecordWithDetails[]> {
  await ensureDatabase();
  const conditions: string[] = [];
  const params: (string | number | null)[] = [];

  if (filters?.startDate) {
    conditions.push("mr.date >= ?");
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    conditions.push("mr.date <= ?");
    params.push(filters.endDate);
  }
  if (filters?.date) {
    conditions.push("mr.date = ?");
    params.push(filters.date);
  }
  if (filters?.category) {
    conditions.push("mr.category = ?");
    params.push(filters.category);
  }
  if (filters?.memberId) {
    conditions.push(
      "(mr.cook_member_id = ? OR mr.cook_member_id = 'both' OR mr.eaters = ? OR mr.eaters = 'both')"
    );
    params.push(filters.memberId, filters.memberId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `${BASE_SELECT} ${where} ORDER BY mr.date DESC, mr.created_at DESC`;
  const rows = await queryAll<RecordRow>(sql, params);
  return rows.map(mapRecord);
}

export async function getRecordById(id: string): Promise<RecordWithDetails | null> {
  await ensureDatabase();
  const row = await queryOne<RecordRow>(`${BASE_SELECT} WHERE mr.id = ?`, [id]);
  return row ? mapRecord(row) : null;
}

export async function createRecord(data: {
  date: string;
  mealType: MealType;
  category: MealCategory;
  cookMemberId?: CookMember | null;
  eaters: Eaters;
  candidateId: string;
  memo?: string;
}) {
  if (data.category === "home_cooked" && !data.cookMemberId) {
    throw new Error("自炊の場合は作った人を選択してください");
  }

  await ensureDatabase();
  const candidate = await queryOne<{ category: MealCategory }>(
    "SELECT category FROM content_candidates WHERE id = ?",
    [data.candidateId]
  );
  if (!candidate) throw new Error("候補が見つかりません");
  if (candidate.category !== data.category) {
    throw new Error("候補の種別が一致しません");
  }

  const now = nowIso();
  const record = {
    id: uuidv4(),
    date: data.date,
    mealType: data.mealType,
    category: data.category,
    cookMemberId: data.category === "dining_out" ? null : data.cookMemberId ?? null,
    eaters: data.eaters,
    candidateId: data.candidateId,
    memo: data.memo?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };

  await execute(
    `INSERT INTO meal_records
     (id, date, meal_type, category, cook_member_id, eaters, candidate_id, memo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.date,
      record.mealType,
      record.category,
      record.cookMemberId,
      record.eaters,
      record.candidateId,
      record.memo,
      record.createdAt,
      record.updatedAt,
    ]
  );

  revalidatePath("/", "layout");
  return record;
}

export async function updateRecord(
  id: string,
  data: {
    date: string;
    mealType: MealType;
    category: MealCategory;
    cookMemberId?: CookMember | null;
    eaters: Eaters;
    candidateId: string;
    memo?: string;
  }
) {
  if (data.category === "home_cooked" && !data.cookMemberId) {
    throw new Error("自炊の場合は作った人を選択してください");
  }
  await ensureDatabase();
  await execute(
    `UPDATE meal_records SET
     date = ?, meal_type = ?, category = ?, cook_member_id = ?,
     eaters = ?, candidate_id = ?, memo = ?, updated_at = ?
     WHERE id = ?`,
    [
      data.date,
      data.mealType,
      data.category,
      data.category === "dining_out" ? null : data.cookMemberId ?? null,
      data.eaters,
      data.candidateId,
      data.memo?.trim() || null,
      nowIso(),
      id,
    ]
  );
  revalidatePath("/", "layout");
}

export async function deleteRecord(id: string) {
  await ensureDatabase();
  await execute("DELETE FROM meal_records WHERE id = ?", [id]);
  revalidatePath("/", "layout");
}

export async function getMissingDaysInRange(
  startDate: string,
  endDate: string
): Promise<string[]> {
  const records = await getRecords({ startDate, endDate });
  const recordedDates = new Set(records.map((r) => r.date));
  const missing: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;
    if (!recordedDates.has(key)) missing.push(key);
  }
  return missing;
}

export async function getWeekSummary() {
  const { getWeekRange, todayString } = await import("@/lib/constants");
  const { start, end } = getWeekRange();
  const records = await getRecords({ startDate: start, endDate: end });
  const homeCooked = records.filter((r) => r.category === "home_cooked").length;
  const diningOut = records.filter((r) => r.category === "dining_out").length;
  const cookCounts: Record<string, number> = {};
  for (const r of records) {
    if (r.category === "home_cooked") {
      applyCookCount(cookCounts, r.cookMemberId);
    }
  }
  await ensureDatabase();
  const membersList = await queryAll<{ id: string; name: string }>(
    "SELECT id, name FROM members ORDER BY id"
  );
  return {
    start,
    end,
    homeCooked,
    diningOut,
    cookCounts,
    members: membersList,
    today: todayString(),
  };
}

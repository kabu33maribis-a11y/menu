"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { isDiningOutUnknownCandidate, nowIso } from "@/lib/constants";
import { ensureDatabase, execute, queryAll, queryOne } from "@/lib/db";
import type { ContentCandidate, MealCategory } from "@/lib/db";
import {
  buildCandidateStats,
  filterCandidates,
  randomPick,
  sortCandidates,
  weightedRandomPick,
  type CandidateWithStats,
} from "@/lib/utils/candidates";
import { getCandidateSortOrder } from "./settings";

function rowToCandidate(row: Record<string, unknown>): ContentCandidate {
  return {
    id: row.id as string,
    name: row.name as string,
    reading: (row.reading as string | null) ?? null,
    category: row.category as MealCategory,
    isArchived: Boolean(row.is_archived),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

async function getStatsMap() {
  await ensureDatabase();
  const rows = await queryAll<{
    candidate_id: string;
    count: number;
    last_date: string | null;
  }>(
    `SELECT candidate_id, COUNT(*) as count, MAX(date) as last_date
     FROM meal_records GROUP BY candidate_id`
  );
  return new Map(
    rows.map((r) => [r.candidate_id, { count: r.count, lastDate: r.last_date }])
  );
}

export async function getCandidates(
  category: MealCategory,
  options?: { includeArchived?: boolean; query?: string }
): Promise<CandidateWithStats[]> {
  await ensureDatabase();
  let sql = "SELECT * FROM content_candidates WHERE category = ?";
  const params: (string | number | null)[] = [category];
  if (!options?.includeArchived) {
    sql += " AND is_archived = 0";
  }
  const rows = await queryAll(sql, params);
  const list = rows.map((r) => rowToCandidate(r));
  const statsMap = await getStatsMap();
  const withStats = buildCandidateStats(list, statsMap);
  const order = await getCandidateSortOrder();
  const sorted = sortCandidates(withStats, order);
  return filterCandidates(sorted, options?.query ?? "");
}

export async function createCandidate(data: {
  name: string;
  reading?: string;
  category: MealCategory;
}) {
  const name = data.name.trim();
  if (!name) throw new Error("名称を入力してください");
  await ensureDatabase();
  const existing = await queryOne(
    "SELECT * FROM content_candidates WHERE name = ? AND category = ?",
    [name, data.category]
  );
  if (existing) return rowToCandidate(existing);

  const now = nowIso();
  const candidate: ContentCandidate = {
    id: uuidv4(),
    name,
    reading: data.reading?.trim() || null,
    category: data.category,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
  await execute(
    `INSERT INTO content_candidates
     (id, name, reading, category, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [
      candidate.id,
      candidate.name,
      candidate.reading,
      candidate.category,
      candidate.createdAt,
      candidate.updatedAt,
    ]
  );
  revalidatePath("/", "layout");
  return candidate;
}

async function assertMutableCandidate(id: string) {
  await ensureDatabase();
  const row = await queryOne<{ id: string; name: string }>(
    "SELECT id, name FROM content_candidates WHERE id = ?",
    [id]
  );
  if (row && isDiningOutUnknownCandidate(row)) {
    throw new Error("この候補は変更・削除できません");
  }
}

export async function updateCandidate(
  id: string,
  data: { name: string; reading?: string }
) {
  await assertMutableCandidate(id);
  const name = data.name.trim();
  if (!name) throw new Error("名称を入力してください");
  await execute(
    "UPDATE content_candidates SET name = ?, reading = ?, updated_at = ? WHERE id = ?",
    [name, data.reading?.trim() || null, nowIso(), id]
  );
  revalidatePath("/", "layout");
}

export async function archiveCandidate(id: string, archived: boolean) {
  await assertMutableCandidate(id);
  await execute(
    "UPDATE content_candidates SET is_archived = ?, updated_at = ? WHERE id = ?",
    [archived ? 1 : 0, nowIso(), id]
  );
  revalidatePath("/", "layout");
}

export async function deleteCandidate(id: string) {
  await assertMutableCandidate(id);
  const used = await queryOne<{ c: number }>(
    "SELECT COUNT(*) as c FROM meal_records WHERE candidate_id = ?",
    [id]
  );
  if (used && used.c > 0) {
    throw new Error("使用済みの候補は削除できません。アーカイブしてください。");
  }
  await execute("DELETE FROM content_candidates WHERE id = ?", [id]);
  revalidatePath("/", "layout");
}

export async function getStaleCandidates(limit = 20): Promise<CandidateWithStats[]> {
  const list = await getCandidates("home_cooked");
  const sorted = [...list].sort((a, b) => {
    if (!a.lastUsedDate && !b.lastUsedDate) return a.name.localeCompare(b.name, "ja");
    if (!a.lastUsedDate) return -1;
    if (!b.lastUsedDate) return 1;
    return a.lastUsedDate.localeCompare(b.lastUsedDate);
  });
  return sorted.slice(0, limit);
}

export async function getMealSuggestions(
  preferStale: boolean
): Promise<CandidateWithStats[]> {
  const list = await getCandidates("home_cooked");
  if (list.length === 0) return [];
  return preferStale ? weightedRandomPick(list, 3) : randomPick(list, 3);
}

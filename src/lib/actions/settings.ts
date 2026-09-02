"use server";

import { revalidatePath } from "next/cache";
import { ensureDatabase, execute, queryOne } from "@/lib/db";
import type { CandidateSortOrder } from "@/lib/db";

export async function getSetting(key: string): Promise<string | null> {
  await ensureDatabase();
  const row = await queryOne<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = ?",
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await ensureDatabase();
  const existing = await queryOne("SELECT key FROM app_settings WHERE key = ?", [key]);
  if (existing) {
    await execute("UPDATE app_settings SET value = ? WHERE key = ?", [value, key]);
  } else {
    await execute("INSERT INTO app_settings (key, value) VALUES (?, ?)", [key, value]);
  }
  revalidatePath("/", "layout");
}

export async function getCandidateSortOrder(): Promise<CandidateSortOrder> {
  const value = await getSetting("candidate_sort_order");
  if (value === "recent" || value === "kana") return value;
  return "frequency";
}

export async function setCandidateSortOrder(order: CandidateSortOrder) {
  await setSetting("candidate_sort_order", order);
}

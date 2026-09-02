"use server";

import { revalidatePath } from "next/cache";
import { ensureDatabase, execute, queryAll } from "@/lib/db";
import type { Member } from "@/lib/db";
import { nowIso } from "@/lib/constants";

function rowToMember(row: Record<string, unknown>): Member {
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getMembers(): Promise<Member[]> {
  await ensureDatabase();
  const rows = await queryAll("SELECT * FROM members ORDER BY id");
  return rows.map((r) => rowToMember(r));
}

export async function updateMemberName(id: string, name: string) {
  if (!name.trim()) throw new Error("名前を入力してください");
  await ensureDatabase();
  await execute("UPDATE members SET name = ?, updated_at = ? WHERE id = ?", [
    name.trim(),
    nowIso(),
    id,
  ]);
  revalidatePath("/", "layout");
}

export async function getMemberMap(): Promise<Record<string, string>> {
  const list = await getMembers();
  return Object.fromEntries(list.map((m) => [m.id, m.name]));
}

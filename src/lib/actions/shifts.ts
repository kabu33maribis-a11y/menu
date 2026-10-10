"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import {
  memberUsesShiftSchedule,
  nowIso,
  SHIFT_TYPES,
} from "@/lib/constants";
import { ensureDatabase, execute, executeBatch, queryAll } from "@/lib/db";
import type { ShiftMemberId, ShiftStamp, ShiftType } from "@/lib/db";

type ShiftStampRow = {
  id: string;
  date: string;
  member_id: ShiftMemberId;
  shift_type: ShiftType | null;
  needs_dinner: number | null;
  created_at: string;
  updated_at: string;
};

function mapStamp(row: ShiftStampRow): ShiftStamp {
  return {
    id: row.id,
    date: row.date,
    memberId: row.member_id,
    shiftType: row.shift_type,
    needsDinner:
      row.needs_dinner === null || row.needs_dinner === undefined
        ? null
        : row.needs_dinner === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isShiftMemberId(id: string): id is ShiftMemberId {
  return id === "member_1" || id === "member_2";
}

function isShiftType(value: string): value is ShiftType {
  return (SHIFT_TYPES as string[]).includes(value);
}

export async function getShiftStamps(
  startDate: string,
  endDate: string
): Promise<ShiftStamp[]> {
  await ensureDatabase();
  const rows = await queryAll<ShiftStampRow>(
    `SELECT * FROM shift_stamps
     WHERE date >= ? AND date <= ?
     ORDER BY date, member_id`,
    [startDate, endDate]
  );
  return rows.map(mapStamp);
}

/** 勤務帯を一括設定（メンバー2のみ）。夜ご飯フラグは維持 */
export async function applyShiftTypes(input: {
  memberId: string;
  dates: string[];
  shiftType: string;
}): Promise<void> {
  if (!isShiftMemberId(input.memberId)) {
    throw new Error("メンバーが不正です");
  }
  if (!memberUsesShiftSchedule(input.memberId)) {
    throw new Error("このメンバーには勤務帯を設定できません");
  }
  if (!isShiftType(input.shiftType)) {
    throw new Error("勤務帯が不正です");
  }
  const dates = [...new Set(input.dates.filter(Boolean))];
  if (dates.length === 0) {
    throw new Error("日付を選択してください");
  }

  await ensureDatabase();
  const now = nowIso();
  await executeBatch(
    dates.map((date) => ({
      sql: `INSERT INTO shift_stamps
        (id, date, member_id, shift_type, needs_dinner, created_at, updated_at)
        VALUES (?, ?, ?, ?, NULL, ?, ?)
        ON CONFLICT(date, member_id) DO UPDATE SET
          shift_type = excluded.shift_type,
          updated_at = excluded.updated_at`,
      args: [uuidv4(), date, input.memberId, input.shiftType, now, now],
    }))
  );
  revalidatePath("/shifts");
}

/** 夜ご飯の要否を一括設定。勤務帯は維持 */
export async function applyDinnerNeeds(input: {
  memberId: string;
  dates: string[];
  needsDinner: boolean;
}): Promise<void> {
  if (!isShiftMemberId(input.memberId)) {
    throw new Error("メンバーが不正です");
  }
  const dates = [...new Set(input.dates.filter(Boolean))];
  if (dates.length === 0) {
    throw new Error("日付を選択してください");
  }

  await ensureDatabase();
  const now = nowIso();
  const needsDinner = input.needsDinner ? 1 : 0;
  await executeBatch(
    dates.map((date) => ({
      sql: `INSERT INTO shift_stamps
        (id, date, member_id, shift_type, needs_dinner, created_at, updated_at)
        VALUES (?, ?, ?, NULL, ?, ?, ?)
        ON CONFLICT(date, member_id) DO UPDATE SET
          needs_dinner = excluded.needs_dinner,
          updated_at = excluded.updated_at`,
      args: [uuidv4(), date, input.memberId, needsDinner, now, now],
    }))
  );
  revalidatePath("/shifts");
}

export async function clearShiftStamps(input: {
  memberId: string;
  dates: string[];
}): Promise<void> {
  if (!isShiftMemberId(input.memberId)) {
    throw new Error("メンバーが不正です");
  }
  const dates = [...new Set(input.dates.filter(Boolean))];
  if (dates.length === 0) {
    throw new Error("日付を選択してください");
  }

  await ensureDatabase();
  const placeholders = dates.map(() => "?").join(", ");
  await execute(
    `DELETE FROM shift_stamps
     WHERE member_id = ? AND date IN (${placeholders})`,
    [input.memberId, ...dates]
  );
  revalidatePath("/shifts");
}

import fs from "fs";
import path from "path";
import {
  DINING_OUT_UNKNOWN_ID,
  DINING_OUT_UNKNOWN_NAME,
  DINING_OUT_UNKNOWN_READING,
} from "@/lib/constants";
import { execStatements, execute, getDataDir, isRemoteDb, queryOne } from "./client";

const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  reading TEXT,
  category TEXT NOT NULL CHECK(category IN ('home_cooked', 'dining_out')),
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(name, category)
);

CREATE TABLE IF NOT EXISTS meal_records (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK(meal_type IN ('lunch', 'dinner', 'other')),
  category TEXT NOT NULL CHECK(category IN ('home_cooked', 'dining_out')),
  cook_member_id TEXT CHECK(cook_member_id IS NULL OR cook_member_id IN ('member_1', 'member_2', 'both')),
  eaters TEXT NOT NULL CHECK(eaters IN ('member_1', 'member_2', 'both')),
  candidate_id TEXT NOT NULL REFERENCES content_candidates(id),
  memo TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shopping_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shopping_ingredients (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES shopping_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  ingredient_id TEXT REFERENCES shopping_ingredients(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES shopping_categories(id) ON DELETE CASCADE,
  temp_name TEXT,
  is_purchased INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_histories (
  id TEXT PRIMARY KEY,
  purchased_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_history_items (
  id TEXT PRIMARY KEY,
  history_id TEXT NOT NULL REFERENCES purchase_histories(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  ingredient_name TEXT NOT NULL,
  category_sort_order INTEGER NOT NULL DEFAULT 0,
  item_sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_meal_records_date ON meal_records(date);
CREATE INDEX IF NOT EXISTS idx_meal_records_candidate ON meal_records(candidate_id);
CREATE INDEX IF NOT EXISTS idx_content_candidates_category ON content_candidates(category);
CREATE INDEX IF NOT EXISTS idx_shopping_ingredients_category ON shopping_ingredients(category_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_ingredient ON shopping_items(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON shopping_items(category_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_items_history ON purchase_history_items(history_id);
`;

const lockPath = () => path.join(getDataDir(), ".init.lock");

function sleepMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withInitLock(fn: () => Promise<void>) {
  if (isRemoteDb()) {
    await fn();
    return;
  }

  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      fs.writeFileSync(lockPath(), String(process.pid), { flag: "wx" });
      try {
        await fn();
      } finally {
        try {
          fs.unlinkSync(lockPath());
        } catch {
          /* ignore */
        }
      }
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EEXIST") {
        await sleepMs(100 + attempt * 25);
        continue;
      }
      throw error;
    }
  }
  await fn();
}

async function ensureDiningOutUnknownCandidate(now: string) {
  const byId = await queryOne<{ id: string }>(
    "SELECT id FROM content_candidates WHERE id = ?",
    [DINING_OUT_UNKNOWN_ID]
  );
  if (byId) {
    await execute(
      "UPDATE content_candidates SET is_archived = 0, updated_at = ? WHERE id = ? AND is_archived = 1",
      [now, DINING_OUT_UNKNOWN_ID]
    );
    return;
  }

  const byName = await queryOne<{ id: string }>(
    "SELECT id FROM content_candidates WHERE name = ? AND category = 'dining_out'",
    [DINING_OUT_UNKNOWN_NAME]
  );
  if (byName) {
    await execute(
      "UPDATE content_candidates SET is_archived = 0, updated_at = ? WHERE id = ? AND is_archived = 1",
      [now, byName.id]
    );
    return;
  }

  await execute(
    `INSERT OR IGNORE INTO content_candidates
     (id, name, reading, category, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, 'dining_out', 0, ?, ?)`,
    [
      DINING_OUT_UNKNOWN_ID,
      DINING_OUT_UNKNOWN_NAME,
      DINING_OUT_UNKNOWN_READING,
      now,
      now,
    ]
  );
}

const DEFAULT_SHOPPING_CATEGORIES = [
  "野菜",
  "肉・魚",
  "乳製品",
  "卵",
  "調味料",
  "冷凍食品",
  "飲料",
  "その他",
];

async function seedShoppingCategories(now: string) {
  const seeded = await queryOne<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = ?",
    ["shopping_seeded"]
  );
  if (seeded?.value === "true") return;

  const existing = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM shopping_categories"
  );
  if (!existing || existing.cnt === 0) {
    for (let i = 0; i < DEFAULT_SHOPPING_CATEGORIES.length; i++) {
      const id = `shop_cat_${i + 1}`;
      await execute(
        `INSERT OR IGNORE INTO shopping_categories
         (id, name, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [id, DEFAULT_SHOPPING_CATEGORIES[i], i, now, now]
      );
    }
  }

  await execute("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)", [
    "shopping_seeded",
    "true",
  ]);
}

async function seedDatabase(now: string) {
  await execute(
    "INSERT OR IGNORE INTO members (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ["member_1", "メンバー1", now, now]
  );
  await execute(
    "INSERT OR IGNORE INTO members (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ["member_2", "メンバー2", now, now]
  );
  await execute("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)", [
    "candidate_sort_order",
    "frequency",
  ]);
  await execute("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)", [
    "initialized",
    "true",
  ]);
  await ensureDiningOutUnknownCandidate(now);
  await seedShoppingCategories(now);
}

async function initializeDatabaseCore() {
  await execStatements(CREATE_TABLES);
  await seedDatabase(new Date().toISOString());
}

type GlobalWithDb = typeof globalThis & { __kenkonDbReady?: Promise<void> };

export async function ensureDatabase() {
  const g = globalThis as GlobalWithDb;
  if (!g.__kenkonDbReady) {
    g.__kenkonDbReady = withInitLock(initializeDatabaseCore);
  }
  await g.__kenkonDbReady;
}

/** @deprecated Use ensureDatabase() */
export async function initializeDatabase() {
  await ensureDatabase();
}

export { getDbPath } from "./client";

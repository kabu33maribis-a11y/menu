/**
 * ローカル data/meals.db の内容を Turso（本番DB）へコピーします。
 *
 * 使い方:
 *   1. .env.local に TURSO_DATABASE_URL / TURSO_AUTH_TOKEN を設定
 *      （Vercel の Environment Variables と同じ値）
 *   2. npm run db:migrate-turso
 */
import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";

const TABLES = ["members", "content_candidates", "meal_records", "app_settings"] as const;

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function countRows(
  client: ReturnType<typeof createClient>,
  table: string
): Promise<number> {
  const result = await client.execute(`SELECT COUNT(*) as c FROM ${table}`);
  const row = result.rows[0] as unknown as { c?: number } | undefined;
  return Number(row?.c ?? 0);
}

async function main() {
  loadEnvLocal();

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (!tursoUrl || !tursoToken) {
    console.error("❌ TURSO_DATABASE_URL と TURSO_AUTH_TOKEN が必要です。");
    console.error("");
    console.error("  .env.local を作成してください:");
    console.error("    TURSO_DATABASE_URL=libsql://...");
    console.error("    TURSO_AUTH_TOKEN=...");
    console.error("");
    console.error("  Vercel → Project → Settings → Environment Variables からコピーできます。");
    process.exit(1);
  }

  const localDbPath = path.join(process.cwd(), "data", "meals.db");
  if (!fs.existsSync(localDbPath)) {
    console.error(`❌ ローカルDBが見つかりません: ${localDbPath}`);
    process.exit(1);
  }

  const local = createClient({ url: `file:${localDbPath}` });
  const remote = createClient({ url: tursoUrl, authToken: tursoToken });

  // WAL をフラッシュして最新データを読む
  await local.execute("PRAGMA wal_checkpoint(FULL)");

  console.log("📦 ローカルDB:", localDbPath);
  console.log("☁️  移行先:", tursoUrl.replace(/\/\/.*@/, "//***@"));
  console.log("");

  // リモートにスキーマを作成
  process.env.TURSO_DATABASE_URL = tursoUrl;
  process.env.TURSO_AUTH_TOKEN = tursoToken;
  const { ensureDatabase } = await import("../src/lib/db/init");
  await ensureDatabase();
  console.log("✓ リモートDBのスキーマを確認しました");
  console.log("");

  for (const table of TABLES) {
    const localCount = await countRows(local, table);
    console.log(`→ ${table}: ローカル ${localCount} 件`);

    if (localCount === 0) continue;

    const result = await local.execute(`SELECT * FROM ${table}`);
    const rows = result.rows;
    if (rows.length === 0) continue;

    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => "?").join(", ");
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;

    for (const row of rows) {
      const values = cols.map((c) => {
        const v = (row as Record<string, unknown>)[c];
        return v === undefined ? null : v;
      });
      await remote.execute({ sql, args: values as (string | number | null)[] });
    }

    const remoteCount = await countRows(remote, table);
    console.log(`  ✓ リモート ${remoteCount} 件に反映`);
  }

  console.log("");
  console.log("✅ 移行完了！デプロイ済みアプリを再読み込みしてください。");
}

main().catch((err) => {
  console.error("❌ 移行に失敗しました:", err);
  process.exit(1);
});

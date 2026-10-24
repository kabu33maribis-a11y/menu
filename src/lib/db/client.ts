import { createClient, type Client } from "@libsql/client";
import fs from "fs";
import path from "path";

let client: Client | undefined;

export function getDbUrl(): string {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return `file:${path.join(dataDir, "meals.db")}`;
}

export function isRemoteDb(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

export function getClient(): Client {
  if (client) return client;
  const url = getDbUrl();
  client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return client;
}

export async function queryAll<T extends Record<string, unknown>>(
  sql: string,
  args: (string | number | null)[] = []
): Promise<T[]> {
  const result = await getClient().execute({ sql, args });
  return result.rows as unknown as T[];
}

export async function queryOne<T extends Record<string, unknown>>(
  sql: string,
  args: (string | number | null)[] = []
): Promise<T | undefined> {
  const rows = await queryAll<T>(sql, args);
  return rows[0];
}

export async function execute(
  sql: string,
  args: (string | number | null)[] = []
): Promise<void> {
  await getClient().execute({ sql, args });
}

export async function execStatements(statements: string): Promise<void> {
  const db = getClient();
  const parts = statements
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const sql of parts) {
    await db.execute(sql);
  }
}

export function getDbPath(): string {
  return path.join(process.cwd(), "data", "meals.db");
}

export function getDataDir(): string {
  return path.join(process.cwd(), "data");
}

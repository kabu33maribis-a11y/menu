# 献立記録

2人の献立（自炊・外食）を記録・統計する Web アプリです。

## 機能

- 今日の献立記録（昼・夕）
- 月間カレンダー表示
- 記録一覧・検索
- 統計グラフ
- 献立サジェスト
- 料理・お店候補の管理

## ローカル開発

```bash
npm install
npm run db:init
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

Windows の場合は `setup.bat` → `start.bat` でも起動できます。

## Vercel へのデプロイ

Vercel のサーバーレス環境ではローカル SQLite ファイルが使えないため、**Turso**（クラウド SQLite）を利用します。

### 1. GitHub にプッシュ

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<ユーザー名>/kenkon-kanri.git
git push -u origin main
```

### 2. Turso データベースを作成

1. [Turso](https://turso.tech/) でアカウント作成
2. ダッシュボードで新しいデータベースを作成
3. **Database URL** と **Auth Token** を控える

CLI を使う場合:

```bash
# Turso CLI インストール後
turso db create kenkon-kanri
turso db show kenkon-kanri --url
turso db tokens create kenkon-kanri
```

### 3. Vercel でプロジェクトをインポート

1. [Vercel](https://vercel.com/) にログイン
2. **Add New Project** → GitHub リポジトリを選択
3. **Environment Variables** に以下を追加:

| 名前 | 値 |
|------|-----|
| `TURSO_DATABASE_URL` | `libsql://...` |
| `TURSO_AUTH_TOKEN` | Turso のトークン |

4. **Deploy** をクリック

初回アクセス時に DB テーブルが自動作成されます。

### 4. ローカルで Turso を使う（任意）

`.env.local` を作成:

```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

未設定の場合は `data/meals.db` にローカル保存されます。

## 技術スタック

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 4
- Turso / libSQL（本番）・SQLite ファイル（ローカル）
- Recharts

## ライセンス

Private

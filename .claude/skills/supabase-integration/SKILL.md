---
name: supabase-integration
description: |
  使用タイミング: supabase, database, RLS, auth, realtime, storage
  やること: クライアント設定、CRUD、RLS設定、リアルタイム購読
  事故ポイント: RLS未設定で全データ公開、server/client混同、型不整合
---

# Supabase Integration

## クライアント使い分け（重要）

| 用途 | ファイル | 使う場所 |
|------|---------|---------|
| Browser | `client.ts` | Client Component |
| Server | `server.ts` | Server Component, Route Handler |
| Admin | `admin.ts` | Webhook, バッチ（RLS無視） |

→ 詳細: ./clients.md

## RLS（Row Level Security）

**デフォルト**: 全拒否。ポリシーなし = アクセス不可。

```sql
-- 有効化（必須）
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 自分のデータだけ見える
CREATE POLICY "select_own" ON posts FOR SELECT
USING (auth.uid() = user_id);
```

→ 詳細: ./rls.md

## チェックリスト

### 初期設定
- [ ] 環境変数設定（URL, ANON_KEY, SERVICE_ROLE_KEY）
- [ ] 3種のクライアント作成
- [ ] 型生成 `supabase gen types typescript`

### テーブル作成時
- [ ] RLS有効化
- [ ] SELECT/INSERT/UPDATE/DELETE ポリシー
- [ ] 型再生成

### デプロイ前
- [ ] SERVICE_ROLE_KEY は絶対に公開しない
- [ ] RLS テスト（別ユーザーでアクセスしてみる）

## トラブルシュート

| 症状 | 原因 | 対処 |
|------|------|------|
| データ取れない | RLSポリシーなし | ポリシー追加 |
| 全データ見える | RLS無効 | `ENABLE ROW LEVEL SECURITY` |
| 型エラー | 型古い | `supabase gen types` 再実行 |
| Server で auth 取れない | client 使用 | `server.ts` に変更 |

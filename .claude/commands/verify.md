# /verify - システム検証コマンド

システム構造を分析し、検証項目を洗い出し、テストを実行する。

## 実行フロー

### 1. README.md / PROJECT.md 参照
まず現状を把握する。

### 2. システム構造分析

以下を自動で分析し、PROJECT.md に記録：

#### ルーティング分析
```bash
# Next.js App Router の構造を解析
find src/app -name "page.tsx" -o -name "route.ts"
```

#### DB スキーマ分析
```bash
# Supabase
cat supabase/migrations/*.sql

# Prisma
cat prisma/schema.prisma

# Drizzle
cat src/lib/db/schema.ts
```

#### コンポーネント依存関係
```bash
# import文を解析
grep -r "import.*from" src/components/
```

### 3. 不明点があれば質問

「この画面とこの画面の関係を教えてください」
「このマスタはどこで使われますか？」

### 4. 検証項目を PROJECT.md に追記

```markdown
## 検証項目

### 機能連携テスト
| 起点 | 終点 | 確認内容 | 状態 |
|------|------|----------|------|
| /users | /users/[id] | ID一致 | [ ] |
```

### 5. テスト実行

#### ユニットテスト
```bash
pnpm test
```

#### E2Eテスト
```bash
pnpm test:e2e
```

#### ローカルサーバー起動 + 手動確認
```bash
pnpm dev
# http://localhost:3000 で確認
```

### 6. 結果を PROJECT.md に反映

- [ ] → [x] に更新
- 失敗したテストをメモ

## オプション

```
/verify              # 全体検証
/verify routes       # ルーティングのみ
/verify db           # DBスキーマのみ
/verify connections  # 画面連携のみ
/verify tests        # テスト実行のみ
```

## 出力例

```
📊 システム分析結果

ルーティング: 15 画面検出
DBテーブル: 8 テーブル検出
コンポーネント: 42 個検出

⚠️ 確認が必要な点:
- /orders と /inventory の連携が不明確
- users.role が使われている箇所が不明

✅ 検証項目を PROJECT.md に追記しました

テストを実行しますか？ (y/n)
```

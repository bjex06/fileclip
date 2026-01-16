# Row Level Security (RLS)

## 基本

```sql
-- 1. 有効化（テーブル作成後すぐ）
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 2. ポリシーなし = 全拒否（安全側に倒れる）
```

## よくあるパターン

### 自分のデータだけ

```sql
-- SELECT
CREATE POLICY "select_own" ON posts FOR SELECT
USING (auth.uid() = user_id);

-- INSERT（自分のIDで作成）
CREATE POLICY "insert_own" ON posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE
CREATE POLICY "update_own" ON posts FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE
CREATE POLICY "delete_own" ON posts FOR DELETE
USING (auth.uid() = user_id);
```

### 公開データ（誰でも読める）

```sql
CREATE POLICY "select_public" ON posts FOR SELECT
USING (is_public = true);
```

### 組織内共有

```sql
CREATE POLICY "select_org" ON posts FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  )
);
```

## テスト方法

```sql
-- 特定ユーザーとしてクエリ実行
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM posts;
```

## 危険な設定

```sql
-- ❌ 全公開（絶対やるな）
CREATE POLICY "allow_all" ON posts FOR ALL USING (true);

-- ❌ RLS無効のまま放置
-- → 全データが誰からでも見える
```

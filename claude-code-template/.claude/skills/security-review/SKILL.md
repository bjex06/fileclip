---
name: security-review
description: |
  Next.js + Supabaseアプリのセキュリティレビューガイド。
  OWASP Top 10チェック、認証・認可検証、入力バリデーション、
  XSS/CSRF対策、シークレット管理、RLSポリシー監査。
  セキュリティチェック、脆弱性診断、コードレビュー時に使用。
  トリガー: security、セキュリティ、脆弱性、review、監査、audit
---

# Security Review

## API Route Security

### 必須チェック項目

#### 1. 認証チェック
```typescript
export async function POST(request: Request) {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ...
}
```

#### 2. 入力バリデーション（Zod必須）
```typescript
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
})

const result = schema.safeParse(body)
if (!result.success) {
  return NextResponse.json(
    { error: 'Invalid input', details: result.error.flatten() },
    { status: 400 }
  )
}
```

#### 3. エラー情報の非露出
```typescript
try {
  // operation
} catch (error) {
  console.error('Internal:', error) // ログには詳細
  return NextResponse.json(
    { error: 'Internal server error' }, // レスポンスは抽象的
    { status: 500 }
  )
}
```

## Forbidden Patterns ❌

```typescript
// ❌ 生SQLクエリ
await supabase.rpc('raw_query', { sql: userInput })

// ❌ 認証なしのデータ操作
export async function DELETE(request: Request) {
  const { id } = await request.json()
  await supabase.from('items').delete().eq('id', id)
}

// ❌ シークレットのハードコード
const apiKey = 'sk-1234567890'

// ❌ 未検証の入力
const { email } = await request.json()
await supabase.from('users').update({ email })
```

## RLS Policy Audit

```sql
-- 各テーブルで確認
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public';

-- RLS有効化確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### RLSチェックリスト
- [ ] 全テーブルでRLS有効化
- [ ] SELECT/INSERT/UPDATE/DELETEそれぞれにポリシー
- [ ] auth.uid()による所有者チェック
- [ ] Service Roleの使用箇所が限定的

## Security Headers

```typescript
// next.config.js
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]
```

## Review Output Format

```markdown
## 🔍 Security Review Report

### 🔴 Critical (即時対応)
- [file:line] 問題の説明
- Fix: 修正方法

### 🟠 High (早急に対応)
- [file:line] 問題の説明

### 🟡 Medium (計画的に対応)
- [file:line] 問題の説明

### ✅ Good Practices
- 確認できた良い実装
```

# API Security Rules

適用: `src/app/api/**/*.ts`

## Required Patterns

### 認証チェック
```typescript
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 入力バリデーション（Zod）
```typescript
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
})
const result = schema.safeParse(body)
if (!result.success) {
  return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
}
```

### エラーハンドリング
```typescript
try {
  // operation
} catch (error) {
  console.error('API Error:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

## Forbidden ❌
- 生SQLクエリ
- 認証なしのデータ操作
- シークレットのハードコード
- 未検証の入力使用

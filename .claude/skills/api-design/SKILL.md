---
name: api-design
description: |
  Next.js App RouterでのAPI設計スキル。
  RESTful設計、Server Actions、バリデーション、
  エラーハンドリング、レート制限、ページネーション。
  API設計、エンドポイント作成、Server Actions実装時に使用。
  トリガー: API、エンドポイント、Server Actions、REST、バックエンド
---

# API Design Skill

## Route Handlers vs Server Actions

| 用途 | Route Handlers | Server Actions |
|------|---------------|----------------|
| 外部APIとして公開 | ✅ | ❌ |
| フォーム送信 | △ | ✅ |
| Webhook受信 | ✅ | ❌ |
| 内部CRUD操作 | △ | ✅ |
| ファイルアップロード | ✅ | △ |

## Route Handlers

### 基本パターン
```typescript
// app/api/users/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// GET /api/users
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const offset = (page - 1) * limit

  const supabase = createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error, count } = await supabase
    .from('users')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil((count || 0) / limit),
    },
  })
}

// POST /api/users
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
})

export async function POST(request: Request) {
  const supabase = createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const result = createUserSchema.safeParse(body)
  
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation error', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('users')
    .insert(result.data)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
```

### 動的ルート
```typescript
// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server'

// GET /api/users/:id
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ data })
}

// PATCH /api/users/:id
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('users')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// DELETE /api/users/:id
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
```

## Server Actions

### 基本パターン
```typescript
// lib/actions/user.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
})

export async function updateProfile(formData: FormData) {
  const supabase = createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const raw = {
    name: formData.get('name'),
    bio: formData.get('bio'),
  }

  const result = updateProfileSchema.safeParse(raw)
  if (!result.success) {
    return { error: 'Validation error', details: result.error.flatten() }
  }

  const { error } = await supabase
    .from('profiles')
    .update(result.data)
    .eq('user_id', user.id)

  if (error) {
    return { error: 'Update failed' }
  }

  revalidatePath('/profile')
  return { success: true }
}
```

### フォームでの使用
```tsx
'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { updateProfile } from '@/lib/actions/user'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      保存
    </Button>
  )
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useFormState(updateProfile, null)

  return (
    <form action={formAction}>
      {state?.error && (
        <div className="text-destructive text-sm mb-4">{state.error}</div>
      )}
      <Input name="name" defaultValue={profile.name} />
      <Textarea name="bio" defaultValue={profile.bio} />
      <SubmitButton />
    </form>
  )
}
```

## Error Response Format

```typescript
// 統一されたエラーレスポンス
interface ApiError {
  error: string
  code?: string
  details?: Record<string, string[]>
}

// 成功レスポンス
interface ApiSuccess<T> {
  data: T
  meta?: {
    pagination?: Pagination
  }
}

// HTTPステータスコード
// 200: 成功
// 201: 作成成功
// 204: 削除成功（本文なし）
// 400: バリデーションエラー
// 401: 認証エラー
// 403: 権限エラー
// 404: 見つからない
// 409: 競合（重複など）
// 429: レート制限
// 500: サーバーエラー
```

## Rate Limiting

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
})

export async function checkRateLimit(identifier: string) {
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
  
  return {
    success,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
    },
  }
}

// 使用例
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const { success, headers } = await checkRateLimit(ip)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers }
    )
  }
  
  // ... rest of handler
}
```

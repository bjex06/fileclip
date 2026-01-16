# Auth Callback

OAuth や Magic Link で認証後、code を token に交換する。

## コード

```typescript
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // エラー時はログインに戻す
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

## Supabase Dashboard 設定

Site URL: `https://your-domain.com`
Redirect URLs: `https://your-domain.com/auth/callback`

ローカル開発時は `http://localhost:3000/auth/callback` も追加。

# Auth Forms

## ログイン

```typescript
// app/login/page.tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (formData: FormData) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    })

    if (error) {
      // エラー表示
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form action={handleLogin}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">ログイン</button>
    </form>
  )
}
```

## サインアップ

```typescript
const handleSignUp = async (formData: FormData) => {
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      emailRedirectTo: `${location.origin}/auth/callback`,
    },
  })

  if (!error) {
    // 「確認メールを送信しました」表示
  }
}
```

## OAuth（Google）

```typescript
const handleGoogleLogin = async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${location.origin}/auth/callback`,
    },
  })
}
```

## ログアウト

```typescript
const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
  router.refresh()
}
```

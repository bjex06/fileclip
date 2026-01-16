---
name: react-component
description: |
  Next.js App RouterでのReactコンポーネント開発ガイド。
  Server Components / Client Componentsの使い分け、hooks設計、
  パフォーマンス最適化、TypeScript型定義、アクセシビリティ対応。
  Reactコンポーネント作成、リファクタリング、レビュー時に使用。
  トリガー: コンポーネント、React、hooks、useState、useEffect、memo
---

# React Component Development

## Server vs Client Components

### Server Component (デフォルト)
```tsx
// データフェッチを含む場合
import { createServerClient } from '@/lib/supabase/server'

export async function UserList() {
  const supabase = createServerClient()
  const { data } = await supabase.from('users').select('*')
  
  return (
    <ul>
      {data?.map(user => <UserCard key={user.id} user={user} />)}
    </ul>
  )
}
```

### Client Component
```tsx
'use client'

// インタラクティブな機能が必要な場合のみ
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
}
```

## Component Structure

```tsx
// 1. Imports (external → internal → types)
import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import type { UserProps } from './types'

// 2. Types
interface ComponentProps {
  user: User
  onSelect?: (id: string) => void
  variant?: 'default' | 'compact'
}

// 3. Component
export function ComponentName({ user, onSelect, variant = 'default' }: ComponentProps) {
  // 3a. Hooks
  const [state, setState] = useState<string>('')
  
  // 3b. Memoized values
  const derivedValue = useMemo(() => expensiveCalc(user), [user])
  
  // 3c. Callbacks
  const handleClick = useCallback(() => {
    onSelect?.(user.id)
  }, [onSelect, user.id])
  
  // 3d. Early returns
  if (!user) return null
  
  // 3e. Render
  return (
    <div className={variant === 'compact' ? 'p-2' : 'p-4'}>
      <span>{user.name}</span>
      <Button onClick={handleClick}>Select</Button>
    </div>
  )
}
```

## Performance Patterns

### メモ化が必要な場合
- 重い計算: `useMemo`
- コールバック参照安定化: `useCallback`
- コンポーネント再レンダリング防止: `memo`

### メモ化が不要な場合
- プリミティブ値の単純計算
- 軽量なレンダリング
- Propsが頻繁に変わる場合

## Accessibility Checklist

- [ ] ボタンに`aria-label`（アイコンのみの場合）
- [ ] フォーム要素に`id`と`aria-describedby`
- [ ] 画像に説明的な`alt`
- [ ] キーボードナビゲーション対応
- [ ] 適切なセマンティックHTML

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Component | PascalCase | `UserProfile` |
| Event Handler | handle + Event | `handleClick` |
| Boolean Props | is/has/should | `isLoading` |
| Callback Props | on + Action | `onSelect` |

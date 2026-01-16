---
name: ux-patterns
description: |
  優れたユーザー体験を実現するUXパターン集。
  フォーム設計、フィードバック、ローディング状態、エラーハンドリング、
  オンボーディング、アクセシビリティ、レスポンシブデザイン。
  UX改善、ユーザビリティ向上、インタラクション設計時に使用。
  トリガー: UX、ユーザビリティ、フォーム、ローディング、エラー、a11y
---

# UX Patterns Skill

## フィードバックの原則

### 即座のフィードバック
```tsx
function ActionButton({ onClick, children }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleClick = async () => {
    setStatus('loading')
    try {
      await onClick()
      setStatus('success')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
    }
  }

  return (
    <Button onClick={handleClick} disabled={status === 'loading'}>
      {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {status === 'success' && <Check className="mr-2 h-4 w-4" />}
      {status === 'error' && <X className="mr-2 h-4 w-4" />}
      {children}
    </Button>
  )
}
```

### Toast通知
```tsx
// lib/toast.ts
import { toast } from 'sonner'

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message, {
    action: {
      label: '詳細',
      onClick: () => console.log('Show details'),
    },
  }),
  promise: <T,>(promise: Promise<T>, messages: {
    loading: string
    success: string
    error: string
  }) => toast.promise(promise, messages),
}
```

## ローディング状態

### Skeleton Loading
```tsx
function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-48 bg-muted rounded-t-lg" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    </div>
  )
}

// 使用例
function UserList() {
  const { data, isLoading } = useUsers()
  
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }
  
  return /* actual content */
}
```

### Progressive Loading
```tsx
function DataTable() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <TableHeader />
      <Suspense fallback={<RowsSkeleton />}>
        <TableRows />
      </Suspense>
    </Suspense>
  )
}
```

## エラーハンドリング

### エラーメッセージの原則
```tsx
// ❌ Bad
<p>エラーが発生しました</p>

// ✅ Good
<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
  <div className="flex items-start gap-3">
    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
    <div>
      <h4 className="font-medium text-destructive">保存に失敗しました</h4>
      <p className="text-sm text-muted-foreground mt-1">
        ネットワーク接続を確認して、もう一度お試しください。
      </p>
      <Button variant="outline" size="sm" className="mt-3">
        再試行
      </Button>
    </div>
  </div>
</div>
```

### Error Boundary
```tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold mb-2">問題が発生しました</h2>
        <p className="text-muted-foreground mb-6">
          予期しないエラーが発生しました。問題が続く場合はサポートにお問い合わせください。
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>もう一度試す</Button>
          <Button variant="outline" asChild>
            <Link href="/">ホームに戻る</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
```

## フォーム設計

### バリデーションフィードバック
```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>メールアドレス</FormLabel>
      <FormControl>
        <Input
          placeholder="you@example.com"
          {...field}
          className={cn(
            form.formState.errors.email && 'border-destructive focus-visible:ring-destructive'
          )}
        />
      </FormControl>
      <FormDescription>
        確認メールを送信します
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

### 段階的開示
```tsx
function AdvancedSettings() {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div>
      <BasicSettings />
      
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            詳細設定
            <ChevronDown className={cn(
              'h-4 w-4 transition-transform',
              showAdvanced && 'rotate-180'
            )} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AdvancedFields />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
```

## Empty States

```tsx
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  )
}

// 使用例
<EmptyState
  icon={FileText}
  title="ドキュメントがありません"
  description="最初のドキュメントを作成して、チームと共有しましょう。"
  action={{ label: '作成する', onClick: handleCreate }}
/>
```

## アクセシビリティ

### WCAG 2.1 チェックリスト
- [ ] カラーコントラスト比 4.5:1以上
- [ ] フォーカス表示が明確
- [ ] キーボード操作可能
- [ ] スクリーンリーダー対応
- [ ] 適切なaria-label

### キーボードナビゲーション
```tsx
function NavigableList({ items }: { items: Item[] }) {
  const [focusedIndex, setFocusedIndex] = useState(0)

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(i => Math.min(i + 1, items.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        handleSelect(items[focusedIndex])
        break
    }
  }

  return (
    <ul role="listbox" onKeyDown={handleKeyDown}>
      {items.map((item, i) => (
        <li
          key={item.id}
          role="option"
          aria-selected={i === focusedIndex}
          tabIndex={i === focusedIndex ? 0 : -1}
        >
          {item.name}
        </li>
      ))}
    </ul>
  )
}
```

## レスポンシブ対応

### ブレークポイント戦略
```tsx
// Mobile First
<div className="
  px-4          /* mobile */
  sm:px-6       /* 640px+ */
  md:px-8       /* 768px+ */
  lg:max-w-6xl  /* 1024px+ */
  lg:mx-auto
">
  {/* Content */}
</div>

// モバイル用ナビゲーション
<nav className="
  fixed bottom-0 left-0 right-0 border-t bg-background
  md:relative md:border-t-0
">
  {/* Navigation items */}
</nav>
```

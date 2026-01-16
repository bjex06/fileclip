---
name: performance
description: |
  Next.jsアプリのパフォーマンス最適化スキル。
  Core Web Vitals、画像最適化、コード分割、キャッシング、
  バンドルサイズ削減、データフェッチ戦略。
  パフォーマンス改善、速度向上、最適化時に使用。
  トリガー: パフォーマンス、最適化、速度、Core Web Vitals、キャッシュ
---

# Performance Optimization Skill

## Core Web Vitals

| 指標 | 目標 | 測定方法 |
|------|------|----------|
| LCP (Largest Contentful Paint) | < 2.5s | 最大コンテンツ表示時間 |
| INP (Interaction to Next Paint) | < 200ms | インタラクション応答性 |
| CLS (Cumulative Layout Shift) | < 0.1 | レイアウトのずれ |

## Image Optimization

### next/image
```tsx
import Image from 'next/image'

// 固定サイズ
<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority // LCP候補には必須
/>

// レスポンシブ
<div className="relative aspect-video">
  <Image
    src="/hero.jpg"
    alt="Hero image"
    fill
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    className="object-cover"
  />
</div>

// 遅延ロード（デフォルト）
<Image
  src="/below-fold.jpg"
  alt="Below the fold"
  width={400}
  height={300}
  loading="lazy" // デフォルト
/>
```

### 画像形式
```javascript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}
```

## Code Splitting

### Dynamic Import
```tsx
import dynamic from 'next/dynamic'

// クライアントコンポーネントの遅延ロード
const HeavyChart = dynamic(() => import('@/components/heavy-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // クライアントのみ
})

// 条件付きロード
const AdminPanel = dynamic(() => import('@/components/admin-panel'))

export function Dashboard({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div>
      <MainContent />
      {isAdmin && <AdminPanel />}
    </div>
  )
}
```

### Route-based Splitting
```tsx
// Next.js App Routerでは自動
// 各page.tsxは別チャンクになる
```

## Caching Strategies

### Data Cache
```tsx
// デフォルト: キャッシュされる
async function getStaticData() {
  const res = await fetch('https://api.example.com/data')
  return res.json()
}

// キャッシュ無効化（常に新鮮）
async function getDynamicData() {
  const res = await fetch('https://api.example.com/data', {
    cache: 'no-store',
  })
  return res.json()
}

// 再検証（ISR）
async function getRevalidatedData() {
  const res = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 }, // 1時間
  })
  return res.json()
}

// タグベース再検証
async function getTaggedData() {
  const res = await fetch('https://api.example.com/data', {
    next: { tags: ['posts'] },
  })
  return res.json()
}

// 再検証トリガー
import { revalidateTag } from 'next/cache'
revalidateTag('posts')
```

### Route Segment Config
```tsx
// app/posts/page.tsx
export const dynamic = 'force-static' // または 'force-dynamic'
export const revalidate = 3600 // 1時間

export default async function PostsPage() {
  // ...
}
```

## Bundle Size Optimization

### 分析
```bash
# バンドル分析
ANALYZE=true pnpm build
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // config
})
```

### Tree Shaking
```tsx
// ❌ Bad: 全部インポート
import * as icons from 'lucide-react'

// ✅ Good: 必要なものだけ
import { Search, Menu, X } from 'lucide-react'

// ❌ Bad: lodash全体
import _ from 'lodash'

// ✅ Good: 関数単位
import debounce from 'lodash/debounce'
```

### External Packages
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
}
```

## Data Fetching Patterns

### Parallel Fetching
```tsx
// ❌ Sequential
async function Page() {
  const user = await getUser()
  const posts = await getPosts() // userを待つ
  return <Component user={user} posts={posts} />
}

// ✅ Parallel
async function Page() {
  const [user, posts] = await Promise.all([
    getUser(),
    getPosts(),
  ])
  return <Component user={user} posts={posts} />
}
```

### Streaming with Suspense
```tsx
export default async function Page() {
  return (
    <div>
      <Header /> {/* 即座にレンダリング */}
      
      <Suspense fallback={<UserSkeleton />}>
        <UserInfo /> {/* 非同期でストリーミング */}
      </Suspense>
      
      <Suspense fallback={<PostsSkeleton />}>
        <Posts /> {/* 非同期でストリーミング */}
      </Suspense>
    </div>
  )
}
```

## Client-side Optimization

### Debounce/Throttle
```tsx
import { useDebouncedCallback } from 'use-debounce'

function SearchInput() {
  const [search, setSearch] = useState('')
  
  const debouncedSearch = useDebouncedCallback((value: string) => {
    // API call
    searchAPI(value)
  }, 300)

  return (
    <Input
      value={search}
      onChange={(e) => {
        setSearch(e.target.value)
        debouncedSearch(e.target.value)
      }}
    />
  )
}
```

### Virtual Lists
```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  })

  return (
    <div ref={parentRef} className="h-[400px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ItemRow item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Checklist

- [ ] LCP < 2.5s（Lighthouse確認）
- [ ] Hero画像にpriority属性
- [ ] next/image使用
- [ ] 動的インポート活用
- [ ] バンドルサイズ分析
- [ ] 不要な依存関係削除
- [ ] 適切なキャッシュ戦略
- [ ] Suspenseでストリーミング

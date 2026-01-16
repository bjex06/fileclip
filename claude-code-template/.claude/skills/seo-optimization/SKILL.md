---
name: seo-optimization
description: |
  SEO最適化スキル。メタタグ、構造化データ、OGP、
  サイトマップ、Core Web Vitals、検索順位向上。
  SEO、メタタグ、OGP、構造化データ設定時に自動適用。
  トリガー: SEO, meta, OGP, sitemap, 構造化データ, schema
---

# SEO Optimization Skill

## Metadata (App Router)

### 静的メタデータ
```typescript
// app/layout.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: {
    default: 'サイト名',
    template: '%s | サイト名',
  },
  description: 'サイトの説明文（120-160文字）',
  keywords: ['キーワード1', 'キーワード2'],
  authors: [{ name: '作者名' }],
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://example.com',
    siteName: 'サイト名',
    title: 'サイト名',
    description: 'サイトの説明文',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'サイト名',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'サイト名',
    description: 'サイトの説明文',
    images: ['/og-image.jpg'],
    creator: '@username',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://example.com',
  },
}
```

### 動的メタデータ
```typescript
// app/posts/[slug]/page.tsx
import { Metadata } from 'next'

type Props = {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.slug)

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.image],
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
  }
}
```

## 構造化データ (JSON-LD)

### Organization
```typescript
// components/seo/organization-schema.tsx
export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '会社名',
    url: 'https://example.com',
    logo: 'https://example.com/logo.png',
    sameAs: [
      'https://twitter.com/username',
      'https://www.facebook.com/username',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+81-XX-XXXX-XXXX',
      contactType: 'customer service',
      availableLanguage: 'Japanese',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### Product
```typescript
export function ProductSchema({ product }: { product: Product }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'JPY',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### Article
```typescript
export function ArticleSchema({ post }: { post: Post }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.image,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'サイト名',
      logo: {
        '@type': 'ImageObject',
        url: 'https://example.com/logo.png',
      },
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

## Sitemap

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts()

  const postUrls = posts.map((post) => ({
    url: `https://example.com/posts/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: 'https://example.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://example.com/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...postUrls,
  ]
}
```

## Robots.txt

```typescript
// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/private/'],
    },
    sitemap: 'https://example.com/sitemap.xml',
  }
}
```

## Core Web Vitals

### Image Optimization
```tsx
import Image from 'next/image'

// LCP対策: priority属性
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority
/>
```

### Font Optimization
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // CLSを防ぐ
})
```

### CLS対策
```tsx
// 画像にサイズを明示
<Image width={400} height={300} />

// スケルトンローディング
<div className="aspect-video bg-muted animate-pulse" />
```

## Checklist
- [ ] title: 60文字以内
- [ ] description: 120-160文字
- [ ] OGP画像: 1200x630px
- [ ] 構造化データ設定
- [ ] sitemap.xml生成
- [ ] robots.txt設定
- [ ] canonical URL設定
- [ ] Core Web Vitals確認

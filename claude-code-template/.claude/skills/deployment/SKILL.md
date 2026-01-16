---
name: deployment
description: |
  Vercelへのデプロイとインフラ設定スキル。
  環境変数管理、プレビューデプロイ、ドメイン設定、
  GitHub Actions CI/CD、モニタリング。
  デプロイ、本番公開、CI/CD設定時に使用。
  トリガー: デプロイ、Vercel、本番、CI/CD、GitHub Actions
---

# Deployment Skill

## Vercel Setup

### プロジェクト設定
```bash
# Vercel CLI インストール
pnpm add -g vercel

# プロジェクトリンク
vercel link

# 環境変数設定
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### vercel.json
```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "regions": ["hnd1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" }
  ]
}
```

## Environment Variables

### 構成
```
.env.local          # ローカル開発用（git ignore）
.env.development    # 開発環境（コミット可）
.env.production     # 本番環境用テンプレート（コミット可、値なし）
```

### .env.example
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### 環境ごとの分岐
```typescript
// lib/config.ts
export const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
}
```

## GitHub Actions CI/CD

### Basic CI
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Lint
        run: pnpm lint
        
      - name: Type check
        run: pnpm tsc --noEmit
        
      - name: Test
        run: pnpm test --passWithNoTests

  build:
    runs-on: ubuntu-latest
    needs: lint-and-test
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Build
        run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

### Preview Deployment Check
```yaml
# .github/workflows/preview.yml
name: Preview Check

on:
  deployment_status:

jobs:
  lighthouse:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            ${{ github.event.deployment_status.target_url }}
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

### Supabase Migrations
```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: supabase/setup-cli@v1
        with:
          version: latest
          
      - name: Link project
        run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          
      - name: Push migrations
        run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

## Domain Setup

### Vercel Dashboard
1. Settings → Domains
2. ドメインを追加
3. DNS設定（CNAME or A record）

### DNS Records
```
# CNAME（サブドメイン）
app.yourdomain.com → cname.vercel-dns.com

# A record（ルートドメイン）
@ → 76.76.21.21

# AAAA record（IPv6）
@ → 2606:4700:90:0:f22e:fbec:5bed:a9b9
```

## Monitoring

### Vercel Analytics
```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

### Error Tracking (Sentry)
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
})
```

## Checklist

- [ ] 環境変数設定（Vercel Dashboard）
- [ ] vercel.json設定
- [ ] GitHub Actions CI設定
- [ ] ドメイン設定
- [ ] SSL自動設定確認
- [ ] Analytics導入
- [ ] エラートラッキング導入
- [ ] プレビューデプロイ確認

---
name: analytics-setup
description: |
  アナリティクス設定スキル。GA4、Mixpanel、PostHog、
  コンバージョン計測、イベントトラッキング、A/Bテスト。
  分析、GA4、コンバージョン、イベント計測時に自動適用。
  トリガー: analytics, GA4, mixpanel, コンバージョン, トラッキング
---

# Analytics Setup Skill

## Google Analytics 4

### Setup
```typescript
// lib/analytics/gtag.ts
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID

export const pageview = (url: string) => {
  window.gtag('config', GA_MEASUREMENT_ID!, {
    page_path: url,
  })
}

export const event = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  })
}
```

### Script Component
```tsx
// components/analytics/google-analytics.tsx
import Script from 'next/script'
import { GA_MEASUREMENT_ID } from '@/lib/analytics/gtag'

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `,
        }}
      />
    </>
  )
}
```

### Page View Tracking
```tsx
// app/layout.tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { pageview } from '@/lib/analytics/gtag'

function Analytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const url = pathname + searchParams.toString()
    pageview(url)
  }, [pathname, searchParams])

  return null
}
```

### Event Tracking
```tsx
import { event } from '@/lib/analytics/gtag'

// ボタンクリック
<Button
  onClick={() => {
    event('click', 'CTA', 'hero_signup_button')
    // 実際の処理
  }}
>
  無料で始める
</Button>

// フォーム送信
const handleSubmit = async () => {
  event('submit', 'form', 'contact_form')
  await submitForm()
}

// 購入完了
event('purchase', 'ecommerce', 'product_123', 9800)
```

## Mixpanel

### Setup
```typescript
// lib/analytics/mixpanel.ts
import mixpanel from 'mixpanel-browser'

export const initMixpanel = () => {
  mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN!, {
    debug: process.env.NODE_ENV === 'development',
    track_pageview: true,
    persistence: 'localStorage',
  })
}

export const track = (event: string, properties?: Record<string, any>) => {
  mixpanel.track(event, properties)
}

export const identify = (userId: string, traits?: Record<string, any>) => {
  mixpanel.identify(userId)
  if (traits) {
    mixpanel.people.set(traits)
  }
}
```

### Usage
```tsx
import { track, identify } from '@/lib/analytics/mixpanel'

// ユーザー識別
identify(user.id, {
  email: user.email,
  plan: user.plan,
  created_at: user.createdAt,
})

// イベント追跡
track('Feature Used', {
  feature_name: 'export',
  format: 'pdf',
})

// ファネル追跡
track('Signup Started')
track('Signup Completed')
track('First Action')
```

## PostHog (Self-hostable)

```typescript
// lib/analytics/posthog.ts
import posthog from 'posthog-js'

export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false, // 手動でトラッキング
    })
  }
}

export const captureEvent = (event: string, properties?: object) => {
  posthog.capture(event, properties)
}

// Feature Flags
export const isFeatureEnabled = (flag: string): boolean => {
  return posthog.isFeatureEnabled(flag) ?? false
}
```

## Conversion Tracking

### 購入完了
```tsx
// app/success/page.tsx
'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')

  useEffect(() => {
    if (orderId) {
      // GA4
      window.gtag('event', 'purchase', {
        transaction_id: orderId,
        value: 9800,
        currency: 'JPY',
      })

      // Mixpanel
      track('Purchase Completed', {
        order_id: orderId,
        value: 9800,
      })
    }
  }, [orderId])

  return <div>購入完了</div>
}
```

### ファネル計測
```typescript
const funnel = {
  step1: () => track('Funnel: Landing Page'),
  step2: () => track('Funnel: Pricing View'),
  step3: () => track('Funnel: Checkout Started'),
  step4: () => track('Funnel: Purchase Completed'),
}
```

## A/B Testing

```tsx
// lib/ab-test.ts
import { isFeatureEnabled } from '@/lib/analytics/posthog'

export function useABTest(testName: string): 'control' | 'variant' {
  return isFeatureEnabled(testName) ? 'variant' : 'control'
}

// Usage
function HeroSection() {
  const variant = useABTest('hero_cta_test')

  return (
    <Button>
      {variant === 'control' ? '今すぐ始める' : '無料で試す'}
    </Button>
  )
}
```

## Privacy & Consent

```tsx
// components/cookie-consent.tsx
'use client'

import { useState, useEffect } from 'react'
import { initMixpanel } from '@/lib/analytics/mixpanel'

export function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookie-consent')) {
      setShow(true)
    } else {
      initMixpanel()
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'true')
    initMixpanel()
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-card p-4 rounded-lg shadow-lg">
      <p>当サイトではCookieを使用しています</p>
      <Button onClick={handleAccept}>同意する</Button>
    </div>
  )
}
```

## Checklist
- [ ] GA4 設定
- [ ] イベント計測実装
- [ ] コンバージョン設定
- [ ] Cookie同意バナー
- [ ] プライバシーポリシー更新

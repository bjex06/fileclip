---
name: saas-patterns
description: |
  SaaSプロダクト開発のアーキテクチャパターン。
  マルチテナンシー、Stripe課金連携、Feature Flags、
  オンボーディング設計、Analytics実装。
  SaaS、サブスクリプション、課金、テナント設計時に使用。
  トリガー: SaaS、subscription、billing、Stripe、tenant、課金
---

# SaaS Development Patterns

## Multi-Tenancy with RLS

```sql
-- テナント分離（Supabase RLS推奨）
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON items
  USING (tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));
```

## Stripe Subscription

```typescript
// lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// Webhook handler
export async function handleSubscriptionUpdate(sub: Stripe.Subscription) {
  await supabase.from('subscriptions').upsert({
    tenant_id: sub.metadata.tenant_id,
    stripe_subscription_id: sub.id,
    status: sub.status,
    plan: sub.items.data[0].price.id,
    current_period_end: new Date(sub.current_period_end * 1000),
  })
}
```

### Plan Design
```typescript
const PLANS = {
  free: { price: 0, limits: { users: 1, storage: '1GB' } },
  pro: { price: 2980, limits: { users: 5, storage: '10GB' } },
  enterprise: { price: null, limits: { users: Infinity, storage: 'Unlimited' } }
}
```

## Feature Flags

```typescript
export async function isFeatureEnabled(key: string, userId: string) {
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled, rollout_percentage')
    .eq('key', key)
    .single()
  
  if (!data?.enabled) return false
  
  const hash = hashUserId(userId, key)
  return hash < data.rollout_percentage
}

// Usage in component
export function FeatureGate({ feature, children, fallback }) {
  const enabled = useFeatureFlag(feature)
  return enabled ? <>{children}</> : fallback ?? null
}
```

## Onboarding Flow

```typescript
const ONBOARDING_STEPS = [
  { id: 'profile', title: 'プロフィール設定', required: true },
  { id: 'team', title: 'チーム招待', required: false },
  { id: 'integration', title: '連携設定', required: false },
]

export function useOnboarding() {
  const [completed, setCompleted] = useState<string[]>([])
  const progress = completed.length / ONBOARDING_STEPS.length
  const isComplete = ONBOARDING_STEPS
    .filter(s => s.required)
    .every(s => completed.includes(s.id))
  
  return { steps: ONBOARDING_STEPS, progress, isComplete }
}
```

## Analytics

```typescript
export function track(event: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    // Mixpanel / Amplitude / 自前実装
    analytics.track(event, {
      ...properties,
      timestamp: new Date().toISOString(),
    })
  }
}
```

## Launch Checklist

### MVP
- [ ] コア機能実装
- [ ] Stripe決済連携
- [ ] 基本Analytics
- [ ] エラーモニタリング（Sentry）

### Growth
- [ ] オンボーディングフロー
- [ ] メール自動化（Resend）
- [ ] Feature flags
- [ ] A/Bテスト基盤

# Customer Portal

プラン変更・解約をユーザー自身で行える画面。

## エンドポイント

```typescript
// app/api/portal/route.ts
import { stripe } from '@/lib/stripe'

export async function POST(req: Request) {
  const { customerId } = await req.json()

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
  })

  return Response.json({ url: session.url })
}
```

## クライアント側

```typescript
const handleManageSubscription = async () => {
  const res = await fetch('/api/portal', {
    method: 'POST',
    body: JSON.stringify({ customerId: user.stripeCustomerId }),
  })
  const { url } = await res.json()
  window.location.href = url
}
```

## Stripe Dashboard 設定

1. Settings → Billing → Customer portal
2. 「プラン変更」「解約」の許可設定
3. ブランディング設定

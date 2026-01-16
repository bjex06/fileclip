# Checkout Session

## 一回払い

```typescript
// app/api/checkout/route.ts
import { stripe } from '@/lib/stripe'

export async function POST(req: Request) {
  const { priceId } = await req.json()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/cancel`,
  })

  return Response.json({ url: session.url })
}
```

## サブスクリプション

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: customerId, // 既存顧客なら指定
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
  cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
})
```

## クライアント側

```typescript
const handleCheckout = async () => {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ priceId }),
  })
  const { url } = await res.json()
  window.location.href = url
}
```

## 注意

- `success_url` 到達 ≠ 決済完了
- DB更新は Webhook で行う

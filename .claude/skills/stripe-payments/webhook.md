# Webhook処理

## エンドポイント

```typescript
// app/api/webhook/stripe/route.ts
import { stripe } from '@/lib/stripe'
import { headers } from 'next/headers'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = headers().get('stripe-signature')!

  // 1. 署名検証（必須）
  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  // 2. イベント処理
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionCancel(event.data.object)
        break
    }
  } catch (err) {
    // ログは残すが 200 を返す（リトライ地獄防止）
    console.error('Webhook handler error:', err)
  }

  // 3. 必ず200を返す（5秒以内）
  return new Response('ok', { status: 200 })
}
```

## ハンドラー例

```typescript
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  // upsert で冪等性確保
  await db
    .insert(subscriptions)
    .values({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: 'active',
    })
    .onConflictDoUpdate({
      target: subscriptions.stripe_subscription_id,
      set: { status: 'active', updated_at: new Date() },
    })
}
```

## 絶対守ること

1. **署名検証**: `constructEvent` を使う。生の body を渡す。
2. **冪等性**: 同じイベントが2回来ても壊れない（upsert or 存在チェック）
3. **200返却**: 処理失敗しても200。失敗は別途通知。
4. **5秒ルール**: 重い処理はキューに入れる

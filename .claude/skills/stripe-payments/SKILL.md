---
name: stripe-payments
description: |
  使用タイミング: checkout, subscription, webhook, 決済, 課金, stripe, 支払い, サブスク
  やること: Checkout Session → Webhook処理 → 状態同期
  事故ポイント: Webhook署名検証漏れ、重複処理、状態不整合
---

# Stripe Payments

## 処理フロー

```
ユーザー → Checkout Session → Stripe決済画面
                                    ↓
DB ← Webhook ← Stripe（非同期）
```

**重要**: 成功画面表示時点ではDBは未更新。Webhook完了まで待つ設計が必須。

## やること（順序厳守）

### 1. セットアップ
```bash
pnpm add stripe @stripe/stripe-js
```

環境変数:
```
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx
```

### 2. Checkout Session作成
→ 詳細: ./checkout.md

### 3. Webhook処理（最重要）
→ 詳細: ./webhook.md

**絶対やること**:
- [ ] 署名検証（`constructEvent`）
- [ ] 冪等性（同じイベント2回来ても壊れない）
- [ ] 200返却（5秒以内）

### 4. Customer Portal
→ 詳細: ./portal.md

## チェックリスト

### 実装時
- [ ] `STRIPE_WEBHOOK_SECRET` 設定済み
- [ ] Webhook エンドポイント `/api/webhook/stripe`
- [ ] 署名検証あり
- [ ] 冪等性確保（upsert or チェック）

### デプロイ後
- [ ] Stripe Dashboard で Webhook URL 登録
- [ ] テストイベント送信して 200 返るか確認
- [ ] 実際のテスト決済で DB 更新されるか確認

## トラブルシュート

| 症状 | 原因 | 対処 |
|------|------|------|
| Webhook 400 | 署名不一致 | `STRIPE_WEBHOOK_SECRET` 確認 |
| DB未更新 | Webhook未到達 | Stripe Dashboard のログ確認 |
| 重複課金 | 冪等性なし | `subscription_id` で upsert |

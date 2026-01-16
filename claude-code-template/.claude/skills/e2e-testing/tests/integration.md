# Integration Tests（機能連携）

A画面とB画面の連携を検証する。

## 一覧 → 詳細 連携

```typescript
test('ユーザー一覧から詳細に遷移、データ一致', async ({ page }) => {
  await page.goto('/users')

  // 一覧から最初のユーザーのIDを取得
  const row = page.getByTestId('user-row').first()
  const userId = await row.getAttribute('data-user-id')

  // クリックして詳細へ
  await row.click()

  // URLにIDが含まれる
  await expect(page).toHaveURL(`/users/${userId}`)

  // 詳細画面に同じIDが表示される
  await expect(page.getByTestId('user-id')).toHaveText(userId!)
})
```

## 作成 → 反映 連携

```typescript
test('注文作成で在庫が減少', async ({ page }) => {
  // 1. 在庫を確認
  await page.goto('/inventory/product-1')
  const before = Number(await page.getByTestId('stock').textContent())

  // 2. 注文作成
  await page.goto('/orders/new')
  await page.fill('[name="product_id"]', 'product-1')
  await page.fill('[name="quantity"]', '1')
  await page.click('[type="submit"]')
  await expect(page.getByText('注文完了')).toBeVisible()

  // 3. 在庫減少を確認
  await page.goto('/inventory/product-1')
  const after = Number(await page.getByTestId('stock').textContent())
  expect(after).toBe(before - 1)
})
```

## 設定 → 反映 連携

```typescript
test('テーマ変更が全画面に反映', async ({ page }) => {
  await page.goto('/settings')
  await page.click('[data-testid="theme-dark"]')

  // 他の画面でも反映されているか
  await page.goto('/dashboard')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
```

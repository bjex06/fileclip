# Auth Tests（認証）

## ログイン

```typescript
test('ログインできる', async ({ page }) => {
  await page.goto('/login')

  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('[type="submit"]')

  await expect(page).toHaveURL('/dashboard')
})
```

## 保護ルート

```typescript
test('未認証で保護ページアクセス → リダイレクト', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/login')
})
```

## 認証状態の保存・再利用

```typescript
// e2e/auth.setup.ts
import { test as setup } from '@playwright/test'

setup('認証状態を保存', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('[type="submit"]')
  await page.waitForURL('/dashboard')

  // 保存
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
})
```

```typescript
// 認証済み前提のテスト
test.use({ storageState: 'e2e/.auth/user.json' })

test('ダッシュボード表示', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByText('ダッシュボード')).toBeVisible()
})
```

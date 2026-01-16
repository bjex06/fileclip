---
name: e2e-testing
description: |
  使用タイミング: e2e, playwright, 統合テスト, 画面テスト, 機能連携テスト
  やること: テスト作成 → 実行 → 失敗確認 → 修正 のループ
  事故ポイント: セレクタ変更で全滅、認証状態の扱い、非同期待ち不足
---

# E2E Testing（Playwright）

## セットアップ

```bash
pnpm add -D @playwright/test
pnpm exec playwright install
```

## 基本ループ

```
1. テスト作成
     ↓
2. 実行: pnpm test:e2e
     ↓
3. 失敗 → 修正 → 再実行
     ↓
4. 成功 → 次のテスト
```

## テスト種別

| 種別 | ファイル | 用途 |
|------|---------|------|
| ナビゲーション | ./tests/navigation.md | ページ遷移 |
| 認証フロー | ./tests/auth.md | ログイン・ログアウト |
| フォーム | ./tests/forms.md | 入力・送信・バリデーション |
| 機能連携 | ./tests/integration.md | A画面 ↔ B画面 の連携 |

## チェックリスト

### テスト作成時
- [ ] `data-testid` でセレクタ指定（クラス名は変わりやすい）
- [ ] 非同期は `waitFor` で待つ
- [ ] 認証必要なテストは `storageState` 使用

### CI/CD
- [ ] `pnpm test:e2e` が通る
- [ ] GitHub Actions に組み込み

## トラブルシュート

| 症状 | 原因 | 対処 |
|------|------|------|
| 要素見つからない | セレクタ変更 | `data-testid` に統一 |
| タイムアウト | 非同期待ち不足 | `waitForSelector` 追加 |
| CI で落ちる | 環境差異 | `webServer` 設定確認 |

## スクリプト

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

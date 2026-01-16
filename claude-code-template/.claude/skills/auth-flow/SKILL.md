---
name: auth-flow
description: |
  使用タイミング: 認証, ログイン, サインアップ, セッション, OAuth, パスワードリセット
  やること: Middleware設定 → 認証フォーム → セッション管理
  事故ポイント: Middleware漏れで保護ページ露出、リダイレクトループ、セッション切れ
---

# Auth Flow（Supabase Auth）

## 処理順序（厳守）

```
1. Middleware 設定（全リクエストで認証チェック）
      ↓
2. 認証コールバック（OAuth / Magic Link 用）
      ↓
3. ログイン・サインアップフォーム
      ↓
4. 保護ルート（認証必須ページ）
```

**この順序を守らないと**: 保護ページが丸見え、リダイレクトループ、セッション不整合

## 1. Middleware（最重要）

→ 詳細: ./middleware.md

```typescript
// middleware.ts（ルート直下）
export async function middleware(request: NextRequest) {
  // セッション更新 + 未認証リダイレクト
}
export const config = { matcher: ['/((?!_next|api|favicon).*)'] }
```

## 2. 認証コールバック

→ 詳細: ./callback.md

```
/auth/callback → code を token に交換
```

## 3. フォーム

→ 詳細: ./forms.md

- ログイン
- サインアップ
- パスワードリセット

## チェックリスト

### 実装時
- [ ] `middleware.ts` がルート直下にある
- [ ] `/auth/callback` ルートがある
- [ ] 環境変数に `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY`

### デプロイ後
- [ ] 未認証で `/dashboard` にアクセス → ログインにリダイレクト
- [ ] ログイン後 → 元のページに戻る
- [ ] ログアウト後 → セッション消える

## トラブルシュート

| 症状 | 原因 | 対処 |
|------|------|------|
| 保護ページ見える | Middleware 動いてない | matcher 確認 |
| リダイレクトループ | 除外パス不足 | `/login` を matcher から除外 |
| OAuth 後エラー | callback 未実装 | `/auth/callback` 作成 |
| セッション消える | Cookie 設定不備 | server client の cookies 設定確認 |

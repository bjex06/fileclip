# Project Context

> **AI へ**: 作業開始時は必ず以下の順で参照してください
> 1. README.md（プロジェクト概要）
> 2. PROJECT.md（進捗・タスク・システム構造）
> 3. このファイル（コーディング規約）

## 作業完了時の必須フロー

作業が完了したら、必ず以下を実行：

1. ユーザーに結果を確認する
   ```
   この作業の結果を記録します。
   
   ○ 一発成功
   △ 動くが手動修正した
   × 失敗、やり直し
   
   どれですか？問題があれば教えてください。
   ```

2. 回答を受けたら PROJECT.md の「検証ログ」に追記

3. △ × の場合、問題の内容も記録

**これを省略しない。毎回必ず聞く。**

---

## Tech Stack
- **Frontend**: Next.js 14+ (App Router), React 18, TypeScript
- **Backend**: Supabase / Firebase / Cloudflare（プロジェクトによる）
- **Styling**: Tailwind CSS + shadcn/ui
- **Deploy**: Vercel / Cloudflare Pages
- **Package Manager**: pnpm
- **Testing**: Vitest + Playwright

## Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証必要ルート
│   ├── (public)/          # 公開ルート
│   └── api/               # API Routes
├── components/
│   ├── ui/                # shadcn/ui ベース
│   ├── common/            # 汎用コンポーネント
│   ├── layout/            # Header, Footer, Sidebar
│   └── features/          # 機能別
├── lib/
│   ├── db/                # DB クライアント
│   ├── actions/           # Server Actions
│   ├── hooks/             # カスタムフック
│   └── utils/             # ユーティリティ
├── types/                 # TypeScript型定義
└── constants/             # 定数
```

## Coding Standards

### 基本原則
- Server Components優先、必要時のみ 'use client'
- 関数コンポーネントのみ（クラス禁止）
- エラーハンドリング必須
- TypeScript strict mode

### Naming
| Type | Convention | Example |
|------|------------|---------|
| File | kebab-case | `user-profile.tsx` |
| Component | PascalCase | `UserProfile` |
| Function | camelCase | `getUserProfile` |
| Constant | SCREAMING_SNAKE | `MAX_RETRY` |
| Type | PascalCase | `UserProps` |

### Import Order
```typescript
// 1. React/Next.js
// 2. External libraries
// 3. Internal (@/)
// 4. Types
// 5. Styles
```

## Design Philosophy

### UXの基本方針
> **「ITリテラシーが低くても使えて、使ううちにリテラシーが上がる」**

- **直感的**: 説明なしで操作できる
- **段階的開示**: 最初はシンプル、必要に応じて詳細表示
- **即座のフィードバック**: 操作結果を明確に伝える
- **成長促進**: 使うほど理解が深まる設計

### UIの基本方針
- Inter/Roboto禁止 → 独自性あるフォント選択
- 紫グラデーション+白禁止 → 個性的なカラースキーム
- アニメーション活用（ページロード、ホバー）
- ダークモード対応必須

## Git Commit Format
```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
```

## Commands
```bash
pnpm dev          # 開発サーバー
pnpm build        # ビルド
pnpm lint         # ESLint
pnpm test         # テスト
pnpm test:e2e     # E2Eテスト
```

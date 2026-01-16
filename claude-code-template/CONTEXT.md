# Project Context

> **AI へ**: 作業開始時は必ず以下の順で参照してください
> 1. README.md（プロジェクト概要）
> 2. PROJECT.md（進捗・タスク・システム構造）
> 3. このファイル（コーディング規約）

## Tech Stack
- **Frontend**: React 18, Vite, TypeScript
- **Backend**: PHP 8.x (Vanilla), MySQL
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI)
- **Deploy**: Xserver (via SCP), GitHub Actions (Optional)
- **Package Manager**: npm
- **Testing**: Manual verification

## Directory Structure
```
src/
├── components/            # Reactコンポーネント (PascalCase)
│   ├── modals/            # モーダル系
│   └── ui/                # 汎用UIパーツ (Button, Input等)
├── context/               # Context API (AuthContext, FileSystemContext)
├── types/                 # TypeScript型定義 (index.ts)
├── utils/                 # ユーティリティ関数
│   ├── api.ts             # HTTPクライアント (fetch wrapper)
│   ├── auth.ts            # トークン・バリデーション関連
│   └── authApi.ts         # 認証API呼び出し
xserver-php/               # バックエンドソースコード
├── api/                   # APIエンドポイント (.php)
│   ├── auth/              # 認証系
│   ├── users/             # ユーザー管理
│   └── ...
├── config/                # 設定ファイル (database.php)
└── utils/                 # バックエンドユーティリティ
```

## Coding Standards

### Frontend (React/TS)
- **Functional Components**: すべて関数コンポーネントで記述
- **Hooks**: カスタムフックを活用し、ロジックを分離
- **TypeScript**: `any` は極力避け、適切な型定義を使用 (`src/types/index.ts`)
- **API Calls**: `api.ts` の `httpClient` または `authApi.ts` を経由する

### Backend (PHP)
- **Vanilla PHP**: フレームワーク未使用。シンプルに保つ。
- **Response**: 全て JSON 形式 (`header('Content-Type: application/json')`)
- **Error Handling**: `try-catch` ブロックを使用し、適切なHTTPステータスコードを返す
- **Security**: 
  - `authenticateRequest()` を各APIの冒頭で呼び出す
  - SQLインジェクション対策として `PDO` のプリペアドステートメントを **必ず** 使用する

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| File (Frontend) | PascalCase or camelCase | `FileManager.tsx`, `auth.ts` |
| File (Backend) | snake_case | `create_user.php` |
| Component | PascalCase | `FilePreviewModal` |
| Function | camelCase | `verifyToken` |
| SQL Table/Column | snake_case | `users`, `is_active` |

## Design Philosophy

### UX Guidelines
- **シンプルさ**: 誰でも使える直感的なUI
- **権限の明確化**: 閲覧できないメニューは非表示にするなど、ユーザーを混乱させない
- **エラー表示**: `toast` (Sonner) を使用し、ユーザーに分かりやすく通知する

### UI Guidelines
- **Tailwind CSS**: ユーティリティクラスを原則使用
- **Responsive**: PC/タブレット対応（モバイルは優先度低だが崩れないように）

## Deployment

デプロイはスクリプトを使用する。

```powershell
.\deploy.ps1
```

**デプロイ時の注意**:
- バックエンドの修正 (`xserver-php/`) も `deploy.ps1` で反映される
- データベースの変更（テーブル追加など）は手動でSQL実行が必要（または `migration` スクリプト作成）

# Project: FileClip (kohinata3_fileclip)

> **このファイルは単一の進捗管理ファイルです**
> - 新規MDを乱立させず、ここに集約
> - タスク完了時は [x] にチェック
> - システム構造やQ&Aもここに記録

---

## システム構造

### ルーティング
| パス | 画面名 | 説明 | 連携先 |
|------|--------|------|--------|
| /login | ログイン | 認証画面。JWTベース。 | / |
| / | ダッシュボード | メイン画面。ファイル一覧表示。 | 各機能 |
| /settings | 設定 | 管理者専用設定画面。ユーザー管理など。 | - |

### DB スキーマ / マスタ関係 (MySQL)
```
users
├── id (PK)
├── name
├── email
├── password_hash
├── role (super_admin, branch_admin, department_admin, user)
├── branch_id (FK -> branches.id)
├── department_id (FK -> departments.id)
├── is_active
├── created_at
└── last_login

files
├── id (PK)
├── name
├── type
├── size
├── storage_path
├── folder_id (FK -> folders.id)
├── created_by (FK -> users.id)
└── created_at

folders
├── id (PK)
├── name
├── parent_id (FK -> folders.id)
├── created_by (FK -> users.id)
└── created_at

branches (営業所) / departments (部署)
```

### コンポーネント依存関係
```
src/
├── App.tsx
│   ├── AuthProvider (Context)
│   ├── SecurityManager
│   └── FileSystemProvider (Context)
│       ├── Login (Page)
│       ├── Dashboard (Page)
│       │   ├── Header
│       │   ├── Sidebar
│       │   ├── FileList
│       │   └── FilePreviewModal
│       └── Settings (Page)
```

---

## タスク進捗

### Phase 1: 基盤構築 (完了)
- [x] プロジェクト初期化 (Vite + React + TypeScript)
- [x] 認証実装 (PHP Backend + JWT)
  - [x] ログイン画面
  - [x] 認証API (`deploy/api/auth/login.php`)
  - [x] 権限管理 (Role-based)
- [x] DB接続 (`deploy/config/database.php`)

### Phase 2: コア機能 (実装中)
- [x] ファイル一覧表示
- [x] フォルダ階層構造
- [x] ファイルアップロード
- [x] ユーザー管理 (管理者機能)
- [/] 検索機能 (実装中)
- [ ] 権限の詳細設定 (フォルダ単位)

### Phase 3: 検証・最適化
- [ ] セッションタイムアウトの改善 (Refresh Token検討)
- [ ] パフォーマンス最適化
- [ ] セキュリティ強化 (WAF回避、CSRF対策)

---

## 検証項目

### 機能連携テスト
| 起点 | 終点 | 確認内容 | 状態 |
|------|------|----------|------|
| ログイン画面 | ダッシュボード | 正しいロールで遷移 | [x] |
| ダッシュボード | ファイルプレビュー | 正しいファイルが表示 | [x] |
| 管理画面 | ユーザー追加 | DBに反映される | [x] |

### 画面別チェック
- [x] /login - ログイン成功・失敗ハンドリング
- [x] /dashboard - ファイル一覧ロード、アップロード
- [ ] /settings - 全設定項目の動作確認

---

## メモ・Q&A

### 決定事項
- **Backend**: XServer (PHP + MySQL)
- **Frontend**: React + TypeScript + Vite
- **Auth**: JWT (LocalStorage保存, 24時間有効)

### 未解決・要確認
- セッションタイムアウト時のUX改善 (突然切れる問題)
- `fileSystemApi.ts` のモック実装とXServer実装の切り替えロジックの整理

### 技術メモ
```bash
# デプロイ手順
npm run build
# dist フォルダの内容を deploy フォルダにコピー
Copy-Item -Recurse -Force dist\* deploy\
# deploy フォルダをFTPでアップロード
```

---

## 検証ログ

| 日付 | 指示 | 結果 | 問題 | 対処 |
|------|------|------|------|------|
| 2026/01/09 | IDEエラー修正 | ○ | `Database` クラス未定義など | `get_users.php` 修正 |
| 2026/01/09 | ログイン画面白飛び | △ | `assets` がサーバーにない | ビルドして `deploy` を同期 |
| 2026/01/13 | セッション調査 | ○ | 24時間固定を確認 | ユーザーに仕様報告 |

---

## 変更履歴
| 日付 | 内容 | 担当 |
|------|------|------|
| 2026/01/13 | Claude Code Template 適用 | Antigravity |

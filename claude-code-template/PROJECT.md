# Project: FileClip (File Management System)

> **このファイルは単一の進捗管理ファイルです**
> - 新規MDを乱立させず、ここに集約
> - タスク完了時は [x] にチェック
> - システム構造やQ&Aもここに記録

---

## システム構造

### 技術スタック
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: PHP (Vanilla), MySQL (on Xserver)
- **Deployment**: SCP via `deploy.ps1` (Win) / `deploy.sh` (Mac/Linux)

### ルーティング
| パス | 画面名 | 説明 | 権限 |
|------|--------|------|------|
| / | ログイン | 認証画面 | - |
| /dashboard | メイン画面 | ファイル一覧、管理機能 | AuthUser |
| /settings | 設定 | ユーザー・組織・権限管理 | Admin |

### DB スキーマ構造 (MySQL)
```
users (ユーザー)
├── id (UUID)
├── email [UNIQUE]
├── name
├── password_hash
├── role (super_admin, branch_admin, department_admin, user)
├── branch_id (FK: branches)
├── department_id (FK: departments)
└── is_active

branches (営業所)
├── id (UUID)
├── name
├── code [UNIQUE]
└── is_active

departments (部署)
├── id (UUID)
├── branch_id (FK: branches)
├── name
├── code [UNIQUE]
└── is_active

permissions (権限設定)
├── file_path (対象パス)
├── resource_type (user, branch, department, role)
├── resource_id (対象ID)
├── permission_level (read, write, delete, admin)
└── is_recursive
```

### コンポーネント構造
```
src/
├── components/
│   ├── FileManager.tsx # メイン機能
│   ├── Header.tsx      # ナビゲーション
│   ├── Settings.tsx    # 管理画面
│   ├── modals/         # 各種モーダル
│   │   ├── FilePreviewModal
│   │   ├── PermissionModal
│   │   └── ...
├── context/
│   ├── AuthContext.tsx       # 認証状態管理
│   └── FileSystemContext.tsx # ファイル操作管理
├── utils/
│   ├── authApi.ts   # 認証APIクライアント
│   ├── api.ts       # HTTPクライアント基盤
│   └── auth.ts      # トークン処理、検証ロジック
```

---

## タスク進捗

### Phase 1: 基盤構築 (完了)
- [x] プロジェクト初期化 (Vite + React)
- [x] UI/UX デザイン実装 (Tailwind)
- [x] PHPバックエンドAPI実装
  - [x] ファイル操作 (List, Upload, Delete, Move)
  - [x] 認証基盤 (JWT, Login, Logout)
  - [x] WAF対策 (X-Auth-Tokenヘッダー)
- [x] デプロイ環境整備
  - [x] deploy.ps1 / deploy.sh
  - [x] .htaccess 設定

### Phase 2: コア機能 (完了)
- [x] ファイル管理機能
  - [x] ディレクトリ階層表示
  - [x] ドラッグ＆ドロップアップロード
  - [x] ゴミ箱機能
  - [x] ファイルプレビュー (PDF, Image, Video)
- [x] 権限管理システム
  - [x] ユーザー・営業所・部署ごとの権限付与
  - [x] 権限の継承ロジック

### Phase 3: 管理機能 & 最適化 (現在)
- [x] 管理画面 (Settings)
  - [x] ユーザー管理
  - [x] 組織管理 (営業所・部署)
- [/] バグ修正・安定化
  - [x] ログイン直後の即ログアウト問題 (JWT単位修正)
  - [x] Base64URLデコード問題 (パディング修正)
  - [ ] 401 Unauthorized エラー (X-Auth-Token backend対応)
- [ ] パフォーマンス改善
  - [ ] 大きなファイルリストのレンダリング最適化

---

## 検証項目

### デプロイ・環境確認
| 項目 | 確認内容 | 状態 |
|------|----------|------|
| フロントエンド | ブラウザキャッシュクリア後の動作 | [ ] |
| バックエンド | 新しい auth.php の反映確認 | [ ] |
| 疎通確認 | /api/branches/list.php が200を返す | [ ] |

### 主要フロー
- [ ] ログイン -> ダッシュボード表示
- [ ] ユーザー作成 (管理者)
- [ ] ファイルアップロード
- [ ] ログアウト

---

## メモ・Q&A

### 決定事項
- バックエンドは Xserver 上の PHP + MySQL を使用
- 認証は JWT (HS256) を使用
- WAF対策として `Authorization` ヘッダーに加え `X-Auth-Token` を併用

### 技術メモ
```bash
# デプロイコマンド (Windows)
.\deploy.ps1
```

# ファイル管理システム - プロジェクトアーキテクチャ

## システム概要

Xserver（PHP + MySQL）環境で動作するファイル管理システム

## システム要件

| 区分 | 要件 |
|------|------|
| ユーザー種別 | 管理者（全権限）/ 一般ユーザー（権限制限付き） |
| 本番環境 | Xserver（PHP + MySQL） |
| 主要機能 | ファイル管理、フォルダ管理、権限管理、ユーザー管理 |

## 技術スタック

### フロントエンド
- **フレームワーク**: React 18 + TypeScript
- **状態管理**: Zustand
- **スタイリング**: Tailwind CSS
- **HTTP クライアント**: Axios
- **ビルドツール**: Vite
- **アイコン**: Lucide React

### バックエンド
- **言語**: PHP 8.0+
- **データベース**: MySQL 8.0
- **認証**: JWT (JSON Web Token)
- **ファイルストレージ**: サーバーローカルストレージ

## 開発フェーズ計画

### フェーズ1: 基盤整備（必須・最優先）
- [ ] API抽象化層の統合
- [ ] PHPバックエンド完成（認証・ファイル・フォルダ・ユーザーAPI）
- [ ] データベース設計・構築
- [ ] ファイルストレージ実装

### フェーズ2: コア機能完成
- [ ] フォルダ階層構造（サブフォルダ対応）
- [ ] ファイルアップロード/ダウンロード
- [ ] 権限管理（閲覧/編集/管理）
- [ ] ユーザー管理（CRUD）

### フェーズ3: UI/UX強化
- [ ] ファイルプレビュー（画像/PDF/テキスト/Office）
- [ ] ドラッグ&ドロップ操作
- [ ] グリッド/リスト表示切り替え
- [ ] 検索・フィルター・ソート
- [ ] パンくずナビゲーション

### フェーズ4: 高度な機能
- [ ] ゴミ箱機能
- [ ] ファイルバージョン履歴
- [ ] 共有リンク（期限付き）
- [ ] お気に入り・最近使用したファイル
- [ ] アクティビティログ
- [ ] ストレージ使用量表示

## ディレクトリ構造

```
filemanager/
├── docs/                          # ドキュメント
│   ├── ARCHITECTURE.md
│   └── API.md
├── database/                      # データベース関連
│   ├── schema.sql                 # スキーマ定義
│   ├── seeds/                     # 初期データ
│   └── migrations/                # マイグレーション
├── backend/                       # PHPバックエンド
│   ├── public/                    # 公開ディレクトリ
│   │   └── index.php              # エントリーポイント
│   ├── src/
│   │   ├── Config/                # 設定
│   │   ├── Controllers/           # コントローラー
│   │   ├── Models/                # モデル
│   │   ├── Services/              # ビジネスロジック
│   │   ├── Middleware/            # ミドルウェア
│   │   └── Utils/                 # ユーティリティ
│   ├── storage/                   # ファイルストレージ
│   │   ├── uploads/               # アップロードファイル
│   │   └── thumbnails/            # サムネイル
│   └── composer.json
├── frontend/                      # Reactフロントエンド
│   ├── src/
│   │   ├── components/            # UIコンポーネント
│   │   ├── pages/                 # ページ
│   │   ├── hooks/                 # カスタムフック
│   │   ├── stores/                # 状態管理
│   │   ├── services/              # API通信
│   │   ├── types/                 # 型定義
│   │   └── utils/                 # ユーティリティ
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── README.md
```

## API設計

### 認証API

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | /api/auth/login | ログイン |
| POST | /api/auth/register | ユーザー登録 |
| POST | /api/auth/logout | ログアウト |
| POST | /api/auth/reset-password | パスワードリセット要求 |
| POST | /api/auth/change-password | パスワード変更 |
| GET | /api/auth/verify | トークン検証 |
| GET | /api/auth/me | 現在のユーザー情報 |

### ユーザーAPI

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /api/users | ユーザー一覧 |
| GET | /api/users/{id} | ユーザー詳細 |
| POST | /api/users | ユーザー作成（管理者） |
| PUT | /api/users/{id} | ユーザー更新 |
| DELETE | /api/users/{id} | ユーザー削除 |
| PUT | /api/users/{id}/avatar | アバター更新 |

### フォルダAPI

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /api/folders | フォルダ一覧（ルート） |
| GET | /api/folders/{id} | フォルダ詳細・子要素 |
| GET | /api/folders/{id}/tree | フォルダツリー取得 |
| POST | /api/folders | フォルダ作成 |
| PUT | /api/folders/{id} | フォルダ更新（名前変更等） |
| DELETE | /api/folders/{id} | フォルダ削除（ゴミ箱へ） |
| POST | /api/folders/{id}/move | フォルダ移動 |
| GET | /api/folders/{id}/permissions | 権限一覧 |
| PUT | /api/folders/{id}/permissions | 権限更新 |

### ファイルAPI

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /api/files | ファイル一覧 |
| GET | /api/files/{id} | ファイル詳細 |
| POST | /api/files/upload | ファイルアップロード |
| GET | /api/files/{id}/download | ファイルダウンロード |
| GET | /api/files/{id}/preview | プレビュー取得 |
| PUT | /api/files/{id} | ファイル更新（名前変更等） |
| DELETE | /api/files/{id} | ファイル削除（ゴミ箱へ） |
| POST | /api/files/{id}/move | ファイル移動 |
| POST | /api/files/{id}/copy | ファイルコピー |
| GET | /api/files/{id}/versions | バージョン履歴 |
| POST | /api/files/{id}/restore | 旧バージョン復元 |

### ゴミ箱API

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /api/trash | ゴミ箱一覧 |
| POST | /api/trash/{id}/restore | 復元 |
| DELETE | /api/trash/{id} | 完全削除 |
| DELETE | /api/trash | ゴミ箱を空にする |

### 共有API

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | /api/share | 共有リンク作成 |
| GET | /api/share/{token} | 共有リンク情報 |
| DELETE | /api/share/{id} | 共有リンク削除 |
| GET | /api/share/{token}/download | 共有ダウンロード |

### その他API

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /api/favorites | お気に入り一覧 |
| POST | /api/favorites | お気に入り追加 |
| DELETE | /api/favorites/{id} | お気に入り削除 |
| GET | /api/recent | 最近のファイル |
| GET | /api/search | 検索 |
| GET | /api/activity | アクティビティログ |
| GET | /api/storage/usage | ストレージ使用量 |

## UI/UX機能一覧

### メイン画面
- サイドバー（フォルダツリー）
- メインエリア（ファイル一覧）
- ツールバー（アップロード、新規フォルダ、表示切替等）
- パンくずナビゲーション
- 検索バー

### ファイル操作
- ドラッグ&ドロップアップロード
- 複数ファイル選択
- 右クリックコンテキストメニュー
- ファイルプレビュー（モーダル）
- ファイル情報パネル（右サイドバー）

### 表示オプション
- グリッド表示 / リスト表示
- ソート（名前、日付、サイズ、種類）
- フィルター（ファイル種類）
- サムネイル表示

### ユーザー管理（管理者）
- ユーザー一覧テーブル
- ユーザー追加/編集モーダル
- 権限一括設定
- アクティビティ確認

## セキュリティ要件

- JWT認証によるステートレス認証
- パスワードはbcryptでハッシュ化
- CSRF対策
- XSS対策（入力値のサニタイズ）
- SQLインジェクション対策（プリペアドステートメント）
- ファイルアップロードの検証（MIME type、拡張子、サイズ）
- アクセス権限の厳格なチェック
- ログイン試行回数制限

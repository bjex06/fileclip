# FileClip (ファイル管理システム)

Xserver (PHP/MySQL) と React (Vite) を用いた、高機能ファイル管理システム。

## 📁 プロジェクト構成

```
fileclip-1/
├── src/                  # フロントエンド (React/TypeScript)
│   ├── components/       # UIコンポーネント
│   ├── context/          # 状態管理 (Auth, FileSystem)
│   └── utils/            # ユーティリティ (Auth, API)
├── xserver-php/          # バックエンド (PHP - ソース)
│   ├── api/              # APIエンドポイント
│   ├── config/           # DB設定
│   └── utils/            # 共通処理 (JWT, Logger)
├── deploy/               # デプロイ用ステージングエリア
├── dist/                 # フロントエンドビルド出力
├── claude-code-template/ # 開発ドキュメント
│   ├── PROJECT.md        # 進捗・タスク管理
│   ├── CONTEXT.md        # コーディング規約
│   └── README.md         # 本ファイル
└── deploy.ps1            # Windows用デプロイスクリプト
```

## 🚀 開発フロー

### フロントエンド開発
```bash
npm install
npm run dev
# http://localhost:5175 にアクセス
```

### バックエンド開発 & デプロイ
バックエンドはPHPで記述されており、Xserver上で動作します。
変更を反映するにはデプロイスクリプトを実行します。

```powershell
# ビルド、ファイル同期、アップロード、権限設定を一括実行
.\deploy.ps1
```

## 🛠 プロジェクト詳細

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: PHP 8.x (Vanilla) + MySQL (on Xserver)
- **Auth**: JWT (JSON Web Token) based authentication with role-based access control.
- **Security**: 
  - WAF対策: `X-Auth-Token` ヘッダーを使用
  - パスワードハッシュ: bcrypt (backend) / SHA-256 (frontend-mock)
  - 権限管理: ユーザー・営業所・部署単位での詳細な権限設定

## � ドキュメント参照順序

1. **README.md** (本ファイル): プロジェクト全体の概要
2. **PROJECT.md**: 現在のタスク進捗、システム構造の詳細、DBスキーマ
3. **CONTEXT.md**: コーディング規約、AIへの指示ルール

## ✨ 主な機能

- **ファイル管理**: アップロード、ダウンロード、移動、削除、ゴミ箱、復元
- **プレビュー**: PDF, 画像, 動画のプレビュー機能
- **組織管理**: 営業所・部署の階層管理
- **権限管理**: フォルダごとの詳細なアクセス権設定 (Read/Write/Delete/Admin)
- **監査ログ**: ユーザー操作の記録と閲覧

## 🔗 環境情報

| 環境 | URL | 備考 |
|------|-----|------|
| 本番 (Xserver) | https://kohinata3.xsrv.jp/ | メイン稼働環境 |
| ローカル | http://localhost:5175/ | 開発用 |

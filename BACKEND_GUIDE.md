# バックエンド対応ガイド

このファイルマネージャーは、Supabase、Xserver（PHP/MySQL）、モック環境の3つのバックエンドに対応した設計になっています。

## 🔧 バックエンド切り替え方法

### 1. 環境変数の設定

`.env`ファイルで`VITE_BACKEND_TYPE`を変更してください：

```env
# モック環境（開発・デモ用）
VITE_BACKEND_TYPE=mock

# Supabase環境
VITE_BACKEND_TYPE=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Xserver環境
VITE_BACKEND_TYPE=xserver
VITE_XSERVER_ENDPOINT=https://your-domain.com
VITE_XSERVER_TOKEN=your-api-token
```

### 2. アプリケーションの再起動

環境変数を変更した後は、開発サーバーを再起動してください：

```bash
npm run dev
```

## 📂 ファイル構成

### フロントエンド抽象化レイヤー
```
src/
├── utils/
│   ├── api.ts              # HTTP通信の抽象化
│   ├── authApi.ts          # 認証API抽象化
│   ├── fileSystemApi.ts    # ファイルシステムAPI抽象化
│   └── auth.ts             # 認証ユーティリティ
├── context/
│   ├── AuthContext.tsx     # 認証コンテキスト
│   └── FileSystemContext.tsx # ファイルシステムコンテキスト
```

### Xserver用PHPファイル
```
xserver-php/
├── api/
│   └── auth/
│       ├── login.php       # ログインAPI
│       ├── register.php    # 登録API
│       └── ...
├── config/
│   └── database.php        # DB設定
└── utils/
    ├── auth.php            # 認証ユーティリティ
    └── validation.php      # バリデーション
```

## 🌐 各バックエンドの特徴

### Mock環境
- **用途**: 開発・デモ・テスト
- **データ**: ブラウザメモリ内で管理
- **認証**: クライアントサイドのみ
- **設定**: 追加設定不要

### Supabase環境
- **用途**: 本番運用（SaaS）
- **データ**: PostgreSQLデータベース
- **認証**: Supabase Auth
- **設定**: Supabaseプロジェクトが必要

### Xserver環境
- **用途**: 本番運用（レンタルサーバー）
- **データ**: MySQLデータベース
- **認証**: JWT + セッション管理
- **設定**: PHP + MySQLサーバーが必要

## 🚀 Xserver環境のセットアップ

### 1. データベースの作成

XserverのphpMyAdminまたはコマンドラインで新しいデータベースを作成します。

### 2. PHPファイルのアップロード

`xserver-php`フォルダ内のファイルをサーバーにアップロードします：

```
your-domain.com/
├── api/
│   ├── auth/
│   ├── files/
│   └── folders/
├── config/
├── utils/
└── logs/
```

### 3. データベース設定の更新

`config/database.php`のデータベース接続情報を更新：

```php
define('DB_HOST', 'mysql*****.xserver.jp');
define('DB_NAME', 'your_database_name');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
```

### 4. 初期テーブルの作成

ブラウザで`https://your-domain.com/setup.php`にアクセスしてテーブルを作成：

```php
<?php
require_once 'config/database.php';
createTables();
echo "セットアップ完了！";
?>
```

### 5. .htaccessの設定

APIディレクトリに`.htaccess`を配置：

```apache
# CORS設定
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-API-Token"

# URLリライト
RewriteEngine On
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=200,L]
```

## 🔒 セキュリティ設定

### JWT秘密鍵の変更

`utils/auth.php`のJWT_SECRETを変更してください：

```php
define('JWT_SECRET', 'your-unique-secret-key-here');
```

### ファイルアップロード制限

`php.ini`または`.htaccess`でアップロード制限を設定：

```apache
php_value upload_max_filesize 10M
php_value post_max_size 10M
php_value max_execution_time 300
```

### ディレクトリアクセス制限

```apache
# config、logs、utilsディレクトリへの直接アクセスを拒否
<Directory "/path/to/config">
    Order Deny,Allow
    Deny from all
</Directory>
```

## 🧪 Supabase環境のセットアップ

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. データベーステーブルを作成
3. Row Level Security (RLS) を設定

### 2. テーブル作成SQL

```sql
-- ユーザーテーブル（Supabase Authと統合）
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- フォルダーテーブル
CREATE TABLE folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- フォルダー権限テーブル
CREATE TABLE folder_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(folder_id, user_id)
);

-- ファイルテーブル
CREATE TABLE files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. RLS ポリシーの設定

```sql
-- プロファイルのRLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- フォルダーのRLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folders they have permission to" ON folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM folder_permissions 
      WHERE folder_id = folders.id AND user_id = auth.uid()
    )
  );
```

## 📊 パフォーマンス比較

| 項目 | Mock | Supabase | Xserver |
|------|------|----------|---------|
| セットアップ時間 | 即座 | 30分 | 1-2時間 |
| 運用コスト | 無料 | $20+/月 | $10+/月 |
| スケーラビリティ | なし | 高 | 中 |
| カスタマイズ性 | 低 | 中 | 高 |
| セキュリティ | 低 | 高 | 中〜高 |

## 🔄 バックエンド移行手順

### Mock → Xserver

1. XserverにPHPファイルをアップロード
2. データベースを作成・初期化
3. 環境変数を`xserver`に変更
4. フロントエンドを再ビルド・デプロイ

### Mock → Supabase

1. Supabaseプロジェクトを作成
2. テーブルとRLSを設定
3. 環境変数にSupabase情報を設定
4. フロントエンドを再ビルド・デプロイ

### Supabase → Xserver

1. Supabaseからデータをエクスポート
2. XserverのMySQLにデータをインポート
3. 環境変数を変更
4. API呼び出し形式の差異を確認・調整

## 🛠️ トラブルシューティング

### よくある問題

**Q: CORS エラーが発生する**
A: サーバーのCORS設定を確認してください。Xserverの場合は`.htaccess`に適切なヘッダーを設定。

**Q: 認証トークンが無効になる**
A: JWT秘密鍵が正しく設定されているか確認。サーバー時刻のずれも原因となる場合があります。

**Q: ファイルアップロードが失敗する**
A: PHPの`upload_max_filesize`と`post_max_size`を確認。ディスク容量も確認してください。

**Q: データベース接続エラー**
A: 接続情報（ホスト、ユーザー名、パスワード）を確認。ファイアウォール設定も確認してください。

## 📚 参考資料

- [Supabase Documentation](https://supabase.com/docs)
- [Xserver PHP Manual](https://www.xserver.ne.jp/manual/man_program_php.php)
- [JWT.io](https://jwt.io/) - JWTトークンの仕組み
- [CORS MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

このドキュメントは、システム開発において柔軟なバックエンド選択を可能にする設計指針を示しています。プロジェクトの要件に応じて最適なバックエンドを選択してください。

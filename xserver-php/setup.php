<?php
/**
 * 初期セットアップスクリプト
 * 本番環境での初回セットアップ時に一度だけ実行
 * 実行後は削除またはリネームしてください
 */

// 設定
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html>
<html lang='ja'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>ファイルマネージャー セットアップ</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
        .step { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>📁 ファイルマネージャー セットアップ</h1>
";

// セキュリティチェック
$setupKey = isset($_GET['key']) ? $_GET['key'] : '';
$expectedKey = 'SETUP_' . date('Ymd'); // 当日限りのシンプルなキー

if ($setupKey !== $expectedKey) {
    echo "<div class='error'>
        <h2>⚠️ セキュリティエラー</h2>
        <p>セットアップを実行するには、URLに正しいキーを追加してください。</p>
        <p>例: setup.php?key={$expectedKey}</p>
    </div>";
    echo "</body></html>";
    exit();
}

require_once 'config/database.php';

$steps = [];

// Step 1: データベース接続テスト
echo "<div class='step'>";
echo "<h2>Step 1: データベース接続</h2>";
try {
    $pdo = getDatabaseConnection();
    echo "<p class='success'>✅ データベース接続成功</p>";
    $steps['db_connection'] = true;
} catch (Exception $e) {
    echo "<p class='error'>❌ データベース接続失敗: " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<pre>config/database.php の設定を確認してください。</pre>";
    $steps['db_connection'] = false;
}
echo "</div>";

if (!$steps['db_connection']) {
    echo "<p class='error'>データベース接続に失敗したため、セットアップを中止します。</p>";
    echo "</body></html>";
    exit();
}

// Step 2: テーブル作成
echo "<div class='step'>";
echo "<h2>Step 2: テーブル作成</h2>";
try {
    createTables();
    echo "<p class='success'>✅ テーブル作成成功</p>";
    $steps['tables'] = true;
} catch (Exception $e) {
    echo "<p class='error'>❌ テーブル作成失敗: " . htmlspecialchars($e->getMessage()) . "</p>";
    $steps['tables'] = false;
}
echo "</div>";

// Step 3: アップロードディレクトリ作成
echo "<div class='step'>";
echo "<h2>Step 3: アップロードディレクトリ作成</h2>";
$uploadDir = __DIR__ . '/uploads';
if (!is_dir($uploadDir)) {
    if (mkdir($uploadDir, 0755, true)) {
        echo "<p class='success'>✅ アップロードディレクトリ作成成功: {$uploadDir}</p>";
        $steps['upload_dir'] = true;
    } else {
        echo "<p class='error'>❌ アップロードディレクトリ作成失敗</p>";
        $steps['upload_dir'] = false;
    }
} else {
    echo "<p class='info'>ℹ️ アップロードディレクトリは既に存在します</p>";
    $steps['upload_dir'] = true;
}
echo "</div>";

// Step 4: ログディレクトリ作成
echo "<div class='step'>";
echo "<h2>Step 4: ログディレクトリ作成</h2>";
$logDir = __DIR__ . '/logs';
if (!is_dir($logDir)) {
    if (mkdir($logDir, 0755, true)) {
        echo "<p class='success'>✅ ログディレクトリ作成成功: {$logDir}</p>";
        $steps['log_dir'] = true;
    } else {
        echo "<p class='error'>❌ ログディレクトリ作成失敗</p>";
        $steps['log_dir'] = false;
    }
} else {
    echo "<p class='info'>ℹ️ ログディレクトリは既に存在します</p>";
    $steps['log_dir'] = true;
}
echo "</div>";

// Step 5: 管理者アカウント確認
echo "<div class='step'>";
echo "<h2>Step 5: 管理者アカウント確認</h2>";
try {
    $stmt = $pdo->prepare("SELECT id, email, name FROM users WHERE role = 'admin' LIMIT 1");
    $stmt->execute();
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($admin) {
        echo "<p class='success'>✅ 管理者アカウント確認済み</p>";
        echo "<pre>
Email: {$admin['email']}
Name: {$admin['name']}
Password: Admin123! (初回ログイン後に変更してください)
</pre>";
        $steps['admin'] = true;
    } else {
        echo "<p class='error'>❌ 管理者アカウントが見つかりません</p>";
        $steps['admin'] = false;
    }
} catch (Exception $e) {
    echo "<p class='error'>❌ 管理者アカウント確認失敗: " . htmlspecialchars($e->getMessage()) . "</p>";
    $steps['admin'] = false;
}
echo "</div>";

// 結果サマリー
echo "<div class='step'>";
echo "<h2>📋 セットアップ結果</h2>";
$allSuccess = !in_array(false, $steps, true);

if ($allSuccess) {
    echo "<p class='success' style='font-size: 1.2em;'>🎉 セットアップが完了しました！</p>";
    echo "<h3>次のステップ:</h3>";
    echo "<ol>
        <li>このファイル (setup.php) を削除またはリネームしてください</li>
        <li>config/database.php の認証情報を本番用に変更してください</li>
        <li>utils/auth.php の JWT_SECRET を変更してください</li>
        <li>フロントエンドの .env ファイルでバックエンドURLを設定してください</li>
        <li>管理者アカウントでログインし、パスワードを変更してください</li>
    </ol>";
} else {
    echo "<p class='error' style='font-size: 1.2em;'>⚠️ 一部のステップで問題が発生しました</p>";
    echo "<p>上記のエラーを確認し、修正してからもう一度セットアップを実行してください。</p>";
}
echo "</div>";

// 環境情報
echo "<div class='step'>";
echo "<h2>🔧 環境情報</h2>";
echo "<pre>";
echo "PHP Version: " . phpversion() . "\n";
echo "Server: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Unknown') . "\n";
echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "Current Directory: " . __DIR__ . "\n";
echo "Upload Max Size: " . ini_get('upload_max_filesize') . "\n";
echo "Post Max Size: " . ini_get('post_max_size') . "\n";
echo "Memory Limit: " . ini_get('memory_limit') . "\n";
echo "</pre>";
echo "</div>";

echo "</body></html>";
?>

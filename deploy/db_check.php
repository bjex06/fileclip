<?php
/**
 * データベース接続テスト用スクリプト
 * このファイルはデバッグ後に削除してください
 */

header('Content-Type: text/plain; charset=utf-8');

// 設定読み込み
require_once 'config/database.php';

echo "Database Connection Test\n";
echo "------------------------\n";
echo "Host: " . DB_HOST . "\n";
echo "Database: " . DB_NAME . "\n";
echo "User: " . DB_USER . "\n";
// パスワードはセキュリティのため表示しない
echo "Password: " . (defined('DB_PASS') ? '****' : '(not set)') . "\n";
echo "------------------------\n";

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    $startTime = microtime(true);
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    $endTime = microtime(true);

    echo "RESULT: SUCCESS!\n";
    echo "Connection time: " . round(($endTime - $startTime) * 1000, 2) . "ms\n";

    // バージョン情報取得
    $stmt = $pdo->query("SELECT VERSION() as version");
    $version = $stmt->fetchColumn();
    echo "Server Version: " . $version . "\n";

} catch (PDOException $e) {
    echo "RESULT: FAILED\n";
    echo "Error Code: " . $e->getCode() . "\n";
    echo "Error Message: " . $e->getMessage() . "\n";

    // よくあるエラーのヒント
    if (strpos($e->getMessage(), 'Access denied') !== false) {
        echo "\n[Hint] ユーザー名またはパスワードが間違っています。\n";
    }
    if (strpos($e->getMessage(), 'Unknown MySQL server') !== false || strpos($e->getMessage(), 'Connection refused') !== false) {
        echo "\n[Hint] ホスト名が間違っている可能性があります。Xserverのサーバーパネルで「MySQLホスト名」を確認してください。\n";
        echo "多くのXserver環境では 'localhost' ではなく 'mysql****.xserver.jp' のようなホスト名が必要です。\n";
    }
}
?>
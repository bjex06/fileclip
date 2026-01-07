<?php
header('Content-Type: text/html; charset=utf-8');
require_once __DIR__ . '/config/database.php';

echo "<h1>管理者ユーザー作成</h1>";

try {
    $pdo = getDatabaseConnection();

    // 既存の管理者を確認
    $stmt = $pdo->query("SELECT * FROM users WHERE role = 'admin'");
    $existing = $stmt->fetchAll();

    if (count($existing) > 0) {
        echo "<p style='color:green'>✅ 管理者は既に存在します:</p>";
        foreach ($existing as $user) {
            echo "<pre>ID: {$user['id']}, Email: {$user['email']}, Name: {$user['name']}</pre>";
        }
    } else {
        // 管理者を作成
        $email = 'admin@example.com';
        $name = 'システム管理者';
        $password = password_hash('Admin123!', PASSWORD_DEFAULT);

        $sql = "INSERT INTO users (email, name, password_hash, role, is_active) VALUES (?, ?, ?, 'admin', 1)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$email, $name, $password]);

        echo "<p style='color:green'>✅ 管理者ユーザーを作成しました</p>";
        echo "<pre>Email: admin@example.com\nPassword: Admin123!</pre>";
    }

    // 全ユーザー一覧
    echo "<h2>登録済みユーザー一覧</h2>";
    $stmt = $pdo->query("SELECT id, email, name, role, is_active FROM users");
    $users = $stmt->fetchAll();
    echo "<pre>";
    print_r($users);
    echo "</pre>";

} catch (Exception $e) {
    echo "<p style='color:red'>❌ エラー: " . htmlspecialchars($e->getMessage()) . "</p>";
}
?>

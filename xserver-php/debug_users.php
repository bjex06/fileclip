<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'config/database.php';

echo "=== USERS TABLE DUMP ===\n";
echo "ID | Email | Name | Role | Active | Created | Last Login\n";
echo str_repeat("-", 80) . "\n";

try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->query("SELECT * FROM users ORDER BY created_at DESC");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($users as $user) {
        printf(
            "%s | %s | %s | %s | %d | %s | %s\n",
            substr($user['id'], 0, 8) . '...',
            $user['email'],
            $user['name'],
            $user['role'],
            $user['is_active'],
            $user['created_at'],
            $user['last_login_at']
        );
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
<?php
// Xserverデバッグ用スクリプト
header('Content-Type: text/plain; charset=utf-8');

try {
    require_once 'config/database.php';
    $pdo = getDatabaseConnection();

    echo "=== DATABASE ROLE DEBUG ===\n\n";

    // 1. Check current schema
    echo "[1] Checking 'users' table schema...\n";
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'");
    $col = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Current Role Definition: " . $col['Type'] . "\n\n";

    // 2. Check current admin user
    echo "[2] Checking current admin user...\n";
    $stmt = $pdo->prepare("SELECT id, email, name, role FROM users WHERE email = ?");
    $stmt->execute(['admin@example.com']);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        echo "Found User: " . $user['email'] . "\n";
        echo "Current Role: " . $user['role'] . "\n";
    } else {
        echo "ERROR: User admin@example.com NOT FOUND\n";
    }
    echo "\n";

    // 3. Force Schema Update
    echo "[3] Attempting to update Schema (ALTER TABLE)...\n";
    try {
        $sql = "ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'branch_admin', 'department_admin', 'user', 'admin') DEFAULT 'user'";
        $pdo->exec($sql);
        echo "SUCCESS: Schema altered.\n";
    } catch (PDOException $e) {
        echo "WARNING: Schema alter failed (might be unchanged): " . $e->getMessage() . "\n";
    }

    // 4. Force User Update
    echo "[4] Attempting to update Admin Role to 'super_admin'...\n";
    if ($user) {
        try {
            $stmt = $pdo->prepare("UPDATE users SET role = 'super_admin' WHERE email = ?");
            $stmt->execute(['admin@example.com']);
            echo "SUCCESS: User role updated.\n";
        } catch (PDOException $e) {
            echo "ERROR: User update failed: " . $e->getMessage() . "\n";
        }
    }

    // 5. Final Check
    echo "\n[5] Final Check...\n";
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'");
    $col = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "New Role Definition: " . $col['Type'] . "\n";

    $stmt = $pdo->prepare("SELECT id, email, role FROM users WHERE email = ?");
    $stmt->execute(['admin@example.com']);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "New User Role: " . $user['role'] . "\n";

} catch (Exception $e) {
    echo "FATAL ERROR: " . $e->getMessage();
}
?>
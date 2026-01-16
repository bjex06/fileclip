<?php
header('Content-Type: text/plain');
require_once 'config/database.php';

try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->query("SELECT id, name, type, created_at FROM files ORDER BY created_at DESC LIMIT 30");
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Recent Files (ID | Name | Type):\n";
    echo "---------------------------------\n";
    foreach ($files as $file) {
        echo $file['id'] . " | " . $file['name'] . " | " . $file['type'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
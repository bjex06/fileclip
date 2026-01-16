<?php
require_once 'config/database.php';

try {
    $pdo = getDatabaseConnection();

    // Check files marked as deleted
    echo "--- Deleted Files ---\n";
    $stmt = $pdo->query("SELECT id, name, is_deleted, deleted_at, created_by FROM files WHERE is_deleted = 1");
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($files);

    // Check folders marked as deleted
    echo "\n--- Deleted Folders ---\n";
    $stmt = $pdo->query("SELECT id, name, is_deleted, deleted_at, created_by FROM folders WHERE is_deleted = 1");
    $folders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($folders);

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
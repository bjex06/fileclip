<?php
require_once 'config/database.php';

header('Content-Type: text/plain');

try {
    $pdo = getDatabaseConnection();
    echo "Starting Schema Repair...\n";

    // 1. Add deleted_at to files
    try {
        $pdo->exec("ALTER TABLE files ADD COLUMN deleted_at DATETIME NULL");
        echo "Added 'deleted_at' to 'files'.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "'deleted_at' already exists in 'files'.\n";
        } else {
            echo "Error adding 'deleted_at' to 'files': " . $e->getMessage() . "\n";
        }
    }

    // 1.5 Add extension to files
    try {
        $pdo->exec("ALTER TABLE files ADD COLUMN extension VARCHAR(20) NULL");
        echo "Added 'extension' to 'files'.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "'extension' already exists in 'files'.\n";
        } else {
            echo "Error adding 'extension' to 'files': " . $e->getMessage() . "\n";
        }
    }

    // 2. Add deleted_at to folders
    try {
        $pdo->exec("ALTER TABLE folders ADD COLUMN deleted_at DATETIME NULL");
        echo "Added 'deleted_at' to 'folders'.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "'deleted_at' already exists in 'folders'.\n";
        } else {
            echo "Error adding 'deleted_at' to 'folders': " . $e->getMessage() . "\n";
        }
    }

    // 3. Add path to folders
    try {
        $pdo->exec("ALTER TABLE folders ADD COLUMN path VARCHAR(1000) NULL");
        echo "Added 'path' to 'folders'.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "'path' already exists in 'folders'.\n";
        } else {
            echo "Error adding 'path' to 'folders': " . $e->getMessage() . "\n";
        }
    }

    // 4. Update existing deleted records (optional cleanup)
    // If we just added deleted_at, it's NULL.
    // If is_deleted is TRUE, we should set deleted_at to something.
    $pdo->exec("UPDATE files SET deleted_at = NOW() WHERE is_deleted = 1 AND deleted_at IS NULL");
    $pdo->exec("UPDATE folders SET deleted_at = NOW() WHERE is_deleted = 1 AND deleted_at IS NULL");

    echo "Schema Repair Complete.\n";

} catch (Exception $e) {
    echo "Critical Error: " . $e->getMessage();
}
?>
<?php
require_once 'config/database.php';

header('Content-Type: text/plain');

try {
    $pdo = getDatabaseConnection();

    $tables = ['files', 'folders'];

    foreach ($tables as $table) {
        echo "Table: $table\n";
        $stmt = $pdo->query("DESCRIBE $table");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN); // Get first column (Field name)

        $targetCols = ['deleted_at', 'is_deleted', 'path', 'storage_path', 'extension'];
        foreach ($targetCols as $col) {
            echo "  Column '$col': " . (in_array($col, $columns) ? "EXISTS" : "MISSING") . "\n";
        }
        echo "\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
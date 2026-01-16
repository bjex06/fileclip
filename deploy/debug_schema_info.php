<?php
header('Content-Type: application/json');
require_once 'config/database.php';

try {
    $pdo = getDatabaseConnection();
    $tables = ['users', 'files', 'folders', 'activity_logs', 'file_versions', 'folder_permissions'];
    $result = [];

    foreach ($tables as $table) {
        try {
            $stmt = $pdo->query("SHOW COLUMNS FROM $table");
            $result[$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $result[$table] = "Error: " . $e->getMessage();
        }
    }

    echo json_encode($result, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
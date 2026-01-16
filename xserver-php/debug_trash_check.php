<?php
require_once 'config/database.php';

try {
    $pdo = getDatabaseConnection();

    // 1. Check raw count of deleted files
    $stmt = $pdo->query("SELECT COUNT(*) FROM files WHERE is_deleted = 1");
    $deletedCount = $stmt->fetchColumn();

    echo "Total Deleted Files in DB: " . $deletedCount . "\n";

    if ($deletedCount > 0) {
        // 2. Dump one deleted file to see its columns
        $stmt = $pdo->query("SELECT * FROM files WHERE is_deleted = 1 LIMIT 1");
        $file = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Sample Deleted File:\n";
        print_r($file);

        // 3. Try the Admin SQL Query from list.php
        echo "\nRunning Admin SQL Query:\n";
        try {
            $sql = "
                SELECT f.id, f.name, 'file' as type, f.size, f.extension,
                       f.folder_id,
                       CONCAT(COALESCE(fld.path, ''), '/', f.name) as original_path,
                       f.deleted_at, f.created_by, u.name as deleted_by_name
                FROM files f
                LEFT JOIN folders fld ON f.folder_id = fld.id
                LEFT JOIN users u ON f.created_by = u.id
                WHERE f.is_deleted = TRUE
                ORDER BY f.deleted_at DESC
            ";
            $stmt = $pdo->query($sql);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo "Query Result Count: " . count($results) . "\n";
            if (count($results) > 0) {
                print_r($results[0]);
            }
        } catch (Exception $e) {
            echo "SQL Error: " . $e->getMessage() . "\n";
        }
    } else {
        echo "No deleted files found. Cannot test query.\n";
    }

} catch (PDOException $e) {
    echo "Connection Error: " . $e->getMessage();
}
?>
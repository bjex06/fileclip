<?php
require_once 'config/database.php';

try {
    $pdo = getDatabaseConnection();

    echo "<h1>Files Table Dump</h1>";

    // Check files table
    $stmt = $pdo->query("SELECT * FROM files ORDER BY created_at DESC LIMIT 20");
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($files)) {
        echo "<p>No files found in database.</p>";
    } else {
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>ID</th><th>Name</th><th>Size</th><th>FolderID</th><th>CreatedBy</th><th>IsDeleted</th><th>DeletedAt</th><th>Created</th></tr>";
        foreach ($files as $file) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($file['id']) . "</td>";
            echo "<td>" . htmlspecialchars($file['name']) . "</td>";
            echo "<td>" . htmlspecialchars($file['size']) . "</td>";
            echo "<td>" . htmlspecialchars($file['folder_id']) . "</td>";
            echo "<td>" . htmlspecialchars($file['created_by']) . "</td>";
            echo "<td>" . ($file['is_deleted'] ? 'TRUE' : 'FALSE') . "</td>";
            echo "<td>" . htmlspecialchars($file['deleted_at'] ?? '') . "</td>";
            echo "<td>" . htmlspecialchars($file['created_at']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }

    echo "<h2>Folder Permissions</h2>";
    // Check permissions
    $stmt = $pdo->query("SELECT * FROM folder_permissions LIMIT 20");
    $perms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "<pre>" . print_r($perms, true) . "</pre>";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
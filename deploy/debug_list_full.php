<?php
header('Content-Type: text/html; charset=utf-8');
require_once 'config/database.php';

echo "<h1>Full File List Debug</h1>";

try {
    $pdo = getDatabaseConnection();

    // List ALL files
    $sql = "SELECT id, name, folder_id, is_deleted, created_at FROM files ORDER BY created_at DESC";
    $stmt = $pdo->query($sql);
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<p>Total Files Found: " . count($files) . "</p>";
    echo "<table border='1' cellpadding='5'>";
    echo "<tr><th>ID</th><th>Name</th><th>Folder ID</th><th>Is Deleted</th><th>Created At</th></tr>";

    foreach ($files as $file) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($file['id']) . "</td>";
        echo "<td>" . htmlspecialchars($file['name']) . "</td>";
        echo "<td>" . htmlspecialchars($file['folder_id']) . "</td>";
        echo "<td>" . ($file['is_deleted'] ? 'TRUE' : 'FALSE') . " (" . htmlspecialchars($file['is_deleted']) . ")</td>";
        echo "<td>" . htmlspecialchars($file['created_at']) . "</td>";
        echo "</tr>";
    }
    echo "</table>";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
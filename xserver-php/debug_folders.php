<?php
header('Content-Type: text/html; charset=utf-8');
require_once 'config/database.php';

echo "<h1>Folders & Files Debug</h1>";

try {
    $pdo = getDatabaseConnection();

    // List ALL folders with file counts
    $sql = "
        SELECT 
            fo.id, 
            fo.name, 
            fo.created_by, 
            fo.is_deleted, 
            COUNT(fi.id) as file_count 
        FROM folders fo
        LEFT JOIN files fi ON fo.id = fi.folder_id
        GROUP BY fo.id
        ORDER BY fo.name, fo.created_at
    ";

    $stmt = $pdo->query($sql);
    $folders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<p>Total Folders Found: " . count($folders) . "</p>";
    echo "<table border='1' cellpadding='5'>";
    echo "<tr><th>Folder Name</th><th>Folder ID</th><th>Is Deleted</th><th>File Count</th></tr>";

    foreach ($folders as $folder) {
        $color = ($folder['file_count'] > 0) ? '#ccffcc' : '#ffffff';
        echo "<tr style='background-color: {$color}'>";
        echo "<td>" . htmlspecialchars($folder['name']) . "</td>";
        echo "<td>" . htmlspecialchars($folder['id']) . "</td>";
        echo "<td>" . ($folder['is_deleted'] ? 'TRUE' : 'FALSE') . "</td>";
        echo "<td>" . htmlspecialchars($folder['file_count']) . "</td>";
        echo "</tr>";
    }
    echo "</table>";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
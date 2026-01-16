<?php
require_once 'config/database.php';

try {
    $pdo = getDatabaseConnection();

    echo "Files Table Structure:\n";
    $stmt = $pdo->query("DESCRIBE files");
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($result as $row) {
        echo $row['Field'] . " - " . $row['Type'] . "\n";
    }

    echo "\nFolders Table Structure:\n";
    $stmt = $pdo->query("DESCRIBE folders");
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($result as $row) {
        echo $row['Field'] . " - " . $row['Type'] . "\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
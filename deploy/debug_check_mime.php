<?php
header('Content-Type: text/plain');
require_once 'config/database.php';

$fileId = $_GET['file_id'] ?? 'd0268e4c-e834-4f8a-9b14-2cbe5ea376ec';

try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("SELECT id, name, type FROM files WHERE id = ?");
    $stmt->execute([$fileId]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($file) {
        echo "ID: " . $file['id'] . "\n";
        echo "Name: " . $file['name'] . "\n";
        echo "Type (DB): " . $file['type'] . "\n";
    } else {
        echo "File not found.";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
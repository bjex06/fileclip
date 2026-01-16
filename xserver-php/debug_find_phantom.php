<?php
header('Content-Type: text/plain');
require_once 'config/database.php';

$targetId = '5d18e541-a76d-4d25-b0c3-6d4e2d0a3558';

echo "Searching for ID: $targetId\n";

try {
    $pdo = getDatabaseConnection();

    // 1. Precise Lookup
    $stmt = $pdo->prepare("SELECT * FROM files WHERE id = ?");
    $stmt->execute([$targetId]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($file) {
        echo "FOUND in DB!\n";
        print_r($file);
    } else {
        echo "NOT FOUND in DB.\n";
    }

    // 2. Loose Lookup (Partial)
    echo "\nChecking partial matches...\n";
    $stmt = $pdo->prepare("SELECT id, name FROM files WHERE id LIKE ?");
    $stmt->execute(['%5d18e541%']);
    $partials = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($partials);

    // 3. Dump ALL IDs again just in case
    echo "\nAll IDs in DB:\n";
    $stmt = $pdo->query("SELECT id, name, is_deleted FROM files");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "{$row['id']} : {$row['name']} (deleted: {$row['is_deleted']})\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
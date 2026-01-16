<?php
header('Content-Type: text/plain');

// 1. Check validation.php Loading
echo "Checking validation.php...\n";
$valPath = 'utils/validation.php';
if (file_exists($valPath)) {
    echo "Files found: YES\n";
    require_once $valPath;
} else {
    echo "Files found: NO\n";
}

// 2. Check Function Existence
echo "Checking isValidUuid function: ";
if (function_exists('isValidUuid')) {
    echo "EXISTS\n";
    echo "Test UUID: " . (isValidUuid('550e8400-e29b-41d4-a716-446655440000') ? 'VALID' : 'INVALID') . "\n";
} else {
    echo "MISSING\n";
}

// 3. Dump Files DB
echo "\n--- DB DUMP ---\n";
require_once 'config/database.php';
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->query("SELECT id, name, is_deleted FROM files");
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($files, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo "DB Error: " . $e->getMessage();
}
?>
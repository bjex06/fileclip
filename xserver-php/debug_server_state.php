<?php
header('Content-Type: text/plain; charset=utf-8');

require_once 'config/database.php';

echo "=== Server State Check ===\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n";

// 1. Check DB Connection
try {
    $pdo = getDatabaseConnection();
    echo "DB Connection: OK\n";
} catch (Exception $e) {
    echo "DB Connection: FAILED - " . $e->getMessage() . "\n";
    exit;
}

// 2. Check Files Table
try {
    echo "\n=== Recent Files (Limit 5) ===\n";
    $stmt = $pdo->prepare("SELECT id, name, created_at, is_deleted, storage_path FROM files ORDER BY created_at DESC LIMIT 5");
    $stmt->execute();
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($files)) {
        echo "No files found in database.\n";
    } else {
        foreach ($files as $file) {
            echo "ID: " . $file['id'] . "\n";
            echo "Name: " . $file['name'] . "\n";
            echo "Created: " . $file['created_at'] . "\n";
            echo "Deleted: " . ($file['is_deleted'] ? 'YES' : 'NO') . "\n";
            echo "Path: " . $file['storage_path'] . "\n";
            echo "-------------------\n";
        }
    }

    // Count total files
    $stmt = $pdo->query("SELECT COUNT(*) FROM files");
    echo "Total files in DB: " . $stmt->fetchColumn() . "\n";

} catch (Exception $e) {
    echo "DB Query Failed: " . $e->getMessage() . "\n";
}

// 3. Check Directory Permissions & Logs
echo "\n=== Directory & Logs ===\n";
$apiFilesDir = __DIR__ . '/api/files';
echo "Checking api/files: $apiFilesDir\n";

if (is_dir($apiFilesDir)) {
    echo "Directory exists.\n";
    $logs = glob($apiFilesDir . '/*.txt');
    echo "Log files found: " . count($logs) . "\n";
    foreach ($logs as $log) {
        echo "Log: " . basename($log) . " (" . filesize($log) . " bytes)\n";
        echo "Content Head:\n" . file_get_contents($log, false, null, 0, 500) . "\n---\n";
    }
} else {
    echo "Directory NOT found!\n";
}

// 4. Check Uploads Directory
$uploadsDir = __DIR__ . '/uploads'; // Assuming xserver-php root is deployed to public_html, uploads is sibling? 
// Wait, deployment puts contents of xserver-php INTO public_html.
// So uploads should be in public_html/../uploads? 
// In file_upload.php: $uploadDir = '../../uploads/' . $folderId;
// Since file_upload.php is in api/files/, ../../ is root of public_html.
// So it expects uploads to be in public_html/uploads.

$uploadsDirCheck = __DIR__ . '/uploads';
echo "Checking uploads dir: $uploadsDirCheck\n";
if (is_dir($uploadsDirCheck)) {
    echo "Uploads directory exists.\n";
    if (is_writable($uploadsDirCheck)) {
        echo "Uploads directory is writable.\n";
    } else {
        echo "Uploads directory is NOT writable.\n";
    }
} else {
    echo "Uploads directory NOT found.\n";
}

?>
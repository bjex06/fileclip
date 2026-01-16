<?php
header('Content-Type: text/plain');
require_once 'config/database.php';

echo "=== File Inspector ===\n";

try {
    $pdo = getDatabaseConnection();
    // Get recent 10 files
    $stmt = $pdo->query("SELECT id, name, storage_path, size FROM files ORDER BY created_at DESC LIMIT 10");
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($files as $file) {
        echo "\nID: " . $file['id'] . "\n";
        echo "Name: " . $file['name'] . "\n";
        echo "DB Size: " . $file['size'] . " bytes\n";

        $path = 'uploads/' . $file['storage_path'];
        $fullPath = __DIR__ . '/../../' . $path; // Adjust for api/files/ location if needed, assuming this script is in xserver-php root? 
        // Wait, if I place this in xserver-php/debug_file_inspector.php, then uploads is in xserver-php/uploads
        // Let's assume relative to this script.
        $fullPath = __DIR__ . '/uploads/' . $file['storage_path'];

        if (file_exists($fullPath)) {
            $realSize = filesize($fullPath);
            echo "Real Size: " . $realSize . " bytes\n";

            if ($realSize < 500) {
                echo "Content (hex): " . bin2hex(file_get_contents($fullPath)) . "\n";
                echo "Content (text): " . file_get_contents($fullPath) . "\n";
            } else {
                echo "First 50 bytes (hex): " . bin2hex(file_get_contents($fullPath, false, null, 0, 50)) . "\n";
            }
        } else {
            echo "File NOT FOUND at: $fullPath\n";
            // Try alternative path
            $altPath = __DIR__ . '/../uploads/' . $file['storage_path'];
            if (file_exists($altPath)) {
                echo "Found at alt path: $altPath\n";
                echo "Real Size: " . filesize($altPath) . "\n";
            }
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
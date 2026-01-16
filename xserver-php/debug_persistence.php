<?php
require_once 'config/database.php';

header('Content-Type: text/plain');

try {
    $pdo = getDatabaseConnection();
    echo "Connected to DB.\n";

    // 1. Check if files table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'files'");
    if ($stmt->rowCount() == 0) {
        die("Error: files table does not exist.\n");
    }
    echo "files table exists.\n";

    // 2. Insert dummy file
    $id = 'test-' . uniqid();
    $name = 'persistence_test.txt';
    // Use an existing folder ID or create a dummy one if FK fails.
    // We'll try to get ANY valid folder_id first.
    $stmt = $pdo->query("SELECT id FROM folders LIMIT 1");
    $folder = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$folder) {
        // Need to create a user and folder first?
        echo "No folders found. Skipping Insert.\n";
    } else {
        $folderId = $folder['id'];
        // Get valid user
        $stmt = $pdo->query("SELECT id FROM users LIMIT 1");
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $userId = $user ? $user['id'] : '0'; // Might fail FK

        echo "Attempting Insert... (FileID: $id, FolderID: $folderId, UserID: $userId)\n";

        $sql = "INSERT INTO files (id, name, type, size, folder_id, created_by, storage_path, created_at, is_deleted) 
                VALUES (?, ?, 'text/plain', 123, ?, ?, 'test/path', NOW(), 0)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id, $name, $folderId, $userId]);
        echo "Insert Success.\n";

        // 3. Select it back
        $stmt = $pdo->prepare("SELECT * FROM files WHERE id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result) {
            echo "Select Success: Found file '{$result['name']}' (ID: {$result['id']}).\n";
            echo "Persistence Confirmed.\n";

            // Cleanup
            $pdo->prepare("DELETE FROM files WHERE id = ?")->execute([$id]);
            echo "Cleanup Success.\n";
        } else {
            echo "Select Failed: File NOT found after insert.\n";
        }
    }

} catch (Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
    if ($e instanceof PDOException) {
        echo "PDO Error Info: " . print_r($pdo->errorInfo(), true) . "\n";
    }
}
?>
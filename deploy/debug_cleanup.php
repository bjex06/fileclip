<?php
header('Content-Type: application/json');
require_once 'config/database.php';

try {
    $pdo = getDatabaseConnection();

    // 1. Delete permissions for broken folders (id is empty or '0')
    $stmt = $pdo->prepare("DELETE FROM folder_permissions WHERE folder_id = '' OR folder_id = '0'");
    $stmt->execute();
    $deletedPermissions = $stmt->rowCount();

    // 2. Delete broken folders (id is empty or '0')
    $stmt = $pdo->prepare("DELETE FROM folders WHERE id = '' OR id = '0'");
    $stmt->execute();
    $deletedFolders = $stmt->rowCount();

    echo json_encode([
        'status' => 'success',
        'message' => 'Cleaned up broken folders',
        'deleted_folders' => $deletedFolders,
        'deleted_permissions' => $deletedPermissions
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
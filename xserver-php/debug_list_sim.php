<?php
header('Content-Type: application/json');
require_once 'config/database.php';

try {
    $pdo = getDatabaseConnection();

    // MIMIC AUTHENTICATED USER (super_admin, ID 6)
    $userId = 6;
    $userRole = 'super_admin'; // Hardcoded based on user report
    // $userRole = 'admin'; // Try this if super_admin fails?

    $isAdmin = ($userRole === 'super_admin' || $userRole === 'admin');

    $parentId = null; // Root

    $params = [];
    $conditions = ['f.is_deleted = FALSE'];

    // Parent ID condition
    if ($parentId) {
        $conditions[] = 'f.parent_id = ?';
        $params[] = $parentId;
    } else {
        $conditions[] = 'f.parent_id IS NULL';
    }

    $whereClause = implode(' AND ', $conditions);

    // DEBUG OUTPUT
    $debug = [
        'isAdmin' => $isAdmin,
        'role' => $userRole,
        'where' => $whereClause
    ];

    if ($isAdmin) {
        $sql = "
            SELECT f.*,
                   u.name as creator_name,
                   GROUP_CONCAT(fp.user_id) as permission_user_ids
            FROM folders f
            LEFT JOIN users u ON f.created_by = u.id
            LEFT JOIN folder_permissions fp ON f.id = fp.folder_id
            WHERE $whereClause
            GROUP BY f.id
            ORDER BY f.name ASC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    } else {
        $params[] = $userId;
        $sql = "
            SELECT f.*,
                   u.name as creator_name,
                   GROUP_CONCAT(fp2.user_id) as permission_user_ids
            FROM folders f
            INNER JOIN folder_permissions fp ON f.id = fp.folder_id AND fp.user_id = ?
            LEFT JOIN users u ON f.created_by = u.id
            LEFT JOIN folder_permissions fp2 ON f.id = fp2.folder_id
            WHERE $whereClause
            GROUP BY f.id
            ORDER BY f.name ASC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_merge($params)); // Note: this array_merge logic in original might be slightly off if params not handled carefully, checking here.
        // In original: $stmt->execute(array_merge($params));
        // Main block params: $params. Then $params[] = $userId. array_merge($params) is just $params.
        // Wait, if $params was ['$pId'], then push $userId -> ['$pId', $userId]. array_merge is redundant but safe.
    }

    $folders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'debug' => $debug,
        'folders' => $folders
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
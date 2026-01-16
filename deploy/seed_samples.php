<?php
header('Content-Type: text/html; charset=utf-8');
require_once 'config/database.php';

echo "<h1>Sample Data Seeding...</h1>";

try {
    $pdo = getDatabaseConnection();

    // Admin User ID
    $userId = '1';

    // 0. Schema Repair (Fix missing 'type' column)
    echo "<h2>0. Checking Schema...</h2>";

    // DEBUG: SHOW CREATE TABLE
    $stmt = $pdo->query("SHOW CREATE TABLE files");
    $create = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "<pre>" . htmlspecialchars($create['Create Table']) . "</pre><hr>";

    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM files LIKE 'type'");
        if (!$stmt->fetch()) {
            echo "Column 'type' missing in 'files' table. Attempting to add...<br>";
            $pdo->exec("ALTER TABLE files ADD COLUMN type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream' AFTER name");
            echo "Added column 'type' successfully.<br>";
        } else {
            echo "Column 'type' exists.<br>";
        }

        // Check created_by
        $stmt = $pdo->query("SHOW COLUMNS FROM files LIKE 'created_by'");
        if (!$stmt->fetch()) {
            echo "Column 'created_by' missing in 'files' table. Attempting to add...<br>";
            // Assuming user ID 1 exists (admin), we set default to 1 temporarily or NULL
            $pdo->exec("ALTER TABLE files ADD COLUMN created_by INT NOT NULL DEFAULT 1 AFTER folder_id");
            // Note: placement AFTER folder_id assumes folder_id exists, but we should probably check that too or just append.
            // Safest to just add.
            echo "Added column 'created_by' successfully.<br>";
        } else {
            echo "Column 'created_by' exists.<br>";
        }

        // Check folder_id
        $stmt = $pdo->query("SHOW COLUMNS FROM files LIKE 'folder_id'");
        $col = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$col) {
            echo "Column 'folder_id' missing in 'files' table. Attempting to add...<br>";
            $pdo->exec("ALTER TABLE files ADD COLUMN folder_id VARCHAR(36) NOT NULL AFTER size");
            echo "Added column 'folder_id' successfully.<br>";
        } else {
            if (stripos($col['Type'], 'int') !== false) {
                $pdo->exec("ALTER TABLE files MODIFY COLUMN folder_id VARCHAR(36) NOT NULL");
                echo "Fixed 'folder_id' type to VARCHAR(36).<br>";
            } else {
                echo "Column 'folder_id' exists and correct type.<br>";
            }
        }

        // Check storage_path
        $stmt = $pdo->query("SHOW COLUMNS FROM files LIKE 'storage_path'");
        if (!$stmt->fetch()) {
            echo "Column 'storage_path' missing in 'files' table. Attempting to add...<br>";
            $pdo->exec("ALTER TABLE files ADD COLUMN storage_path VARCHAR(500) NOT NULL AFTER created_by");
            echo "Added column 'storage_path' successfully.<br>";
        } else {
            echo "Column 'storage_path' exists.<br>";
        }

        // Check updated_at - FORCE FIX DEFAULTS
        $stmt = $pdo->query("SHOW COLUMNS FROM files LIKE 'updated_at'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE files ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            echo "Added column 'updated_at'.<br>";
        } else {
            // Ensure default is set
            $pdo->exec("ALTER TABLE files MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            echo "Fixed 'updated_at' default.<br>";
        }

        // Check created_at - FORCE FIX DEFAULTS
        $stmt = $pdo->query("SHOW COLUMNS FROM files LIKE 'created_at'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE files ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            echo "Added column 'created_at'.<br>";
        } else {
            $pdo->exec("ALTER TABLE files MODIFY COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            echo "Fixed 'created_at' default.<br>";
        }

        // Check is_deleted for files - FORCE FIX DEFAULTS
        $stmt = $pdo->query("SHOW COLUMNS FROM files LIKE 'is_deleted'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE files ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE");
            echo "Added column 'is_deleted'.<br>";
        } else {
            $pdo->exec("ALTER TABLE files MODIFY COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE");
            echo "Fixed 'is_deleted' default.<br>";
        }

        // Check is_deleted for folders
        $stmt = $pdo->query("SHOW COLUMNS FROM folders LIKE 'is_deleted'");
        if (!$stmt->fetch()) {
            echo "Column 'is_deleted' missing in 'folders' table. Attempting to add...<br>";
            $pdo->exec("ALTER TABLE folders ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE");
            echo "Added column 'is_deleted' to folders successfully.<br>";
        } else {
            echo "Column 'is_deleted' exists in folders.<br>";
        }

        // --- FIX ID COLUMN TYPES (INT -> VARCHAR) ---
        $tables = ['files', 'folders', 'folder_permissions'];
        foreach ($tables as $table) {
            $stmt = $pdo->query("SHOW COLUMNS FROM $table LIKE 'id'");
            $col = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($col && stripos($col['Type'], 'int') !== false) {
                echo "Column 'id' in '$table' is INT. Converting to VARCHAR(36)...<br>";
                try {
                    // Remove AUTO_INCREMENT if present (required before type change)
                    $pdo->exec("ALTER TABLE $table MODIFY COLUMN id INT NOT NULL");
                } catch (Exception $ex) {
                }

                // Convert to VARCHAR
                $pdo->exec("ALTER TABLE $table MODIFY COLUMN id VARCHAR(36) NOT NULL");
                echo "Converted 'id' in '$table' to VARCHAR(36).<br>";
            } else {
                echo "Column 'id' in '$table' check: OK ({$col['Type']}).<br>";
            }
        }

    } catch (Exception $e) {
        echo "Schema check warning: " . $e->getMessage() . "<br>";
    }

    // Fix potentially NULL is_deleted values AND resurrect all files
    $pdo->exec("UPDATE files SET is_deleted = 0"); // Force Show ALL
    $pdo->exec("UPDATE folders SET is_deleted = 0"); // Force Show ALL
    echo "Ensured is_deleted is 0 for ALL records (Resurrected).<br>";

    // Define Folders and Files
    $folders = [
        'A' => ['file' => 'sample_data.xlsx', 'type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'B' => ['file' => 'project_doc.docx', 'type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        'C' => ['file' => 'image_asset.jpg', 'type' => 'image/jpeg'],
        '全員' => ['file' => 'guideline.pdf', 'type' => 'application/pdf']
    ];

    foreach ($folders as $folderName => $fileInfo) {
        // 1. Check or Create Folder
        $stmt = $pdo->prepare("SELECT id FROM folders WHERE name = ?");
        $stmt->execute([$folderName]);
        $folder = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($folder) {
            $folderId = $folder['id'];
            echo "Folder '{$folderName}' already exists (ID: {$folderId})<br>";
        } else {
            $folderId = uniqid('f_', true); // Generate UUID-like ID
            // For UUID in MySQL (if char(36)), we might need uuid() function or specific format.
            // Assuming current DB accepts string IDs or uses auto-inc? 
            // Looking at previous code, it uses UUIDs. Let's try to use DB UUID if possible or PHP uniqid.
            // Supabase schema had UUID default gen_random_uuid(). MySQL schema in xserver might differ.
            // Let's check a create.php... it used UUID v4 generation or similar?
            // Actually `xserver-php/api/folders/create.php` uses `uuid_create()` or similar polyfill?
            // Let's use a simple random string for now if schema allows, or just let DB handle it if auto-inc.
            // Wait, schema for `folders.id` is likely VARCHAR(36) or similar.

            // Simple UUID v4 polyfill
            $data = random_bytes(16);
            $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
            $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
            $folderId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));

            $stmt = $pdo->prepare("INSERT INTO folders (id, name, created_by, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())");
            $stmt->execute([$folderId, $folderName, $userId]);
            echo "Created Folder '{$folderName}' (ID: {$folderId})<br>";

            // Add permission for admin
            $permId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
            $stmt = $pdo->prepare("INSERT INTO folder_permissions (id, folder_id, user_id, created_at) VALUES (?, ?, ?, NOW())");
            $stmt->execute([$permId, $folderId, $userId]);
        }

        // 2. Create Dummy File
        $fileName = $fileInfo['file'];
        $fileType = $fileInfo['type'];

        // Check if file exists in DB
        $stmt = $pdo->prepare("SELECT id FROM files WHERE folder_id = ? AND name = ?");
        $stmt->execute([$folderId, $fileName]);
        if ($stmt->fetch()) {
            echo "File '{$fileName}' already exists in '{$folderName}'. Updating link...<br>";
            $update = $pdo->prepare("UPDATE files SET folder_id = ? WHERE name = ?");
            $update->execute([$folderId, $fileName]);
            echo "Updated link.<br><hr>";
            continue;
        }

        // Create physical file
        $uploadBase = __DIR__ . '/uploads';
        $targetDir = $uploadBase . '/' . $folderId;

        if (!file_exists($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        $storageName = time() . '_' . $fileName;
        $storagePath = $folderId . '/' . $storageName;
        $fullPath = $targetDir . '/' . $storageName;

        // Content generation
        $content = "Dummy content for " . $fileName;
        if (strpos($fileName, '.jpg') !== false) {
            // 1x1 Pixel JPEG
            $content = base64_decode('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=');
        } elseif (strpos($fileName, '.pdf') !== false) {
            // Minimal PDF
            $content = "%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000117 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF";
        }

        file_put_contents($fullPath, $content);
        $size = filesize($fullPath);

        // 3. Insert File Record
        $fileId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
        $stmt = $pdo->prepare("INSERT INTO files (id, name, type, size, folder_id, created_by, storage_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([$fileId, $fileName, $fileType, $size, $folderId, $userId, $storagePath]);

        echo "Created File '{$fileName}' in '{$folderName}'<br><hr>";
    }

    echo "<h2>Seeding Completed Successfully!</h2>";

    echo "<h3>Debug: Files Table Content</h3>";
    $stmt = $pdo->query("SELECT id, name, folder_id, is_deleted, created_by FROM files");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "<table border='1'><tr><th>ID</th><th>Name</th><th>Folder ID</th><th>Is Deleted</th><th>Created By</th></tr>";
    foreach ($rows as $row) {
        echo "<tr>";
        foreach ($row as $val) {
            echo "<td>" . htmlspecialchars($val) . "</td>";
        }
        echo "</tr>";
    }
    echo "</table>";

} catch (Exception $e) {
    echo "<h2>Error: " . $e->getMessage() . "</h2>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}
?>
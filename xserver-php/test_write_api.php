<?php
header('Content-Type: text/plain');
$file = 'test_write_perm.txt';
if (file_put_contents($file, 'Write Test Successful')) {
    echo "Success: Wrote to " . __DIR__ . "/$file";
    // Clean up
    unlink($file);
} else {
    echo "Failure: Could not write to " . __DIR__ . "/$file. Check Directory Permissions.";
    echo "\nCurrent User: " . get_current_user();
    echo "\nEffective ID: " . posix_geteuid();
}
?>
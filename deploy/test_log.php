<?php
header('Content-Type: text/plain');
ini_set('display_errors', 1);
error_reporting(E_ALL);

$logDir = __DIR__ . '/logs';
$logFile = $logDir . '/test_write.log';

echo "Log Dir: $logDir\n";

if (!is_dir($logDir)) {
    echo "Directory does not exist. Attempting to create...\n";
    if (mkdir($logDir, 0755, true)) {
        echo "Directory created.\n";
    } else {
        echo "Failed to create directory. Error: " . print_r(error_get_last(), true) . "\n";
    }
}

if (is_writable($logDir)) {
    echo "Directory is writable.\n";
    if (file_put_contents($logFile, "Test log entry at " . date('Y-m-d H:i:s') . "\n", FILE_APPEND)) {
        echo "Successfully wrote to file.\n";
    } else {
        echo "Failed to write to file. Error: " . print_r(error_get_last(), true) . "\n";
    }
} else {
    echo "Directory is NOT writable.\n";
    echo "Permissions: " . substr(sprintf('%o', fileperms($logDir)), -4) . "\n";
    echo "Owner: " . fileowner($logDir) . "\n";
    echo "Current User: " . get_current_user() . " (UID: " . getmyuid() . ")\n";
}

// Check open_basedir
echo "open_basedir: " . ini_get('open_basedir') . "\n";
?>
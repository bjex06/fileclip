<?php
$logFile = __DIR__ . '/upload_debug.txt';
if (file_exists($logFile)) {
    echo "<h1>Upload Log</h1>";
    echo "<pre>" . htmlspecialchars(file_get_contents($logFile)) . "</pre>";
} else {
    echo "Log file not found at " . $logFile;
}
?>
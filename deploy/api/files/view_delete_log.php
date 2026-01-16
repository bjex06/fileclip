<?php
$logFile = __DIR__ . '/delete_debug.txt';
if (file_exists($logFile)) {
    echo nl2br(file_get_contents($logFile));
} else {
    echo "Log file not found at " . $logFile;
}
?>
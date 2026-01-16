<?php
header('Content-Type: text/plain');
$logDir = sys_get_temp_dir();
$logFile = $logDir . '/kohinata3_preview_debug.log';
if (file_exists($logFile)) {
    echo file_get_contents($logFile);
} else {
    echo "No log file found at $logFile";
}
?>
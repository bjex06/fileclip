<?php
header('Content-Type: text/plain');
echo "Server Time: " . date('Y-m-d H:i:s') . "\n";
echo "Timestamp: " . time() . "\n";
echo "Temp Dir: " . sys_get_temp_dir() . "\n";
echo "Log File Path: " . sys_get_temp_dir() . '/kohinata3_auth_debug.log' . "\n";
echo "Is Writable: " . (is_writable(sys_get_temp_dir()) ? 'YES' : 'NO') . "\n";
echo "PHP Version: " . phpversion() . "\n";
?>
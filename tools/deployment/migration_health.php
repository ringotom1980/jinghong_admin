<?php
declare(strict_types=1);

// A single POST-only, read-only dependency check. No app/bootstrap.php, db.php,
// authentication API, session_start, user uploads, CSV or logs are loaded.
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo '{"ok":false,"error":"method_not_allowed"}';
    exit;
}
if (($_SERVER['QUERY_STRING'] ?? '') !== '' || (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    http_response_code(400);
    echo '{"ok":false,"error":"empty_request_required"}';
    exit;
}
try {
    require_once __DIR__ . '/../app/deployment_paths.php';
    // Keep the protected original loader in its existing parent directory.
    require_once JINGHONG_SHARED_ROOT . '/app/env.php';
    load_project_env(true);
    require_once JINGHONG_SHARED_ROOT . '/vendor/autoload.php';

    $checks = [
        'env_file_exists' => is_file(JINGHONG_SHARED_ROOT . '/.env'),
        'vendor_loaded' => class_exists(PhpOffice\PhpSpreadsheet\Spreadsheet::class),
        'excel_reader_class' => class_exists(PhpOffice\PhpSpreadsheet\IOFactory::class),
        'excel_writer_class' => class_exists(PhpOffice\PhpSpreadsheet\Writer\Xlsx::class),
        'zipstream_class' => class_exists(ZipStream\ZipStream::class),
        'simplecache_interface' => interface_exists(Psr\SimpleCache\CacheInterface::class),
        'gd_jpeg_available' => function_exists('imagejpeg') && function_exists('imagecreatefromjpeg'),
        'session_inactive' => session_status() !== PHP_SESSION_ACTIVE,
    ];
    // A workbook exists only in PHP memory. No save(), writer invocation,
    // reader load(), php://temp, filesystem fixture or business DB access.
    $book = new PhpOffice\PhpSpreadsheet\Spreadsheet();
    $sheet = $book->getActiveSheet();
    $sheet->setCellValue('A1', 'jinghong-runtime-memory-check');
    $checks['excel_memory_cell'] = $sheet->getCell('A1')->getValue() === 'jinghong-runtime-memory-check';
    $book->disconnectWorksheets();
    unset($book);
    $ok = !in_array(false, $checks, true);
    http_response_code($ok ? 200 : 503);
    echo json_encode(['ok' => $ok, 'checks' => $checks], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    // Do not disclose exception text, paths, credentials, versions or env values.
    http_response_code(503);
    echo '{"ok":false,"error":"dependency_check_failed"}';
}

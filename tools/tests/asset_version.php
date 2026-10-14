<?php
declare(strict_types=1);
// Exercise the real asset() implementation in independent PHP requests.
$root = sys_get_temp_dir() . '/jinghong-asset-' . bin2hex(random_bytes(8));
mkdir($root . '/Public/partials', 0700, true);
mkdir($root . '/Public/assets/js', 0700, true);
$head = $root . '/Public/partials/head.php';
$asset = $root . '/Public/assets/js/probe.js';
$runner = $root . '/request.php';
try {
    copy(__DIR__ . '/../../Public/partials/head.php', $head);
    file_put_contents($runner, '<?php function base_url(){return "/jinghong_admin";} ob_start(); require __DIR__."/Public/partials/head.php"; ob_end_clean(); echo asset("assets/js/probe.js");');
    $request = static function () use ($runner): string {
        $lines = []; $status = 0;
        exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($runner), $lines, $status);
        if ($status !== 0) throw new RuntimeException('Fixture PHP request failed');
        return implode("\n", $lines);
    };
    file_put_contents($asset, 'first-content'); touch($asset, 1700000000);
    $first = $request();
    if (!str_ends_with($first, '?v=' . substr(hash('sha256', 'first-content'), 0, 16))) throw new RuntimeException('Content hash missing');
    file_put_contents($asset, 'second-content'); touch($asset, 1700000000);
    $second = $request();
    if ($first === $second) throw new RuntimeException('Same mtime hid changed bytes');
    touch($asset, 1800000000);
    if ($request() !== $second) throw new RuntimeException('Same bytes changed asset identity');
    echo "PASS real asset(): changed bytes with same mtime get new URL; same bytes with changed mtime retain URL\n";
} finally {
    foreach ([$runner, $asset, $head] as $path) if (is_file($path)) unlink($path);
    foreach (['/Public/assets/js', '/Public/assets', '/Public/partials', '/Public', ''] as $path) rmdir($root . $path);
}

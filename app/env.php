<?php
/**
 * Path: app/env.php
 * 說明: 載入 .env（不啟 session）
 *
 * - 公開 API / CLI 都用這支
 * - 支援 override：可選擇是否覆蓋既有環境變數
 */

declare(strict_types=1);

/**
 * 載入指定 env 檔案
 * @param string $envPath
 * @param bool   $override  true=覆蓋既有環境變數；false=不覆蓋
 */
function load_env_file(string $envPath, bool $override = false): void
{
    if (!is_file($envPath)) {
        return;
    }

    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim((string)$line);
        if ($line === '') continue;
        if (($line[0] ?? '') === '#') continue;
        if (strpos($line, '=') === false) continue;

        [$k, $v] = explode('=', $line, 2);
        $k = trim((string)$k);
        $v = trim((string)$v);

        if ($k === '') continue;

        // 不覆蓋既有環境變數（除非 override=true）
        if (!$override) {
            $already = getenv($k);
            if ($already !== false) {
                continue;
            }
        }

        // 去掉 "...”
        if (($v[0] ?? '') === '"' && substr($v, -1) === '"') {
            $v = substr($v, 1, -1);
        }

        putenv($k . '=' . $v);
    }
}

/**
 * 專案預設：載入根目錄 /.env
 */
function load_project_env(bool $override = false): void
{
    $root = dirname(__DIR__);
    load_env_file($root . '/.env', $override);
}

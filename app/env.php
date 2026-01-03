<?php
/**
 * Path: app/env.php
 * 說明: 載入 .env（不啟 session，不做任何業務邏輯）
 *
 * 用途：
 * - CLI scripts（import_poles.php）
 * - 公開 API（/api/public/*）
 * - 任何不需要 session 的入口
 *
 * 規則：
 * - 只解析 KEY=VALUE
 * - 忽略空行與 # 開頭註解
 * - 支援 "value" 雙引號包住
 * - 已存在的環境變數不覆蓋（避免外部注入被改寫）
 */

declare(strict_types=1);

/**
 * 載入指定 env 檔案
 */
function load_env_file(string $envPath): void
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

        // 不覆蓋既有環境變數
        $already = getenv($k);
        if ($already !== false) {
            continue;
        }

        // 去掉 "..."
        if (($v[0] ?? '') === '"' && substr($v, -1) === '"') {
            $v = substr($v, 1, -1);
        }

        putenv($k . '=' . $v);
    }
}

/**
 * 專案預設：載入根目錄 /.env
 * - 此檔位於 app/，所以 root = dirname(__DIR__)
 */
function load_project_env(): void
{
    $root = dirname(__DIR__);
    load_env_file($root . '/.env');
}

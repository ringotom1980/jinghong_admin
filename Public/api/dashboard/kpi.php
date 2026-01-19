<?php

/**
 * Path: Public/api/dashboard/kpi.php
 * 說明: Dashboard KPI
 * - 1-1：即期膠囊日期 + 領退狀態燈號
 * - 1-2：即期 A 班領料（直接共用 stats_ac 邏輯）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

/* 共用 A/C 班統計邏輯 */
require_once __DIR__ . '/../mat/stats_ac.php';
require_once __DIR__ . '/../mat/stats_d.php';

/**
 * 從日期清單中挑選「即期日期」
 * 規則：
 * 1) 若有 >= 今日 → 取最近的一筆
 * 2) 否則 → 取過去最近的一筆
 */
function pick_asof_date(array $dates): ?string
{
    $dates = array_values(array_filter($dates, function ($d) {
        return is_string($d) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d);
    }));
    if (!$dates) return null;

    sort($dates); // ASC
    $today = date('Y-m-d');

    foreach ($dates as $d) {
        if ($d >= $today) return $d;
    }
    return end($dates) ?: null;
}

/** 安全檢查資料表是否存在 */
function table_exists(string $table): bool
{
    $st = db()->prepare(
        "SELECT 1
           FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
          LIMIT 1"
    );
    $st->execute([$table]);
    return (bool)$st->fetchColumn();
}

try {

    /* ===============================
     * 1) 取得近三個月的領退日期
     * =============================== */
    $sql = "
        SELECT DISTINCT withdraw_date
          FROM mat_issue_batches
         WHERE withdraw_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
         ORDER BY withdraw_date DESC
    ";
    $rows = db()->query($sql)->fetchAll();

    $dates = [];
    foreach ($rows as $r) {
        $dates[] = (string)$r['withdraw_date'];
    }

    $asof = pick_asof_date($dates);

    /* ===============================
     * 2) 預設狀態燈號（全紅）
     * =============================== */
    $status = [
        'LWK'   => false,
        'T'     => false,
        'S'     => false,
        'RECON' => false,
    ];

    /* ===============================
     * 3) 若有即期日期 → 判斷燈號
     * =============================== */
    if ($asof) {

        // 3-1 領退檔案存在判斷（依 file_type）
        $st = db()->prepare("
            SELECT file_type, COUNT(*) AS c
              FROM mat_issue_batches
             WHERE withdraw_date = ?
             GROUP BY file_type
        ");
        $st->execute([$asof]);
        $typeRows = $st->fetchAll();

        $cnt = [];
        foreach ($typeRows as $tr) {
            $t = strtoupper((string)$tr['file_type']);
            if ($t !== '') {
                $cnt[$t] = (int)$tr['c'];
            }
        }

        // K/L/W → 領料
        $status['LWK'] =
            (($cnt['K'] ?? 0) + ($cnt['L'] ?? 0) + ($cnt['W'] ?? 0)) > 0;

        // T → 退料
        $status['T'] = ($cnt['T'] ?? 0) > 0;

        // S → 用餘
        $status['S'] = ($cnt['S'] ?? 0) > 0;

        // 3-2 對帳資料
        if (table_exists('mat_edit_reconciliation')) {
            $st2 = db()->prepare("
                SELECT 1
                  FROM mat_edit_reconciliation
                 WHERE withdraw_date = ?
                 LIMIT 1
            ");
            $st2->execute([$asof]);
            $status['RECON'] = (bool)$st2->fetchColumn();
        }
    }

    /* ===============================
     * 4) 取得 A 班統計資料（給 1-2 用）
     * =============================== */
    $aRows = [];
    if ($asof) {
        $ac = mat_stats_ac($asof);
        if (isset($ac['A']['rows']) && is_array($ac['A']['rows'])) {
            $aRows = $ac['A']['rows'];
        }
    }

    /* ===============================
 * 4-2) 取得 D 班「合計為負」材料（給 1-3 用）
 * - 與統計頁一致：負數來自 total_new / total_old（領 - 退）
 * - 來源：mat_issue_items 彙總到 material_number
 * - 條件：total_new < 0 OR total_old < 0
 * - 顯示：取更負的那個值（min(total_new,total_old)）
 * - Top N：先固定 6
 * =============================== */
    $dNeg = [];
    if ($asof) {
        $st = db()->prepare("
        SELECT *
        FROM (
          SELECT
            i.material_number,
            MAX(i.material_name) AS material_name,
            SUM(i.collar_new) AS collar_new,
            SUM(i.collar_old) AS collar_old,
            SUM(i.recede_new) AS recede_new,
            (SUM(i.recede_old)+SUM(i.scrap)+SUM(i.footprint)) AS recede_old2,
            (SUM(i.collar_new) - SUM(i.recede_new)) AS total_new,
            (SUM(i.collar_old) - (SUM(i.recede_old)+SUM(i.scrap)+SUM(i.footprint))) AS total_old
          FROM mat_issue_items i
          WHERE i.withdraw_date = ?
            AND i.shift = 'D'
          GROUP BY i.material_number
        ) t
        WHERE t.total_new < 0 OR t.total_old < 0
        ORDER BY LEAST(t.total_new, t.total_old) ASC
        LIMIT 6
    ");
        $st->execute([$asof]);
        $rows = $st->fetchAll();

        foreach ($rows as $r) {
            $name = trim((string)($r['material_name'] ?? ''));
            if ($name === '') continue;

            $tn = (float)($r['total_new'] ?? 0);
            $to = (float)($r['total_old'] ?? 0);
            $v = min($tn, $to); // 取更負的那個，對齊你畫面紅字

            if ($v >= 0) continue;

            $dNeg[] = [
                'k' => $name,
                'v' => (string)$v
            ];
        }
    }

    /* ===============================
     * 5) 回傳 KPI
     * =============================== */
    json_ok([
        'asof_date' => $asof,
        'mat' => [
            'status' => $status,
            'stats' => [
                'A' => [
                    'rows' => $aRows
                ]
            ],
            // 1-3：即期 D 班退料負數材料（Top N）
            'd_negative_returns' => $dNeg
        ]
    ]);
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}

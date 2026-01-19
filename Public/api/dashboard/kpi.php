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

    /* 4-2) 取得 D 班「領退合計(舊) total_old < 0」Top N（給 1-3 用）
 * - 不限制 ITEM：因為很多材料會被歸類進 CAT，若只抓 ITEM 會漏掉大異常
 * - 顯示名稱：ITEM 用 material_name；CAT 用 category_name
 */
    $dNeg = [];
    if ($asof) {
        $dg = mat_stats_d($asof);
        $dRows = (isset($dg['D']['rows']) && is_array($dg['D']['rows']))
            ? $dg['D']['rows']
            : [];

        foreach ($dRows as $r) {
            if (!array_key_exists('total_old', $r)) continue;

            $totalOld = (float)$r['total_old'];
            if ($totalOld >= 0) continue;

            $kind = strtoupper((string)($r['row_kind'] ?? ''));

            // 名稱：CAT/ITEM 各用自己的欄位
            if ($kind === 'CAT') {
                $name = trim((string)($r['category_name'] ?? ''));
            } else {
                $name = trim((string)($r['material_name'] ?? ''));
            }
            if ($name === '') continue;

            $dNeg[] = ['k' => $name, 'v' => (string)$totalOld];
        }

        // 最負的排最前
        usort($dNeg, function ($a, $b) {
            return (float)$a['v'] <=> (float)$b['v'];
        });

        // Top 6（你要幾筆自己調）
        $dNeg = array_slice($dNeg, 0, 6);
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

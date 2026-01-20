<?php
/**
 * Path: Public/api/dashboard/kpi.php
 * 說明: Dashboard KPI（依卡片順序回傳）
 * 1-1：即期膠囊日期 + 領退狀態燈號（LWK/T/S/RECON）
 * 1-2：即期 A 班領料（共用 stats_ac）
 * 1-3：即期 D 班退料（舊料合計為負的 TopN）
 * 1-4：即期 F 班變壓器領退（共用 stats_ef）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

/* ===== 共用統計邏輯（你原本就要共用） ===== */
require_once __DIR__ . '/../mat/stats_ac.php';
require_once __DIR__ . '/../mat/stats_d.php';
require_once __DIR__ . '/../mat/stats_ef.php'; // ✅ 你原本漏了這個，會直接讓 API 爆掉

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

    /* =====================================================
     * 1-1：即期日期 + 燈號狀態
     * ===================================================== */

    // 1) 取得近三個月的領退日期
    $stDates = db()->query("
        SELECT DISTINCT withdraw_date
          FROM mat_issue_batches
         WHERE withdraw_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
         ORDER BY withdraw_date DESC
    ");
    $rows = $stDates->fetchAll();

    $dates = [];
    foreach ($rows as $r) $dates[] = (string)$r['withdraw_date'];

    $asof = pick_asof_date($dates);

    // 2) 預設狀態燈號（全 false）
    $status = [
        'LWK'   => false,
        'T'     => false,
        'S'     => false,
        'RECON' => false,
    ];

    // 3) 若有即期日期 → 判斷燈號
    if ($asof) {

        // 3-1 領退批次存在判斷（依 file_type）
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
            if ($t !== '') $cnt[$t] = (int)$tr['c'];
        }

        // K/L/W → 領料
        $status['LWK'] = (($cnt['K'] ?? 0) + ($cnt['L'] ?? 0) + ($cnt['W'] ?? 0)) > 0;

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

    /* =====================================================
     * 1-2：即期 A 班領料（共用 stats_ac）
     * ===================================================== */
    $aRows = [];
    if ($asof) {
        $ac = mat_stats_ac($asof);
        if (isset($ac['A']['rows']) && is_array($ac['A']['rows'])) {
            $aRows = $ac['A']['rows'];
        }
    }

    /* =====================================================
     * 1-3：即期 D 班退料（舊料合計為負的 TopN）
     * ===================================================== */
    $dNeg = [];
    if ($asof) {
        $dg = mat_stats_d($asof);
        $dRows = (isset($dg['D']['rows']) && is_array($dg['D']['rows'])) ? $dg['D']['rows'] : [];

        foreach ($dRows as $r) {
            if (!array_key_exists('total_old', $r)) continue;

            $totalOld = (float)$r['total_old'];
            if ($totalOld >= 0) continue;

            $kind = strtoupper((string)($r['row_kind'] ?? ''));

            // 名稱：CAT/ITEM 各用自己的欄位（照你原本規則）
            $name = '';
            if ($kind === 'CAT') {
                $name = trim((string)($r['category_name'] ?? ''));
            } else {
                $name = trim((string)($r['material_name'] ?? ''));
            }
            if ($name === '') continue;

            $dNeg[] = ['k' => $name, 'v' => (string)$totalOld];
        }

        // 最負的排最前（值越小越前）
        usort($dNeg, function ($a, $b) {
            return (float)$a['v'] <=> (float)$b['v'];
        });

        // Top 6（要改筆數你自己調）
        $dNeg = array_slice($dNeg, 0, 6);
    }

    /* =====================================================
     * 1-4：即期 F 班變壓器領退（共用 stats_ef）
     * ===================================================== */
    $fRows = [];
    if ($asof) {
        $ef = mat_stats_ef($asof);
        if (isset($ef['F']['rows']) && is_array($ef['F']['rows'])) {
            $fRows = $ef['F']['rows'];
        }
    }

    /* =====================================================
     * 回傳（維持你 dashboard.js 吃的結構）
     * ===================================================== */
    json_ok([
        'asof_date' => $asof,
        'mat' => [
            'status' => $status,
            'stats' => [
                'A' => ['rows' => $aRows],
                'F' => ['rows' => $fRows],
            ],
            'd_negative_returns' => $dNeg,
        ],
    ]);

} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}

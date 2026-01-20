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
require_once __DIR__ . '/../mat/stats_ef.php';
require_once __DIR__ . '/../../../app/services/VehicleService.php';
require_once __DIR__ . '/../../../app/services/VehicleRepairStatsService.php';
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

        'vehicle' => (function () {

            $pdo = db();

            /* =====================================================
     * 2-3：近半年維修金額（依車輛維修統計膠囊：最新 end_date 的那顆）
     * - 不用 rolling 6 months
     * - 直接用 VehicleRepairStatsService 的 capsules/keyToRange
     * ===================================================== */
            $repair6m = (function () use ($pdo) {
                $svc = new VehicleRepairStatsService($pdo);

                // 近 N 年內有資料的 capsules（svc 內已用 end_ts desc 排序）
                $caps = $svc->getCapsules(5);
                $key = $svc->getDefaultKeyFromCapsules($caps);
                if ($key === '') {
                    return [
                        'key' => '',
                        'start' => '',
                        'end' => '',
                        'company' => 0,
                        'team' => 0,
                        'total' => 0,
                    ];
                }

                [$start, $end] = $svc->keyToRange($key);

                // KPI 只要總額 → 直接 SUM（不走 getSummary/top3）
                $sql = "
          SELECT
            COALESCE(SUM(h.company_amount_total),0) AS company_total,
            COALESCE(SUM(h.team_amount_total),0)    AS team_total,
            COALESCE(SUM(h.grand_total),0)          AS grand_total
          FROM vehicle_repair_headers h
          WHERE h.repair_date BETWEEN :s AND :e
        ";
                $st = $pdo->prepare($sql);
                $st->execute([':s' => $start, ':e' => $end]);
                $r = $st->fetch(PDO::FETCH_ASSOC) ?: [];

                return [
                    'key' => $key,
                    'label' => $svc->keyToLabel($key),
                    'start' => $start,
                    'end' => $end,
                    'company' => (float)($r['company_total'] ?? 0),
                    'team' => (float)($r['team_total'] ?? 0),
                    'total' => (float)($r['grand_total'] ?? 0),
                ];
            })();

            // 你已定義：到期門檻 30 天（與 VehicleService 一致）
            $today = new DateTimeImmutable('today');
            $soonDate = $today->modify('+30 days');

            // 將 DB 的 type_name/type_key 正規化成你指定的 6 個字樣
            $normLabel = function (?string $typeKey, ?string $typeName): string {
                $key = strtoupper(trim((string)$typeKey));
                $name = trim((string)$typeName);

                // 優先：type_name 內含關鍵字（最不猜、最穩）
                $targets = ['驗車', '保險', '廢氣', '行車', 'X光', '絕緣'];
                foreach ($targets as $t) {
                    if ($name !== '' && mb_strpos($name, $t) !== false) return $t;
                }

                // 次要：若你 DB type_key 剛好是固定鍵，可在這裡補對照（沒有就不硬猜）
                // 例如：if ($key === 'INSURANCE') return '保險';

                // fallback：完全對不上就回空（避免出現你不想要的長字）
                return '';
            };

            // 一次撈出「每台車、每個檢查項」的 due_date + required
            $sql = "
      SELECT
        v.id AS vehicle_id,
        v.vehicle_code,
        v.plate_no,
        t.type_key,
        t.type_name,
        COALESCE(r.is_required, 1) AS is_required,
        i.due_date
      FROM vehicle_vehicles v
      JOIN vehicle_inspection_types t ON t.is_enabled = 1
      LEFT JOIN vehicle_vehicle_inspection_rules r
        ON r.vehicle_id = v.id AND r.type_id = t.type_id
      LEFT JOIN vehicle_vehicle_inspections i
        ON i.vehicle_id = v.id AND i.type_id = t.type_id
      WHERE v.is_active = 1
      ORDER BY v.vehicle_code ASC, v.id ASC, t.sort_no ASC, t.type_id ASC
    ";
            $rows = $pdo->query($sql)->fetchAll();
            if (!$rows) {
                return [
                    'overdue' => [],
                    'due_soon' => [],
                    'due_soon_days' => 30,
                    'repair_6m' => $repair6m,
                ];
            }

            // 聚合：vehicle_id => { name, overdueItems[], soonItems[] }
            $map = [];

            foreach ($rows as $r) {
                $vid = (int)$r['vehicle_id'];
                if ($vid <= 0) continue;

                if (!isset($map[$vid])) {
                    $code = trim((string)($r['vehicle_code'] ?? ''));
                    $plate = trim((string)($r['plate_no'] ?? ''));
                    $name = $code;
                    if ($plate !== '') $name .= '（' . $plate . '）';

                    $map[$vid] = [
                        'vehicle_id' => $vid,
                        'name' => $name,
                        'overdueItems' => [],
                        'soonItems' => [],
                    ];
                }

                // required=0 → 不納入
                if ((int)($r['is_required'] ?? 1) !== 1) continue;

                // 沒 due_date → 不納入（UNSET 不在 KPI 顯示）
                if (empty($r['due_date'])) continue;

                $due = new DateTimeImmutable((string)$r['due_date']);

                $label = $normLabel($r['type_key'] ?? null, $r['type_name'] ?? null);
                if ($label === '') continue;

                // OVERDUE / DUE_SOON 判斷
                if ($due < $today) {
                    $map[$vid]['overdueItems'][$label] = true; // 用 key 去重
                } elseif ($due <= $soonDate) {
                    $map[$vid]['soonItems'][$label] = true;
                }
            }

            $overdue = [];
            $dueSoon = [];

            foreach ($map as $pack) {
                $o = array_keys($pack['overdueItems']);
                $s = array_keys($pack['soonItems']);

                // 每台最多 4 顆膠囊
                if ($o) {
                    $overdue[] = [
                        'vehicle_id' => (int)$pack['vehicle_id'],
                        'name' => (string)$pack['name'],
                        'items' => array_slice($o, 0, 4),
                    ];
                }
                if ($s) {
                    $dueSoon[] = [
                        'vehicle_id' => (int)$pack['vehicle_id'],
                        'name' => (string)$pack['name'],
                        'items' => array_slice($s, 0, 4),
                    ];
                }
            }

            return [
                'overdue' => $overdue,
                'due_soon' => $dueSoon,
                'due_soon_days' => 30,
                'repair_6m' => $repair6m,
            ];
        })(),

    ]);
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}

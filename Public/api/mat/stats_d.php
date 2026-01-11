<?php
/**
 * Path: Public/api/mat/stats_d.php
 * 說明: D 班（分類對帳）統計
 *
 * 規則（定版）：
 * - 依 mat_edit_categories 產生列（排序 sort_order asc）
 * - 依 mat_edit_category_materials.material_number 將 mat_issue_items 歸類到 category_id
 * - 統計欄位（皆為 D 班、指定 withdraw_date）
 *   collar_new, collar_old, recede_new, recede_old
 * - 對帳資料：mat_edit_reconciliation.recon_values_json（key=category_id）
 * - 領退合計：
 *   total_new = collar_new - recede_new
 *   total_old = collar_old + recon_value - recede_old
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';

function mat_stats_d(string $d): array
{
    $pdo = db();

    // 1) 分類主檔
    $cats = $pdo->query(
        "SELECT id, category_name, sort_order
         FROM mat_edit_categories
         ORDER BY sort_order ASC, id ASC"
    )->fetchAll();

    // 2) 來源統計：依分類彙總（只算 D 班）
    $sumSql = "SELECT
                 cm.category_id,
                 SUM(i.collar_new)  AS collar_new,
                 SUM(i.collar_old)  AS collar_old,
                 SUM(i.recede_new)  AS recede_new,
                 SUM(i.recede_old)  AS recede_old
               FROM mat_edit_category_materials cm
               JOIN mat_issue_items i
                 ON i.material_number = cm.material_number
                AND i.withdraw_date = ?
                AND i.shift = 'D'
               GROUP BY cm.category_id";
    $st = $pdo->prepare($sumSql);
    $st->execute([$d]);
    $sumRows = $st->fetchAll();

    $sumMap = [];
    foreach ($sumRows as $r) {
        $cid = (string)($r['category_id'] ?? '');
        if ($cid === '') continue;
        $sumMap[$cid] = $r;
    }

    // 3) 對帳資料（json key=category_id）
    $rst = $pdo->prepare(
        "SELECT withdraw_date, recon_values_json, updated_at, updated_by
         FROM mat_edit_reconciliation
         WHERE withdraw_date = ?
         LIMIT 1"
    );
    $rst->execute([$d]);
    $reconRow = $rst->fetch();

    $reconValues = [];
    $reconMeta = [
        'updated_at' => '',
        'updated_by' => null,
    ];

    if ($reconRow) {
        $decoded = json_decode((string)($reconRow['recon_values_json'] ?? ''), true);
        if (is_array($decoded)) $reconValues = $decoded;

        $reconMeta = [
            'updated_at' => (string)($reconRow['updated_at'] ?? ''),
            'updated_by' => $reconRow['updated_by'] ?? null,
        ];
    }

    // 4) 產出 rows（每個 category 一列）
    $rows = [];
    foreach ($cats as $c) {
        $cid = (string)($c['id'] ?? '');
        if ($cid === '') continue;

        $s = $sumMap[$cid] ?? [];

        $cn = (float)($s['collar_new'] ?? 0);
        $co = (float)($s['collar_old'] ?? 0);
        $rn = (float)($s['recede_new'] ?? 0);
        $ro = (float)($s['recede_old'] ?? 0);

        // recon 可能是字串，強制轉數字
        $rv = 0.0;
        if (array_key_exists($cid, $reconValues)) {
            $rv = (float)$reconValues[$cid];
        }

        $rows[] = [
            'category_id' => (int)$c['id'],
            'category_name' => (string)($c['category_name'] ?? ''),
            'sort_order' => (int)($c['sort_order'] ?? 0),

            'collar_new' => $cn,
            'collar_old' => $co,
            'recede_new' => $rn,
            'recede_old' => $ro,

            'recon_value' => $rv,

            // ✅ 定版公式
            'total_new' => $cn - $rn,
            'total_old' => $co + $rv - $ro,
        ];
    }

    return [
        'D' => [
            'rows' => $rows,
            'recon' => [
                'meta' => $reconMeta,
            ],
        ],
    ];
}

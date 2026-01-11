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
 *
 * 修正重點（你現在「統計數量沒出來」的原因）：
 * - 原本用 INNER JOIN 會把沒有對應 D 班資料的分類整列吃掉，導致 sumMap 空
 * - 改用 LEFT JOIN，且維持條件在 ON（同效果），確保分類存在時仍能回 0
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
    // ✅ 修正：JOIN -> LEFT JOIN，避免分類被吃掉導致統計全 0
    $sumSql = "SELECT
                 cm.category_id,
                 COALESCE(SUM(i.collar_new), 0)  AS collar_new,
                 COALESCE(SUM(i.collar_old), 0)  AS collar_old,
                 COALESCE(SUM(i.recede_new), 0)  AS recede_new,
                 COALESCE(SUM(i.recede_old), 0)  AS recede_old
               FROM mat_edit_category_materials cm
               LEFT JOIN mat_issue_items i
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
            'category_id' => (int)($c['id'] ?? 0),
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

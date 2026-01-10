<?php
/**
 * Path: Public/api/mat/stats_d.php
 * 說明: 統計頁 — D 組查詢（分類統計）
 * 參數:
 * - withdraw_date=YYYY-MM-DD（必填）
 *
 * 回傳:
 * - categories: 分類列表（含 sort_order）
 * - issue_sum_by_category: 各分類彙總（來自 items + 歸屬表）
 * - recon: 該日對帳整包（JSON 原樣字串 + decode 後陣列）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

try {
  $d = (string)($_GET['withdraw_date'] ?? '');
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) {
    json_error('withdraw_date 格式不正確（YYYY-MM-DD）', 400);
  }

  $pdo = db();

  // 1) categories（排序）
  $catSql = "SELECT id, category_name, sort_order
             FROM mat_edit_categories
             ORDER BY sort_order ASC, id ASC";
  $categories = $pdo->query($catSql)->fetchAll();

  // 2) issue_sum_by_category：以「分類歸屬」彙總（只統計 items.shift='D'）
  $sumSql = "SELECT
               cm.category_id,
               SUM(i.collar_new)  AS collar_new,
               SUM(i.collar_old)  AS collar_old,
               SUM(i.recede_new)  AS recede_new,
               SUM(i.recede_old)  AS recede_old,
               SUM(i.scrap)       AS scrap,
               SUM(i.footprint)   AS footprint
             FROM mat_edit_category_materials cm
             JOIN mat_issue_items i
               ON i.material_number = cm.material_number
              AND i.withdraw_date = ?
              AND i.shift = 'D'
             GROUP BY cm.category_id
             ORDER BY cm.category_id ASC";
  $st = $pdo->prepare($sumSql);
  $st->execute([$d]);
  $sumRows = $st->fetchAll();

  // 轉成 map：category_id => sums
  $sumMap = [];
  foreach ($sumRows as $r) {
    $cid = (string)$r['category_id'];
    $sumMap[$cid] = $r;
  }

  // 3) recon（可無）
  $reconSql = "SELECT withdraw_date, recon_values_json, updated_at, updated_by
               FROM mat_edit_reconciliation
               WHERE withdraw_date = ?
               LIMIT 1";
  $rst = $pdo->prepare($reconSql);
  $rst->execute([$d]);
  $reconRow = $rst->fetch();

  $reconJson = null;
  $reconValues = null;
  $reconMeta = null;

  if ($reconRow) {
    $reconJson = (string)($reconRow['recon_values_json'] ?? '');
    $decoded = json_decode($reconJson, true);
    if (is_array($decoded)) $reconValues = $decoded;

    $reconMeta = [
      'updated_at' => (string)($reconRow['updated_at'] ?? ''),
      'updated_by' => $reconRow['updated_by'] ?? null,
    ];
  }

  json_ok([
    'withdraw_date' => $d,
    'group' => 'D',
    'categories' => $categories,
    'issue_sum_by_category' => $sumMap,
    'recon' => [
      'json' => $reconJson,
      'values' => $reconValues,
      'meta' => $reconMeta
    ]
  ]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

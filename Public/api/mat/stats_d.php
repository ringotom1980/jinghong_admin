<?php

/**
 * Path: Public/api/mat/stats_d.php
 * 說明: D 班（分類對帳）統計 — 含「分類彙總 + 未分類材料明細」
 *
 * 你要的規則（已照做）：
 * 1) 先用 mat_edit_category_materials 把 D 班資料歸類 → 依 category 彙總（分類一列）
 * 2) 沒有出現在分類表的 D 班材料 → 不歸類，直接以材料彙總（材料一列）
 *
 * 共同統計欄位（兩種列都會有）：
 * - collar_new, collar_old, recede_new, recede_old
 *
 * 額外欄位：
 * - 分類列：recon_value（來自 mat_edit_reconciliation JSON key=category_id）
 * - 材料列：recon_value 固定 0
 *
 * 合計（兩種列都會算）：
 * - total_new = collar_new - recede_new
 * - total_old = collar_old + recon_value - recede_old
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';

function mat_stats_d(string $d): array
{
  $pdo = db();

  // ===== 0) 類別主檔（排序）=====
  $cats = $pdo->query(
    "SELECT id, category_name, sort_order
         FROM mat_edit_categories
         ORDER BY sort_order ASC, id ASC"
  )->fetchAll();

  // ===== 1) 對帳資料（json key=category_id）=====
  $rst = $pdo->prepare(
    "SELECT recon_values_json, updated_at, updated_by
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

  // ===== 2) 已歸類：依分類彙總（category 一列）=====
  // 這裡用 JOIN（只抓得到有對應分類表的材料）是正確的
  $sumSqlCat = "SELECT
                    cm.category_id,
                    COALESCE(SUM(i.collar_new), 0)  AS collar_new,
                    COALESCE(SUM(i.collar_old), 0)  AS collar_old,
                    COALESCE(SUM(i.recede_new), 0)  AS recede_new,
                    (COALESCE(SUM(i.recede_old), 0) + COALESCE(SUM(i.scrap), 0) + COALESCE(SUM(i.footprint), 0)) AS recede_old
                  FROM mat_edit_category_materials cm
                  JOIN mat_issue_items i
                    ON i.material_number = cm.material_number
                   AND i.withdraw_date = ?
                   AND i.shift = 'D'
                  GROUP BY cm.category_id";
  $st = $pdo->prepare($sumSqlCat);
  $st->execute([$d]);
  $sumRowsCat = $st->fetchAll();

  $sumCatMap = [];
  foreach ($sumRowsCat as $r) {
    $cid = (string)($r['category_id'] ?? '');
    if ($cid === '') continue;
    $sumCatMap[$cid] = $r;
  }

  // ===== 3) 未歸類：不在分類表的材料 → 以材料彙總（材料一列）=====
  $sumSqlItem = "SELECT
                     i.material_number,
                     MAX(i.material_name) AS material_name,
                     COALESCE(SUM(i.collar_new), 0)  AS collar_new,
                     COALESCE(SUM(i.collar_old), 0)  AS collar_old,
                     COALESCE(SUM(i.recede_new), 0)  AS recede_new,
                     (COALESCE(SUM(i.recede_old), 0) + COALESCE(SUM(i.scrap), 0) + COALESCE(SUM(i.footprint), 0)) AS recede_old
                   FROM mat_issue_items i
                   LEFT JOIN mat_edit_category_materials cm
                     ON cm.material_number = i.material_number
                   WHERE i.withdraw_date = ?
                     AND i.shift = 'D'
                     AND cm.material_number IS NULL
                   GROUP BY i.material_number
                   ORDER BY i.material_number ASC";
  $st2 = $pdo->prepare($sumSqlItem);
  $st2->execute([$d]);
  $sumRowsItem = $st2->fetchAll();

  // ===== 4) 組 rows：先放分類列（依 sort_order）=====
  $rows = [];

  foreach ($cats as $c) {
    $cid = (string)($c['id'] ?? '');
    if ($cid === '') continue;

    $s = $sumCatMap[$cid] ?? [];

    $cn = (float)($s['collar_new'] ?? 0);
    $co = (float)($s['collar_old'] ?? 0);
    $rn = (float)($s['recede_new'] ?? 0);
    $ro = (float)($s['recede_old'] ?? 0);
    // ✅ 若該分類「領新/領舊/退新/退舊」全為 0：整列不顯示
    if ($cn == 0.0 && $co == 0.0 && $rn == 0.0 && $ro == 0.0) {
      continue;
    }

    $rv = 0.0;
    if (array_key_exists($cid, $reconValues)) {
      $rv = (float)$reconValues[$cid];
    }

    $rows[] = [
      'row_kind' => 'CAT', // ✅ 分類列

      'category_id' => (int)($c['id'] ?? 0),
      'category_name' => (string)($c['category_name'] ?? ''),
      'sort_order' => (int)($c['sort_order'] ?? 0),

      // 材料欄位（分類列留空）
      'material_number' => '',
      'material_name' => '',

      'collar_new' => $cn,
      'collar_old' => $co,
      'recede_new' => $rn,
      'recede_old' => $ro,

      'recon_value' => $rv,

      // ✅ 定版公式（兩種列都算）
      'total_new' => $cn - $rn,
      'total_old' => $co + $rv - $ro,
    ];
  }

  // ===== 5) 再放未分類材料列 =====
  foreach ($sumRowsItem as $r) {
    $cn = (float)($r['collar_new'] ?? 0);
    $co = (float)($r['collar_old'] ?? 0);
    $rn = (float)($r['recede_new'] ?? 0);
    $ro = (float)($r['recede_old'] ?? 0);
    // ✅ 若該材料「領新/領舊/退新/退舊」全為 0：整列不顯示
    if ($cn == 0.0 && $co == 0.0 && $rn == 0.0 && $ro == 0.0) {
      continue;
    }

    $rv = 0.0; // 未分類材料列沒有對帳值

    $rows[] = [
      'row_kind' => 'ITEM', // ✅ 材料列

      // 分類欄位（材料列留空）
      'category_id' => null,
      'category_name' => '',
      'sort_order' => null,

      'material_number' => (string)($r['material_number'] ?? ''),
      'material_name' => (string)($r['material_name'] ?? ''),

      'collar_new' => $cn,
      'collar_old' => $co,
      'recede_new' => $rn,
      'recede_old' => $ro,

      'recon_value' => $rv,

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

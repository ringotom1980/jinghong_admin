<?php
/**
 * Path: Public/api/mat/stats.php
 * 說明: 統計總控 API
 * 參數:
 * - withdraw_date=YYYY-MM-DD（可選，不給就取近三個月最新）
 * - shift=all|A|B|C|D|E|F（可選，預設 all）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

function _pick_latest_date_3m(): ?string {
  $sql = "SELECT MAX(withdraw_date) AS d
          FROM mat_issue_batches
          WHERE withdraw_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)";
  $row = db()->query($sql)->fetch();
  $d = $row ? (string)($row['d'] ?? '') : '';
  return $d !== '' ? $d : null;
}

function _agg_items_by_shifts(string $d, array $shifts, bool $withSortB = false): array {
  $pdo = db();

  $in = implode(',', array_fill(0, count($shifts), '?'));
  $params = array_merge([$d], $shifts);

  if ($withSortB) {
    $sql = "SELECT
              i.material_number,
              MAX(i.material_name) AS material_name,
              COALESCE(msb.sort_order, 999999) AS sort_order,
              SUM(i.collar_new)  AS collar_new,
              SUM(i.collar_old)  AS collar_old,
              SUM(i.recede_new)  AS recede_new,
              SUM(i.recede_old)  AS recede_old,
              SUM(i.scrap)       AS scrap,
              SUM(i.footprint)   AS footprint
            FROM mat_issue_items i
            LEFT JOIN mat_materials_sort_b msb
                   ON msb.material_number = i.material_number
            WHERE i.withdraw_date = ?
              AND i.shift IN ($in)
            GROUP BY i.material_number, msb.sort_order
            ORDER BY sort_order ASC, i.material_number ASC";
  } else {
    $sql = "SELECT
              i.material_number,
              MAX(i.material_name) AS material_name,
              SUM(i.collar_new)  AS collar_new,
              SUM(i.collar_old)  AS collar_old,
              SUM(i.recede_new)  AS recede_new,
              SUM(i.recede_old)  AS recede_old,
              SUM(i.scrap)       AS scrap,
              SUM(i.footprint)   AS footprint
            FROM mat_issue_items i
            WHERE i.withdraw_date = ?
              AND i.shift IN ($in)
            GROUP BY i.material_number
            ORDER BY i.material_number ASC";
  }

  $st = $pdo->prepare($sql);
  $st->execute($params);
  return $st->fetchAll();
}

function _d_group(string $d): array {
  // 直接沿用 stats_d.php 的邏輯（避免你前端打兩次 API 的時候還要合併）
  $pdo = db();

  $categories = $pdo->query(
    "SELECT id, category_name, sort_order
     FROM mat_edit_categories
     ORDER BY sort_order ASC, id ASC"
  )->fetchAll();

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

  $sumMap = [];
  foreach ($sumRows as $r) {
    $cid = (string)$r['category_id'];
    $sumMap[$cid] = $r;
  }

  $reconRow = null;
  $rst = $pdo->prepare(
    "SELECT withdraw_date, recon_values_json, updated_at, updated_by
     FROM mat_edit_reconciliation
     WHERE withdraw_date = ?
     LIMIT 1"
  );
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

  return [
    'categories' => $categories,
    'issue_sum_by_category' => $sumMap,
    'recon' => [
      'json' => $reconJson,
      'values' => $reconValues,
      'meta' => $reconMeta
    ]
  ];
}

try {
  $shift = strtoupper((string)($_GET['shift'] ?? 'ALL'));
  $d = (string)($_GET['withdraw_date'] ?? '');

  if ($d === '') {
    $latest = _pick_latest_date_3m();
    if (!$latest) json_ok([
      'withdraw_date' => null,
      'shift' => $shift,
      'groups' => []
    ]);
    $d = $latest;
  }

  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) {
    json_error('withdraw_date 格式不正確（YYYY-MM-DD）', 400);
  }

  $groups = [];

  if ($shift === 'ALL') {
    $groups['AC'] = ['rows' => _agg_items_by_shifts($d, ['A','C'])];
    $groups['B']  = ['rows' => _agg_items_by_shifts($d, ['B'], true)];
    $groups['D']  = _d_group($d);
    $groups['EF'] = ['rows' => _agg_items_by_shifts($d, ['E','F'])];
  } else {
    if ($shift === 'A' || $shift === 'C') {
      $groups['AC'] = ['rows' => _agg_items_by_shifts($d, ['A','C'])];
    } elseif ($shift === 'E' || $shift === 'F') {
      $groups['EF'] = ['rows' => _agg_items_by_shifts($d, ['E','F'])];
    } elseif ($shift === 'B') {
      $groups['B'] = ['rows' => _agg_items_by_shifts($d, ['B'], true)];
    } elseif ($shift === 'D') {
      $groups['D'] = _d_group($d);
    } else {
      json_error('shift 參數不正確（all|A|B|C|D|E|F）', 400);
    }
  }

  json_ok([
    'withdraw_date' => $d,
    'shift' => $shift,
    'groups' => $groups
  ]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

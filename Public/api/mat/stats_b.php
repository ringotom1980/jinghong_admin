<?php
/**
 * Path: Public/api/mat/stats_b.php
 * 說明: 統計頁 — B 組查詢（含 sort_order）
 * 參數:
 * - withdraw_date=YYYY-MM-DD（必填）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

try {
  $d = (string)($_GET['withdraw_date'] ?? '');
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) {
    json_error('withdraw_date 格式不正確（YYYY-MM-DD）', 400);
  }

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
            AND i.shift = 'B'
          GROUP BY i.material_number, msb.sort_order
          ORDER BY sort_order ASC, i.material_number ASC";

  $st = db()->prepare($sql);
  $st->execute([$d]);

  json_ok([
    'withdraw_date' => $d,
    'group' => 'B',
    'rows' => $st->fetchAll()
  ]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

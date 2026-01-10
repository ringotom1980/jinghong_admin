<?php
/**
 * Path: Public/api/mat/stats_ef.php
 * 說明: 統計頁 — E + F 組查詢（同一組）
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
            SUM(i.collar_new)  AS collar_new,
            SUM(i.collar_old)  AS collar_old,
            SUM(i.recede_new)  AS recede_new,
            SUM(i.recede_old)  AS recede_old,
            SUM(i.scrap)       AS scrap,
            SUM(i.footprint)   AS footprint
          FROM mat_issue_items i
          WHERE i.withdraw_date = ?
            AND i.shift IN ('E','F')
          GROUP BY i.material_number
          ORDER BY i.material_number ASC";

  $st = db()->prepare($sql);
  $st->execute([$d]);

  json_ok([
    'withdraw_date' => $d,
    'group' => 'EF',
    'rows' => $st->fetchAll()
  ]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

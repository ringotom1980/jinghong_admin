<?php

/**
 * Path: Public/api/mat/stats_ac.php
 * 說明:
 * - A/C 班統計邏輯（同組計算、分班輸出）
 * - 可被 stats.php include 使用
 * - 亦可單獨作為 API 呼叫
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';

/**
 * A/C 班統計主函式
 * @param string $withdrawDate YYYY-MM-DD
 * @return array ['A' => ['rows'=>[]], 'C' => ['rows'=>[]]]
 */
function mat_stats_ac(string $withdrawDate): array
{
  $pdo = db();

  $sql = "
        SELECT
            i.shift,
            i.material_number,
            MAX(i.material_name) AS material_name,

            SUM(i.collar_new)  AS collar_new,
            SUM(i.collar_old)  AS collar_old,
            SUM(i.recede_new)  AS recede_new,
            SUM(i.recede_old)  AS recede_old,

            -- A/C 合計邏輯（定版）
            SUM(i.collar_new)  - SUM(i.recede_new) AS total_new,
            SUM(i.collar_old)  - SUM(i.recede_old) AS total_old

        FROM mat_issue_items i
        WHERE i.withdraw_date = ?
          AND i.shift IN ('A','C')
        GROUP BY i.shift, i.material_number
        ORDER BY i.shift ASC, i.material_number ASC
    ";

  $st = $pdo->prepare($sql);
  $st->execute([$withdrawDate]);
  $rows = $st->fetchAll();

  // 依班別拆開
  $out = [
    'A' => ['rows' => []],
    'C' => ['rows' => []],
  ];

  foreach ($rows as $r) {
    $s = strtoupper((string)$r['shift']);
    if ($s === 'A' || $s === 'C') {
      $out[$s]['rows'][] = $r;
    }
  }

  return $out;
}

/* =========================================================
 * 以下是「輸出邊界」：只有在直接打 API 時才會走
 * ========================================================= */

if (php_sapi_name() !== 'cli' && basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {

  require_login();

  $d = (string)($_GET['withdraw_date'] ?? '');
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) {
    json_error('withdraw_date 格式不正確（YYYY-MM-DD）', 400);
  }

  try {
    $data = mat_stats_ac($d);

    json_ok([
      'withdraw_date' => $d,
      'group' => 'AC',
      'groups' => $data
    ]);
  } catch (Throwable $e) {
    json_error($e->getMessage(), 500);
  }
}

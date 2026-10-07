<?php
/**
 * Path: Public/api/mat/stats_b.php
 * 說明:
 * - B 班統計邏輯（含 sort_order）
 * - 產出「合計」+「筆數字串（每筆數量用 + 串起來）」
 *
 * 規則（目前版）：
 * - 領新合計 = SUM(collar_new)；領新筆數字串 = GROUP_CONCAT(collar_new 非0, '+')
 * - 領舊合計 = SUM(collar_old)；領舊筆數字串 = GROUP_CONCAT(collar_old 非0, '+')
 * - 退新合計 = SUM(recede_new)；退新筆數字串 = GROUP_CONCAT(recede_new 非0, '+')
 * - 退舊合計 = SUM(recede_old)；退舊筆數字串 = GROUP_CONCAT(recede_old 非0, '+')
 * - 領退合計(新) = 領新合計 - 退新合計
 * - 領退合計(舊) = 領舊合計 - 退舊合計
 *
 * 注意：
 * - 這裡的「筆數」不是 COUNT，是「每筆數量明細串」。
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';

/**
 * B 班統計主函式
 * @param string $withdrawDate YYYY-MM-DD
 * @return array ['B' => ['rows'=>[]]]
 */
function mat_stats_b(string $withdrawDate): array
{
  $pdo = db();

  // ✅ MariaDB/MySQL：GROUP_CONCAT 預設長度可能偏小，這行可避免明細太長被截斷
  // 若你環境不允許 set session 也不會致命，只是明細可能被截斷
  try {
    $pdo->exec("SET SESSION group_concat_max_len = 8192");
  } catch (Throwable $e) {
    // ignore
  }

  $sql = "
    SELECT
      i.material_number,
      MAX(i.material_name) AS material_name,
      COALESCE(msb.sort_order, 999999) AS sort_order,

      -- ===== 合計（SUM）=====
      SUM(i.collar_new)  AS collar_new,
      SUM(i.collar_old)  AS collar_old,
      SUM(i.recede_new)  AS recede_new,
      SUM(i.recede_old)  AS recede_old,

      -- ===== 筆數字串（每筆數量用 + 串起來，只串非 0）=====
      GROUP_CONCAT(
        CASE WHEN i.collar_new <> 0 THEN TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM CAST(i.collar_new AS CHAR))) END
        SEPARATOR '+'
      ) AS collar_new_list,

      GROUP_CONCAT(
        CASE WHEN i.collar_old <> 0 THEN TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM CAST(i.collar_old AS CHAR))) END
        SEPARATOR '+'
      ) AS collar_old_list,

      GROUP_CONCAT(
        CASE WHEN i.recede_new <> 0 THEN TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM CAST(i.recede_new AS CHAR))) END
        SEPARATOR '+'
      ) AS recede_new_list,

      GROUP_CONCAT(
        CASE WHEN i.recede_old <> 0 THEN TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM CAST(i.recede_old AS CHAR))) END
        SEPARATOR '+'
      ) AS recede_old_list,

      -- ===== 領退合計（先比照 A/C）=====
      (SUM(i.collar_new) - SUM(i.recede_new)) AS total_new,
      (SUM(i.collar_old) - SUM(i.recede_old)) AS total_old

    FROM mat_issue_items i
    LEFT JOIN mat_materials_sort_b msb
           ON msb.material_number = i.material_number
    WHERE i.withdraw_date = ?
      AND i.shift = 'B'
    GROUP BY i.material_number, msb.sort_order
    ORDER BY sort_order ASC, i.material_number ASC
  ";

  $st = $pdo->prepare($sql);
  $st->execute([$withdrawDate]);
  $rows = $st->fetchAll();

  // 補空字串（避免前端看到 null）
  foreach ($rows as &$r) {
    $r['collar_new_list'] = (string)($r['collar_new_list'] ?? '');
    $r['collar_old_list'] = (string)($r['collar_old_list'] ?? '');
    $r['recede_new_list'] = (string)($r['recede_new_list'] ?? '');
    $r['recede_old_list'] = (string)($r['recede_old_list'] ?? '');
  }
  unset($r);

  return [
    'B' => ['rows' => $rows],
  ];
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
    $data = mat_stats_b($d);

    json_ok([
      'withdraw_date' => $d,
      'group' => 'B',
      'groups' => $data
    ]);
  } catch (Throwable $e) {
    json_error($e->getMessage(), 500);
  }
}

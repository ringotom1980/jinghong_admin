<?php

/**
 * Path: app/services/VehicleRepairStatsService.php
 * 說明: 維修統計/聚合/列印資料組裝（嚴格：不做 CRUD、不拼 UI）
 */

declare(strict_types=1);

final class VehicleRepairStatsService
{
  private PDO $db;

  public function __construct(PDO $db)
  {
    $this->db = $db;
  }

  /** key -> [start,end] (Y-m-d) */
  public function keyToRange(string $key): array
  {
    $key = trim($key);

    if (preg_match('/^\d{4}$/', $key)) {
      $y = (int)$key;
      return [$y . '-01-01', $y . '-12-31'];
    }

    if (preg_match('/^(\d{4})-(H1|H2)$/', $key, $m)) {
      $y = (int)$m[1];
      $half = $m[2];
      if ($half === 'H1') return [$y . '-01-01', $y . '-06-30'];
      return [$y . '-07-01', $y . '-12-31'];
    }

    throw new InvalidArgumentException('Invalid key: ' . $key);
  }

  /** 近 N 年（含今年）且「有資料」的 capsules */
  public function getCapsules(int $years = 5): array
  {
    $years = max(1, min(10, $years));
    $curY = (int)date('Y');
    $minY = $curY - ($years - 1);

    // 取出近 N 年內各半年的 counts，避免多次查詢
    $sql = "
      SELECT
        YEAR(repair_date) AS y,
        CASE WHEN MONTH(repair_date) <= 6 THEN 'H1' ELSE 'H2' END AS h,
        COUNT(*) AS c
      FROM vehicle_repair_headers
      WHERE repair_date >= :minDate
      GROUP BY YEAR(repair_date), CASE WHEN MONTH(repair_date) <= 6 THEN 'H1' ELSE 'H2' END
    ";
    $stmt = $this->db->prepare($sql);
    $stmt->execute([':minDate' => sprintf('%d-01-01', $minY)]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $map = []; // [y][H1|H2] => count
    foreach ($rows as $r) {
      $y = (int)$r['y'];
      $h = (string)$r['h'];
      $c = (int)$r['c'];
      if ($y < $minY || $y > $curY) continue;
      if (!isset($map[$y])) $map[$y] = ['H1' => 0, 'H2' => 0];
      $map[$y][$h] = $c;
    }

    $capsules = [];
    for ($y = $curY; $y >= $minY; $y--) {
      $h1 = $map[$y]['H1'] ?? 0;
      $h2 = $map[$y]['H2'] ?? 0;
      $yearTotal = $h1 + $h2;

      // 規則：只顯示有資料的期間
      if ($yearTotal > 0) {
        $capsules[] = [
          'key' => (string)$y,
          'label' => $y . '-全年',
          'start' => $y . '-01-01',
          'end' => $y . '-12-31',
          'end_ts' => strtotime($y . '-12-31') ?: 0
        ];
      }
      if ($h1 > 0) {
        $capsules[] = [
          'key' => $y . '-H1',
          'label' => $y . '-上半年',
          'start' => $y . '-01-01',
          'end' => $y . '-06-30',
          'end_ts' => strtotime($y . '-06-30') ?: 0
        ];
      }
      if ($h2 > 0) {
        $capsules[] = [
          'key' => $y . '-H2',
          'label' => $y . '-下半年',
          'start' => $y . '-07-01',
          'end' => $y . '-12-31',
          'end_ts' => strtotime($y . '-12-31') ?: 0
        ];
      }
    }

    // 預設 activeKey：以 end_date 最新
    usort($capsules, function ($a, $b) {
      return (int)($b['end_ts'] ?? 0) <=> (int)($a['end_ts'] ?? 0);
    });

    return $capsules;
  }

  public function getDefaultKeyFromCapsules(array $capsules): string
  {
    if (!$capsules) return '';
    // capsules 已按 end_ts desc 排序
    return (string)($capsules[0]['key'] ?? '');
  }

  /** 左側彙總 + Top3 */
  public function getSummary(string $key): array
  {
    [$start, $end] = $this->keyToRange($key);

    $sql = "
      SELECT
        v.id AS vehicle_id,
        v.vehicle_code,
        v.plate_no,
        COUNT(h.id) AS `count`,
        COALESCE(SUM(h.company_amount_total),0) AS company_amount_total,
        COALESCE(SUM(h.team_amount_total),0) AS team_amount_total,
        COALESCE(SUM(h.grand_total),0) AS grand_total
      FROM vehicle_repair_headers h
      JOIN vehicle_vehicles v ON v.id = h.vehicle_id
      WHERE h.repair_date BETWEEN :s AND :e
      GROUP BY v.id, v.vehicle_code, v.plate_no
      ORDER BY `count` DESC, grand_total DESC, v.vehicle_code ASC
    ";
    $stmt = $this->db->prepare($sql);
    $stmt->execute([':s' => $start, ':e' => $end]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$rows) return [];

    // Top3：每車限定期間、content group count >=3 取前三（不回次數）
    foreach ($rows as &$r) {
      $vid = (int)$r['vehicle_id'];
      $r['top3'] = $this->getTop3($key, $vid);
    }
    unset($r);

    return $rows;
  }

  /** 右側明細（以 headers 為一列，內容由 items 組合） */
  public function getDetails(string $key, int $vehicleId): array
  {
    [$start, $end] = $this->keyToRange($key);

    $sql = "
  SELECT
    v.vehicle_code,
    DATE_FORMAT(h.repair_date, '%Y-%m-%d') AS repair_date,
    COALESCE(vd.name, '') AS vendor_name,
    COALESCE(h.repair_type, '') AS repair_type,
    COALESCE(
      GROUP_CONCAT(
        CONCAT(
          i.content,
          '(公司',
          CAST(ROUND(COALESCE(i.company_amount,0), 0) AS UNSIGNED),
          '、工班',
          CAST(ROUND(COALESCE(i.team_amount,0), 0) AS UNSIGNED),
          ')'
        )
        ORDER BY i.seq, i.id
        SEPARATOR '\n'
      ),
      ''
    ) AS detail,
    h.company_amount_total,
    h.team_amount_total,
    h.grand_total
  FROM vehicle_repair_headers h
  JOIN vehicle_vehicles v ON v.id = h.vehicle_id
  LEFT JOIN vehicle_repair_vendors vd ON vd.id = h.vendor_id
  LEFT JOIN vehicle_repair_items i ON i.repair_id = h.id
  WHERE h.vehicle_id = :vid
    AND h.repair_date BETWEEN :s AND :e
  GROUP BY
    h.id, v.vehicle_code, h.repair_date, vd.name, h.repair_type,
    h.company_amount_total, h.team_amount_total, h.grand_total
  ORDER BY h.repair_date DESC, h.id DESC
";

    $stmt = $this->db->prepare($sql);
    $stmt->execute([':vid' => $vehicleId, ':s' => $start, ':e' => $end]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
  }

  /** Top3：count>=3 才算，最多3筆，不足則少顯 */
  private function getTop3(string $key, int $vehicleId): array
  {
    [$start, $end] = $this->keyToRange($key);

    // MariaDB 11.8 支援 REGEXP_REPLACE：統一空白（含全形空白）
    $sql = "
      SELECT
        norm_content AS content,
        c
      FROM (
        SELECT
          REGEXP_REPLACE(REPLACE(TRIM(i.content), '　', ' '), '[[:space:]]+', ' ') AS norm_content,
          COUNT(*) AS c
        FROM vehicle_repair_headers h
        JOIN vehicle_repair_items i ON i.repair_id = h.id
        WHERE h.vehicle_id = :vid
          AND h.repair_date BETWEEN :s AND :e
          AND i.content IS NOT NULL
          AND TRIM(i.content) <> ''
        GROUP BY norm_content
      ) t
      WHERE c >= 3
      ORDER BY c DESC, content ASC
      LIMIT 3
    ";
    $stmt = $this->db->prepare($sql);
    $stmt->execute([':vid' => $vehicleId, ':s' => $start, ':e' => $end]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $out = [];
    foreach ($rows as $r) {
      $out[] = (string)$r['content'];
    }
    return $out;
  }

  /** 列印：跨車跨月份矩陣（回傳 months + rows） */
  public function getPrintSummary(string $key): array
  {
    [$start, $end] = $this->keyToRange($key);
    $months = $this->monthsInRange($start, $end); // ["YYYY-MM", ...]

    $sql = "
      SELECT
        v.id AS vehicle_id,
        v.vehicle_code,
        v.plate_no,
        YEAR(h.repair_date) AS y,
        MONTH(h.repair_date) AS m,
        COALESCE(SUM(h.company_amount_total),0) AS company_sum,
        COALESCE(SUM(h.team_amount_total),0) AS team_sum,
        COALESCE(SUM(h.grand_total),0) AS grand_sum
      FROM vehicle_repair_headers h
      JOIN vehicle_vehicles v ON v.id = h.vehicle_id
      WHERE h.repair_date BETWEEN :s AND :e
      GROUP BY v.id, v.vehicle_code, v.plate_no, YEAR(h.repair_date), MONTH(h.repair_date)
      ORDER BY v.vehicle_code ASC
    ";
    $stmt = $this->db->prepare($sql);
    $stmt->execute([':s' => $start, ':e' => $end]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    // 組成 per vehicle 的 by_month
    $map = []; // vehicle_id => row
    foreach ($rows as $r) {
      $vid = (int)$r['vehicle_id'];
      if (!isset($map[$vid])) {
        $map[$vid] = [
          'vehicle_id' => $vid,
          'vehicle_code' => $r['vehicle_code'] ?? '',
          'plate_no' => $r['plate_no'] ?? '',
          'by_month' => [],
          'company_total' => 0,
          'team_total' => 0,
          'grand_total' => 0,
        ];
        foreach ($months as $mm) {
          $map[$vid]['by_month'][$mm] = ['company_total' => 0, 'team_total' => 0, 'grand_total' => 0];
        }
      }

      $mm = sprintf('%04d-%02d', (int)$r['y'], (int)$r['m']);
      if (!isset($map[$vid]['by_month'][$mm])) continue;

      $c = (float)$r['company_sum'];
      $t = (float)$r['team_sum'];
      $g = (float)$r['grand_sum'];

      $map[$vid]['by_month'][$mm] = [
        'company_total' => $c,
        'team_total' => $t,
        'grand_total' => $g
      ];
      $map[$vid]['company_total'] += $c;
      $map[$vid]['team_total'] += $t;
      $map[$vid]['grand_total'] += $g;
    }

    $outRows = array_values($map);

    return [
      'type' => 'summary',
      'title' => '境宏工程有限公司-維修統計表(' . $this->keyToLabel($key) . ')',
      'key' => $key,
      'months' => $months,
      'rows' => $outRows
    ];
  }

  /** 列印：各車明細（每車一段） */
  public function getPrintAllVehicleDetails(string $key): array
  {
    [$start, $end] = $this->keyToRange($key);

    $vsql = "
      SELECT DISTINCT v.id, v.vehicle_code, v.plate_no
      FROM vehicle_repair_headers h
      JOIN vehicle_vehicles v ON v.id = h.vehicle_id
      WHERE h.repair_date BETWEEN :s AND :e
      ORDER BY v.vehicle_code ASC
    ";
    $stmt = $this->db->prepare($vsql);
    $stmt->execute([':s' => $start, ':e' => $end]);
    $vehicles = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $out = [];
    foreach ($vehicles as $v) {
      $vid = (int)$v['id'];
      $out[] = [
        'vehicle_id' => $vid,
        'vehicle_code' => $v['vehicle_code'] ?? '',
        'plate_no' => $v['plate_no'] ?? '',
        'rows' => $this->getDetails($key, $vid)
      ];
    }

    return [
      'type' => 'all_details',
      'title' => '境宏工程有限公司-各車維修明細表(' . $this->keyToLabel($key) . ')',
      'key' => $key,
      'vehicles' => $out
    ];
  }

  /** 列印：單車明細 */
  public function getPrintVehicleDetails(string $key, int $vehicleId): array
  {
    [$start, $end] = $this->keyToRange($key);

    $vsql = "SELECT id, vehicle_code, plate_no FROM vehicle_vehicles WHERE id = :id LIMIT 1";
    $stmt = $this->db->prepare($vsql);
    $stmt->execute([':id' => $vehicleId]);
    $v = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$v) throw new RuntimeException('找不到車輛');

    return [
      'type' => 'vehicle_details',
      'title' => '境宏工程有限公司-單車維修明細（' . ($v['vehicle_code'] ?? '') . '｜' . $this->keyToLabel($key) . '）',
      'key' => $key,
      'vehicle' => [
        'vehicle_id' => (int)$v['id'],
        'vehicle_code' => $v['vehicle_code'] ?? '',
        'plate_no' => $v['plate_no'] ?? '',
      ],
      'rows' => $this->getDetails($key, $vehicleId)
    ];
  }

  private function monthsInRange(string $start, string $end): array
  {
    $s = new DateTimeImmutable($start . ' 00:00:00');
    $e = new DateTimeImmutable($end . ' 00:00:00');

    $months = [];
    $cur = new DateTimeImmutable($s->format('Y-m-01') . ' 00:00:00');

    while ($cur <= $e) {
      $months[] = $cur->format('Y-m');
      $cur = $cur->modify('+1 month');
    }
    return $months;
  }

    private function keyToLabel(string $key): string
  {
    if (preg_match('/^\d{4}$/', $key)) return $key . '-全年';
    if (preg_match('/^(\d{4})-(H1|H2)$/', $key, $m)) {
      return $m[1] . '-' . ($m[2] === 'H1' ? '上半年' : '下半年');
    }
    return $key;
  }

}

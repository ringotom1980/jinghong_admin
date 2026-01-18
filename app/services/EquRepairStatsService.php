<?php

/**
 * Path: app/services/EquRepairStatsService.php
 * 說明: 工具維修統計/聚合/列印資料組裝（嚴格：不做 CRUD、不拼 UI）
 *
 * tables:
 * - equ_repair_headers (tool_id, repair_date, vendor_id, repair_type, team_amount_total, company_amount_total, grand_total)
 * - equ_repair_items   (repair_id, seq, content, team_amount, company_amount)
 * - equ_tools          (id, name)
 * - equ_vendors        (id, name)
 */

declare(strict_types=1);

final class EquRepairStatsService
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

    /** 近 N 年（含今年）且「有資料」的 capsules（只看 equ_repair_headers.repair_date） */
    public function getCapsules(int $years = 5): array
    {
        $years = max(1, min(10, $years));
        $curY = (int)date('Y');
        $minY = $curY - ($years - 1);

        $sql = "
      SELECT
        YEAR(repair_date) AS y,
        CASE WHEN MONTH(repair_date) <= 6 THEN 'H1' ELSE 'H2' END AS h,
        COUNT(*) AS c
      FROM equ_repair_headers
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
        return (string)($capsules[0]['key'] ?? '');
    }

    /** 左側彙總 + Top3（以工具為一列） */
    public function getSummary(string $key): array
    {
        [$start, $end] = $this->keyToRange($key);

        $sql = "
      SELECT
        t.id AS tool_id,
        t.name AS tool_name,
        COUNT(h.id) AS `count`,
        COALESCE(SUM(h.company_amount_total),0) AS company_amount_total,
        COALESCE(SUM(h.team_amount_total),0) AS team_amount_total,
        COALESCE(SUM(h.grand_total),0) AS grand_total
      FROM equ_repair_headers h
      JOIN equ_tools t ON t.id = h.tool_id
      WHERE h.repair_date BETWEEN :s AND :e
      GROUP BY t.id, t.name
      ORDER BY `count` DESC, grand_total DESC, t.name ASC
    ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':s' => $start, ':e' => $end]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$rows) return [];

        foreach ($rows as &$r) {
            $tid = (int)$r['tool_id'];
            $r['top3'] = $this->getTop3($key, $tid);
        }
        unset($r);

        return $rows;
    }

    /** 右側明細（以 headers 為一列，內容由 items 組合） */
    public function getDetails(string $key, int $toolId): array
    {
        [$start, $end] = $this->keyToRange($key);

        $sql = "
      SELECT
        t.name AS tool_name,
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
      FROM equ_repair_headers h
      JOIN equ_tools t ON t.id = h.tool_id
      LEFT JOIN equ_vendors vd ON vd.id = h.vendor_id
      LEFT JOIN equ_repair_items i ON i.repair_id = h.id
      WHERE h.tool_id = :tid
        AND h.repair_date BETWEEN :s AND :e
      GROUP BY
        h.id, t.name, h.repair_date, vd.name, h.repair_type,
        h.company_amount_total, h.team_amount_total, h.grand_total
      ORDER BY h.repair_date DESC, h.id DESC
    ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':tid' => $toolId, ':s' => $start, ':e' => $end]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** Top3：count>=3 才算，最多3筆，不足則少顯 */
    private function getTop3(string $key, int $toolId): array
    {
        [$start, $end] = $this->keyToRange($key);

        $sql = "
      SELECT
        norm_content AS content,
        c
      FROM (
        SELECT
          REGEXP_REPLACE(REPLACE(TRIM(i.content), '　', ' '), '[[:space:]]+', ' ') AS norm_content,
          COUNT(*) AS c
        FROM equ_repair_headers h
        JOIN equ_repair_items i ON i.repair_id = h.id
        WHERE h.tool_id = :tid
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
        $stmt->execute([':tid' => $toolId, ':s' => $start, ':e' => $end]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $out = [];
        foreach ($rows as $r) $out[] = (string)$r['content'];
        return $out;
    }

    /** 列印：廠商 × 月份矩陣（對齊你截圖） */
    public function getPrintVendorMatrix(string $key): array
    {
        [$start, $end] = $this->keyToRange($key);
        $months = $this->monthsInRange($start, $end); // ["YYYY-MM", ...]

        $sql = "
  SELECT
    vd.id AS vendor_id,
    vd.name AS vendor_name,
    YEAR(h.repair_date) AS y,
    MONTH(h.repair_date) AS m,
    COALESCE(SUM(h.team_amount_total),0) AS team_sum,
    COALESCE(SUM(h.company_amount_total),0) AS company_sum,
    COALESCE(SUM(h.grand_total),0) AS grand_sum
  FROM equ_repair_headers h
  LEFT JOIN equ_vendors vd ON vd.id = h.vendor_id
  WHERE h.repair_date BETWEEN :s AND :e
  GROUP BY vd.id, vd.name, YEAR(h.repair_date), MONTH(h.repair_date)
  ORDER BY vendor_name ASC
";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':s' => $start, ':e' => $end]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $map = []; // vendor_id => row
        foreach ($rows as $r) {
            $vid = (int)($r['vendor_id'] ?? 0);
            $vname = (string)($r['vendor_name'] ?? '');
            $keyId = $vid > 0 ? $vid : ('0:' . $vname); // 避免 NULL vendor 合併錯

            if (!isset($map[$keyId])) {
                $map[$keyId] = [
                    'vendor_id' => $vid > 0 ? $vid : null,
                    'vendor_name' => $vname,
                    'by_month' => [],
                    'team_total' => 0,
                    'company_total' => 0,
                    'grand_total' => 0,
                ];
                foreach ($months as $mm) {
                    $map[$keyId]['by_month'][$mm] = [
                        'team_total' => 0,
                        'company_total' => 0,
                        'grand_total' => 0
                    ];
                }
            }

            $mm = sprintf('%04d-%02d', (int)$r['y'], (int)$r['m']);
            if (!isset($map[$keyId]['by_month'][$mm])) continue;

            $t = (float)$r['team_sum'];
            $c = (float)$r['company_sum'];
            $g = (float)$r['grand_sum'];

            $map[$keyId]['by_month'][$mm] = [
                'team_total' => $t,
                'company_total' => $c,
                'grand_total' => $g
            ];

            $map[$keyId]['team_total'] += $t;
            $map[$keyId]['company_total'] += $c;
            $map[$keyId]['grand_total'] += $g;
        }

        $outRows = array_values($map);

        return [
            'type' => 'print_summary',
            'title' => '境宏工程有限公司-工具維修統計表(' . $this->keyToLabel($key) . ')',
            'key' => $key,
            'label' => $this->keyToLabel($key),
            'period_text' => $this->keyToPeriodText($key), // 例如：2025年上半年(1-6月)
            'months' => $months,
            'rows' => $outRows
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

    /** 給列印表頭用：2025年上半年(1-6月) / 2025年下半年(7-12月) / 2025年全年(1-12月) */
    private function keyToPeriodText(string $key): string
    {
        if (preg_match('/^(\d{4})$/', $key, $m)) {
            return $m[1] . '年全年(1-12月)';
        }
        if (preg_match('/^(\d{4})-(H1|H2)$/', $key, $m)) {
            return $m[1] . '年' . ($m[2] === 'H1' ? '上半年(1-6月)' : '下半年(7-12月)');
        }
        return $key;
    }
}

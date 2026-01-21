<?php

/**
 * Path: app/services/EquipmentService.php
 * 說明: 工具管理服務（工具字典 / 廠商字典 / 維修-保養-購買-租賃）
 *
 * DB tables:
 * - equ_tools
 * - equ_vendors
 * - equ_repair_headers
 * - equ_repair_items
 */

declare(strict_types=1);

final class EquipmentService
{
  /**
   * dicts：給前端 datalist 初始資料（最近常用工具/廠商）
   */
  public static function getDicts(): array
  {
    $pdo = db();

    $tools = $pdo->query("
      SELECT id, name, is_active, use_count, last_used_at
      FROM equ_tools
      WHERE is_active = 1
      ORDER BY use_count DESC, last_used_at DESC, id DESC
      LIMIT 50
    ")->fetchAll();

    $vendors = $pdo->query("
      SELECT id, name, is_active, use_count, last_used_at
      FROM equ_vendors
      WHERE is_active = 1
      ORDER BY use_count DESC, last_used_at DESC, id DESC
      LIMIT 50
    ")->fetchAll();

    return [
      'tools' => $tools,
      'vendors' => $vendors,
      'repair_types' => ['維修', '保養', '購買', '租賃'],
    ];
  }

  /* ================================
   * Repairs（列表/時間膠囊/CRUD）
   * ================================ */

  public static function equRepairList(array $filters = []): array
  {
    $pdo = db();

    $key = isset($filters['key']) ? trim((string)$filters['key']) : '';

    $where = '';
    $params = [];

    // key: YYYY-H1 / YYYY-H2 / YYYY
    if ($key !== '') {
      if (preg_match('/^(\d{4})-(H1|H2)$/', $key, $m)) {
        $y = (int)$m[1];
        $h = (string)$m[2];
        $start = ($h === 'H1') ? sprintf('%04d-01-01', $y) : sprintf('%04d-07-01', $y);
        $end   = ($h === 'H1') ? sprintf('%04d-06-30', $y) : sprintf('%04d-12-31', $y);

        $where = 'WHERE h.repair_date BETWEEN ? AND ?';
        $params = [$start, $end];
      } else if (preg_match('/^\d{4}$/', $key)) {
        $y = (int)$key;
        $start = sprintf('%04d-01-01', $y);
        $end   = sprintf('%04d-12-31', $y);

        $where = 'WHERE h.repair_date BETWEEN ? AND ?';
        $params = [$start, $end];
      }
    }

    $sql = "
      SELECT
        h.id,
        h.tool_id,
        t.name AS tool_name,
        h.vendor_id,
        v.name AS vendor_name,
        h.repair_date,
        h.repair_type,
        h.note,
        h.team_amount_total,
        h.company_amount_total,
        h.grand_total
      FROM equ_repair_headers h
      JOIN equ_tools t ON t.id = h.tool_id
      JOIN equ_vendors v ON v.id = h.vendor_id
      {$where}
      ORDER BY h.repair_date DESC, h.id DESC
    ";

    if ($params) {
      $st = $pdo->prepare($sql);
      $st->execute($params);
      $rows = $st->fetchAll();
    } else {
      $rows = $pdo->query($sql)->fetchAll();
    }

    if (!$rows) return ['rows' => []];

    // items summary + tooltip
    $ids = array_map(static fn($r) => (int)$r['id'], $rows);
    $in = implode(',', array_fill(0, count($ids), '?'));

    $st2 = $pdo->prepare("
      SELECT repair_id, seq, content, team_amount, company_amount
      FROM equ_repair_items
      WHERE repair_id IN ($in)
      ORDER BY repair_id ASC, seq ASC, id ASC
    ");
    foreach ($ids as $i => $id) $st2->bindValue($i + 1, $id, PDO::PARAM_INT);
    $st2->execute();
    $items = $st2->fetchAll();

    $map = []; // rid => ['contents'=>[], 'tooltip_lines'=>[]]
    foreach ($items as $it) {
      $rid = (int)$it['repair_id'];
      if (!isset($map[$rid])) $map[$rid] = ['contents' => [], 'tooltip_lines' => []];

      $content = (string)($it['content'] ?? '');
      $team = (float)($it['team_amount'] ?? 0);
      $comp = (float)($it['company_amount'] ?? 0);

      $map[$rid]['contents'][] = $content;

      $map[$rid]['tooltip_lines'][] =
        $content . '(公司' . (string)round($comp) . '、工班' . (string)round($team) . ')';
    }

    foreach ($rows as &$r) {
      $rid = (int)$r['id'];
      $pack = $map[$rid] ?? ['contents' => [], 'tooltip_lines' => []];

      $arr = $pack['contents'] ?? [];
      $lines = $pack['tooltip_lines'] ?? [];

      $N = 3;
      $summary = '';
      if ($arr) {
        $pick = array_slice($arr, 0, $N);
        $summary = implode('、', $pick);
        if (count($arr) > $N) $summary .= '…';
      }
      $r['items_summary'] = $summary;
      $r['items_tooltip'] = $lines ? implode("\n", $lines) : '';
    }
    unset($r);

    return ['rows' => $rows];
  }

  public static function equRepairCapsules(): array
  {
    $pdo = db();

    $yNow = (int)date('Y');

    $rows = $pdo->query("
      SELECT
        YEAR(repair_date) AS y,
        CASE WHEN MONTH(repair_date) <= 6 THEN 1 ELSE 2 END AS h,
        COUNT(*) AS cnt,
        MIN(repair_date) AS min_d,
        MAX(repair_date) AS max_d
      FROM equ_repair_headers
      GROUP BY YEAR(repair_date), CASE WHEN MONTH(repair_date) <= 6 THEN 1 ELSE 2 END
      ORDER BY y DESC, h DESC
    ")->fetchAll();

    if (!$rows) return ['capsules' => []];

    $cur = ['H1' => null, 'H2' => null];
    $years = []; // y => ['cnt'=>, 'min'=>, 'max'=>]

    foreach ($rows as $r) {
      $y = (int)$r['y'];
      $h = ((int)$r['h'] === 1) ? 'H1' : 'H2';
      $cnt = (int)$r['cnt'];
      $min = (string)$r['min_d'];
      $max = (string)$r['max_d'];

      if ($y === $yNow) {
        $cur[$h] = ['cnt' => $cnt, 'min' => $min, 'max' => $max];
      } else {
        if (!isset($years[$y])) {
          $years[$y] = ['cnt' => 0, 'min' => $min, 'max' => $max];
        }
        $years[$y]['cnt'] += $cnt;
        if ($min !== '' && $years[$y]['min'] !== '' && $min < $years[$y]['min']) $years[$y]['min'] = $min;
        if ($max !== '' && $years[$y]['max'] !== '' && $max > $years[$y]['max']) $years[$y]['max'] = $max;
      }
    }

    $caps = [];

    if ($cur['H2'] && $cur['H2']['cnt'] > 0) {
      $caps[] = [
        'key' => $yNow . '-H2',
        'label' => $yNow . '下半年',
        'count' => (int)$cur['H2']['cnt'],
        'start' => $yNow . '-07-01',
        'end' => $yNow . '-12-31',
        'is_default' => 1
      ];
    }
    if ($cur['H1'] && $cur['H1']['cnt'] > 0) {
      $caps[] = [
        'key' => $yNow . '-H1',
        'label' => $yNow . '上半年',
        'count' => (int)$cur['H1']['cnt'],
        'start' => $yNow . '-01-01',
        'end' => $yNow . '-06-30',
        'is_default' => (count($caps) === 0) ? 1 : 0
      ];
    }

    krsort($years);
    foreach ($years as $y => $info) {
      $caps[] = [
        'key' => (string)$y,
        'label' => $y . '年',
        'count' => (int)$info['cnt'],
        'start' => $y . '-01-01',
        'end' => $y . '-12-31',
        'is_default' => (count($caps) === 0) ? 1 : 0
      ];
    }

    if ($caps) {
      $hasDefault = false;
      foreach ($caps as $c) {
        if (!empty($c['is_default'])) {
          $hasDefault = true;
          break;
        }
      }
      if (!$hasDefault) $caps[0]['is_default'] = 1;
    }

    return ['capsules' => $caps];
  }

  public static function equRepairGet(int $repairId): array
  {
    $pdo = db();

    $st = $pdo->prepare("
      SELECT
        h.id,
        h.tool_id,
        t.name AS tool_name,
        h.vendor_id,
        v.name AS vendor_name,
        h.repair_date,
        h.repair_type,
        h.note
      FROM equ_repair_headers h
      JOIN equ_tools t ON t.id = h.tool_id
      JOIN equ_vendors v ON v.id = h.vendor_id
      WHERE h.id = ?
      LIMIT 1
    ");
    $st->execute([$repairId]);
    $h = $st->fetch();
    if (!$h) throw new RuntimeException('找不到該筆紀錄');

    $itemsSt = $pdo->prepare("
      SELECT seq, content, team_amount, company_amount
      FROM equ_repair_items
      WHERE repair_id = ?
      ORDER BY seq ASC, id ASC
    ");
    $itemsSt->execute([$repairId]);
    $items = $itemsSt->fetchAll();

    return [
      'header' => [
        'id' => (int)$h['id'],
        'repair_date' => (string)$h['repair_date'],
        'repair_type' => (string)$h['repair_type'],
        'tool' => (string)$h['tool_name'],
        'vendor' => (string)$h['vendor_name'],
        'note' => (string)($h['note'] ?? ''),
      ],
      'items' => array_map(static function ($it) {
        return [
          'seq' => (int)$it['seq'],
          'content' => (string)$it['content'],
          'company_amount' => (float)$it['company_amount'],
          'team_amount' => (float)$it['team_amount'],
        ];
      }, $items)
    ];
  }

  public static function equRepairSave(array $payload): array
  {
    $pdo = db();

    $id = isset($payload['id']) ? (int)$payload['id'] : 0;
    $header = (isset($payload['header']) && is_array($payload['header'])) ? $payload['header'] : [];
    $items = (isset($payload['items']) && is_array($payload['items'])) ? $payload['items'] : [];

    $repairDate = isset($header['repair_date']) ? trim((string)$header['repair_date']) : '';
    $repairType = isset($header['repair_type']) ? trim((string)$header['repair_type']) : '維修';
    $tool = isset($header['tool']) ? trim((string)$header['tool']) : '';
    $vendor = isset($header['vendor']) ? trim((string)$header['vendor']) : '';
    $note = isset($header['note']) ? trim((string)$header['note']) : '';

    if ($repairDate === '') throw new RuntimeException('請選擇日期');
    if ($tool === '') throw new RuntimeException('請輸入機具名稱');
    if ($vendor === '') throw new RuntimeException('請輸入廠商');
    if ($repairType !== '維修' && $repairType !== '保養' && $repairType !== '購買' && $repairType !== '租賃') {
      throw new RuntimeException('類型不正確');
    }
    if (!$items) throw new RuntimeException('請至少新增 1 筆明細');

    $toolId = self::toolUpsert($tool)['tool_id'];
    $vendorId = self::vendorUpsert($vendor)['vendor_id'];

    $normItems = [];
    $teamTotal = 0.0;
    $companyTotal = 0.0;

    foreach ($items as $idx => $it) {
      if (!is_array($it)) continue;

      $seq = isset($it['seq']) ? (int)$it['seq'] : ($idx + 1);
      $content = isset($it['content']) ? trim((string)$it['content']) : '';
      if ($content === '') throw new RuntimeException('明細第 ' . ($idx + 1) . ' 筆：項目內容不可空白');

      $comp = isset($it['company_amount']) ? (float)$it['company_amount'] : 0.0;
      $team = isset($it['team_amount']) ? (float)$it['team_amount'] : 0.0;

      $companyTotal += $comp;
      $teamTotal += $team;

      $normItems[] = [
        'seq' => $seq,
        'content' => $content,
        'company_amount' => $comp,
        'team_amount' => $team,
      ];
    }

    if (!$normItems) throw new RuntimeException('明細資料不正確');

    usort($normItems, static fn($a, $b) => ($a['seq'] <=> $b['seq']));

    $grandTotal = $companyTotal + $teamTotal;

    $pdo->beginTransaction();
    try {
      if ($id <= 0) {
        $st = $pdo->prepare("
          INSERT INTO equ_repair_headers
            (tool_id, repair_date, vendor_id, repair_type, note,
             team_amount_total, company_amount_total, grand_total)
          VALUES
            (:tool_id, :repair_date, :vendor_id, :repair_type, :note,
             :team_total, :company_total, :grand_total)
        ");
        $st->execute([
          ':tool_id' => $toolId,
          ':repair_date' => $repairDate,
          ':vendor_id' => $vendorId,
          ':repair_type' => $repairType,
          ':note' => ($note === '') ? null : $note,
          ':team_total' => number_format($teamTotal, 2, '.', ''),
          ':company_total' => number_format($companyTotal, 2, '.', ''),
          ':grand_total' => number_format($grandTotal, 2, '.', ''),
        ]);
        $id = (int)$pdo->lastInsertId();
      } else {
        $st = $pdo->prepare("
          UPDATE equ_repair_headers
          SET
            tool_id = :tool_id,
            repair_date = :repair_date,
            vendor_id = :vendor_id,
            repair_type = :repair_type,
            note = :note,
            team_amount_total = :team_total,
            company_amount_total = :company_total,
            grand_total = :grand_total
          WHERE id = :id
          LIMIT 1
        ");
        $st->execute([
          ':tool_id' => $toolId,
          ':repair_date' => $repairDate,
          ':vendor_id' => $vendorId,
          ':repair_type' => $repairType,
          ':note' => ($note === '') ? null : $note,
          ':team_total' => number_format($teamTotal, 2, '.', ''),
          ':company_total' => number_format($companyTotal, 2, '.', ''),
          ':grand_total' => number_format($grandTotal, 2, '.', ''),
          ':id' => $id,
        ]);

        $del = $pdo->prepare("DELETE FROM equ_repair_items WHERE repair_id = ?");
        $del->execute([$id]);
      }

      $ins = $pdo->prepare("
        INSERT INTO equ_repair_items
          (repair_id, seq, content, team_amount, company_amount)
        VALUES
          (:repair_id, :seq, :content, :team_amount, :company_amount)
      ");
      foreach ($normItems as $it) {
        $ins->execute([
          ':repair_id' => $id,
          ':seq' => (int)$it['seq'],
          ':content' => (string)$it['content'],
          ':team_amount' => number_format((float)$it['team_amount'], 2, '.', ''),
          ':company_amount' => number_format((float)$it['company_amount'], 2, '.', ''),
        ]);
      }

      $pdo->commit();
    } catch (Throwable $e) {
      $pdo->rollBack();
      throw $e;
    }

    return [
      'id' => $id,
      'team_amount_total' => number_format($teamTotal, 2, '.', ''),
      'company_amount_total' => number_format($companyTotal, 2, '.', ''),
      'grand_total' => number_format($grandTotal, 2, '.', ''),
    ];
  }

  public static function equRepairDelete(int $repairId): array
  {
    $pdo = db();

    $st0 = $pdo->prepare("SELECT id FROM equ_repair_headers WHERE id = ? LIMIT 1");
    $st0->execute([$repairId]);
    if (!$st0->fetchColumn()) throw new RuntimeException('找不到該筆紀錄');

    $st = $pdo->prepare("DELETE FROM equ_repair_headers WHERE id = ? LIMIT 1");
    $st->execute([$repairId]);

    return ['id' => $repairId];
  }

  /* ================================
   * Suggest / Upsert（datalist）
   * ================================ */

  public static function toolSuggest(string $q): array
  {
    $pdo = db();
    $q = trim($q);

    // ✅ 空字串：回常用/最近（focus 就要出清單）
    if ($q === '') {
      $st = $pdo->prepare("
      SELECT id, name, use_count, last_used_at
      FROM equ_tools
      WHERE is_active = 1
      ORDER BY use_count DESC, last_used_at DESC, id DESC
      LIMIT 10
    ");
      $st->execute();
      return ['rows' => $st->fetchAll()];
    }

    // 純數字：不做模糊查詢（避免用 id 查詢造成誤判）
    if (preg_match('/^\d+$/', $q)) {
      return ['rows' => []];
    }

    $st = $pdo->prepare("
    SELECT id, name, use_count, last_used_at
    FROM equ_tools
    WHERE is_active = 1
      AND name LIKE ?
    ORDER BY use_count DESC, last_used_at DESC, id DESC
    LIMIT 10
  ");
    $st->execute(['%' . $q . '%']);
    return ['rows' => $st->fetchAll()];
  }

  public static function vendorSuggest(string $q): array
  {
    $pdo = db();
    $q = trim($q);

    // ✅ 空字串：回常用/最近
    if ($q === '') {
      $st = $pdo->prepare("
      SELECT id, name, use_count, last_used_at
      FROM equ_vendors
      WHERE is_active = 1
      ORDER BY use_count DESC, last_used_at DESC, id DESC
      LIMIT 10
    ");
      $st->execute();
      return ['rows' => $st->fetchAll()];
    }

    if (preg_match('/^\d+$/', $q)) {
      return ['rows' => []];
    }

    $st = $pdo->prepare("
    SELECT id, name, use_count, last_used_at
    FROM equ_vendors
    WHERE is_active = 1
      AND name LIKE ?
    ORDER BY use_count DESC, last_used_at DESC, id DESC
    LIMIT 10
  ");
    $st->execute(['%' . $q . '%']);
    return ['rows' => $st->fetchAll()];
  }

  public static function toolUpsert(string $nameOrId): array
  {
    $pdo = db();
    $v = trim($nameOrId);
    if ($v === '') throw new RuntimeException('tool 不可空白');

    // 純數字：先當 id；不存在則當 name 建立
    if (preg_match('/^\d+$/', $v)) {
      $id = (int)$v;

      $st = $pdo->prepare("SELECT id, name FROM equ_tools WHERE id = ? LIMIT 1");
      $st->execute([$id]);
      $row = $st->fetch();
      if ($row) {
        $upd = $pdo->prepare("
          UPDATE equ_tools
          SET use_count = use_count + 1,
              last_used_at = CURRENT_TIMESTAMP(),
              is_active = 1
          WHERE id = ?
          LIMIT 1
        ");
        $upd->execute([(int)$row['id']]);

        return ['tool_id' => (int)$row['id'], 'tool_name' => (string)$row['name']];
      }

      $v = (string)$v; // 改當 name 建立
    }

    $pdo->beginTransaction();
    try {
      $st = $pdo->prepare("SELECT id, name FROM equ_tools WHERE name = ? LIMIT 1");
      $st->execute([$v]);
      $row = $st->fetch();

      if ($row) {
        $id = (int)$row['id'];
        $upd = $pdo->prepare("
          UPDATE equ_tools
          SET use_count = use_count + 1,
              last_used_at = CURRENT_TIMESTAMP(),
              is_active = 1
          WHERE id = ?
          LIMIT 1
        ");
        $upd->execute([$id]);
        $pdo->commit();
        return ['tool_id' => $id, 'tool_name' => (string)$row['name']];
      }

      $ins = $pdo->prepare("
        INSERT INTO equ_tools (name, is_active, use_count, last_used_at)
        VALUES (:name, 1, 1, CURRENT_TIMESTAMP())
      ");
      $ins->execute([':name' => $v]);

      $id = (int)$pdo->lastInsertId();
      $pdo->commit();
      return ['tool_id' => $id, 'tool_name' => $v];
    } catch (Throwable $e) {
      $pdo->rollBack();
      throw $e;
    }
  }

  public static function vendorUpsert(string $nameOrId): array
  {
    $pdo = db();
    $v = trim($nameOrId);
    if ($v === '') throw new RuntimeException('vendor 不可空白');

    // 純數字：先當 id；不存在則當 name 建立
    if (preg_match('/^\d+$/', $v)) {
      $id = (int)$v;

      $st = $pdo->prepare("SELECT id, name FROM equ_vendors WHERE id = ? LIMIT 1");
      $st->execute([$id]);
      $row = $st->fetch();
      if ($row) {
        $upd = $pdo->prepare("
          UPDATE equ_vendors
          SET use_count = use_count + 1,
              last_used_at = CURRENT_TIMESTAMP(),
              is_active = 1
          WHERE id = ?
          LIMIT 1
        ");
        $upd->execute([(int)$row['id']]);

        return ['vendor_id' => (int)$row['id'], 'vendor_name' => (string)$row['name']];
      }

      $v = (string)$v; // 改當 name 建立
    }

    $pdo->beginTransaction();
    try {
      $st = $pdo->prepare("SELECT id, name FROM equ_vendors WHERE name = ? LIMIT 1");
      $st->execute([$v]);
      $row = $st->fetch();

      if ($row) {
        $id = (int)$row['id'];
        $upd = $pdo->prepare("
          UPDATE equ_vendors
          SET use_count = use_count + 1,
              last_used_at = CURRENT_TIMESTAMP(),
              is_active = 1
          WHERE id = ?
          LIMIT 1
        ");
        $upd->execute([$id]);
        $pdo->commit();
        return ['vendor_id' => $id, 'vendor_name' => (string)$row['name']];
      }

      $ins = $pdo->prepare("
        INSERT INTO equ_vendors (name, is_active, use_count, last_used_at)
        VALUES (:name, 1, 1, CURRENT_TIMESTAMP())
      ");
      $ins->execute([':name' => $v]);

      $id = (int)$pdo->lastInsertId();
      $pdo->commit();
      return ['vendor_id' => $id, 'vendor_name' => $v];
    } catch (Throwable $e) {
      $pdo->rollBack();
      throw $e;
    }
  }
}

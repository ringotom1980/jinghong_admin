<?php
/**
 * Path: app/services/EquipmentService.php
 * 說明: 工具模組服務（字典 + 維修主檔/明細）
 */

declare(strict_types=1);

final class EquipmentService
{
  private static function db(): PDO
  {
    return db(); // 你現有 bootstrap.php 若已提供 db() 就沿用
  }

  private static function normName(string $s): string
  {
    $s = trim($s);
    $s = preg_replace('/\s+/u', ' ', $s);
    return $s ?? '';
  }

  public static function getDicts(int $limit = 100): array
  {
    $pdo = self::db();

    $tools = $pdo->query("SELECT id, name, use_count FROM equ_tools WHERE is_active=1 ORDER BY use_count DESC, name ASC LIMIT " . (int)$limit)->fetchAll(PDO::FETCH_ASSOC);
    $vendors = $pdo->query("SELECT id, name, use_count FROM equ_vendors WHERE is_active=1 ORDER BY use_count DESC, name ASC LIMIT " . (int)$limit)->fetchAll(PDO::FETCH_ASSOC);

    return ['tools' => $tools, 'vendors' => $vendors];
  }

  public static function upsertToolByName(string $name): int
  {
    $name = self::normName($name);
    if ($name === '') throw new RuntimeException('tool_name 不可空白');

    $pdo = self::db();
    $sql = "INSERT INTO equ_tools(name, is_active, use_count, last_used_at)
            VALUES(:name, 1, 1, NOW())
            ON DUPLICATE KEY UPDATE
              is_active=1,
              use_count=use_count+1,
              last_used_at=NOW()";
    $st = $pdo->prepare($sql);
    $st->execute([':name' => $name]);

    // 取得 id：若是 insert，lastInsertId 會有值；若是 duplicate，需 select
    $id = (int)$pdo->lastInsertId();
    if ($id > 0) return $id;

    $st2 = $pdo->prepare("SELECT id FROM equ_tools WHERE name=:name LIMIT 1");
    $st2->execute([':name' => $name]);
    $row = $st2->fetch(PDO::FETCH_ASSOC);
    return (int)($row['id'] ?? 0);
  }

  public static function upsertVendorByName(string $name): int
  {
    $name = self::normName($name);
    if ($name === '') throw new RuntimeException('vendor_name 不可空白');

    $pdo = self::db();
    $sql = "INSERT INTO equ_vendors(name, is_active, use_count, last_used_at)
            VALUES(:name, 1, 1, NOW())
            ON DUPLICATE KEY UPDATE
              is_active=1,
              use_count=use_count+1,
              last_used_at=NOW()";
    $st = $pdo->prepare($sql);
    $st->execute([':name' => $name]);

    $id = (int)$pdo->lastInsertId();
    if ($id > 0) return $id;

    $st2 = $pdo->prepare("SELECT id FROM equ_vendors WHERE name=:name LIMIT 1");
    $st2->execute([':name' => $name]);
    $row = $st2->fetch(PDO::FETCH_ASSOC);
    return (int)($row['id'] ?? 0);
  }

  public static function listRepairs(?string $month, ?string $repairType, ?string $q): array
  {
    $pdo = self::db();

    $params = [];
    $where = [];

    if ($month) {
      // YYYY-MM
      $where[] = "DATE_FORMAT(h.repair_date, '%Y-%m') = :ym";
      $params[':ym'] = $month;
    }

    if ($repairType) {
      $where[] = "h.repair_type = :rt";
      $params[':rt'] = $repairType;
    }

    if ($q) {
      $where[] = "(t.name LIKE :q OR v.name LIKE :q OR EXISTS (
        SELECT 1 FROM equ_repair_items i WHERE i.repair_id=h.id AND i.content LIKE :q
      ))";
      $params[':q'] = '%' . $q . '%';
    }

    $sql = "SELECT
              h.id, h.repair_date, h.repair_type, h.note,
              t.name AS tool_name,
              v.name AS vendor_name,
              h.team_amount_total, h.company_amount_total, h.grand_total
            FROM equ_repair_headers h
            JOIN equ_tools t ON t.id = h.tool_id
            JOIN equ_vendors v ON v.id = h.vendor_id";

    if ($where) $sql .= " WHERE " . implode(" AND ", $where);
    $sql .= " ORDER BY h.repair_date DESC, h.id DESC LIMIT 500";

    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);

    // 摘要（前 3 筆用 '、'，title 用 '\n'）
    $ids = array_map(fn($r) => (int)$r['id'], $rows);
    $map = [];
    if ($ids) {
      $in = implode(',', array_fill(0, count($ids), '?'));
      $st2 = $pdo->prepare("SELECT repair_id, seq, content FROM equ_repair_items WHERE repair_id IN ($in) ORDER BY repair_id, seq");
      $st2->execute($ids);
      while ($it = $st2->fetch(PDO::FETCH_ASSOC)) {
        $rid = (int)$it['repair_id'];
        $map[$rid] = $map[$rid] ?? [];
        $map[$rid][] = (string)$it['content'];
      }
    }

    foreach ($rows as &$r) {
      $items = $map[(int)$r['id']] ?? [];
      $shown = array_slice($items, 0, 3);
      $r['items_text'] = implode('、', $shown) . (count($items) > 3 ? '…' : '');
      $r['items_title'] = implode("\n", $items);
    }
    unset($r);

    return $rows;
  }

  public static function getRepair(int $id): array
  {
    $pdo = self::db();

    $st = $pdo->prepare("SELECT h.*, t.name AS tool_name, v.name AS vendor_name
                         FROM equ_repair_headers h
                         JOIN equ_tools t ON t.id=h.tool_id
                         JOIN equ_vendors v ON v.id=h.vendor_id
                         WHERE h.id=:id LIMIT 1");
    $st->execute([':id' => $id]);
    $h = $st->fetch(PDO::FETCH_ASSOC);
    if (!$h) throw new RuntimeException('找不到主檔');

    $st2 = $pdo->prepare("SELECT seq, content, company_amount, team_amount
                          FROM equ_repair_items
                          WHERE repair_id=:id ORDER BY seq ASC");
    $st2->execute([':id' => $id]);
    $items = $st2->fetchAll(PDO::FETCH_ASSOC);

    return [
      'id' => (int)$h['id'],
      'repair_date' => $h['repair_date'],
      'repair_type' => $h['repair_type'],
      'tool_name' => $h['tool_name'],
      'vendor_name' => $h['vendor_name'],
      'note' => $h['note'],
      'items' => $items
    ];
  }

  public static function saveRepair(array $body): array
  {
    $pdo = self::db();

    $id = (int)($body['id'] ?? 0);
    $header = $body['header'] ?? [];
    $items = $body['items'] ?? [];

    $repairDate = (string)($header['repair_date'] ?? '');
    $repairType = (string)($header['repair_type'] ?? '維修');
    $toolName = (string)($header['tool_name'] ?? '');
    $vendorName = (string)($header['vendor_name'] ?? '');
    $note = (string)($header['note'] ?? '');

    if ($repairDate === '') throw new RuntimeException('缺少 repair_date');
    if ($toolName === '') throw new RuntimeException('缺少 tool_name');
    if ($vendorName === '') throw new RuntimeException('缺少 vendor_name');
    if (!is_array($items) || !count($items)) throw new RuntimeException('缺少 items');

    $pdo->beginTransaction();
    try {
      $toolId = self::upsertToolByName($toolName);
      $vendorId = self::upsertVendorByName($vendorName);

      // totals
      $sumC = 0.0; $sumT = 0.0;
      foreach ($items as $it) {
        $content = trim((string)($it['content'] ?? ''));
        if ($content === '') continue;
        $sumC += (float)($it['company_amount'] ?? 0);
        $sumT += (float)($it['team_amount'] ?? 0);
      }
      $grand = $sumC + $sumT;

      if ($id <= 0) {
        $st = $pdo->prepare("INSERT INTO equ_repair_headers
          (tool_id, repair_date, vendor_id, repair_type, note, team_amount_total, company_amount_total, grand_total)
          VALUES (:tool_id, :repair_date, :vendor_id, :repair_type, :note, :team_total, :company_total, :grand_total)");
        $st->execute([
          ':tool_id' => $toolId,
          ':repair_date' => $repairDate,
          ':vendor_id' => $vendorId,
          ':repair_type' => $repairType,
          ':note' => ($note === '' ? null : $note),
          ':team_total' => $sumT,
          ':company_total' => $sumC,
          ':grand_total' => $grand,
        ]);
        $id = (int)$pdo->lastInsertId();
      } else {
        $st = $pdo->prepare("UPDATE equ_repair_headers SET
          tool_id=:tool_id,
          repair_date=:repair_date,
          vendor_id=:vendor_id,
          repair_type=:repair_type,
          note=:note,
          team_amount_total=:team_total,
          company_amount_total=:company_total,
          grand_total=:grand_total
          WHERE id=:id");
        $st->execute([
          ':id' => $id,
          ':tool_id' => $toolId,
          ':repair_date' => $repairDate,
          ':vendor_id' => $vendorId,
          ':repair_type' => $repairType,
          ':note' => ($note === '' ? null : $note),
          ':team_total' => $sumT,
          ':company_total' => $sumC,
          ':grand_total' => $grand,
        ]);

        // 先清空 items 再重寫（簡單且穩）
        $pdo->prepare("DELETE FROM equ_repair_items WHERE repair_id=:id")->execute([':id' => $id]);
      }

      // items insert
      $stI = $pdo->prepare("INSERT INTO equ_repair_items(repair_id, seq, content, team_amount, company_amount)
                            VALUES(:rid, :seq, :content, :team, :company)");
      $seq = 1;
      foreach ($items as $it) {
        $content = trim((string)($it['content'] ?? ''));
        if ($content === '') continue;

        $stI->execute([
          ':rid' => $id,
          ':seq' => $seq++,
          ':content' => $content,
          ':team' => (float)($it['team_amount'] ?? 0),
          ':company' => (float)($it['company_amount'] ?? 0),
        ]);
      }

      $pdo->commit();
      return ['id' => $id];
    } catch (Throwable $e) {
      $pdo->rollBack();
      throw $e;
    }
  }

  public static function deleteRepair(int $id): void
  {
    $pdo = self::db();
    $st = $pdo->prepare("DELETE FROM equ_repair_headers WHERE id=:id");
    $st->execute([':id' => $id]);
  }
}

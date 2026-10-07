<?php

/**
 * Path: app/services/HotToolsService.php
 * 說明: 活電工具（tools）後端服務
 * - 管分類 hot_items（可刪，刪則連帶刪 hot_tools）
 * - 管工具 hot_tools（不可刪，只能新增/編輯/配賦/解除配賦）
 * - 自動編號：tool_no = code(1)+batch_no(2 base36)+seq(3)
 */

declare(strict_types=1);

final class HotToolsService
{
  /** @var PDO */
  private $db;

  public function __construct(PDO $db)
  {
    $this->db = $db;
  }

  /* =========================
   * 分類列表（含統計）
   * ========================= */
  public function listItemsWithCounts(): array
  {
    $sql = "
      SELECT
        i.id,
        i.code,
        i.name,
        i.batch_no,
        i.seq_no,
        COUNT(t.id) AS tool_total,
        SUM(CASE WHEN t.vehicle_id IS NOT NULL THEN 1 ELSE 0 END) AS assigned_cnt,
        SUM(CASE WHEN t.vehicle_id IS NULL THEN 1 ELSE 0 END) AS available_cnt
      FROM hot_items i
      LEFT JOIN hot_tools t ON t.item_id = i.id
      GROUP BY i.id
      ORDER BY i.code ASC
    ";
    return $this->db->query($sql)->fetchAll();
  }

  /* =========================
   * 車輛下拉（含停用）
   * ========================= */
  public function listVehiclesAll(): array
  {
    $sql = "
      SELECT
        v.id,
        v.vehicle_code,
        v.plate_no,
        v.is_active
      FROM vehicle_vehicles v
      ORDER BY v.is_active DESC, v.vehicle_code ASC
    ";
    return $this->db->query($sql)->fetchAll();
  }

  /* =========================
   * 工具明細（某分類）
   * ========================= */
  public function listToolsByItem(int $itemId): array
  {
    $sql = "
      SELECT
        t.id,
        t.item_id,
        t.tool_no,
        t.inspect_date,
        t.vehicle_id,
        t.note,
        v.vehicle_code,
        v.plate_no,
        v.is_active AS vehicle_is_active
      FROM hot_tools t
      LEFT JOIN vehicle_vehicles v ON v.id = t.vehicle_id
      WHERE t.item_id = :item_id
      ORDER BY t.tool_no ASC
    ";
    $st = $this->db->prepare($sql);
    $st->execute([':item_id' => $itemId]);
    return $st->fetchAll();
  }

  /* =========================
   * 建立分類 + 依 qty 產生工具
   * - code 自動取得 A~Z 下一個
   * ========================= */
  public function createItem(string $name, int $qty): array
  {
    $name = trim($name);
    if ($name === '') throw new InvalidArgumentException('分類名稱為必填');
    if ($qty < 1) throw new InvalidArgumentException('初始數量 qty 必須 >= 1');

    $this->db->beginTransaction();
    try {
      // 1) 取得下一個可用 code（A~Z）
      $code = $this->nextAvailableCodeForUpdate(); // 內含 FOR UPDATE 鎖住 hot_items

      // 2) 建 hot_items（batch_no/seq_no 初始）
      $sqlIns = "INSERT INTO hot_items (name, code, batch_no, seq_no) VALUES (:name, :code, '01', 0)";
      $stIns = $this->db->prepare($sqlIns);
      $stIns->execute([':name' => $name, ':code' => $code]);
      $itemId = (int)$this->db->lastInsertId();

      // 3) 依 qty 產生 hot_tools（需 lock 該分類列）
      $created = $this->addToolsInternal($itemId, $qty, null, null, null);

      $this->db->commit();

      return [
        'item_id' => $itemId,
        'code' => $code,
        'created_qty' => $qty,
        'range' => $created['range'],
      ];
    } catch (Throwable $e) {
      $this->db->rollBack();
      throw $e;
    }
  }

  /* =========================
   * 批次更新分類名稱（EDIT 儲存）
   * rows: [{id,name}]
   * ========================= */
  public function updateItems(array $rows): array
  {
    $this->db->beginTransaction();
    try {
      $sql = "UPDATE hot_items SET name = :name WHERE id = :id";
      $st = $this->db->prepare($sql);

      $n = 0;
      foreach ($rows as $r) {
        $id = (int)($r['id'] ?? 0);
        $name = trim((string)($r['name'] ?? ''));
        if ($id <= 0) continue;
        if ($name === '') throw new InvalidArgumentException('分類名稱不可為空');

        $st->execute([':name' => $name, ':id' => $id]);
        $n += $st->rowCount();
      }

      $this->db->commit();
      return ['updated' => $n];
    } catch (Throwable $e) {
      $this->db->rollBack();
      throw $e;
    }
  }

  /* =========================
   * 刪除分類前的預覽（二次確認用）
   * ========================= */
  public function getDeletePreview(int $itemId): array
  {
    $sqlItem = "SELECT id, code, name FROM hot_items WHERE id = :id";
    $stItem = $this->db->prepare($sqlItem);
    $stItem->execute([':id' => $itemId]);
    $item = $stItem->fetch();
    if (!$item) throw new RuntimeException('分類不存在');

    $sqlCounts = "
      SELECT
        COUNT(*) AS tool_total,
        SUM(CASE WHEN vehicle_id IS NOT NULL THEN 1 ELSE 0 END) AS assigned_cnt
      FROM hot_tools
      WHERE item_id = :id
    ";
    $stC = $this->db->prepare($sqlCounts);
    $stC->execute([':id' => $itemId]);
    $counts = $stC->fetch() ?: ['tool_total' => 0, 'assigned_cnt' => 0];

    $sqlVeh = "
      SELECT
        v.id AS vehicle_id,
        v.vehicle_code,
        v.plate_no,
        v.is_active,
        COUNT(t.id) AS cnt
      FROM hot_tools t
      JOIN vehicle_vehicles v ON v.id = t.vehicle_id
      WHERE t.item_id = :id
      GROUP BY v.id
      ORDER BY cnt DESC, v.vehicle_code ASC
    ";
    $stV = $this->db->prepare($sqlVeh);
    $stV->execute([':id' => $itemId]);
    $vehRows = $stV->fetchAll();

    return [
      'item' => $item,
      'tool_total' => (int)$counts['tool_total'],
      'assigned_cnt' => (int)$counts['assigned_cnt'],
      'vehicles' => $vehRows,
    ];
  }

  /* =========================
   * 刪除分類（硬刪，連帶刪 tools）
   * ========================= */
  public function deleteItem(int $itemId): array
  {
    if ($itemId <= 0) throw new InvalidArgumentException('item_id 不可為空');

    $this->db->beginTransaction();
    try {
      // 先確認存在（FOR UPDATE 避免同時操作）
      $st = $this->db->prepare("SELECT id, code, name FROM hot_items WHERE id = :id FOR UPDATE");
      $st->execute([':id' => $itemId]);
      $item = $st->fetch();
      if (!$item) throw new RuntimeException('分類不存在');

      // 刪 hot_items（hot_tools ON DELETE CASCADE）
      $stDel = $this->db->prepare("DELETE FROM hot_items WHERE id = :id");
      $stDel->execute([':id' => $itemId]);

      $this->db->commit();
      return ['deleted' => 1, 'item' => $item];
    } catch (Throwable $e) {
      $this->db->rollBack();
      throw $e;
    }
  }

  /* =========================
   * 新增工具：先預覽編號範圍（不寫入）
   * ========================= */
  public function previewAddToolsRange(int $itemId, int $qty): array
  {
    if ($itemId <= 0) throw new InvalidArgumentException('item_id 不可為空');
    if ($qty < 1) throw new InvalidArgumentException('qty 必須 >= 1');

    // 讀取分類當前 batch/seq（不鎖，僅預覽；真正寫入另有 FOR UPDATE）
    $st = $this->db->prepare("SELECT id, code, batch_no, seq_no FROM hot_items WHERE id = :id");
    $st->execute([':id' => $itemId]);
    $it = $st->fetch();
    if (!$it) throw new RuntimeException('分類不存在');

    $code = (string)$it['code'];
    $batch = (string)$it['batch_no'];
    $seq = (int)$it['seq_no'];

    $start = null;
    $end = null;

    for ($i = 1; $i <= $qty; $i++) {
      [$batch, $seq] = $this->nextBatchSeq($batch, $seq);
      $toolNo = $this->composeToolNo($code, $batch, $seq);
      if ($i === 1) $start = $toolNo;
      if ($i === $qty) $end = $toolNo;
    }

    return ['start' => $start, 'end' => $end];
  }

  /* =========================
   * 新增工具（寫入）
   * - inspect_date / vehicle_id / note 可套用到本次新增
   * ========================= */
  public function addTools(int $itemId, int $qty, ?string $inspectDate, ?int $vehicleId, ?string $note): array
  {
    if ($itemId <= 0) throw new InvalidArgumentException('item_id 不可為空');
    if ($qty < 1) throw new InvalidArgumentException('qty 必須 >= 1');

    $inspectDate = $this->normalizeDateOrNull($inspectDate);
    $note = $this->normalizeNoteOrNull($note);

    $this->db->beginTransaction();
    try {
      $created = $this->addToolsInternal($itemId, $qty, $inspectDate, $vehicleId, $note);
      $this->db->commit();
      return $created;
    } catch (Throwable $e) {
      $this->db->rollBack();
      throw $e;
    }
  }

  /* =========================
   * 編輯工具（同分類下）
   * rows: [{id,inspect_date,vehicle_id,note}]
   * ========================= */
  public function updateTools(int $itemId, array $rows): array
  {
    if ($itemId <= 0) throw new InvalidArgumentException('item_id 不可為空');

    $this->db->beginTransaction();
    try {
      // 鎖分類（避免同時新增工具造成 seq/batch 更新混亂）
      $stLock = $this->db->prepare("SELECT id FROM hot_items WHERE id = :id FOR UPDATE");
      $stLock->execute([':id' => $itemId]);
      if (!$stLock->fetch()) throw new RuntimeException('分類不存在');

      $sql = "
        UPDATE hot_tools
        SET
          inspect_date = :inspect_date,
          vehicle_id = :vehicle_id,
          note = :note
        WHERE id = :id AND item_id = :item_id
      ";
      $st = $this->db->prepare($sql);

      $n = 0;
      foreach ($rows as $r) {
        $id = (int)($r['id'] ?? 0);
        if ($id <= 0) continue;

        $inspectDate = $this->normalizeDateOrNull($r['inspect_date'] ?? null);
        $vehicleId = isset($r['vehicle_id']) && $r['vehicle_id'] !== '' ? (int)$r['vehicle_id'] : null;
        if ($vehicleId !== null && $vehicleId <= 0) $vehicleId = null;

        $note = $this->normalizeNoteOrNull($r['note'] ?? null);

        $st->bindValue(':inspect_date', $inspectDate, $inspectDate === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $st->bindValue(':vehicle_id', $vehicleId, $vehicleId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $st->bindValue(':note', $note, $note === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $st->bindValue(':id', $id, PDO::PARAM_INT);
        $st->bindValue(':item_id', $itemId, PDO::PARAM_INT);
        $st->execute();

        $n += $st->rowCount();
      }

      $this->db->commit();
      return ['updated' => $n];
    } catch (Throwable $e) {
      $this->db->rollBack();
      throw $e;
    }
  }

  /* =========================================================
   * Internal helpers
   * ========================================================= */

  private function nextAvailableCodeForUpdate(): string
  {
    // 鎖 hot_items，避免同時新增分類拿到相同 code
    $rows = $this->db->query("SELECT code FROM hot_items FOR UPDATE")->fetchAll();
    $used = [];
    foreach ($rows as $r) {
      $c = strtoupper((string)($r['code'] ?? ''));
      if ($c !== '') $used[$c] = true;
    }

    for ($i = 0; $i < 26; $i++) {
      $c = chr(ord('A') + $i);
      if (!isset($used[$c])) return $c;
    }
    throw new RuntimeException('分類代碼已滿（A~Z 用盡）');
  }

  private function addToolsInternal(int $itemId, int $qty, ?string $inspectDate, ?int $vehicleId, ?string $note): array
  {
    // 鎖分類列（transaction + FOR UPDATE）
    $st = $this->db->prepare("SELECT id, code, batch_no, seq_no FROM hot_items WHERE id = :id FOR UPDATE");
    $st->execute([':id' => $itemId]);
    $it = $st->fetch();
    if (!$it) throw new RuntimeException('分類不存在');

    $code = (string)$it['code'];
    $batch = (string)$it['batch_no'];
    $seq = (int)$it['seq_no'];

    // 如 vehicleId 有給，允許停用車；只要存在即可
    if ($vehicleId !== null && $vehicleId > 0) {
      $stV = $this->db->prepare("SELECT id FROM vehicle_vehicles WHERE id = :id");
      $stV->execute([':id' => $vehicleId]);
      if (!$stV->fetch()) throw new RuntimeException('vehicle_id 不存在');
    } else {
      $vehicleId = null;
    }

    $sqlIns = "
      INSERT INTO hot_tools (item_id, tool_no, vehicle_id, inspect_date, note)
      VALUES (:item_id, :tool_no, :vehicle_id, :inspect_date, :note)
    ";
    $stIns = $this->db->prepare($sqlIns);

    $start = null;
    $end = null;

    for ($i = 1; $i <= $qty; $i++) {
      [$batch, $seq] = $this->nextBatchSeq($batch, $seq);
      $toolNo = $this->composeToolNo($code, $batch, $seq);

      $stIns->bindValue(':item_id', $itemId, PDO::PARAM_INT);
      $stIns->bindValue(':tool_no', $toolNo, PDO::PARAM_STR);
      $stIns->bindValue(':vehicle_id', $vehicleId, $vehicleId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
      $stIns->bindValue(':inspect_date', $inspectDate, $inspectDate === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
      $stIns->bindValue(':note', $note, $note === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
      $stIns->execute();

      if ($i === 1) $start = $toolNo;
      if ($i === $qty) $end = $toolNo;
    }

    // 更新分類的 batch_no / seq_no
    $stUp = $this->db->prepare("UPDATE hot_items SET batch_no = :b, seq_no = :s WHERE id = :id");
    $stUp->execute([':b' => $batch, ':s' => $seq, ':id' => $itemId]);

    return [
      'created_qty' => $qty,
      'range' => ['start' => $start, 'end' => $end],
    ];
  }

  private function normalizeDateOrNull($v): ?string
  {
    $s = trim((string)$v);
    if ($s === '') return null;
    // 只接受 YYYY-MM-DD（前端用 date input）
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) throw new InvalidArgumentException('日期格式錯誤（需 YYYY-MM-DD）');
    return $s;
  }

  private function normalizeNoteOrNull($v): ?string
  {
    $s = trim((string)$v);
    return $s === '' ? null : $s;
  }

  /**
   * batch_no: base36 2 碼（01..0Z..1Z..ZZ）
   * seq_no: 0..999（新增時先 +1；>999 則 batch 進位、seq=1）
   */
  private function nextBatchSeq(string $batch, int $seq): array
  {
    $seq += 1;

    // 需求確認：不會超過 999；若真的超過就直接擋下
    if ($seq > 999) {
      throw new RuntimeException('此分類工具編號已達 999 上限');
    }

    // batch 不再使用，但為了不動其他流程與 DB 欄位，原樣回傳
    return [$batch, $seq];
  }

  private function composeToolNo(string $code, string $batch, int $seq): string
  {
    $code = strtoupper(trim($code)); // 仍維持 DB 內 code = A~Z
    $seqStr = str_pad((string)$seq, 3, '0', STR_PAD_LEFT);
    return '16' . $code . $seqStr;   // 新規則：16A001
  }

  /**
   * base36(2) 加一：01..09..0A..0Z..10..1Z..ZZ
   */
  private function base36Inc2(string $s): string
  {
    $s = strtoupper(trim($s));
    if (!preg_match('/^[0-9A-Z]{2}$/', $s)) throw new RuntimeException('batch_no 格式錯誤');

    $n = intval($s, 36);
    $n += 1;
    if ($n > intval('ZZ', 36)) throw new RuntimeException('batch_no 已達上限 ZZ');

    $out = strtoupper(base_convert((string)$n, 10, 36));
    return str_pad($out, 2, '0', STR_PAD_LEFT);
  }
}

<?php
/**
 * Path: Public/api/hot/helmets.php
 * 說明: 安全帽管理 API（單檔 action 分派）
 * 回傳：{success,data,error}
 *
 * 需求定版：
 * - 代碼固定 16E + 3 碼 serial_no（1..999）
 * - 逾期/快到期只針對 ASSIGNED（半年）
 * - 庫存 IN_STOCK 不顯示/不要求檢驗日
 * - 批次新增：超過 999 即 wrap 回 001..qty；若區間內存在 ASSIGNED → 直接禁止（A）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

function helmet_code(int $serial): string {
  return '16E' . str_pad((string)$serial, 3, '0', STR_PAD_LEFT);
}

function parse_serial($v): int {
  $s = trim((string)$v);
  if ($s === '') return 0;
  // allow "16E123" or "123"
  $s = strtoupper($s);
  if (preg_match('/^16E(\d{3})$/', $s, $m)) return (int)$m[1];
  if (preg_match('/^\d{1,3}$/', $s)) return (int)$s;
  return 0;
}

function normalize_date_required($v): string {
  $s = trim((string)$v);
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) throw new InvalidArgumentException('日期格式錯誤（需 YYYY-MM-DD）');
  return $s;
}

try {
  $db = db();
  $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

  $action = '';
  if ($method === 'GET') {
    $action = isset($_GET['action']) ? trim((string)$_GET['action']) : '';
  } else {
    $body = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($body)) $body = [];
    $action = isset($body['action']) ? trim((string)$body['action']) : '';
  }
  if ($action === '') json_error('action 不可為空', 400);

  /* =========================
   * GET
   * ========================= */
  if ($method === 'GET') {
    switch ($action) {

      case 'assignees': {
        $rows = $db->query("SELECT id, name FROM helmet_assignees ORDER BY id ASC")->fetchAll();
        json_ok(['assignees' => $rows]);
      }

      case 'assigned_list': {
        // 只要員工清單 + 目前配賦的帽（每人最多一頂：以最新 ASSIGNED 為準）
        $sql = "
          SELECT
            a.id AS assignee_id,
            a.name AS assignee_name,
            h.serial_no,
            h.inspect_date,
            h.assigned_at,
            h.status
          FROM helmet_assignees a
          LEFT JOIN helmets h
            ON h.assignee_id = a.id AND h.status = 'ASSIGNED'
          ORDER BY a.id ASC
        ";
        $rows = $db->query($sql)->fetchAll();

        // 到期狀態（半年）：只算 ASSIGNED 且 inspect_date 非空
        // 這裡只回前端需要的標籤；快到期門檻（天數）先固定 30 天
        $today = new DateTimeImmutable('now', new DateTimeZone('Asia/Taipei'));
        $warnDays = 30;

        foreach ($rows as &$r) {
          $r['helmet_code'] = ($r['serial_no'] !== null) ? helmet_code((int)$r['serial_no']) : null;

          $r['expiry_status'] = null; // OK / WARN / EXPIRED
          $r['expiry_date'] = null;

          if (($r['status'] ?? null) === 'ASSIGNED' && !empty($r['inspect_date'])) {
            $inspect = DateTimeImmutable::createFromFormat('Y-m-d', (string)$r['inspect_date'], new DateTimeZone('Asia/Taipei'));
            if ($inspect) {
              $expiry = $inspect->modify('+6 months');
              $r['expiry_date'] = $expiry->format('Y-m-d');

              $diff = (int)$today->diff($expiry)->format('%r%a'); // remaining days
              if ($diff < 0) $r['expiry_status'] = 'EXPIRED';
              else if ($diff <= $warnDays) $r['expiry_status'] = 'WARN';
              else $r['expiry_status'] = 'OK';
            }
          }
        }
        unset($r);

        json_ok(['rows' => $rows, 'warn_days' => $warnDays]);
      }

      case 'stock_list': {
        // 只列可配賦庫存
        $sql = "SELECT serial_no FROM helmets WHERE status = 'IN_STOCK' ORDER BY serial_no ASC";
        $rows = $db->query($sql)->fetchAll();

        $out = [];
        foreach ($rows as $r) {
          $sn = (int)$r['serial_no'];
          $out[] = ['serial_no' => $sn, 'helmet_code' => helmet_code($sn)];
        }
        json_ok(['stock' => $out, 'stock_cnt' => count($out)]);
      }

      case 'suggest_print': {
        $qty = isset($_GET['qty']) ? (int)$_GET['qty'] : 0;
        if ($qty < 1 || $qty > 999) json_error('qty 必須 1..999', 400);

        // meta 只有一列：id=1
        $meta = $db->query("SELECT last_serial, last_batch_id FROM helmet_meta WHERE id = 1")->fetch();
        if (!$meta) json_error('helmet_meta 尚未初始化（id=1）', 500);

        $lastSerial = (int)$meta['last_serial'];
        $nextStart = $lastSerial + 1;
        $isWrap = false;
        $start = 0;
        $end = 0;

        if ($nextStart + $qty - 1 <= 999) {
          $start = $nextStart;
          $end = $nextStart + $qty - 1;
        } else {
          $isWrap = true;
          $start = 1;
          $end = $qty; // 001..qty
        }

        // wrap 時：提示區間內仍 IN_STOCK 的號碼（你要顯示用）
        $unused = [];
        $assignedBlocking = [];
        if ($isWrap) {
          $stU = $db->prepare("SELECT serial_no, status FROM helmets WHERE serial_no BETWEEN :a AND :b");
          $stU->execute([':a' => $start, ':b' => $end]);
          $rows = $stU->fetchAll();
          foreach ($rows as $r) {
            $sn = (int)$r['serial_no'];
            $st = (string)$r['status'];
            if ($st === 'IN_STOCK') $unused[] = helmet_code($sn);
            if ($st === 'ASSIGNED') $assignedBlocking[] = helmet_code($sn);
          }
        }

        json_ok([
          'qty' => $qty,
          'is_wrap' => $isWrap,
          'range' => [
            'start_serial' => $start,
            'end_serial' => $end,
            'start_code' => helmet_code($start),
            'end_code' => helmet_code($end),
          ],
          'wrap_notice_unused_in_stock' => $unused,
          'wrap_block_assigned' => $assignedBlocking,
          'can_add' => $isWrap ? (count($assignedBlocking) === 0) : true,
        ]);
      }

      default:
        json_error('未知 action', 400);
    }
  }

  /* =========================
   * POST
   * ========================= */
  $body = json_decode((string)file_get_contents('php://input'), true);
  if (!is_array($body)) json_error('body 格式錯誤', 400);

  switch ($action) {

    case 'assignee_create': {
      $name = trim((string)($body['name'] ?? ''));
      if ($name === '') json_error('name 不可為空', 400);

      $st = $db->prepare("INSERT INTO helmet_assignees (name) VALUES (:name)");
      $st->execute([':name' => $name]);

      json_ok(['assignee_id' => (int)$db->lastInsertId(), 'name' => $name]);
    }

    case 'assign': {
      $assigneeId = (int)($body['assignee_id'] ?? 0);
      $serial = parse_serial($body['serial_no'] ?? '');
      $inspect = normalize_date_required($body['inspect_date'] ?? '');

      if ($assigneeId <= 0) json_error('assignee_id 不可為空', 400);
      if ($serial < 1 || $serial > 999) json_error('serial_no 必須 1..999', 400);

      $db->beginTransaction();
      try {
        // 1) assignee exists
        $stA = $db->prepare("SELECT id FROM helmet_assignees WHERE id = :id");
        $stA->execute([':id' => $assigneeId]);
        if (!$stA->fetch()) throw new RuntimeException('員工不存在');

        // 2) 這人是否已配賦（一人一頂）
        $stChk = $db->prepare("SELECT serial_no FROM helmets WHERE assignee_id = :aid AND status = 'ASSIGNED' FOR UPDATE");
        $stChk->execute([':aid' => $assigneeId]);
        if ($stChk->fetch()) throw new RuntimeException('此員工已配賦安全帽，請用「更換」流程');

        // 3) 這頂是否庫存可配賦
        $stH = $db->prepare("SELECT serial_no, status FROM helmets WHERE serial_no = :sn FOR UPDATE");
        $stH->execute([':sn' => $serial]);
        $h = $stH->fetch();
        if (!$h) throw new RuntimeException('此帽號不存在於庫存（請先批次新增號碼）');
        if ((string)$h['status'] !== 'IN_STOCK') throw new RuntimeException('此帽號非可配賦狀態');

        $stUp = $db->prepare("
          UPDATE helmets
          SET status='ASSIGNED', assignee_id=:aid, inspect_date=:ins, assigned_at=NOW()
          WHERE serial_no=:sn
        ");
        $stUp->execute([':aid' => $assigneeId, ':ins' => $inspect, ':sn' => $serial]);

        $db->commit();
        json_ok(['assigned' => 1, 'helmet_code' => helmet_code($serial)]);
      } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
      }
    }

    case 'swap': {
      // 更換：舊帽 → 報廢（SCRAPPED + replace_date）；新帽 → ASSIGNED
      $assigneeId = (int)($body['assignee_id'] ?? 0);
      $newSerial = parse_serial($body['new_serial_no'] ?? '');
      $inspect = normalize_date_required($body['inspect_date'] ?? '');
      $replaceDate = normalize_date_required($body['replace_date'] ?? date('Y-m-d'));

      if ($assigneeId <= 0) json_error('assignee_id 不可為空', 400);
      if ($newSerial < 1 || $newSerial > 999) json_error('new_serial_no 必須 1..999', 400);

      $db->beginTransaction();
      try {
        // lock current assigned
        $stOld = $db->prepare("SELECT serial_no FROM helmets WHERE assignee_id=:aid AND status='ASSIGNED' FOR UPDATE");
        $stOld->execute([':aid' => $assigneeId]);
        $old = $stOld->fetch();
        if (!$old) throw new RuntimeException('此員工目前沒有配賦安全帽');

        $oldSerial = (int)$old['serial_no'];

        // lock new helmet
        $stNew = $db->prepare("SELECT serial_no, status FROM helmets WHERE serial_no=:sn FOR UPDATE");
        $stNew->execute([':sn' => $newSerial]);
        $n = $stNew->fetch();
        if (!$n) throw new RuntimeException('新帽號不存在（請先批次新增號碼）');
        if ((string)$n['status'] !== 'IN_STOCK') throw new RuntimeException('新帽號非可配賦狀態');

        // scrap old
        $stScr = $db->prepare("
          UPDATE helmets
          SET status='SCRAPPED', assignee_id=NULL, replace_date=:rd
          WHERE serial_no=:sn
        ");
        $stScr->execute([':rd' => $replaceDate, ':sn' => $oldSerial]);

        // assign new
        $stAsn = $db->prepare("
          UPDATE helmets
          SET status='ASSIGNED', assignee_id=:aid, inspect_date=:ins, assigned_at=NOW()
          WHERE serial_no=:sn
        ");
        $stAsn->execute([':aid' => $assigneeId, ':ins' => $inspect, ':sn' => $newSerial]);

        $db->commit();
        json_ok(['swapped' => 1, 'old_code' => helmet_code($oldSerial), 'new_code' => helmet_code($newSerial)]);
      } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
      }
    }

    case 'unassign': {
      // 解除：變回庫存（IN_STOCK），清掉 assignee_id；inspect_date 保留或清除？先清除避免誤判
      $serial = parse_serial($body['serial_no'] ?? '');
      if ($serial < 1 || $serial > 999) json_error('serial_no 必須 1..999', 400);

      $st = $db->prepare("UPDATE helmets SET status='IN_STOCK', assignee_id=NULL, inspect_date=NULL WHERE serial_no=:sn AND status='ASSIGNED'");
      $st->execute([':sn' => $serial]);
      json_ok(['unassigned' => $st->rowCount()]);
    }

    case 'batch_add': {
      $qty = (int)($body['qty'] ?? 0);
      if ($qty < 1 || $qty > 999) json_error('qty 必須 1..999', 400);

      $db->beginTransaction();
      try {
        // lock meta
        $stM = $db->prepare("SELECT last_serial, last_batch_id FROM helmet_meta WHERE id=1 FOR UPDATE");
        $stM->execute();
        $meta = $stM->fetch();
        if (!$meta) throw new RuntimeException('helmet_meta 尚未初始化（id=1）');

        $lastSerial = (int)$meta['last_serial'];
        $nextStart = $lastSerial + 1;

        $isWrap = false;
        $start = 0;
        $end = 0;

        if ($nextStart + $qty - 1 <= 999) {
          $start = $nextStart;
          $end = $nextStart + $qty - 1;
        } else {
          $isWrap = true;
          $start = 1;
          $end = $qty; // 001..qty
        }

        // A 規則：wrap 時，若區間內存在 ASSIGNED → 禁止新增
        if ($isWrap) {
          $stBlk = $db->prepare("SELECT serial_no FROM helmets WHERE serial_no BETWEEN :a AND :b AND status='ASSIGNED' LIMIT 1 FOR UPDATE");
          $stBlk->execute([':a' => $start, ':b' => $end]);
          $blk = $stBlk->fetch();
          if ($blk) throw new RuntimeException('新增被禁止：建議區間內存在使用中(ASSIGNED)帽號，請先更換後再新增');
        }

        // create batch row
        $stB = $db->prepare("INSERT INTO helmet_batches (qty, range_start, range_end, is_wrap, created_at) VALUES (:q,:s,:e,:w,NOW())");
        $stB->execute([':q' => $qty, ':s' => $start, ':e' => $end, ':w' => $isWrap ? 1 : 0]);
        $batchId = (int)$db->lastInsertId();

        // upsert slots 1..999 (only for the range)
        // 若存在且非 ASSIGNED（wrap 已檢查；非 wrap 不應該撞到 ASSIGNED，但仍保護）
        $stUp = $db->prepare("
          UPDATE helmets
          SET status='IN_STOCK', assignee_id=NULL, inspect_date=NULL, replace_date=NULL, assigned_at=NULL, batch_id=:bid, updated_at=NOW()
          WHERE serial_no=:sn AND status<>'ASSIGNED'
        ");
        $stIns = $db->prepare("
          INSERT INTO helmets (serial_no, status, assignee_id, inspect_date, replace_date, assigned_at, batch_id, updated_at)
          VALUES (:sn, 'IN_STOCK', NULL, NULL, NULL, NULL, :bid, NOW())
        ");

        $created = 0;
        $updated = 0;

        for ($sn = $start; $sn <= $end; $sn++) {
          // try update first
          $stUp->execute([':bid' => $batchId, ':sn' => $sn]);
          if ($stUp->rowCount() > 0) {
            $updated++;
            continue;
          }
          // insert if not exists
          try {
            $stIns->execute([':sn' => $sn, ':bid' => $batchId]);
            $created++;
          } catch (Throwable $e) {
            // if duplicate but ASSIGNED (should not happen here), rethrow
            throw $e;
          }
        }

        // update meta
        $newLastSerial = $end; // 非 wrap 或 wrap：都以本次 end 作為 last_serial
        $stMU = $db->prepare("UPDATE helmet_meta SET last_serial=:ls, last_batch_id=:bid, updated_at=NOW() WHERE id=1");
        $stMU->execute([':ls' => $newLastSerial, ':bid' => $batchId]);

        $db->commit();
        json_ok([
          'batch_id' => $batchId,
          'qty' => $qty,
          'is_wrap' => $isWrap,
          'range' => [
            'start_code' => helmet_code($start),
            'end_code' => helmet_code($end),
          ],
          'upsert' => ['created' => $created, 'updated' => $updated],
        ]);
      } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
      }
    }

    default:
      json_error('未知 action', 400);
  }

} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

<?php
/**
 * Path: Public/api/equ/equ_repair_save.php
 * body: { id, header{repair_date,repair_type,tool_name,vendor_name,note}, items[{seq,content,company_amount,team_amount}] }
 */
declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/EquipmentService.php';

try {
  $body = json_decode(file_get_contents('php://input'), true);
  if (!is_array($body)) json_error('body 格式錯誤', 400);

  $data = EquipmentService::saveRepair($body);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

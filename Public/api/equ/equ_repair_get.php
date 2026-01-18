<?php
/**
 * Path: Public/api/equ/equ_repair_get.php
 * 參數: id
 */
declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/EquipmentService.php';

try {
  $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
  if ($id <= 0) json_error('缺少 id', 400);

  $data = EquipmentService::getRepair($id);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

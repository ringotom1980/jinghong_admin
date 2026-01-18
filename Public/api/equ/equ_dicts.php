<?php
/**
 * Path: Public/api/equ/equ_dicts.php
 * 說明: 下拉字典（工具/廠商）
 */
declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/EquipmentService.php';

try {
  $data = EquipmentService::getDicts(200);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

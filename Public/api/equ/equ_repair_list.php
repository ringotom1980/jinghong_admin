<?php
/**
 * Path: Public/api/equ/equ_repair_list.php
 * 參數: month=YYYY-MM, repair_type(可選), q(可選)
 */
declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/EquipmentService.php';

try {
  $month = isset($_GET['month']) ? trim((string)$_GET['month']) : null;
  $type = isset($_GET['repair_type']) ? trim((string)$_GET['repair_type']) : null;
  $q = isset($_GET['q']) ? trim((string)$_GET['q']) : null;

  $rows = EquipmentService::listRepairs($month, $type ?: null, $q ?: null);
  json_ok($rows);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

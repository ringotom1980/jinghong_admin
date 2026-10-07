<?php
/**
 * Path: Public/api/equ/equ_dicts.php
 * 說明: 工具維修模組字典（工具/廠商/類型 + 時間膠囊）
 * 回傳:
 *  - dicts: {tools[], vendors[], repair_types[]}
 *  - capsules: [{key,label,count,start,end,is_default}]
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/EquipmentService.php';

try {
  $dicts = EquipmentService::getDicts();
  $capsules = EquipmentService::equRepairCapsules();
  json_ok([
    'dicts' => $dicts,
    'capsules' => $capsules['capsules'] ?? [],
  ]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

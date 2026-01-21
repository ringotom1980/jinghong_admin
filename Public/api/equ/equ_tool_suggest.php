<?php
/**
 * Path: Public/api/equ/equ_tool_suggest.php
 * 說明: 工具名稱建議（focus 顯示常用/最近；輸入即時 like 查詢）
 * query:
 *  - q (string, optional)
 * return:
 *  - rows: [{id,name,use_count,last_used_at}]
 */
declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/EquipmentService.php';

try {
  $q = isset($_GET['q']) ? (string)$_GET['q'] : '';
  $data = EquipmentService::toolSuggest($q);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

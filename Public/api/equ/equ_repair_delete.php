<?php
/**
 * Path: Public/api/equ/equ_repair_delete.php
 * body: { id }
 */
declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/EquipmentService.php';

try {
  $body = json_decode(file_get_contents('php://input'), true);
  if (!is_array($body)) json_error('body 格式錯誤', 400);

  $id = (int)($body['id'] ?? 0);
  if ($id <= 0) json_error('缺少 id', 400);

  EquipmentService::deleteRepair($id);
  json_ok(['id' => $id]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

<?php
/**
 * Path: Public/api/car/car_repair_capsules.php
 * 說明: 維修紀錄時間膠囊（今年上下半年 + 歷年）
 * 回傳: {success:true,data:{capsules:[{key,label,count,start,end,is_default}]},error:null}
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_once __DIR__ . '/../../../app/services/VehicleService.php';

require_login();

header('Content-Type: application/json; charset=utf-8');

try {
  $data = VehicleService::vehicleRepairCapsules();
  echo json_encode(['success' => true, 'data' => $data, 'error' => null], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  http_response_code(400);
  echo json_encode(['success' => false, 'data' => null, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}

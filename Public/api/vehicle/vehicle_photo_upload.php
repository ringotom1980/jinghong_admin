<?php
/**
 * Path: Public/api/vehicle/vehicle_photo_upload.php
 * 說明: 上傳車輛照片（單張覆蓋），並更新 vehicle_vehicles.photo_path
 * FormData:
 * - vehicle_id (required)
 * - photo (required, image/*)
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

$vehicleId = (int)($_POST['vehicle_id'] ?? 0);
if ($vehicleId <= 0) {
  json_error('vehicle_id 不可空白', 400);
}

if (!isset($_FILES['photo'])) {
  json_error('缺少 photo 檔案', 400);
}

try {
  $res = VehicleService::uploadPhoto($vehicleId, $_FILES['photo']);
  json_ok($res);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

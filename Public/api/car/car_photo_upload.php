<?php
/**
 * Path: Public/api/car/car_photo_upload.php
 * 說明: 照片上傳覆蓋：storage/uploads/vehicles/vehicle_{id}.jpg
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

$id = (int)($_POST['id'] ?? 0);
if ($id <= 0) json_error('缺少 id', 400);

if (!isset($_FILES['photo'])) {
  json_error('缺少 photo', 400);
}

try {
  $photoUrl = VehicleService::uploadVehiclePhoto($id, $_FILES['photo']);
  json_ok(['photo_url' => $photoUrl]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

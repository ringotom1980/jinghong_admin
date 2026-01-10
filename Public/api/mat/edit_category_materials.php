<?php
/**Public/api/mat/edit_category_materials.php
 * 分類 ↔ 材料
 */
declare(strict_types=1);
require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$svc = new MatEditService();
$action = $_POST['action'] ?? $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'get':
            json_ok(
                $svc->getCategoryMaterials((int)$_GET['category_id'])
            );

        case 'save':
            $svc->saveCategoryMaterials(
                (int)$_POST['category_id'],
                $_POST['materials'] ?? []
            );
            json_ok();

        default:
            json_error('未知 action');
    }
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}

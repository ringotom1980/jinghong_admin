<?php
/**Public/api/mat/edit_personnel.php
 * 承辦人（mat_personnel）
 */
declare(strict_types=1);
require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$svc = new MatEditService();
$action = $_POST['action'] ?? $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'get':
            json_ok($svc->getPersonnel());

        case 'save':
            $svc->savePersonnel(
                $_POST['shift'],
                trim($_POST['name'])
            );
            json_ok();

        default:
            json_error('未知 action');
    }
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}

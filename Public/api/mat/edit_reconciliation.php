<?php
/**Public/api/mat/edit_reconciliation.php
 * 對帳資料
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
                $svc->getReconciliation($_GET['withdraw_date'])
            );

        case 'save':
            $svc->saveReconciliation(
                $_POST['withdraw_date'],
                $_POST['values'] ?? [],
                current_user_id()
            );
            json_ok();

        default:
            json_error('未知 action');
    }
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}

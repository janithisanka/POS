<?php
/**
 * Supplier Controller
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../models/Supplier.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Validator.php';

class SupplierController {
    private Supplier $supplierModel;

    public function __construct() {
        $this->supplierModel = new Supplier();
    }

    /**
     * Get all suppliers
     */
    public function index(): void {
        Auth::requireAuth();

        $suppliers = $this->supplierModel->getAllWithPayments();
        Response::success($suppliers);
    }

    /**
     * Get single supplier with payments
     */
    public function show(int $id): void {
        Auth::requireAuth();

        $supplier = $this->supplierModel->getWithPayments($id);
        if (!$supplier) {
            Response::notFound('Supplier not found');
        }

        Response::success($supplier);
    }

    /**
     * Create supplier
     */
    public function store(): void {
        Auth::requireAuth();

        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator
            ->required('name')
            ->maxLength('name', 200)
            ->phone('phone')
            ->email('email')
            ->validate();

        $supplierId = $this->supplierModel->create([
            'name' => Validator::sanitizeString($data['name']),
            'contact_person' => isset($data['contact_person']) ? Validator::sanitizeString($data['contact_person']) : null,
            'phone' => isset($data['phone']) ? Validator::sanitizeString($data['phone']) : null,
            'email' => isset($data['email']) ? Validator::sanitizeEmail($data['email']) : null,
            'address' => isset($data['address']) ? Validator::sanitizeString($data['address']) : null,
            'status' => 'active'
        ]);

        $supplier = $this->supplierModel->find($supplierId);
        Response::success($supplier, 'Supplier created successfully', 201);
    }

    /**
     * Update supplier
     */
    public function update(int $id): void {
        Auth::requireAuth();

        $supplier = $this->supplierModel->find($id);
        if (!$supplier) {
            Response::notFound('Supplier not found');
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $updateData = [];

        if (isset($data['name'])) {
            $updateData['name'] = Validator::sanitizeString($data['name']);
        }
        if (isset($data['contact_person'])) {
            $updateData['contact_person'] = Validator::sanitizeString($data['contact_person']);
        }
        if (isset($data['phone'])) {
            $updateData['phone'] = Validator::sanitizeString($data['phone']);
        }
        if (isset($data['email'])) {
            $updateData['email'] = Validator::sanitizeEmail($data['email']);
        }
        if (isset($data['address'])) {
            $updateData['address'] = Validator::sanitizeString($data['address']);
        }
        if (isset($data['status'])) {
            $updateData['status'] = $data['status'];
        }

        $this->supplierModel->update($id, $updateData);

        $updatedSupplier = $this->supplierModel->find($id);
        Response::success($updatedSupplier, 'Supplier updated successfully');
    }

    /**
     * Delete supplier
     */
    public function destroy(int $id): void {
        Auth::requireAuth();

        $supplier = $this->supplierModel->find($id);
        if (!$supplier) {
            Response::notFound('Supplier not found');
        }

        $this->supplierModel->update($id, ['status' => 'inactive']);
        Response::success(null, 'Supplier deleted successfully');
    }

    /**
     * Add payment
     */
    public function addPayment(int $supplierId): void {
        $user = Auth::requireAuth();

        $supplier = $this->supplierModel->find($supplierId);
        if (!$supplier) {
            Response::notFound('Supplier not found');
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator
            ->required('amount')
            ->numeric('amount')
            ->min('amount', 0.01)
            ->required('payment_date')
            ->date('payment_date')
            ->validate();

        $paymentId = $this->supplierModel->addPayment(
            $supplierId,
            (float)$data['amount'],
            $data['payment_date'],
            $data['payment_method'] ?? 'cash',
            $data['reference'] ?? null,
            $user['user_id']
        );

        $payment = $this->supplierModel->getPayment($paymentId);
        Response::success($payment, 'Payment added successfully', 201);
    }

    /**
     * Get payments by date range
     */
    public function payments(): void {
        Auth::requireAuth();

        $fromDate = $_GET['from'] ?? date('Y-m-01');
        $toDate = $_GET['to'] ?? date('Y-m-d');

        $payments = $this->supplierModel->getPaymentsByDateRange($fromDate, $toDate);
        Response::success($payments);
    }
}

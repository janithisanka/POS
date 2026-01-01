<?php
/**
 * Stock Controller
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../models/Stock.php';
require_once __DIR__ . '/../models/StockItem.php';
require_once __DIR__ . '/../models/Supplier.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Validator.php';

class StockController {
    private Stock $stockModel;
    private StockItem $stockItemModel;
    private Supplier $supplierModel;

    public function __construct() {
        $this->stockModel = new Stock();
        $this->stockItemModel = new StockItem();
        $this->supplierModel = new Supplier();
    }

    /**
     * Get current stock (today)
     */
    public function current(): void {
        Auth::requireAuth();

        $stock = $this->stockModel->getCurrentStock();
        Response::success($stock);
    }

    /**
     * Get today's stock entries
     */
    public function today(): void {
        Auth::requireAuth();

        $stock = $this->stockModel->getTodayStock();
        Response::success($stock);
    }

    /**
     * Add stock
     */
    public function addStock(): void {
        $user = Auth::requireAuth();

        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator
            ->required('product_id')
            ->required('quantity')
            ->numeric('quantity')
            ->min('quantity', 0.01)
            ->validate();

        $productId = Validator::sanitizeInt($data['product_id']);
        $quantity = Validator::sanitizeFloat($data['quantity']);
        $date = isset($data['date']) ? $data['date'] : date('Y-m-d');

        $result = $this->stockModel->addStock($productId, $quantity, $user['user_id'], $date);

        if ($result) {
            $stock = $this->stockModel->getStockByProductAndDate($productId, $date);
            Response::success($stock, 'Stock added successfully');
        } else {
            Response::serverError('Failed to add stock');
        }
    }

    /**
     * Clear/Remove stock balance
     */
    public function clearStock(int $id): void {
        Auth::requireAuth();

        $stock = $this->stockModel->find($id);
        if (!$stock) {
            Response::notFound('Stock entry not found');
        }

        $result = $this->stockModel->clearStock($id);

        if ($result) {
            Response::success(null, 'Stock cleared successfully');
        } else {
            Response::serverError('Failed to clear stock');
        }
    }

    /**
     * Get product stock history
     */
    public function history(int $productId): void {
        Auth::requireAuth();

        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 30;
        $history = $this->stockModel->getProductHistory($productId, $limit);
        Response::success($history);
    }

    /**
     * Get stock report
     */
    public function report(): void {
        Auth::requireAuth();

        $fromDate = $_GET['from'] ?? date('Y-m-01');
        $toDate = $_GET['to'] ?? date('Y-m-d');

        $report = $this->stockModel->getStockReport($fromDate, $toDate);
        Response::success($report);
    }

    // === Secondary Stock Items ===

    /**
     * Get all stock items
     */
    public function items(): void {
        Auth::requireAuth();

        $items = $this->stockItemModel->getActive();
        Response::success($items);
    }

    /**
     * Get sellable stock items (for POS)
     */
    public function sellableItems(): void {
        Auth::requireAuth();

        $items = $this->stockItemModel->getSellable();
        Response::success($items);
    }

    /**
     * Create stock item
     */
    public function createItem(): void {
        $user = Auth::requireAuth();

        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator
            ->required('name')
            ->required('unit_price')
            ->numeric('unit_price')
            ->min('unit_price', 0)
            ->validate();

        $quantity = isset($data['quantity']) ? Validator::sanitizeFloat($data['quantity']) : 0;
        $itemId = $this->stockItemModel->create([
            'name' => Validator::sanitizeString($data['name']),
            'unit_price' => Validator::sanitizeFloat($data['unit_price']),
            'quantity' => $quantity,
            'unit' => isset($data['unit']) ? Validator::sanitizeString($data['unit']) : 'pcs',
            'is_sellable' => isset($data['is_sellable']) ? (int)$data['is_sellable'] : 1,
            'status' => 'active'
        ]);

        // Record supplier payment/purchase if provided
        if (isset($data['supplier_id']) && $data['supplier_id']) {
            $supplierId = (int)$data['supplier_id'];
            $totalAmount = isset($data['total_amount']) ? Validator::sanitizeFloat($data['total_amount']) : null;
            $paidAmount = isset($data['paid_amount']) ? Validator::sanitizeFloat($data['paid_amount']) : 0;
            $notes = isset($data['notes']) ? Validator::sanitizeString($data['notes']) : 'Stock item purchase';

            if ($totalAmount !== null) {
                // Negative entry for purchase/outstanding
                $this->supplierModel->addPayment($supplierId, -abs($totalAmount), date('Y-m-d'), 'cash', $notes, $user['user_id']);
            }

            if ($paidAmount > 0) {
                $this->supplierModel->addPayment($supplierId, abs($paidAmount), date('Y-m-d'), 'cash', "Payment for {$notes}", $user['user_id']);
            }
        }

        $item = $this->stockItemModel->find($itemId);
        Response::success($item, 'Stock item created successfully', 201);
    }

    /**
     * Update stock item
     */
    public function updateItem(int $id): void {
        Auth::requireAuth();

        $item = $this->stockItemModel->find($id);
        if (!$item) {
            Response::notFound('Stock item not found');
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $updateData = [];

        if (isset($data['name'])) {
            $updateData['name'] = Validator::sanitizeString($data['name']);
        }
        if (isset($data['unit_price'])) {
            $updateData['unit_price'] = Validator::sanitizeFloat($data['unit_price']);
        }
        if (isset($data['quantity'])) {
            $updateData['quantity'] = Validator::sanitizeFloat($data['quantity']);
        }
        if (isset($data['unit'])) {
            $updateData['unit'] = Validator::sanitizeString($data['unit']);
        }
        if (isset($data['is_sellable'])) {
            $updateData['is_sellable'] = (int)$data['is_sellable'];
        }
        if (isset($data['status'])) {
            $updateData['status'] = $data['status'];
        }

        $this->stockItemModel->update($id, $updateData);

        $updatedItem = $this->stockItemModel->find($id);
        Response::success($updatedItem, 'Stock item updated successfully');
    }

    /**
     * Add quantity to stock item
     */
    public function addItemQuantity(int $id): void {
        $user = Auth::requireAuth();

        $item = $this->stockItemModel->find($id);
        if (!$item) {
            Response::notFound('Stock item not found');
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator
            ->required('quantity')
            ->numeric('quantity')
            ->min('quantity', 0.01)
            ->validate();

        $quantity = Validator::sanitizeFloat($data['quantity']);
        $supplierId = isset($data['supplier_id']) ? (int)$data['supplier_id'] : null;
        $totalAmount = isset($data['total_amount']) ? Validator::sanitizeFloat($data['total_amount']) : null;
        $paidAmount = isset($data['paid_amount']) ? Validator::sanitizeFloat($data['paid_amount']) : 0;
        $notes = isset($data['notes']) ? Validator::sanitizeString($data['notes']) : null;

        $this->stockItemModel->addQuantity($id, $quantity);

        // Record supplier purchase/payment if provided
        if ($supplierId && $totalAmount !== null) {
            $supplier = $this->supplierModel->find($supplierId);
            if ($supplier) {
                $purchaseNote = $notes ?: 'Stock item purchase';
                // Log purchase as negative amount to track outstanding
                $this->supplierModel->addPayment($supplierId, -abs($totalAmount), date('Y-m-d'), 'cash', $purchaseNote, $user['user_id']);

                if ($paidAmount > 0) {
                    $this->supplierModel->addPayment($supplierId, abs($paidAmount), date('Y-m-d'), 'cash', "Payment for {$purchaseNote}", $user['user_id']);
                }
            }
        }

        $updatedItem = $this->stockItemModel->find($id);
        Response::success($updatedItem, 'Quantity added successfully');
    }

    /**
     * Delete stock item
     */
    public function deleteItem(int $id): void {
        Auth::requireAuth();

        $item = $this->stockItemModel->find($id);
        if (!$item) {
            Response::notFound('Stock item not found');
        }

        $this->stockItemModel->update($id, ['status' => 'inactive']);
        Response::success(null, 'Stock item deleted successfully');
    }

    /**
     * Get low stock items
     */
    public function lowStock(): void {
        Auth::requireAuth();

        $threshold = isset($_GET['threshold']) ? (float)$_GET['threshold'] : 10;
        $items = $this->stockItemModel->getLowStock($threshold);
        Response::success($items);
    }
}

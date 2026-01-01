<?php
/**
 * POS Controller
 * Handles Point of Sale operations
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../models/Bill.php';
require_once __DIR__ . '/../models/Product.php';
require_once __DIR__ . '/../models/StockItem.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Validator.php';

class POSController {
    private Bill $billModel;
    private Product $productModel;
    private StockItem $stockItemModel;

    public function __construct() {
        $this->billModel = new Bill();
        $this->productModel = new Product();
        $this->stockItemModel = new StockItem();
    }

    /**
     * Get all items for POS (products + stock items)
     */
    public function getItems(): void {
        Auth::requireAuth();

        $products = $this->productModel->getAllForPOS();
        $stockItems = $this->stockItemModel->getSellable();

        Response::success([
            'products' => $products,
            'stock_items' => $stockItems
        ]);
    }

    /**
     * Create bill / Process sale
     */
    public function createBill(): void {
        $user = Auth::requireAuth();

        $data = json_decode(file_get_contents('php://input'), true);

        // Validate cart items
        if (empty($data['items']) || !is_array($data['items'])) {
            Response::error('Cart is empty');
        }

        $currentHour = (int)date('H');

        // Validate each item and normalize pricing server-side
        $items = [];
        foreach ($data['items'] as $item) {
            if (empty($item['id']) || empty($item['quantity']) || empty($item['price'])) {
                Response::error('Invalid item in cart');
            }

            $itemType = $item['type'] ?? 'product';
            $itemId = (int)$item['id'];
            $quantity = (float)$item['quantity'];

            if ($itemType === 'product') {
                $product = $this->productModel->find($itemId);
                if (!$product) Response::error('Product not found');

                $unitPrice = $this->productModel->calculateCurrentPrice($product, $currentHour);

                $items[] = [
                    'item_type' => 'product',
                    'item_id' => $itemId,
                    'item_name' => $product['name'],
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice
                ];
            } else {
                $stockItem = $this->stockItemModel->find($itemId);
                if (!$stockItem) Response::error('Stock item not found');

                $items[] = [
                    'item_type' => 'stock_item',
                    'item_id' => $itemId,
                    'item_name' => $stockItem['name'],
                    'quantity' => $quantity,
                    'unit_price' => (float)$stockItem['unit_price']
                ];
            }
        }

        $billData = [
            'discount_percent' => (float)($data['discount'] ?? 0),
            'payment_method' => $data['payment_method'] ?? 'cash',
            'amount_paid' => isset($data['amount_paid']) ? (float)$data['amount_paid'] : null,
            'notes' => $data['notes'] ?? null
        ];

        $result = $this->billModel->createBill($billData, $items, $user['user_id']);

        if ($result) {
            Response::success($result, 'Bill created successfully');
        } else {
            Response::serverError('Failed to create bill');
        }
    }

    /**
     * Get bill by ID
     */
    public function getBill(int $id): void {
        Auth::requireAuth();

        $bill = $this->billModel->getBillWithItems($id);
        if (!$bill) {
            Response::notFound('Bill not found');
        }

        Response::success($bill);
    }

    /**
     * Get bills (with filters)
     */
    public function getBills(): void {
        Auth::requireAuth();

        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $perPage = isset($_GET['per_page']) ? min((int)$_GET['per_page'], MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
        $fromDate = $_GET['from'] ?? date('Y-m-d');
        $toDate = $_GET['to'] ?? date('Y-m-d');

        $result = $this->billModel->getBillsByDateRange($fromDate, $toDate, $page, $perPage);

        Response::paginated($result['data'], $result['page'], $result['per_page'], $result['total']);
    }

    /**
     * Get daily summary
     */
    public function dailySummary(): void {
        Auth::requireAuth();

        $date = $_GET['date'] ?? date('Y-m-d');
        $summary = $this->billModel->getDailySummary($date);

        Response::success($summary);
    }

    /**
     * Cancel bill
     */
    public function cancelBill(int $id): void {
        Auth::requireAuth();

        $bill = $this->billModel->find($id);
        if (!$bill) {
            Response::notFound('Bill not found');
        }

        if ($bill['status'] === 'cancelled') {
            Response::error('Bill is already cancelled');
        }

        $result = $this->billModel->cancelBill($id);

        if ($result) {
            Response::success(null, 'Bill cancelled successfully');
        } else {
            Response::serverError('Failed to cancel bill');
        }
    }

    /**
     * Reprint bill receipt
     */
    public function reprintBill(int $id): void {
        Auth::requireAuth();

        $bill = $this->billModel->getBillWithItems($id);
        if (!$bill) {
            Response::notFound('Bill not found');
        }

        // Return bill data formatted for printing
        Response::success([
            'bill' => $bill,
            'print_data' => [
                'bill_number' => $bill['bill_number'],
                'date' => date('d/m/Y H:i', strtotime($bill['created_at'])),
                'items' => $bill['items'],
                'subtotal' => $bill['subtotal'],
                'discount' => $bill['discount_amount'],
                'total' => $bill['total'],
                'payment_method' => $bill['payment_method']
            ]
        ]);
    }
}

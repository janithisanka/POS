<?php
/**
 * Order Controller
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../models/Order.php';
require_once __DIR__ . '/../models/Bill.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Validator.php';

class OrderController {
    private Order $orderModel;
    private Bill $billModel;

    public function __construct() {
        $this->orderModel = new Order();
        $this->billModel = new Bill();
    }

    /**
     * Get all orders (with filters)
     */
    public function index(): void {
        Auth::requireAuth();

        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $perPage = isset($_GET['per_page']) ? min((int)$_GET['per_page'], MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

        $filters = [];
        if (!empty($_GET['status'])) {
            $filters['status'] = $_GET['status'];
        }
        if (!empty($_GET['from_date'])) {
            $filters['from_date'] = $_GET['from_date'];
        }
        if (!empty($_GET['to_date'])) {
            $filters['to_date'] = $_GET['to_date'];
        }
        if (!empty($_GET['customer'])) {
            $filters['customer'] = $_GET['customer'];
        }

        $result = $this->orderModel->getAllOrders($filters, $page, $perPage);
        Response::paginated($result['data'], $result['page'], $result['per_page'], $result['total']);
    }

    /**
     * Get pending orders (for dashboard)
     */
    public function pending(): void {
        Auth::requireAuth();

        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        $orders = $this->orderModel->getPendingOrders($limit);

        Response::success([
            'orders' => $orders,
            'count' => $this->orderModel->getPendingCount()
        ]);
    }

    /**
     * Get single order with items
     */
    public function show(int $id): void {
        Auth::requireAuth();

        $order = $this->orderModel->getOrderWithItems($id);
        if (!$order) {
            Response::notFound('Order not found');
        }

        Response::success($order);
    }

    /**
     * Create order
     */
    public function store(): void {
        $user = Auth::requireAuth();

        $data = json_decode(file_get_contents('php://input'), true);

        // Validate
        $validator = new Validator($data);
        $validator
            ->required('customer_name')
            ->validate();

        if (empty($data['items']) || !is_array($data['items'])) {
            Response::error('At least one item is required');
        }

        // Prepare items
        $items = [];
        foreach ($data['items'] as $item) {
            if (empty($item['id']) || empty($item['quantity']) || empty($item['price'])) {
                Response::error('Invalid item data');
            }

            $items[] = [
                'item_type' => $item['type'] ?? 'product',
                'item_id' => (int)$item['id'],
                'item_name' => $item['name'] ?? 'Unknown',
                'quantity' => (float)$item['quantity'],
                'unit_price' => (float)$item['price'],
                'notes' => $item['notes'] ?? null
            ];
        }

        $orderData = [
            'customer_name' => Validator::sanitizeString($data['customer_name']),
            'customer_phone' => isset($data['customer_phone']) ? Validator::sanitizeString($data['customer_phone']) : null,
            'order_date' => $data['order_date'] ?? date('Y-m-d'),
            'delivery_date' => $data['delivery_date'] ?? null,
            'advance_amount' => isset($data['advance_amount']) ? (float)$data['advance_amount'] : 0,
            'notes' => isset($data['notes']) ? Validator::sanitizeString($data['notes']) : null
        ];

        $result = $this->orderModel->createOrder($orderData, $items, $user['user_id']);

        if ($result) {
            Response::success($result, 'Order created successfully', 201);
        } else {
            Response::serverError('Failed to create order');
        }
    }

    /**
     * Update order status
     */
    public function updateStatus(int $id): void {
        $user = Auth::requireAuth();

        $order = $this->orderModel->find($id);
        if (!$order) {
            Response::notFound('Order not found');
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator
            ->required('status')
            ->in('status', ['pending', 'in_progress', 'ready', 'completed', 'cancelled'])
            ->validate();

        $newStatus = $data['status'];
        $previousStatus = $order['status'];

        $result = $this->orderModel->updateStatus($id, $newStatus);

        if ($result) {
            // Reduce inventory only when moving into completed for the first time
            if ($newStatus === 'completed' && $previousStatus !== 'completed') {
                $this->orderModel->reduceInventoryForOrder($id);
                $orderWithItems = $this->orderModel->getOrderWithItems($id);

                // Create a bill entry so it appears in reports
                $existingBill = $this->billModel->findBy('bill_number', $orderWithItems['order_number']);
                if (!$existingBill) {
                    $billItems = array_map(function ($item) {
                        return [
                            'item_type' => $item['item_type'],
                            'item_id' => (int)$item['item_id'],
                            'item_name' => $item['item_name'],
                            'quantity' => (float)$item['quantity'],
                            'unit_price' => (float)$item['unit_price']
                        ];
                    }, $orderWithItems['items']);

                    $billData = [
                        'discount_percent' => 0,
                        'payment_method' => 'cash',
                        'amount_paid' => (float)$orderWithItems['total_amount'],
                        'notes' => "Order {$orderWithItems['order_number']} completion"
                    ];

                    $this->billModel->createBill($billData, $billItems, $user['user_id'], false, $orderWithItems['order_number']);
                }
            }

            $updatedOrder = $this->orderModel->getOrderWithItems($id);
            Response::success($updatedOrder, 'Order status updated');
        } else {
            Response::serverError('Failed to update order status');
        }
    }

    /**
     * Add payment to order
     */
    public function addPayment(int $id): void {
        Auth::requireAuth();

        $order = $this->orderModel->find($id);
        if (!$order) {
            Response::notFound('Order not found');
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator
            ->required('amount')
            ->numeric('amount')
            ->min('amount', 0.01)
            ->validate();

        $amount = (float)$data['amount'];
        $result = $this->orderModel->addPayment($id, $amount);

        if ($result) {
            $updatedOrder = $this->orderModel->getOrderWithItems($id);
            $updatedOrder['last_payment'] = $amount;
            Response::success($updatedOrder, 'Payment added successfully');
        } else {
            Response::serverError('Failed to add payment');
        }
    }

    /**
     * Delete order
     */
    public function destroy(int $id): void {
        Auth::requireAuth();

        $order = $this->orderModel->find($id);
        if (!$order) {
            Response::notFound('Order not found');
        }

        // Set status to cancelled instead of deleting
        $result = $this->orderModel->updateStatus($id, 'cancelled');

        if ($result) {
            Response::success(null, 'Order cancelled successfully');
        } else {
            Response::serverError('Failed to cancel order');
        }
    }
}

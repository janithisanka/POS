<?php
/**
 * Order Model
 * Handles customer pre-orders and custom orders
 */

require_once __DIR__ . '/BaseModel.php';

class Order extends BaseModel {
    protected string $table = 'orders';
    protected array $fillable = [
        'order_number', 'customer_name', 'customer_phone', 'order_date',
        'delivery_date', 'total_amount', 'advance_amount', 'status',
        'payment_status', 'notes', 'created_by'
    ];
    protected array $orderItemFields = [
        'order_id', 'item_type', 'item_id', 'item_name', 'quantity', 'unit_price', 'total_price', 'notes'
    ];

    /**
     * Generate unique order number
     */
    public function generateOrderNumber(): string {
        $prefix = 'ORD-' . date('Ymd');
        $sql = "SELECT MAX(CAST(SUBSTRING(order_number, 13) AS UNSIGNED)) as last_num
                FROM orders
                WHERE order_number LIKE :prefix";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['prefix' => $prefix . '%']);
        $result = $stmt->fetch();
        $nextNum = ($result['last_num'] ?? 0) + 1;
        return $prefix . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Create order with items
     * Preserves original business logic
     */
    public function createOrder(array $orderData, array $items, int $userId = null): ?array {
        $this->beginTransaction();

        try {
            $orderNumber = $this->generateOrderNumber();

            // Calculate total
            $totalAmount = 0;
            foreach ($items as $item) {
                $totalAmount += $item['quantity'] * $item['unit_price'];
            }

            $advanceAmount = $orderData['advance_amount'] ?? 0;

            // Determine payment status
            $paymentStatus = 'pending';
            if ($advanceAmount >= $totalAmount) {
                $paymentStatus = 'paid';
            } elseif ($advanceAmount > 0) {
                $paymentStatus = 'partial';
            }

            // Create order
            $orderId = $this->create([
                'order_number' => $orderNumber,
                'customer_name' => $orderData['customer_name'],
                'customer_phone' => $orderData['customer_phone'] ?? null,
                'order_date' => $orderData['order_date'] ?? date('Y-m-d'),
                'delivery_date' => $orderData['delivery_date'] ?? null,
                'total_amount' => $totalAmount,
                'advance_amount' => $advanceAmount,
                'status' => 'pending',
                'payment_status' => $paymentStatus,
                'notes' => $orderData['notes'] ?? null,
                'created_by' => $userId
            ]);

            // Insert order items
            foreach ($items as $item) {
                $sql = "INSERT INTO order_items (order_id, item_type, item_id, item_name, quantity, unit_price, total_price, notes)
                        VALUES (:order_id, :item_type, :item_id, :item_name, :quantity, :unit_price, :total_price, :notes)";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    'order_id' => $orderId,
                    'item_type' => $item['item_type'],
                    'item_id' => $item['item_id'],
                    'item_name' => $item['item_name'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_price' => $item['quantity'] * $item['unit_price'],
                    'notes' => $item['notes'] ?? null
                ]);
            }

            $this->commit();

            return [
                'order_id' => $orderId,
                'order_number' => $orderNumber,
                'order_date' => $orderData['order_date'] ?? date('Y-m-d'),
                'delivery_date' => $orderData['delivery_date'] ?? null,
                'customer_name' => $orderData['customer_name'],
                'customer_phone' => $orderData['customer_phone'] ?? null,
                'total_amount' => $totalAmount,
                'advance_amount' => $advanceAmount,
                'balance_amount' => $totalAmount - $advanceAmount,
                'items' => $items
            ];
        } catch (Exception $e) {
            $this->rollback();
            error_log("Order creation error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get order with items
     */
    public function getOrderWithItems(int $orderId): ?array {
        $sql = "SELECT o.*, u.first_name as created_by_name
                FROM orders o
                LEFT JOIN users u ON o.created_by = u.id
                WHERE o.id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $orderId]);
        $order = $stmt->fetch();

        if (!$order) return null;

        $itemsSql = "SELECT * FROM order_items WHERE order_id = :order_id";
        $itemsStmt = $this->db->prepare($itemsSql);
        $itemsStmt->execute(['order_id' => $orderId]);
        $order['items'] = $itemsStmt->fetchAll();

        return $order;
    }

    /**
     * Get pending orders (for dashboard notification)
     */
    public function getPendingOrders(int $limit = 10): array {
        $sql = "SELECT id, order_number, customer_name, order_date, delivery_date,
                       total_amount, advance_amount, balance_amount, status
                FROM orders
                WHERE status IN ('pending', 'in_progress')
                ORDER BY COALESCE(delivery_date, order_date) ASC
                LIMIT :limit";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Get pending orders count
     */
    public function getPendingCount(): int {
        $sql = "SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'in_progress')";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return (int)$stmt->fetch()['count'];
    }

    /**
     * Update order status
     */
    public function updateStatus(int $orderId, string $status): bool {
        $validStatuses = ['pending', 'in_progress', 'ready', 'completed', 'cancelled'];
        if (!in_array($status, $validStatuses)) {
            return false;
        }

        $sql = "UPDATE orders SET status = :status WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['status' => $status, 'id' => $orderId]);
    }

    /**
     * Update payment (add more advance)
     */
    public function addPayment(int $orderId, float $amount): bool {
        $sql = "UPDATE orders
                SET advance_amount = advance_amount + :amount,
                    payment_status = CASE
                        WHEN advance_amount + :amount >= total_amount THEN 'paid'
                        WHEN advance_amount + :amount > 0 THEN 'partial'
                        ELSE 'pending'
                    END
                WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['amount' => $amount, 'id' => $orderId]);
    }

    /**
     * Reduce inventory quantities when an order is completed
     */
    public function reduceInventoryForOrder(int $orderId): bool {
        $items = $this->getOrderItems($orderId);
        if (empty($items)) {
            return true;
        }

        require_once __DIR__ . '/Stock.php';
        require_once __DIR__ . '/StockItem.php';

        $stock = new Stock();
        $stockItem = new StockItem();
        $date = date('Y-m-d');

        foreach ($items as $item) {
            if ($item['item_type'] === 'product') {
                $stock->reduceStock((int)$item['item_id'], (float)$item['quantity'], $date);
            } else {
                $stockItem->reduceQuantity((int)$item['item_id'], (float)$item['quantity']);
            }
        }

        return true;
    }

    /**
     * Get order items
     */
    public function getOrderItems(int $orderId): array {
        $sql = "SELECT order_id, item_type, item_id, item_name, quantity, unit_price, total_price, notes
                FROM order_items WHERE order_id = :order_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['order_id' => $orderId]);
        return $stmt->fetchAll();
    }

    /**
     * Get orders by status
     */
    public function getByStatus(string $status, int $page = 1, int $perPage = 10): array {
        $offset = ($page - 1) * $perPage;

        $countSql = "SELECT COUNT(*) as total FROM orders WHERE status = :status";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute(['status' => $status]);
        $total = (int)$countStmt->fetch()['total'];

        $sql = "SELECT * FROM orders WHERE status = :status
                ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':status', $status);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'data' => $stmt->fetchAll(),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage
        ];
    }

    /**
     * Get all orders with filtering
     */
    public function getAllOrders(array $filters = [], int $page = 1, int $perPage = 10): array {
        $offset = ($page - 1) * $perPage;
        $where = [];
        $params = [];

        if (!empty($filters['status'])) {
            $where[] = "status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['from_date'])) {
            $where[] = "order_date >= :from_date";
            $params['from_date'] = $filters['from_date'];
        }

        if (!empty($filters['to_date'])) {
            $where[] = "order_date <= :to_date";
            $params['to_date'] = $filters['to_date'];
        }

        if (!empty($filters['customer'])) {
            $where[] = "customer_name LIKE :customer";
            $params['customer'] = '%' . $filters['customer'] . '%';
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $countSql = "SELECT COUNT(*) as total FROM orders {$whereClause}";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetch()['total'];

        $sql = "SELECT * FROM orders {$whereClause}
                ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(":{$key}", $value);
        }
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'data' => $stmt->fetchAll(),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage
        ];
    }
}

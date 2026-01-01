<?php
/**
 * Stock Model
 * Handles daily stock tracking for products
 */

require_once __DIR__ . '/BaseModel.php';

class Stock extends BaseModel {
    protected string $table = 'stock';
    protected array $fillable = ['product_id', 'quantity', 'quantity_balance', 'stock_date', 'added_by', 'notes'];

    /**
     * Add or update stock for today
     * Preserves original business logic: if stock exists for today, add to it
     */
    public function addStock(int $productId, float $quantity, int $userId, string $date = null): bool {
        $date = $date ?? date('Y-m-d');

        // Check if stock exists for this product today
        $existing = $this->getStockByProductAndDate($productId, $date);

        if ($existing) {
            // Update existing stock (add to current quantity)
            $sql = "UPDATE stock
                    SET quantity = quantity + :qty,
                        quantity_balance = quantity_balance + :qty
                    WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                'qty' => $quantity,
                'id' => $existing['id']
            ]);
        } else {
            // Create new stock entry
            return $this->create([
                'product_id' => $productId,
                'quantity' => $quantity,
                'quantity_balance' => $quantity,
                'stock_date' => $date,
                'added_by' => $userId
            ]) > 0;
        }
    }

    /**
     * Get stock by product and date
     */
    public function getStockByProductAndDate(int $productId, string $date): ?array {
        $sql = "SELECT * FROM stock WHERE product_id = :product_id AND stock_date = :date LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['product_id' => $productId, 'date' => $date]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Get current stock with product details
     */
    public function getCurrentStock(): array {
        $sql = "SELECT s.*, p.name as product_name, b.name as brand_name, p.price
                FROM stock s
                JOIN products p ON s.product_id = p.id
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE s.stock_date = CURDATE() AND s.quantity_balance > 0
                ORDER BY p.name";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Get all today's stock (including zero balance)
     */
    public function getTodayStock(): array {
        $sql = "SELECT s.*, p.name as product_name, b.name as brand_name, p.price,
                       u.first_name as added_by_name
                FROM stock s
                JOIN products p ON s.product_id = p.id
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN users u ON s.added_by = u.id
                WHERE s.stock_date = CURDATE()
                ORDER BY s.created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Reduce stock balance (when sold)
     */
    public function reduceStock(int $productId, float $quantity, string $date = null): bool {
        $date = $date ?? date('Y-m-d');

        $sql = "UPDATE stock
                SET quantity_balance = quantity_balance - :qty
                WHERE product_id = :product_id AND stock_date = :date";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'qty' => $quantity,
            'product_id' => $productId,
            'date' => $date
        ]);
    }

    /**
     * Clear stock balance (set to 0)
     */
    public function clearStock(int $stockId): bool {
        $sql = "UPDATE stock SET quantity_balance = 0 WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $stockId]);
    }

    /**
     * Get stock history for a product
     */
    public function getProductHistory(int $productId, int $limit = 30): array {
        $sql = "SELECT s.*, u.first_name as added_by_name
                FROM stock s
                LEFT JOIN users u ON s.added_by = u.id
                WHERE s.product_id = :product_id
                ORDER BY s.stock_date DESC
                LIMIT :limit";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':product_id', $productId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Get stock report by date range
     */
    public function getStockReport(string $fromDate, string $toDate): array {
        $sql = "SELECT p.id, p.name as product_name, b.name as brand_name,
                       SUM(s.quantity) as total_added,
                       SUM(s.quantity - s.quantity_balance) as total_sold,
                       SUM(s.quantity_balance) as total_remaining
                FROM stock s
                JOIN products p ON s.product_id = p.id
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE s.stock_date BETWEEN :from_date AND :to_date
                GROUP BY p.id
                ORDER BY p.name";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['from_date' => $fromDate, 'to_date' => $toDate]);
        return $stmt->fetchAll();
    }
}

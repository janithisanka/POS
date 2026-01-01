<?php
/**
 * Bill Model
 * Handles POS billing operations
 */

require_once __DIR__ . '/BaseModel.php';
require_once __DIR__ . '/Stock.php';
require_once __DIR__ . '/StockItem.php';

class Bill extends BaseModel {
    protected string $table = 'bills';
    protected array $fillable = [
        'bill_number', 'subtotal', 'discount_percent', 'discount_amount',
        'tax_amount', 'total', 'payment_method', 'amount_paid', 'change_amount',
        'cashier_id', 'notes', 'status'
    ];

    /**
     * Generate unique bill number
     */
    public function generateBillNumber(): string {
        $prefix = 'INV-' . date('Ymd');
        $sql = "SELECT MAX(CAST(SUBSTRING(bill_number, 13) AS UNSIGNED)) as last_num
                FROM bills
                WHERE bill_number LIKE :prefix";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['prefix' => $prefix . '%']);
        $result = $stmt->fetch();
        $nextNum = ($result['last_num'] ?? 0) + 1;
        return $prefix . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Create bill with items (main POS transaction)
     * Preserves original business logic: saves bill and updates stock
     */
    public function createBill(array $billData, array $items, int $cashierId = null, bool $updateStock = true, ?string $forcedBillNumber = null): ?array {
        $this->beginTransaction();

        try {
            // Generate bill number
            $billNumber = $forcedBillNumber ?: $this->generateBillNumber();

            // Calculate totals
            $subtotal = 0;
            foreach ($items as $item) {
                $subtotal += $item['quantity'] * $item['unit_price'];
            }

            $discountPercent = $billData['discount_percent'] ?? 0;
            $discountAmount = $subtotal * ($discountPercent / 100);
            $total = $subtotal - $discountAmount;

            // Create bill
            $billId = $this->create([
                'bill_number' => $billNumber,
                'subtotal' => $subtotal,
                'discount_percent' => $discountPercent,
                'discount_amount' => $discountAmount,
                'tax_amount' => 0,
                'total' => $total,
                'payment_method' => $billData['payment_method'] ?? 'cash',
                'amount_paid' => $billData['amount_paid'] ?? $total,
                'change_amount' => ($billData['amount_paid'] ?? $total) - $total,
                'cashier_id' => $cashierId,
                'notes' => $billData['notes'] ?? null,
                'status' => 'completed'
            ]);

            // Insert bill items and update stock
            $stockModel = new Stock();
            $stockItemModel = new StockItem();
            $today = date('Y-m-d');

            foreach ($items as $item) {
                // Insert bill item
                $sql = "INSERT INTO bill_items (bill_id, item_type, item_id, item_name, quantity, unit_price, total_price)
                        VALUES (:bill_id, :item_type, :item_id, :item_name, :quantity, :unit_price, :total_price)";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    'bill_id' => $billId,
                    'item_type' => $item['item_type'],
                    'item_id' => $item['item_id'],
                    'item_name' => $item['item_name'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_price' => $item['quantity'] * $item['unit_price']
                ]);

                // Update stock based on item type (preserving original logic)
                if ($updateStock) {
                    if ($item['item_type'] === 'product') {
                        $stockModel->reduceStock($item['item_id'], $item['quantity'], $today);
                    } else {
                        $stockItemModel->reduceQuantity($item['item_id'], $item['quantity']);
                    }
                }
            }

            $this->commit();

            return [
                'bill_id' => $billId,
                'bill_number' => $billNumber,
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'total' => $total,
                'items' => $items
            ];
        } catch (Exception $e) {
            $this->rollback();
            error_log("Bill creation error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get bill with items
     */
    public function getBillWithItems(int $billId): ?array {
        $bill = $this->find($billId);
        if (!$bill) return null;

        $sql = "SELECT * FROM bill_items WHERE bill_id = :bill_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['bill_id' => $billId]);
        $bill['items'] = $stmt->fetchAll();

        return $bill;
    }

    /**
     * Get bills by date range (for reporting)
     */
    public function getBillsByDateRange(string $fromDate, string $toDate, int $page = 1, int $perPage = 10): array {
        $offset = ($page - 1) * $perPage;

        // Count total
        $countSql = "SELECT COUNT(*) as total FROM bills
                     WHERE DATE(created_at) BETWEEN :from_date AND :to_date
                     AND status = 'completed'";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute(['from_date' => $fromDate, 'to_date' => $toDate]);
        $total = (int)$countStmt->fetch()['total'];

        // Get bills
        $sql = "SELECT b.*, u.first_name as cashier_name
                FROM bills b
                LEFT JOIN users u ON b.cashier_id = u.id
                WHERE DATE(b.created_at) BETWEEN :from_date AND :to_date
                AND b.status = 'completed'
                ORDER BY b.created_at DESC
                LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':from_date', $fromDate);
        $stmt->bindValue(':to_date', $toDate);
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
     * Get daily sales summary
     */
    public function getDailySummary(string $date): array {
        $sql = "SELECT
                    COUNT(*) as total_bills,
                    COALESCE(SUM(subtotal), 0) as gross_sales,
                    COALESCE(SUM(discount_amount), 0) as total_discount,
                    COALESCE(SUM(total), 0) as net_sales
                FROM bills
                WHERE DATE(created_at) = :date AND status = 'completed'";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['date' => $date]);
        $summary = $stmt->fetch();

        // Get items sold count
        $itemsSql = "SELECT COALESCE(SUM(bi.quantity), 0) as items_sold
                     FROM bill_items bi
                     JOIN bills b ON bi.bill_id = b.id
                     WHERE DATE(b.created_at) = :date AND b.status = 'completed'";
        $itemsStmt = $this->db->prepare($itemsSql);
        $itemsStmt->execute(['date' => $date]);
        $summary['items_sold'] = (float)$itemsStmt->fetch()['items_sold'];

        return $summary;
    }

    /**
     * Get monthly sales summary
     */
    public function getMonthlySummary(int $year, int $month): array {
        $sql = "SELECT
                    DATE(created_at) as date,
                    COUNT(*) as total_bills,
                    SUM(total) as net_sales
                FROM bills
                WHERE YEAR(created_at) = :year AND MONTH(created_at) = :month
                AND status = 'completed'
                GROUP BY DATE(created_at)
                ORDER BY date";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['year' => $year, 'month' => $month]);
        return $stmt->fetchAll();
    }

    /**
     * Cancel/refund bill
     */
    public function cancelBill(int $billId): bool {
        // Note: In a real system, you might want to restore stock
        $sql = "UPDATE bills SET status = 'cancelled' WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $billId]);
    }
}

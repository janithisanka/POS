<?php
/**
 * Supplier Model
 */

require_once __DIR__ . '/BaseModel.php';

class Supplier extends BaseModel {
    protected string $table = 'suppliers';
    protected array $fillable = ['name', 'contact_person', 'phone', 'email', 'address', 'status'];

    /**
     * Get all suppliers with payment totals
     */
    public function getAllWithPayments(): array {
        $sql = "SELECT s.*,
                       COALESCE(SUM(CASE WHEN sp.amount > 0 THEN sp.amount ELSE 0 END), 0) as total_paid,
                       COALESCE(SUM(CASE WHEN sp.amount < 0 THEN ABS(sp.amount) ELSE 0 END), 0) as total_purchases,
                       COUNT(sp.id) as payment_count
                FROM suppliers s
                LEFT JOIN supplier_payments sp ON s.id = sp.supplier_id
                GROUP BY s.id
                ORDER BY s.name ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $suppliers = $stmt->fetchAll();

        // Normalize outstanding to always be positive and derived from totals
        foreach ($suppliers as &$supplier) {
            $totalPaid = (float) ($supplier['total_paid'] ?? 0);
            $totalPurchases = (float) ($supplier['total_purchases'] ?? 0); // already absolute
            $supplier['outstanding'] = max($totalPurchases - $totalPaid, 0);
        }

        return $suppliers;
    }

    /**
     * Get supplier with payment history
     */
    public function getWithPayments(int $id): ?array {
        $supplier = $this->find($id);
        if (!$supplier) return null;

        $sql = "SELECT sp.*, u.first_name as created_by_name
                FROM supplier_payments sp
                LEFT JOIN users u ON sp.created_by = u.id
                WHERE sp.supplier_id = :supplier_id
                ORDER BY sp.payment_date DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['supplier_id' => $id]);
        $supplier['payments'] = $stmt->fetchAll();

        // Calculate totals (purchases are stored as negative amounts; convert to absolute)
        $supplier['total_paid'] = array_sum(array_map(function ($p) { return $p['amount'] > 0 ? $p['amount'] : 0; }, $supplier['payments']));
        $supplier['total_purchases'] = array_sum(array_map(function ($p) { return $p['amount'] < 0 ? abs($p['amount']) : 0; }, $supplier['payments']));
        $supplier['outstanding'] = max($supplier['total_purchases'] - $supplier['total_paid'], 0);

        return $supplier;
    }

    /**
     * Add payment
     */
    public function addPayment(int $supplierId, float $amount, string $date, string $method = 'cash', string $reference = null, int $userId = null): int {
        $sql = "INSERT INTO supplier_payments (supplier_id, amount, payment_date, payment_method, reference, created_by)
                VALUES (:supplier_id, :amount, :payment_date, :payment_method, :reference, :created_by)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'supplier_id' => $supplierId,
            'amount' => $amount,
            'payment_date' => $date,
            'payment_method' => $method,
            'reference' => $reference,
            'created_by' => $userId
        ]);
        return (int)$this->db->lastInsertId();
    }

    /**
     * Get payment by ID
     */
    public function getPayment(int $paymentId): ?array {
        $sql = "SELECT sp.*, s.name as supplier_name
                FROM supplier_payments sp
                JOIN suppliers s ON sp.supplier_id = s.id
                WHERE sp.id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $paymentId]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Get payments by date range
     */
    public function getPaymentsByDateRange(string $fromDate, string $toDate): array {
        $sql = "SELECT sp.*, s.name as supplier_name
                FROM supplier_payments sp
                JOIN suppliers s ON sp.supplier_id = s.id
                WHERE sp.payment_date BETWEEN :from_date AND :to_date
                ORDER BY sp.payment_date DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['from_date' => $fromDate, 'to_date' => $toDate]);
        return $stmt->fetchAll();
    }
}

<?php
/**
 * Stock Item Model
 * Handles secondary/other stock items (like packaging, supplies)
 */

require_once __DIR__ . '/BaseModel.php';

class StockItem extends BaseModel {
    protected string $table = 'stock_items';
    protected array $fillable = ['name', 'unit_price', 'quantity', 'unit', 'is_sellable', 'status'];

    /**
     * Get all sellable items (for POS)
     */
    public function getSellable(): array {
        $sql = "SELECT id, name, unit_price as price, unit_price as current_price,
                       quantity as stock, unit, 'stock_item' as item_type
                FROM stock_items
                WHERE is_sellable = 1 AND status = 'active'
                ORDER BY name";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Get all active items
     */
    public function getActive(): array {
        return $this->findAllBy('status', 'active', 'name ASC');
    }

    /**
     * Add stock quantity
     */
    public function addQuantity(int $id, float $quantity): bool {
        $sql = "UPDATE stock_items SET quantity = quantity + :qty WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['qty' => $quantity, 'id' => $id]);
    }

    /**
     * Reduce stock quantity
     */
    public function reduceQuantity(int $id, float $quantity): bool {
        $sql = "UPDATE stock_items SET quantity = quantity - :qty WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['qty' => $quantity, 'id' => $id]);
    }

    /**
     * Get low stock items
     */
    public function getLowStock(float $threshold = 10): array {
        $sql = "SELECT * FROM stock_items WHERE quantity <= :threshold AND status = 'active' ORDER BY quantity ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['threshold' => $threshold]);
        return $stmt->fetchAll();
    }
}

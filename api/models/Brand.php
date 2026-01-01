<?php
/**
 * Brand Model
 */

require_once __DIR__ . '/BaseModel.php';

class Brand extends BaseModel {
    protected string $table = 'brands';
    protected array $fillable = ['name', 'image', 'description', 'status'];

    /**
     * Get all active brands with product count
     */
    public function getAllWithProductCount(): array {
        $sql = "SELECT b.*, COUNT(p.id) as product_count
                FROM brands b
                LEFT JOIN products p ON b.id = p.brand_id AND p.status = 'active'
                GROUP BY b.id
                ORDER BY b.name ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Get active brands only
     */
    public function getActive(): array {
        return $this->findAllBy('status', 'active', 'name ASC');
    }
}

<?php
/**
 * Product Model
 */

require_once __DIR__ . '/BaseModel.php';

class Product extends BaseModel {
    protected string $table = 'products';
    protected array $fillable = [
        'name', 'brand_id', 'price', 'special_price', 'size',
        'description', 'image', 'is_special_pricing', 'status'
    ];

    /**
     * Get all products with brand info
     */
    public function getAllWithBrand(string $status = null): array {
        $sql = "SELECT p.*, b.name as brand_name
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id";

        $params = [];
        if ($status !== null) {
            $sql .= " WHERE p.status = :status";
            $params['status'] = $status;
        }

        $sql .= " ORDER BY p.name ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Get product with current stock
     */
    public function getWithStock(int $id): ?array {
        $sql = "SELECT p.*, b.name as brand_name,
                       COALESCE(s.quantity_balance, 0) as current_stock
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN stock s ON p.id = s.product_id AND s.stock_date = CURDATE()
                WHERE p.id = :id
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Get all products with current stock (for POS)
     */
    public function getAllForPOS(): array {
        $currentHour = (int)date('H');

        $sql = "SELECT p.id, p.name, p.brand_id, b.name as brand_name,
                       p.price, p.special_price, p.is_special_pricing,
                       p.image, p.size,
                       COALESCE(s.quantity_balance, 0) as stock,
                       'product' as item_type
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN stock s ON p.id = s.product_id AND s.stock_date = CURDATE()
                WHERE p.status = 'active'
                ORDER BY b.name, p.name";

        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $products = $stmt->fetchAll();

        // Apply current price on PHP side to avoid SQL/timezone quirks
        foreach ($products as &$product) {
            $product['current_price'] = $this->calculateCurrentPrice($product, $currentHour);
            $product['is_special_active'] = $this->isSpecialActive($product, $currentHour) ? 1 : 0;
        }

        return $products;
    }

    private function isSpecialActive(array $product, int $currentHour): bool {
        return (int)($product['is_special_pricing'] ?? 0) === 1
            && $product['special_price'] !== null
            && $currentHour >= SPECIAL_PRICE_START_HOUR;
    }

    public function calculateCurrentPrice(array $product, int $currentHour): float {
        if ($this->isSpecialActive($product, $currentHour)) {
            return (float)$product['special_price'];
        }
        return (float)$product['price'];
    }

    /**
     * Get products by brand
     */
    public function getByBrand(int $brandId): array {
        $sql = "SELECT p.*, COALESCE(s.quantity_balance, 0) as current_stock
                FROM products p
                LEFT JOIN stock s ON p.id = s.product_id AND s.stock_date = CURDATE()
                WHERE p.brand_id = :brand_id AND p.status = 'active'
                ORDER BY p.name";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['brand_id' => $brandId]);
        return $stmt->fetchAll();
    }

    /**
     * Search products
     */
    public function search(string $query): array {
        $sql = "SELECT p.*, b.name as brand_name,
                       COALESCE(s.quantity_balance, 0) as current_stock
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN stock s ON p.id = s.product_id AND s.stock_date = CURDATE()
                WHERE p.status = 'active'
                AND (p.name LIKE :query OR b.name LIKE :query)
                ORDER BY p.name
                LIMIT 20";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['query' => "%{$query}%"]);
        return $stmt->fetchAll();
    }
}
